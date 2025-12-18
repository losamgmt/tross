# Rollback Procedures

Emergency procedures for reverting TrossApp deployments to previous stable versions.

---

## Quick Reference

**Backend (Railway) Rollback:** 2-3 minutes  
**Frontend (Vercel) Rollback:** 1-2 minutes  
**Database Schema Rollback:** Variable (see below)

---

## When to Rollback

### Immediate Rollback Required

- 🚨 Application crashes on startup
- 🚨 Database connection failures
- 🚨 Critical security vulnerability introduced
- 🚨 Data corruption detected
- 🚨 Authentication completely broken

### Consider Rollback

- ⚠️ Significant performance degradation (>50% slower)
- ⚠️ High error rate (>5% of requests failing)
- ⚠️ Major feature completely broken
- ⚠️ Rollback is faster than hotfix

### Forward Fix Instead

- ✅ Minor UI bugs
- ✅ Non-critical feature issues
- ✅ Easy to patch (< 15 minutes)
- ✅ Database schema changed (complex to revert)

---

## Backend Rollback (Railway)

### Method 1: Railway Dashboard (Fastest)

**Steps:**
1. Go to https://railway.app
2. Select TrossApp project
3. Click on backend service
4. Go to "Deployments" tab
5. Find last stable deployment (green checkmark)
6. Click three dots (...) → "Redeploy"
7. Confirm rollback

**Time:** ~2 minutes  
**Risk:** Low (Railway handles gracefully)

### Method 2: Git Revert + Push

**Steps:**
```bash
# 1. Find the bad commit
git log --oneline -10

# 2. Revert the bad commit (creates new commit)
git revert <bad-commit-hash>

# 3. Push to trigger auto-deploy
git push origin main
```

**Time:** ~3 minutes + build time (~2 min)  
**Risk:** Low (preserves history)

### Method 3: Git Reset (Use with Caution)

**Only if you just deployed and no one else has pulled:**

```bash
# 1. Reset to previous commit
git reset --hard HEAD~1

# 2. Force push (DANGEROUS - only on main if you own it)
git push -f origin main
```

**Time:** ~3 minutes + build time  
**Risk:** HIGH (rewrites history, breaks collaborators)

---

## Frontend Rollback (Vercel)

### Method 1: Vercel Dashboard (Recommended)

**Steps:**
1. Go to https://vercel.com/dashboard
2. Select TrossApp project
3. Click "Deployments" tab
4. Find last stable deployment (green Production badge)
5. Click three dots (...) → "Promote to Production"
6. Confirm

**Time:** ~1 minute (instant switchover)  
**Risk:** Very low (atomic swap)

### Method 2: Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# List recent deployments
vercel ls

# Promote a specific deployment
vercel promote <deployment-url>
```

**Time:** ~2 minutes  
**Risk:** Low

---

## Database Schema Rollback

### ⚠️ WARNING: Database Rollbacks are Complex

**Why it's hard:**
- Data may have been created with new schema
- Dropping columns loses data
- Constraint changes may break existing data

### Safe Rollback Strategy

**Option 1: Forward Migration (Preferred)**

Instead of reverting, add a new migration to fix:

```sql
-- Example: If you added a column that's causing issues
-- DON'T drop it (data loss), make it nullable instead

ALTER TABLE users ALTER COLUMN new_column DROP NOT NULL;
```

**Option 2: Full Rollback (Data Loss Risk)**

**Only if:**
- No production data affected yet
- Migration just ran (< 1 hour)
- You have a backup

**Steps:**
```bash
# 1. Create backup FIRST
railway run bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
exit

# 2. Identify the migration to revert
ls backend/migrations/
# Example: 005_add_user_status.sql is bad

# 3. Write reverse migration
# Create: backend/migrations/006_revert_user_status.sql
# DROP TABLE, DROP COLUMN, etc.

# 4. Apply reverse migration
railway run bash
psql $DATABASE_URL -f backend/migrations/006_revert_user_status.sql
exit
```

**Time:** 10-30 minutes  
**Risk:** HIGH (potential data loss)

### Best Practice: Backward-Compatible Migrations

**Always make migrations reversible:**

```sql
-- ❌ Bad: Immediate breaking change
ALTER TABLE users DROP COLUMN old_field;

