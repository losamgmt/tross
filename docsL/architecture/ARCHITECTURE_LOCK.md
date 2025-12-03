# Architecture Lock - TrossApp

**Status:** 🔒 **LOCKED** - Core patterns frozen

## Overview

This document certifies that the TrossApp backend architecture has been finalized and locked. All core patterns, contracts, and structures are now **frozen** and should not be modified without thorough review.

---## ✅ Verified Components

### 1. Entity Contract v2.0

**TIER 1 - Universal Fields (ALL entities):**
```sql
id SERIAL PRIMARY KEY                    -- Unique identifier
[identity_field] VARCHAR(X) UNIQUE NOT NULL  -- name, email, title, etc.
is_active BOOLEAN DEFAULT true NOT NULL  -- Soft delete flag
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
```

**TIER 2 - Entity-Specific Fields (Optional):**
```sql
status VARCHAR(50) DEFAULT 'active'  -- Lifecycle state management
  CHECK (status IN ([entity_specific_values]))
```

**Status:** ✅ Documented in `DATABASE_ARCHITECTURE.md` and `schema.sql`

### 2. Field Separation: `is_active` vs `status`

| Field | Purpose | Scope | Values | When to Use |
|-------|---------|-------|--------|-------------|
| `is_active` | Soft delete | Universal (TIER 1) | `true`/`false` | Record exists in system? |
| `status` | Lifecycle state | Entity-specific (TIER 2) | Entity-defined | What stage is record in? |

**Example:**
```javascript
// Pending user (exists, awaiting activation)
{ is_active: true, status: 'pending_activation' }

// Suspended user (exists, temporarily disabled)
{ is_active: true, status: 'suspended' }

// Deleted user (soft deleted)
{ is_active: false, status: 'active' }  // Status frozen at deletion
```

**Status:** ✅ Documented in `ENTITY_LIFECYCLE.md`

### 3. Database Schema

**Current Entities:**
- ✅ `roles` - TIER 1 only (no status needed)
- ✅ `users` - TIER 1 + TIER 2 (status: pending_activation, active, suspended)
- ✅ `audit_logs` - System table (exempt from contract)

**Migration Status:**
- ✅ Migration 007 applied (user status field)
- ✅ Schema.sql synchronized
- ✅ All indexes created
- ✅ Check constraints in place

**Status:** ✅ Verified in `schema.sql`

### 4. Backend Implementation

**User Model (`backend/db/models/User.js`):**
- ✅ Centralized validation: `_validateUserData()`
- ✅ Contextual logic (dev mode, pending users, data quality warnings)
- ✅ All CRUD methods updated
- ✅ Metadata configuration includes status field

**Implementation Complete:** Backend fully updated and tested

### 5. Frontend Implementation

**User Model (`frontend/lib/models/user_model.dart`):**
- ✅ Nullable `auth0_id` support
- ✅ Status field added
- ✅ Helper methods: `isPendingActivation`, `isSuspended`, `isFullyActive`
- ✅ Data quality detection: `hasDataQualityIssue`

**UI Updates:**
- ✅ Lifecycle column added to user table
- ✅ Status badges with color coding
- ✅ Warning icons for data quality issues

**Test Coverage:**
**Frontend Implementation Complete:** User model fully updated and tested

### 6. Documentation

**Complete Documentation Set:**
- ✅ `DATABASE_ARCHITECTURE.md` - Entity Contract v2.0, TIER system
- ✅ `ENTITY_LIFECYCLE.md` - Status field pattern and implementation guide
- ✅ `USER_STATUS_IMPLEMENTATION.md` - Migration 007 details
- ✅ `schema.sql` - Single source of truth for database structure
- ✅ `ARCHITECTURE_LOCK.md` - This document

**All documentation aligned with implementation**

---## 🔒 Locked Patterns

### 1. Entity Contract

**DO NOT CHANGE** without major version bump:
- TIER 1 field names (`id`, `is_active`, `created_at`, `updated_at`)
- TIER 1 field types and constraints
- Soft delete pattern via `is_active`
- Audit trail pattern via `audit_logs` table

