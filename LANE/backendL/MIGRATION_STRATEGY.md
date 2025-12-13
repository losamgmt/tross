# Database Migration Strategy

Guide to managing database schema changes in TrossApp.

---

## 📋 Overview

**Current Approach**: Idempotent schema.sql  
**Philosophy**: Simple, safe, explicit migrations

---

## 🎯 Core Principles

1. **Idempotent**: Can run multiple times safely
2. **No Data Loss**: Migrations never delete data
3. **Reversible**: Can roll back if needed
4. **Tested**: All migrations tested locally before production
5. **Documented**: Every change has a comment explaining why

---

## 📁 File Structure

```
backend/
├── schema.sql              # Main schema (CREATE TABLE IF NOT EXISTS)
├── migrations/             # Timestamped migration files
│   ├── 001_initial.sql
│   ├── 002_add_user_indexes.sql
│   ├── 003_audit_logs.sql
│   └── ...
└── scripts/
    ├── db-manage.sh       # Database management script
    └── apply-migration.sh # Migration runner
```

---

## 🔄 Migration Workflow

### Development

**1. Create Migration File**
```bash
# Naming: XXX_description.sql (XXX = sequential number)
cd backend/migrations
touch 004_add_user_preferences.sql
```

**2. Write Migration**
```sql
-- Migration: 004
-- Description: Add user preferences table
-- Author: [Your Name]
-- Date: 2025-11-10
-- Reversible: Yes

-- Add new table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
    ON user_preferences(user_id);

-- Add trigger
DROP TRIGGER IF EXISTS update_user_preferences_updated_at 
    ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Rollback script (for documentation)
-- DROP TABLE IF EXISTS user_preferences CASCADE;
```

**3. Test Locally**
```bash
# Apply to development database
npm run db:migrate

# Or manually
psql -U trossapp_user -d trossapp_dev -f migrations/004_add_user_preferences.sql

# Verify
psql -U trossapp_user -d trossapp_dev -c "\d user_preferences"
```

**4. Update schema.sql**
```bash
# Add new table definition to schema.sql
# Keep schema.sql as single source of truth for fresh installs
```

**5. Test Fresh Install**
```bash
# Drop and recreate database
npm run db:reset

# Verify schema.sql creates everything correctly
npm run db:setup
```

---

### Production

**Pre-Deployment Checklist**
- [ ] Migration tested locally
- [ ] Migration tested on staging
- [ ] Rollback script prepared
- [ ] Database backup created
- [ ] Team notified of deployment
- [ ] Downtime window scheduled (if needed)

**Deployment Steps**

**1. Backup Database**
```bash
# On production server
pg_dump -U trossapp_user -d trossapp_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

**2. Apply Migration**
```bash
# Connect to production database
psql -U trossapp_user -d trossapp_prod -f migrations/004_add_user_preferences.sql

# Verify migration
psql -U trossapp_user -d trossapp_prod -c "\d user_preferences"
```

**3. Monitor Application**
```bash
# Watch logs for errors
tail -f logs/combined.log

# Check health endpoint
curl http://localhost:3001/api/health
```

**4. If Issues: Rollback**
```bash
# Option A: Restore from backup
psql -U trossapp_user -d trossapp_prod < backup_20251110_153045.sql

# Option B: Run rollback script
psql -U trossapp_user -d trossapp_prod -f migrations/004_rollback.sql
```

---

## 🛠️ Common Migration Patterns

### Adding a Column
```sql
-- Add column with default (safe, no downtime)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add index
CREATE INDEX IF NOT EXISTS idx_users_phone 
    ON users(phone_number);
```

### Modifying a Column
```sql
-- Change column type (requires data migration)
-- Step 1: Add new column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_new VARCHAR(320);

-- Step 2: Copy data
UPDATE users SET email_new = email;

-- Step 3: Drop old column (after verification)
-- ALTER TABLE users DROP COLUMN IF EXISTS email;

