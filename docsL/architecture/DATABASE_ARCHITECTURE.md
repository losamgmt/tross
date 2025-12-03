# Database Architecture & Schema Management

**Entity Contract v2.0 - Two-Tier System**

---## 🎯 Architectural Principles

### 1. **TIER 1: Universal Entity Contract Fields**

Every business entity in TrossApp MUST have these fields:

```sql
CREATE TABLE entity_name (
    -- TIER 1: Required by Entity Contract v2.0
    id SERIAL PRIMARY KEY,                          -- Unique identifier
    <identity_field> VARCHAR(X) UNIQUE NOT NULL,    -- name/email/title (human-readable)
    is_active BOOLEAN DEFAULT true NOT NULL,        -- Soft delete flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Entity-specific fields (TIER 2)
    -- ... varies by entity ...
);
```

**TIER 1 Fields (Universal):**

- ✅ **`id`**: Auto-incrementing primary key
- ✅ **`identity_field`**: Human-readable identifier (varies: `name` for roles, `email` for users, `title` for work_orders)
- ✅ **`is_active`**: Soft delete mechanism (false = record deleted from system)
- ✅ **`created_at`**: Performance cache for creation time (source of truth: audit_logs)
- ✅ **`updated_at`**: Auto-managed by trigger on every UPDATE

**Benefits:**

- ✅ Consistent soft delete pattern across ALL entities
- ✅ Predictable API responses
- ✅ Easy filtering: `WHERE is_active = true`
- ✅ Audit trail foundation

### 2. **TIER 2: Entity-Specific Lifecycle Fields (Optional)**

Some entities require workflow state management beyond soft deletes:

```sql
-- Example: Users need lifecycle states
status VARCHAR(50) DEFAULT 'active' 
    CHECK (status IN ('pending_activation', 'active', 'suspended'))
```

**Critical Distinction: `is_active` vs `status`**

| Field | Purpose | Scope | Values | Meaning |
|-------|---------|-------|--------|---------|
| **`is_active`** | Soft delete | ALL entities | `true`/`false` | "Does this record exist?" |
| **`status`** | Lifecycle state | Workflow entities only | Entity-specific strings | "What stage is this at?" |

**Example: User States**

```javascript
// Pending user (exists, not yet logged in)
{ is_active: true, status: 'pending_activation' }

// Active user (fully operational)
{ is_active: true, status: 'active' }

// Suspended user (temporarily disabled, can be reactivated)
{ is_active: true, status: 'suspended' }

// Deleted user (soft deleted, status frozen)
{ is_active: false, status: 'active' }  // Status preserved at deletion time
```

**When to Use Status Fields:**

- ✅ Entity has multiple operational states (users, work_orders, assets)
- ✅ Need to track lifecycle progression (draft → pending → approved)
- ✅ Temporary states exist (suspended, on_hold, in_review)

**When NOT to Use Status Fields:**

- ❌ Entity is simple (roles: just active/inactive)
- ❌ No workflow or lifecycle (permissions, settings)
- ❌ Soft delete is sufficient (use `is_active`)

**Implementation Pattern:**

```sql
-- 1. Add status column with sensible default
ALTER TABLE entity_name ADD COLUMN status VARCHAR(50) DEFAULT 'active';

-- 2. Add check constraint for allowed values
ALTER TABLE entity_name ADD CONSTRAINT entity_name_status_check 
    CHECK (status IN ('state1', 'state2', 'state3'));

-- 3. Add performance index
CREATE INDEX idx_entity_name_status ON entity_name(status);

-- 4. Add composite index for common query pattern
CREATE INDEX idx_entity_name_status_active 
    ON entity_name(status, is_active) WHERE is_active = true;
```

See `docs/USER_STATUS_IMPLEMENTATION.md` for detailed example.

### 3. **Single Source of Truth**

- **Master Schema:** `backend/schema.sql`
- **Applied To:** Both `trossapp_dev` (port 5433) and `trossapp_test` (port 5434)
- **Enforcement:** Automated via `backend/scripts/apply-schema.js`

### 3. **Migration Strategy**

- **Migrations:** `backend/migrations/*.sql`
- **Naming:** `001_description.sql`, `002_description.sql`, etc.
- **Idempotent:** Safe to run multiple times
- **Documented:** Each migration explains WHAT and WHY

## 📊 Current Schema

### **Roles Table**

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,        -- ✨ System-level field
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- ✨ System-level field
);
```

**Core Roles:**

1. `admin` - Full system access and user management
2. `manager` - Full data access, manages work orders and technicians
3. `dispatcher` - Medium access, assigns and schedules work orders
4. `technician` - Limited access, updates assigned work orders
5. `client` - Basic access, submits and tracks service requests

### **Users Table**

```sql
CREATE TABLE users (
    -- TIER 1: Entity Contract required fields
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,    -- Identity field (name equivalent)
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Entity-specific fields
    auth0_id VARCHAR(255) UNIQUE,          -- Auth0 SSO identifier (nullable for pending users)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active'    -- Lifecycle: pending_activation, active, suspended
        CHECK (status IN ('pending_activation', 'active', 'suspended'))
);

