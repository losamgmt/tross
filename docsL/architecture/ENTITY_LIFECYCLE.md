# Entity Lifecycle Management

## Overview

This document defines the pattern for implementing lifecycle states in TrossApp entities using the `status` field.

## Core Principle: Two-Tier System

TrossApp uses a **two-tier system** for entity state management:

### **TIER 1: Universal Soft Delete (`is_active`)**

**Purpose:** Record existence flag  
**Applies To:** ALL business entities  
**Values:** `true` (exists) / `false` (soft deleted)

```sql
is_active BOOLEAN DEFAULT true NOT NULL
```

### **TIER 2: Entity-Specific Lifecycle (`status`)**

**Purpose:** Workflow state tracking  
**Applies To:** Entities with multi-stage lifecycles  
**Values:** Entity-specific strings  

```sql
status VARCHAR(50) DEFAULT '<default_state>' 
    CHECK (status IN ('state1', 'state2', ...))
```

## The Distinction

| Scenario | `is_active` | `status` | Interpretation |
|----------|-------------|----------|----------------|
| Normal operation | `true` | `'active'` | Record exists and is operational |
| Pending state | `true` | `'pending_activation'` | Record exists but not yet ready |
| Temporary pause | `true` | `'suspended'` | Record exists but temporarily disabled |
| Soft deleted | `false` | (any) | Record removed, status frozen |
| Hard deleted | N/A | N/A | Record physically removed (rare) |

**Key Insight:** `is_active = false` ALWAYS means "deleted". The `status` field can never resurrect a deleted record.

## Implementation Pattern

### Step 1: Identify If Status Is Needed

**Use `status` field when:**
- ✅ Entity has multiple operational states
- ✅ Workflow or approval process exists
- ✅ Temporary states are meaningful
- ✅ State transitions need tracking

**Skip `status` field when:**
- ❌ Entity is simple (only active/inactive matters)
- ❌ No workflow exists
- ❌ `is_active` alone is sufficient

### Step 2: Define Status Values

Choose clear, business-meaningful names:

```javascript
// Good: Descriptive, business-aligned
'pending_activation', 'active', 'suspended'
'draft', 'submitted', 'approved', 'rejected'
'available', 'in_use', 'maintenance', 'retired'

// Bad: Technical jargon, unclear
'state1', 'state2', 'state3'
'flag_a', 'flag_b'
'enabled', 'disabled'  // Use is_active for this!
```

### Step 3: Create Migration

```sql
-- Migration: XXX_add_entity_status.sql

-- Add status column with sensible default
ALTER TABLE entity_name 
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add check constraint for data integrity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entity_name_status_check'
    ) THEN
        ALTER TABLE entity_name 
            ADD CONSTRAINT entity_name_status_check 
            CHECK (status IN ('state1', 'state2', 'state3'));
    END IF;
END $$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_entity_name_status 
    ON entity_name(status);

CREATE INDEX IF NOT EXISTS idx_entity_name_status_active 
    ON entity_name(status, is_active) 
    WHERE is_active = true;

-- Migrate existing data if needed
UPDATE entity_name 
    SET status = 'appropriate_state' 
    WHERE some_condition;
```

### Step 4: Update Model Validation

Add centralized validation in the model:

```javascript
// backend/db/models/Entity.js

static _validateEntityData(entity, context = {}) {
  const status = entity.status || 'active';
  
  // Business rules based on status
  if (status === 'pending' && !entity.required_field) {
    logger.warn('Pending entity missing required field', {
      entityId: entity.id,
      status
    });
  }
  
  // Dev mode handling if needed
  if (context.isDev && context.isApiResponse) {
    // Add synthetic data if appropriate
  }
  
  return entity;
}
```

### Step 5: Update Metadata Config

```javascript
// backend/config/models/entity-metadata.js

module.exports = {
  tableName: 'entity_name',
  
  filterableFields: [
    'id',
    'name',
    'is_active',
    'status',  // ← Add status
    'created_at',
    'updated_at',
  ],
  
  sortableFields: [
    'id',
    'name',
    'is_active',
    'status',  // ← Add status
    'created_at',
    'updated_at',
  ],
};
```

### Step 6: Update Tests

