# 🔒 Security & Architecture Audit Report

**CRITICAL FINDING:** Triple-tier security is INCOMPLETE. Frontend lacks permission checks.

### Security Tier Coverage

| Tier | Status | Coverage |
|------|--------|----------|
| **Backend API** | ✅ EXCELLENT | 100% - All endpoints protected |
| **Middleware** | ✅ EXCELLENT | Role-based + permission-based auth |
| **Frontend** | ❌ MISSING | Zero permission checks, no active user validation |

---

## 🎯 Security Architecture (Current State)

### Tier 1: Backend API Routes ✅ COMPLETE

**All CRUD operations properly protected:**

```javascript
// Users - Admin Only
GET    /api/users         → authenticateToken + requirePermission('users', 'read')
GET    /api/users/:id     → authenticateToken + requirePermission('users', 'read')
POST   /api/users         → authenticateToken + requirePermission('users', 'create')
PUT    /api/users/:id     → authenticateToken + requirePermission('users', 'update')
PUT    /api/users/:id/role → authenticateToken + requirePermission('users', 'update')
DELETE /api/users/:id     → authenticateToken + requirePermission('users', 'delete')

// Roles - Admin Create/Update/Delete, Manager+ Read
GET    /api/roles         → authenticateToken + requirePermission('roles', 'read')
GET    /api/roles/:id     → authenticateToken + requirePermission('roles', 'read')
POST   /api/roles         → authenticateToken + requirePermission('roles', 'create')
PUT    /api/roles/:id     → authenticateToken + requirePermission('roles', 'update')
DELETE /api/roles/:id     → authenticateToken + requirePermission('roles', 'delete')

// Health - Public + Admin-only detailed view
GET    /api/health        → Public (no auth)
GET    /api/health/databases → authenticateToken + requireMinimumRole('admin')
```

**Security Features Implemented:**
- ✅ JWT token validation (Auth0 + Dev tokens)
- ✅ Token expiry checks
- ✅ Provider validation (dev tokens ONLY in dev mode)
- ✅ **ACTIVE USER CHECK** - Deactivated users rejected at auth middleware
- ✅ Role-based access control (RBAC)
- ✅ Permission matrix enforcement
- ✅ Security event logging
- ✅ IP tracking for audit trails
- ✅ Rate limiting (implemented in middleware)

### Tier 2: Middleware Layer ✅ COMPLETE

**Permission Matrix (`backend/config/permissions.js`):**

```javascript
PERMISSIONS = {
  users: {
    create: ROLE_HIERARCHY.admin,      // Priority 5
    read: ROLE_HIERARCHY.technician,   // Priority 2
    update: ROLE_HIERARCHY.admin,      // Priority 5
    delete: ROLE_HIERARCHY.admin,      // Priority 5
  },
  roles: {
    create: ROLE_HIERARCHY.admin,      // Priority 5
    read: ROLE_HIERARCHY.manager,      // Priority 4
    update: ROLE_HIERARCHY.admin,      // Priority 5
    delete: ROLE_HIERARCHY.admin,      // Priority 5
  },
}
```

**Authentication Flow:**

1. `authenticateToken()` - Validates JWT, loads `req.dbUser`
2. **CRITICAL CHECK:** `if (req.dbUser.is_active === false)` → 403 Forbidden
3. `requirePermission(resource, operation)` - Checks role hierarchy
4. `hasPermission(userRole, resource, operation)` - Matrix lookup

**Logging:**
- ✅ AUTH_MISSING_TOKEN
- ✅ AUTH_INVALID_TOKEN
- ✅ AUTH_DEACTIVATED_USER 🔒
- ✅ AUTH_DEV_TOKEN_IN_PRODUCTION (CRITICAL severity)
- ✅ AUTH_INSUFFICIENT_PERMISSION
- ✅ AUTH_INSUFFICIENT_ROLE

### Tier 3: Frontend ❌ CRITICAL GAPS

**Current Issues:**

1. **NO PERMISSION CHECKS** - UI shows all buttons regardless of user role
2. **NO ACTIVE STATUS VALIDATION** - Deactivated users could see UI (backend stops them, but UX is poor)
3. **NO CLIENT-SIDE ROLE ENFORCEMENT** - Clients see admin buttons (backend rejects, but confusing)
4. **NO LOADING STATES** during operations (security operations feel unresponsive)
5. **NO PERMISSION-AWARE COMPONENTS** - Every screen reimplements same checks