-- Indexes for performance
CREATE INDEX idx_users_auth0_id ON users(auth0_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_status_active ON users(status, is_active) WHERE is_active = true;
```

**User Status Lifecycle:**

- **`pending_activation`**: Admin created user, awaiting first Auth0 login (auth0_id can be null)
- **`active`**: Fully activated user with Auth0 account
- **`suspended`**: Temporarily disabled (can be reactivated without re-auth)

### **Audit Logs Table**

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    result VARCHAR(20),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Refresh Tokens Table**

```sql
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,        -- ✨ System-level field
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP
);
```

## 🔧 Database Management

### **Development Database**

- **Container:** `trossapp-postgres`
- **Port:** 5433
- **Database:** `trossapp_dev`
- **User:** `postgres` / `postgres`

### **Test Database**

- **Container:** `trossapp-postgres-test`
- **Port:** 5434
- **Database:** `trossapp_test`
- **User:** `test_user` / `test_password`

### **Commands**

#### Start Databases

```bash
npm run db:start          # Start dev database
npm run db:test:start     # Start test database
docker ps                 # Verify both running
```

#### Apply Schema (Both Databases)

```bash
node backend/scripts/apply-schema.js           # Apply to BOTH
node backend/scripts/apply-schema.js --dev-only   # Dev only
node backend/scripts/apply-schema.js --test-only  # Test only
```

#### Reset Databases (Clean Slate)

```bash
npm run db:reset          # Dev: Drop, recreate, apply schema
npm run db:test:reset     # Test: Drop, recreate, apply schema
```

#### Check Status

```bash
npm run db:status         # Check dev database health
docker ps                 # Check container health
```

## 🛡️ Schema Consistency Protection

### **1. Pre-Commit Hook (Future)**

```bash
# .git/hooks/pre-commit
# Verify schema.sql is syntactically valid
node backend/scripts/validate-schema.js
```

### **2. CI/CD Pipeline**

```yaml
# In .github/workflows/ci.yml
- name: Verify Schema Consistency
  run: |
    npm run db:test:start
    node backend/scripts/apply-schema.js --test-only
    npm run test:integration
```

### **3. Developer Workflow**

When adding a new table:

1. ✅ Update `backend/schema.sql` (single source of truth)
2. ✅ Add migration in `backend/migrations/` (for existing databases)
3. ✅ Run `node backend/scripts/apply-schema.js` (apply to both DBs)
4. ✅ Update backend models in `backend/db/models/`
5. ✅ Add tests for new entity

### **4. Automatic updated_at Triggers**

All tables with `updated_at` automatically maintain timestamps:

```sql
CREATE TRIGGER update_<table>_updated_at
    BEFORE UPDATE ON <table>
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 🎨 Best Practices

### **Soft Deletes (is_active)**

Instead of `DELETE FROM users WHERE id = 1`:

```sql
UPDATE users SET is_active = false WHERE id = 1;
```

**Benefits:**

- ✅ Data preservation for audit trails
- ✅ Easy restoration if needed
- ✅ Maintains referential integrity
- ✅ Prevents orphaned foreign keys

### **Querying Active Records**

Always filter by `is_active` in queries:

```sql
SELECT * FROM users WHERE is_active = true;
SELECT * FROM roles WHERE is_active = true;
```

**Index Support:**

```sql
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_roles_active ON roles(is_active);
```

### **Foreign Key Protection**

```sql
role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL
```

- If role is deleted, user's `role_id` becomes `NULL` (not orphaned)
- Application handles null role appropriately

## 📈 Future Enhancements

### **Phase 8: Production Hardening**

- [ ] Add `deleted_at` timestamp for soft delete auditing
- [ ] Implement database replication (read replicas)
- [ ] Add connection pooling with PgBouncer
- [ ] Set up automated backups with retention policy

### **Phase 9: Work Orders Module**

```sql
CREATE TABLE work_orders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,           -- Name equivalent
    -- ... entity-specific fields ...
    is_active BOOLEAN DEFAULT true,        -- System-level field
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚨 Emergency Procedures

### **Database Corrupted**

```bash
# 1. Stop containers
docker-compose down

# 2. Remove volumes (nuclear option)
docker volume prune -f

# 3. Restart with fresh schema
npm run db:start
npm run db:test:start
node backend/scripts/apply-schema.js

# 4. Verify
npm run db:status
```

### **Schema Drift Detected**

```bash
# Compare schemas between dev and test
docker exec trossapp-postgres pg_dump -U postgres -s trossapp_dev > dev_schema.sql
docker exec trossapp-postgres-test pg_dump -U test_user -s trossapp_test > test_schema.sql
diff dev_schema.sql test_schema.sql

# Fix: Reapply canonical schema
node backend/scripts/apply-schema.js
```

## 📚 Related Documentation

- [MVP Scope](../guides/MVP_SCOPE.md)
- [Development Workflow](../guides/DEVELOPMENT_WORKFLOW.md)
- [Testing Guide](../testing/TESTING_GUIDE.md)

---

**Maintained by:** TrossApp Development Team  
**Review Cycle:** Every major schema change  
**Contact:** See [CONTRIBUTORS.md](../CONTRIBUTORS.md)
