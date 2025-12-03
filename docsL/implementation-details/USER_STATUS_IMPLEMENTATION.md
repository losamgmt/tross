# User Status Field Implementation

**Migration:** 007_add_user_status_field.sql

## Overview

Implemented user lifecycle management via TIER 2 entity-specific `status` field to support legitimate null `auth0_id` cases (pending activation, dev users) while maintaining data integrity.

## Problem Statement

**Critical Bug Found During Manual Testing:**
- Frontend crashed when parsing users with `null auth0_id`
- Root cause: Test data pollution + missing validation layer
- Need: Support admin-created users awaiting first login (pending activation)

**User Requirements:**
1. Admins can create users directly in-app
2. Created users get `auth0_id` only after first Auth0 login
3. No special cases - centralized, generic, SRP-compliant solution
4. Support dev mode users with synthetic IDs

## Architecture Decision

### TIER 2: Entity-Specific Lifecycle Field

Following Entity Contract v2.0 TWO-TIER SYSTEM, `status` is **TIER 2** (entity-specific):

**TIER 1 (Universal):** `is_active` - Soft delete for ALL entities ("Does record exist?")  
**TIER 2 (Optional):** `status` - Lifecycle state for workflow entities ("What stage?")

**User Status Values:**
- `pending_activation`: Admin created, awaiting first Auth0 login
- `active`: Fully operational with Auth0 account
- `suspended`: Temporarily disabled

**Why not TIER 1?**
- Different entities have different lifecycle states
- Avoids premature generalization (KISS)
- Maintains Single Responsibility Principle
- Each entity owns its lifecycle logic
- More flexible for future entities

**NOT REDUNDANT:** `is_active` and `status` serve different purposes:
- `{ is_active: true, status: 'pending_activation' }` - Exists, awaiting activation
- `{ is_active: true, status: 'active' }` - Exists, fully operational
- `{ is_active: false, status: 'active' }` - Soft deleted (status frozen)

## Database Changes

### Migration 007

```sql
-- Add status column
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add check constraint
ALTER TABLE users ADD CONSTRAINT users_status_check 
  CHECK (status IN ('pending_activation', 'active', 'suspended'));

-- Performance indexes
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_status_active ON users(status, is_active) 
  WHERE is_active = true;

-- Migrate existing data
UPDATE users SET status = 'pending_activation' WHERE auth0_id IS NULL;
```

### Status Values

| Status | Auth0 ID | Use Case |
|--------|----------|----------|
| `pending_activation` | Can be NULL | Admin created user awaiting first login |
| `active` | Should exist | Fully activated user (logs warning if null) |
| `suspended` | Can be NULL | Temporarily disabled account |

## Backend Implementation

### 1. User Model Validation

**New Private Method:** `User._validateUserData(user, context)`

**Contextual Validation Logic:**
```javascript
// Dev mode + API response → synthetic auth0_id
if (isDev && context.isApiResponse && !user.auth0_id) {
  return { ...user, auth0_id: `dev-user-${user.id}`, _synthetic: true };
}

// Pending activation → null auth0_id is valid
if (status === 'pending_activation' && !user.auth0_id) {
  return user; // Valid state
}

// Active without auth0_id → log warning (defensive, don't throw)
if (status === 'active' && !user.auth0_id) {
  logger.warn('Data integrity issue: Active user missing auth0_id', {...});
}
```

**Key Principles:**
- **Centralized:** All validation in one place
- **Contextual:** Behavior adapts to dev mode, status, API vs internal
- **Defensive:** Logs warnings instead of throwing for data quality issues
- **Extensible:** Easy to add new status values or validation rules

### 2. Updated CRUD Methods

**findById() / findByAuth0Id():**
```javascript
const user = result.rows[0] || null;
return user ? this._validateUserData(user, { isApiResponse: false }) : null;
```

**findAll():**
```javascript
const validatedUsers = result.rows.map(user => 
  this._validateUserData(user, { isApiResponse: true })
);
```

**create():**
```javascript
// Determine initial status
const status = auth0_id ? 'active' : 'pending_activation';

// Insert with status
INSERT INTO users (email, first_name, last_name, role_id, auth0_id, status)
VALUES ($1, $2, $3, $4, $5, $6)
```

### 3. Metadata Configuration

**user-metadata.js:**
```javascript
filterableFields: [
  'id', 'email', 'auth0_id', 'first_name', 'last_name', 
  'role_id', 'is_active', 'status', 'created_at', 'updated_at'
],

sortableFields: [
  'id', 'email', 'first_name', 'last_name', 
  'role_id', 'is_active', 'status', 'created_at', 'updated_at'
],
```