**Example - Admin Dashboard:**
```dart
// ❌ BAD: Always shows delete button (backend will reject, but UX is confusing)
actionsBuilder: (user) => [
  IconButton(icon: Icon(Icons.delete_outline), onPressed: () => delete(user)),
]

// ✅ GOOD: Should be
actionsBuilder: (user) => [
  if (authProvider.hasPermission('users', 'delete'))
    IconButton(icon: Icon(Icons.delete_outline), onPressed: () => delete(user)),
]
```

---

## 🚨 Security Vulnerabilities & Remediation

### HIGH PRIORITY

#### 1. Missing Frontend Permission System ⚠️ CRITICAL

**Risk:** Users see actions they can't perform (poor UX, potential confusion)

**Impact:** Medium (backend protects, but UX suffers)

**Remediation:**
- Create `PermissionService.dart` with `hasPermission(resource, operation)` method
- Mirror backend permission matrix in frontend
- Add to `AuthProvider` for reactive permission checks
- Wrap all admin actions in permission checks

#### 2. No Active User Frontend Validation ⚠️ MEDIUM

**Risk:** Deactivated users see UI briefly before backend rejects them

**Impact:** Low (backend prevents action, but creates confusion)

**Remediation:**
- Add `isActive` check to `AuthProvider.isAuthenticated`
- Auto-logout deactivated users on profile refresh
- Show "Account Deactivated" message instead of 403 errors

#### 3. No Row-Level Security Infrastructure 📋 FUTURE

**Risk:** No framework for "only see your own data" patterns

**Impact:** Future feature blocker

**Remediation:**
- Design `PermissionContext` pattern (user_id, tenant_id, etc.)
- Add to permission checks: `hasPermission(resource, operation, context)`
- Backend already has `req.dbUser.id` - ready for row-level checks

---

## ✅ What's Working Well

### Backend Security Excellence

1. **Consistent middleware application** - Every protected route uses auth + permissions
2. **Comprehensive logging** - All security events tracked
3. **Defense in depth** - Multiple validation layers
4. **Clear separation** - Auth (who?) vs Authorization (what?)
5. **Environment-aware** - Dev tokens only in dev mode
6. **Active user enforcement** - Deactivated users cannot authenticate

### Permission Matrix Design

1. **Simple hierarchy** - admin(5) > manager(4) > dispatcher(3) > technician(2) > client(1)
2. **Inheritance** - Higher roles get lower role permissions automatically
3. **Declarative** - Easy to audit and modify
4. **Centralized** - Single source of truth
5. **Testable** - Pure functions, easy to validate

---

## 🎯 Required Actions (Priority Order)

### Phase 1: Frontend Permission Infrastructure (THIS PR)

- [ ] Create `PermissionService.dart` with permission matrix
- [ ] Add `hasPermission()` to `AuthProvider`
- [ ] Create `PermissionGuard` widget for declarative UI protection
- [ ] Add `requiresPermission` to all CRUD action buttons
- [ ] Add `isActive` frontend validation

### Phase 2: Generic CRUD Components (THIS PR)

- [ ] Extract CRUD dialogs into reusable organisms
- [ ] Create `CrudActionButton` with built-in permission checks
- [ ] Create `CrudDataTable<T>` with automatic security
- [ ] Create `SecureFormModal<T>` with permission validation
- [ ] Add loading states and optimistic UI updates

### Phase 3: Testing & Validation (THIS PR)

- [ ] Unit tests for `PermissionService`
- [ ] Widget tests for `PermissionGuard`
- [ ] Integration tests for CRUD workflows
- [ ] Security tests for permission denial scenarios

### Phase 4: Documentation (THIS PR)

- [ ] Update API docs with permission requirements
- [ ] Create frontend security guide
- [ ] Document permission matrix expansion process

---

## 📊 Permission Matrix Coverage

### Current Resources

| Resource | Create | Read | Update | Delete | Notes |
|----------|--------|------|--------|--------|-------|
| users | admin | tech+ | admin | admin | Complete |
| roles | admin | mgr+ | admin | admin | Complete |
| work_orders | N/A | N/A | N/A | N/A | Placeholder only |
| audit_logs | auto | admin | admin | admin | Backend only |

### Future Resources (Design Now)