-- Step 4: Rename new column
-- ALTER TABLE users RENAME COLUMN email_new TO email;
```

### Adding an Index (Large Tables)
```sql
-- Create index concurrently (no table lock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
    ON users(created_at DESC);

-- Verify index is ready
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE indexname = 'idx_users_created_at';
```

### Adding Foreign Key
```sql
-- Add FK with validation (can lock table)
ALTER TABLE user_preferences
ADD CONSTRAINT fk_user_preferences_user_id
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

-- For large tables: add NOT VALID first, then validate
ALTER TABLE user_preferences
ADD CONSTRAINT fk_user_preferences_user_id
FOREIGN KEY (user_id) REFERENCES users(id)
NOT VALID;

-- Validate in background (no lock)
ALTER TABLE user_preferences
VALIDATE CONSTRAINT fk_user_preferences_user_id;
```

---

## 🔍 Migration Best Practices

### DO
- ✅ Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- ✅ Add comments explaining purpose
- ✅ Test on development first
- ✅ Test on staging before production
- ✅ Create backup before production migration
- ✅ Include rollback script
- ✅ Monitor after deployment
- ✅ Update schema.sql to match
- ✅ Use transactions when possible

### DON'T
- ❌ Delete data without explicit approval
- ❌ Drop columns without backup
- ❌ Change column types without data migration plan
- ❌ Run untested migrations in production
- ❌ Skip backups
- ❌ Forget to update schema.sql
- ❌ Make breaking changes during business hours
- ❌ Use `CASCADE` without understanding impact

---

## 🚨 Emergency Rollback Procedure

**If Production Migration Fails:**

1. **Stop Application**
   ```bash
   pm2 stop trossapp-backend
   ```

2. **Restore Database**
   ```bash
   # Quick restore from backup
   psql -U trossapp_user -d trossapp_prod < backup_latest.sql
   ```

3. **Verify Database**
   ```bash
   # Check tables
   psql -U trossapp_user -d trossapp_prod -c "\dt"
   
   # Run health check queries
   psql -U trossapp_user -d trossapp_prod -c "SELECT COUNT(*) FROM users;"
   ```

4. **Restart Application**
   ```bash
   pm2 start trossapp-backend
   ```

5. **Monitor**
   ```bash
   pm2 logs trossapp-backend
   curl http://localhost:3001/api/health
   ```

6. **Investigate**
   - Review migration script
   - Check error logs
   - Fix issue
   - Test again on staging

---

## 📊 Migration Tracking

### Manual Tracking
Keep log in `migrations/CHANGELOG.md`:

```markdown
# Migration Changelog

## [004] Add User Preferences - 2025-11-10
- Added user_preferences table
- Added indexes for user_id
- Applied: Development ✅, Staging ✅, Production ✅
- Rollback available: Yes
- Issues: None

## [003] Add Audit Logs - 2025-11-05
- Created audit_logs table
- Added indexes for performance
- Applied: Development ✅, Staging ✅, Production ✅
```

### Future: Migration Tool
Consider adding migration tracking table:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version INTEGER UNIQUE NOT NULL,
    description TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    applied_by VARCHAR(100),
    success BOOLEAN DEFAULT true
);
```

---

## 🔗 Related Scripts

### `scripts/db-manage.sh`
Database management helper:
```bash
# Create database
npm run db:create

# Drop database
npm run db:drop

# Reset database (drop + create + schema)
npm run db:reset

# Run migrations
npm run db:migrate
```

### `scripts/apply-migration.sh`
Apply specific migration:
```bash
./scripts/apply-migration.sh 004_add_user_preferences.sql
```

---

## 📖 Related Documentation

- [schema.sql](/backend/schema.sql) - Current database schema
- [DATABASE_ARCHITECTURE.md](/docs/DATABASE_ARCHITECTURE.md) - Database design
- [DEPLOYMENT.md](/docs/DEPLOYMENT.md) - Production deployment
- [scripts/db-manage.sh](/backend/scripts/db-manage.sh) - Database tools

---

## 🎓 Further Reading

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL Concurrency](https://www.postgresql.org/docs/current/mvcc-intro.html)
- [Zero-Downtime Migrations](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)