Now admins can filter/sort by status via API: `/api/users?filters[status]=pending_activation`

## Testing

### Test Updates

Updated 3 unit tests in `User.crud.test.js` to expect new parameters:
```javascript
// Old
["email@example.com", "First", "Last", 2]

// New
// New
["email@example.com", "First", "Last", 2, null, "pending_activation"]
```

### Test Verification
✅ **All backend tests passing**

### Database Verification
```
Column: status | character varying(50) | default 'active'
Check: users_status_check (status IN ('pending_activation', 'active', 'suspended'))
Indexes: idx_users_status, idx_users_status_active
```


## Frontend Changes Required

### 1. User Model Updates
```dart
class User {
  final int id;
  final String email;
  final String? auth0_id;  // Make nullable
  final String status;      // Add status field
  final String? first_name;
  final String? last_name;
  
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      auth0_id: json['auth0_id'],  // Allow null
      status: json['status'] ?? 'active',
      // ...
    );
  }
}
```

### 2. Error Boundaries
Add try-catch blocks around user parsing:
```dart
try {
  final user = User.fromJson(data);
} catch (e) {
  ErrorService.logDataQualityIssue(
    'Failed to parse user data',
    details: {'error': e.toString(), 'data': data}
  );
  // Show fallback UI or skip this user
}
```

### 3. Admin UI Enhancements
- Show status badges in user tables
- Add status filter dropdown
- Highlight pending activation users
- Display warning for active users without auth0_id

### 4. Dev Mode Support
Handle synthetic IDs gracefully:
```dart
if (user.auth0_id?.startsWith('dev-user-') ?? false) {
  // Dev mode user - show indicator
}
```

## API Examples

### Create User (Admin)
```bash
POST /api/users
{
  "email": "newuser@example.com",
  "first_name": "New",
  "last_name": "User",
  "role_id": 2
}

# Response: { ..., "auth0_id": null, "status": "pending_activation" }
```

### Create User (Auth0 SSO)
```bash
POST /api/users
{
  "email": "ssouser@example.com",
  "auth0_id": "auth0|123456",
  "first_name": "SSO",
  "last_name": "User"
}

# Response: { ..., "auth0_id": "auth0|123456", "status": "active" }
```

### Filter Pending Users
```bash
GET /api/users?filters[status]=pending_activation
```

### Dev Mode Response
```bash
GET /api/users/1
# Dev environment response:
{
  "id": 1,
  "email": "dev@example.com",
  "auth0_id": "dev-user-1",  # Synthetic
  "_synthetic": true,
  "status": "active"
}
```

## Design Principles Applied

✅ **Single Responsibility Principle**
- Validation centralized in `_validateUserData()`
- Each method has one reason to change

✅ **KISS (Keep It Simple)**
- No over-engineered state machines
- Simple string field with check constraint
- Direct SQL - no ORMs

✅ **Context-Insensitive**
- Validation adapts to context (dev mode, status, API vs internal)
- No hardcoded special cases scattered throughout

✅ **Flexibility & Extensibility**
- Easy to add new status values
- Generic approach works for other entities
- No breaking changes to existing API

✅ **Defensive Programming**
- Logs warnings instead of crashing
- Graceful degradation for data quality issues
- Dev mode synthetic IDs for testing

## Rollback Plan

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_users_status_active;
DROP INDEX IF EXISTS idx_users_status;

-- Remove constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;

-- Remove column
ALTER TABLE users DROP COLUMN IF EXISTS status;
```

## Next Steps

### Immediate (Frontend)
1. Update Flutter User model (nullable auth0_id, add status)
2. Add error boundaries for parse failures
3. Implement status badges in admin UI
4. Add data quality logging

### Future Enhancements
1. Status transition validation (e.g., can't go from suspended → pending)
2. Audit logging for status changes
3. Email notifications on status transitions
4. Extend pattern to work_orders, assets
5. Admin dashboard widget: "Users Pending Activation"

## References

- **Entity Contract v2.0:** TIER 1 vs entity-specific fields
- **Migration:** `backend/migrations/007_add_user_status_field.sql`
- **Schema:** `backend/schema.sql` (lines 70-90, 155-175)
- **Model:** `backend/db/models/User.js`
- **Metadata:** `backend/config/models/user-metadata.js`

**Implementation Status:**
- ✅ Database migration applied
- ✅ Backend validation implemented
- ✅ Comprehensive test suite
- ✅ Metadata updated
- ⏳ Frontend updates pending
- ⏳ Manual testing pending