| Resource | Create | Read | Update | Delete | Row-Level? |
|----------|--------|------|--------|--------|------------|
| projects | mgr+ | client+ | mgr+ | admin | ✅ Owner/Assigned |
| tasks | tech+ | client+ | tech+ | mgr+ | ✅ Assigned |
| invoices | mgr+ | client+ | mgr+ | admin | ✅ Client-specific |
| documents | tech+ | related | owner | owner | ✅ Strict ownership |

---

## 🔐 Row-Level Security (RLS) Design

### Pattern (Not Yet Implemented)

```javascript
// Backend
if (!hasPermission(userRole, 'projects', 'read')) return 403;

// Row-level check
const project = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
if (!canAccessProject(req.dbUser, project)) return 404; // Hide existence

function canAccessProject(user, project) {
  if (user.role === 'admin') return true;
  if (project.owner_id === user.id) return true;
  if (project.assigned_users.includes(user.id)) return true;
  return false;
}
```

### Frontend Pattern

```dart
// Check both permission AND ownership
if (authProvider.hasPermission('projects', 'delete') && 
    project.ownerId == authProvider.userId) {
  // Show delete button
}
```

---

## 📈 Security Maturity Score

| Category | Score | Grade |
|----------|-------|-------|
| Authentication | 95/100 | A+ |
| Authorization (Backend) | 100/100 | A+ |
| Authorization (Frontend) | 40/100 | F |
| Audit Logging | 90/100 | A |
| Input Validation | 85/100 | B+ |
| Error Handling | 80/100 | B |
| **Overall** | **82/100** | **B** |

**Target:** 95+ (A+) - Achievable with frontend permission system

---

## 🎓 Security Best Practices (Applied)

### ✅ Currently Following

1. **Principle of Least Privilege** - Default deny, explicit grants
2. **Defense in Depth** - Multiple validation layers
3. **Fail Secure** - Unknown roles/resources → deny
4. **Complete Mediation** - Every request checked
5. **Open Design** - Security through architecture, not obscurity
6. **Separation of Privilege** - Auth separate from authz
7. **Least Common Mechanism** - Centralized auth middleware

### ⚠️ Needs Improvement

1. **Psychological Acceptability** - Frontend should hide unavailable actions
2. **Economy of Mechanism** - CRUD code is duplicated, not centralized

---

## 🔧 Implementation Recommendations

### 1. Permission Service (SRP-compliant)

```dart
class PermissionService {
  static const _matrix = { /* mirror backend */ };
  
  static bool hasPermission(String role, String resource, String operation) {
    // Pure function, easily testable
  }
  
  static bool canAccessResource(User user, Resource resource) {
    // Row-level security helper
  }
}
```

### 2. Atomic Security Components

```dart
class PermissionGuard extends StatelessWidget {
  final String resource;
  final String operation;
  final Widget child;
  final Widget? fallback;
  
  // Declaratively hide/show based on permissions
}

class SecureCrudButton extends StatelessWidget {
  final String resource;
  final CrudOperation operation; // create|read|update|delete
  final VoidCallback onPressed;
  
  // Self-contained permission check + loading state + error handling
}
```

### 3. Generic CRUD Infrastructure

```dart
abstract class CrudService<T> {
  String get resourceName;
  Future<List<T>> getAll();
  Future<T> getById(int id);
  Future<T> create(Map<String, dynamic> data);
  Future<T> update(int id, Map<String, dynamic> data);
  Future<bool> delete(int id);
}

class UserCrudService extends CrudService<User> {
  String get resourceName => 'users';
  // Implementations use ApiClient which adds auth automatically
}
```

---

## 📝 Conclusion

**Current State:** Backend security is EXCELLENT. Frontend security is MISSING.

**Risk Level:** MEDIUM - Backend prevents actual security breaches, but UX is poor and code is not maintainable.

**Recommendation:** Implement frontend permission system IMMEDIATELY as part of CRUD refactor.

**Timeline:** 
- Phase 1 (Permission Infrastructure): 2-4 hours
- Phase 2 (Generic CRUD): 4-6 hours  
- Phase 3 (Testing): 2-3 hours
- **Total:** 8-13 hours to complete triple-tier security

**ROI:** High - Enables rapid feature development with built-in security, eliminates permission check duplication, improves UX significantly.

---

**Next Steps:** See implementation plan in `CRUD_REFACTOR_PLAN.md`