```javascript
// __tests__/unit/models/Entity.test.js

describe('Entity status field', () => {
  test('fromJson handles status field', () => {
    const json = {
      id: 1,
      name: 'Test',
      is_active: true,
      status: 'pending',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    };
    
    const entity = Entity.fromJson(json);
    expect(entity.status).toBe('pending');
  });
  
  test('defaults status to active when missing', () => {
    const json = {
      id: 1,
      name: 'Test',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      // No status field
    };
    
    const entity = Entity.fromJson(json);
    expect(entity.status).toBe('active');
  });
});
```

## Current Implementations

### Users (`pending_activation` → `active` → `suspended`)

**Status Values:**
- `pending_activation`: Admin created, awaiting first Auth0 login
- `active`: Fully operational
- `suspended`: Temporarily disabled (can be reactivated)

**Business Rules:**
- `auth0_id` can be null for `pending_activation` users
- `auth0_id` should exist for `active` users (logs warning if missing)
- Status transitions: `pending_activation` → `active` (on first login)

**Files:**
- Migration: `backend/migrations/007_add_user_status_field.sql`
- Model: `backend/db/models/User.js` (see `_validateUserData`)
- Docs: `docs/USER_STATUS_IMPLEMENTATION.md`

## Future Implementations

### Work Orders (Planned)

**Suggested Status Values:**
- `draft`: Created but not submitted
- `pending`: Awaiting assignment
- `assigned`: Technician assigned
- `in_progress`: Technician working on it
- `completed`: Work finished
- `cancelled`: Cancelled before completion

### Assets (Planned)

**Suggested Status Values:**
- `available`: Ready for use
- `in_use`: Currently deployed
- `maintenance`: Under repair
- `retired`: No longer in service

## Anti-Patterns to Avoid

### ❌ **Don't Duplicate `is_active` Logic**

```javascript
// BAD: Status duplicates is_active
status IN ('enabled', 'disabled')

// GOOD: Use is_active for existence, status for lifecycle
is_active: true/false
status: 'pending', 'active', 'suspended'
```

### ❌ **Don't Make Status Optional for Workflow Entities**

```sql
-- BAD: Status nullable makes queries complex
status VARCHAR(50) NULL

-- GOOD: Always have a default
status VARCHAR(50) DEFAULT 'active' NOT NULL
```

### ❌ **Don't Mix Status with is_active in Queries**

```javascript
// BAD: Confusing logic
WHERE (is_active = false OR status = 'deleted')

// GOOD: Clear separation
WHERE is_active = true AND status = 'active'
```

### ❌ **Don't Use Status for Non-Workflow Entities**

```javascript
// BAD: Roles don't need status
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50),
  status VARCHAR(50),  // ← Unnecessary!
  is_active BOOLEAN
);

// GOOD: Keep it simple
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50),
  is_active BOOLEAN  // Sufficient
);
```

## Query Patterns

### Get All Active Records in Specific Status

```sql
SELECT * FROM entity_name 
WHERE is_active = true 
  AND status = 'active';
```

### Get All Active Records (Any Status)

```sql
SELECT * FROM entity_name 
WHERE is_active = true;
```

### Get Records in Pending State

```sql
SELECT * FROM entity_name 
WHERE is_active = true 
  AND status = 'pending_activation';
```

### Status Distribution Report

```sql
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM entity_name
GROUP BY status
ORDER BY count DESC;
```

## Best Practices

1. **Default to Active:** New records should default to operational state
2. **Validate Transitions:** Not all status changes make sense (e.g., `completed` → `draft`)
3. **Log State Changes:** Use audit_logs for all status transitions
4. **Document Business Rules:** Each status should have clear meaning and usage
5. **Index Smart:** Composite index on `(status, is_active)` for common queries
6. **Keep It Simple:** Don't add status field unless genuinely needed

## References

- **Entity Contract v2.0:** See `DATABASE_ARCHITECTURE.md`
- **User Implementation:** See `USER_STATUS_IMPLEMENTATION.md`
- **Migration Pattern:** See `backend/migrations/007_add_user_status_field.sql`
- **Model Validation:** See `backend/db/models/User.js:_validateUserData()`

---

**Architecture Status:** 🔒 **LOCKED** - This pattern is production-ready and should be followed for all future entity lifecycle implementations.