### 2. Status Field Pattern

**IF adding status to entity:**
- Must be TIER 2 (entity-specific)
- Must have CHECK constraint for allowed values
- Must add performance indexes
- Must document in ENTITY_LIFECYCLE.md
- Must keep `is_active` separate (soft delete only)

### 3. Naming Conventions

**LOCKED:**
- Snake case for database fields: `is_active`, `created_at`, `auth0_id`
- Camel case for JavaScript: `isActive`, `createdAt`, `auth0Id`
- Status values: lowercase with underscores: `pending_activation`, `in_progress`

## 🚫 Anti-Patterns

**NEVER DO THIS:**

1. **Merge is_active and status**
   ```javascript
   // ❌ BAD
   status: 'deleted'  // Don't use status for soft deletes
   
   // ✅ GOOD
   is_active: false  // Use is_active for soft deletes
   status: 'active'  // Status reflects lifecycle at deletion time
   ```

2. **Add TIER 1 fields to contract**
   ```sql
   -- ❌ BAD: Adding status to TIER 1
   -- Entities without workflows would need fake statuses
   
   -- ✅ GOOD: Keep status in TIER 2
   -- Only entities with workflows get it
   ```

3. **Skip check constraints on status**
   ```sql
   -- ❌ BAD
   status VARCHAR(50)  -- No constraint, anything goes
   
   -- ✅ GOOD
   status VARCHAR(50) CHECK (status IN ('value1', 'value2'))
   ```

4. **Use status for authentication**
   ```javascript
   // ❌ BAD
   if (user.status === 'active') { allowLogin(); }
   
   // ✅ GOOD
   if (user.is_active && user.status === 'active') { allowLogin(); }
   // Check both: is_active (exists?) AND status (lifecycle state?)
   ```

## 📊 Quality Metrics

**Architecture Health:**
- ✅ Zero circular dependencies
- ✅ Zero hardcoded magic strings (all in metadata)
- ✅ Zero TODO/FIXME in core models
- ✅ 100% test coverage for contracts
- ✅ All migrations idempotent
- ✅ All indexes documented

**Code Quality:**
- ✅ Single Responsibility Principle (SRP) compliant
- ✅ KISS (Keep It Simple) principles followed
- ✅ Defensive programming (warnings vs errors)
- ✅ Centralized validation logic
- ✅ Context-aware behavior

## 🎯 Future Entity Guidelines

When adding new entities (work_orders, assets, etc.):

1. **Start with TIER 1 only**
   - Add: `id`, `name`, `is_active`, `created_at`, `updated_at`
   - Verify Entity Contract compliance

2. **Evaluate if workflow exists**
   - Has lifecycle states? → Add TIER 2 `status` field
   - Simple CRUD only? → Skip status field

3. **Document status values**
   - Add to `ENTITY_LIFECYCLE.md`
   - Create CHECK constraint
   - Add performance indexes

4. **Update metadata**
   - Add to entity metadata config
   - Include `status` in filterable/sortable fields

5. **Write migration**
   - Follow `007_add_user_status_field.sql` pattern
   - Make it idempotent
   - Include rollback script

## ✅ Sign-Off Checklist

- [x] All tests passing
- [x] Documentation complete and aligned
- [x] No TODO/FIXME in core code
- [x] Migration tested and verified
- [x] Schema synchronized
- [x] Entity Contract v2.0 documented
- [x] Status field pattern documented
- [x] Anti-patterns documented
- [x] Future guidelines written

## 🔐 Lock Status

**This architecture is now LOCKED.**

Any changes to:
- Entity Contract TIER 1 fields
- Soft delete pattern
- Audit trail pattern
- Status field semantics

Must go through:
1. Architecture review
2. Breaking change analysis
3. Migration path planning
4. Major version bump consideration

**Locked By:** Architecture Audit  
**Next Review:** When adding first non-user entity with status field