-- ✅ Good: Gradual deprecation
-- Step 1: Make nullable
ALTER TABLE users ALTER COLUMN old_field DROP NOT NULL;
-- Step 2: Update code to not use it
-- Step 3: Drop after confirmed unused (weeks later)
```

---

## Full System Rollback

### When both backend AND frontend need rollback

**Steps:**
1. **Rollback backend first** (Railway dashboard)
2. **Wait for backend to be healthy** (check `/api/health`)
3. **Rollback frontend** (Vercel dashboard)
4. **Verify integration** (test frontend → backend API calls)

**Time:** 5-10 minutes  
**Reason for order:** Frontend can handle backend temporarily down, but not vice versa

---

## Rollback Verification Checklist

After any rollback:

- [ ] Health endpoint returns 200 OK
- [ ] Login/authentication works
- [ ] Core CRUD operations work (users, roles, etc.)
- [ ] Database connections stable
- [ ] No errors in logs (Railway/Vercel)
- [ ] Frontend loads and communicates with backend
- [ ] Monitor for 15 minutes to ensure stability

---

## Communication Template

**Post-rollback notification to team:**

```
🔄 ROLLBACK COMPLETED

What: [Backend/Frontend/Both] rolled back to [version/commit]
When: [Timestamp]
Why: [Brief description of issue]
Duration: Production was affected for [X minutes]

Current Status: ✅ Stable
Action Items:
- [ ] Root cause analysis
- [ ] Write hotfix
- [ ] Add tests to prevent recurrence

Next Steps: [Plan for fix and redeployment]
```

---

## Prevention Strategies

### Pre-Deployment Checklist

- [ ] All tests passing (1,736+ backend tests)
- [ ] Manual smoke test on staging/preview
- [ ] Database migrations tested locally
- [ ] Environment variables verified
- [ ] Rollback plan documented (for complex changes)

### Deployment Best Practices

1. **Deploy during low-traffic hours** (if possible)
2. **Monitor for 15 minutes post-deploy**
3. **Keep previous deployment tab open** (for quick rollback)
4. **Announce deployments in team chat**
5. **One change at a time** (easier to identify issues)

### Railway-Specific Tips

- Railway keeps 10 recent deployments (you have options)
- Each deployment has unique URL (can test before promoting)
- Health checks auto-rollback if critical failure

### Vercel-Specific Tips

- Every PR gets preview deployment (test before merge)
- Vercel keeps all deployments forever (unlimited rollback history)
- Can alias production to any deployment instantly

---

## Disaster Recovery

### Complete System Failure

**If everything is down:**

1. **Check platform status:**
   - Railway: https://railway.app/status
   - Vercel: https://vercel.com/status

2. **Check your DNS:**
   ```bash
   nslookup trossapp.vercel.app
   dig trossapp-production.up.railway.app
   ```

3. **Emergency contact:**
   - Railway support: support@railway.app
   - Vercel support: Vercel dashboard → Help

4. **Fallback plan:**
   - Deploy to alternative platform using Dockerfiles
   - Activate maintenance page
   - Restore from database backup

### Database Disaster Recovery

**If database is corrupted/lost:**

1. **Stop all services** (prevent more damage)
2. **Contact Railway support** (they have automatic backups)
3. **Restore from Railway backup:**
   - Railway dashboard → PostgreSQL → Backups
   - Select restore point
   - Restore to new database
   - Update DATABASE_URL env var

**Time to recover:** 30-60 minutes

---

## Testing Rollback Procedures

**Practice rollbacks quarterly:**

1. Create a test deployment with intentional bug
2. Deploy to staging/preview
3. Perform rollback using dashboard method
4. Time the process
5. Document any issues
6. Update this guide

---

## Rollback Decision Matrix

| Issue Severity | User Impact | Database Changed | Action |
|---------------|-------------|------------------|--------|
| Critical | All users | No | Immediate rollback |
| Critical | All users | Yes | Forward fix (usually) |
| Major | >50% users | No | Rollback if fix >30 min |
| Major | >50% users | Yes | Forward fix |
| Minor | <10% users | Any | Forward fix |
| Cosmetic | Any | Any | Forward fix |

---

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures
- [HEALTH_MONITORING.md](HEALTH_MONITORING.md) - Monitoring setup
- [CI_CD_GUIDE.md](CI_CD_GUIDE.md) - CI/CD pipeline
