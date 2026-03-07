# ADR-009: Granular Permissions System (Deferred)

**Status:** Proposed (Not Implemented)  
**Date:** 2026-03-06  
**Deciders:** Architecture Team  
**Category:** Security / Authorization

---

## Context

TROSS uses a **role-based access control (RBAC)** system with 5 hierarchical roles:

```
admin (5) → manager (4) → dispatcher (3) → technician (2) → customer (1)
```

The current permission system is **code-derived** from entity metadata:
- `entityPermissions` defines CRUD access per entity
- `fieldAccess` defines field-level access per role
- `permissions-deriver.js` computes permissions at runtime
- No database storage of permissions

This approach works well for entity-level CRUD operations but has limitations for:
- **System actions**: `system:enter_maintenance`, `system:view_audit_logs`
- **Business operations**: `work_orders:assign_technician`, `invoices:approve`
- **Tool actions**: `export:bulk_csv`, `reports:generate_financial`
- **Custom roles**: Fine-grained capabilities beyond the 5-tier hierarchy

---

## Decision

**Defer implementation** of database-backed granular permissions until specific business requirements demand it.

### Rationale

1. **YAGNI**: No current feature requires named permissions beyond entity CRUD
2. **Current system works**: 5-role hierarchy covers all implemented features
3. **Low reversal cost**: Adding tables and M:M relationship is straightforward when needed
4. **Avoiding premature complexity**: Dual SSOT (metadata + database) introduces drift risk

### What We Removed

A stub relationship existed in `role-metadata.js`:
```javascript
permissions: {
  type: 'hasMany',           // INCORRECT - should be manyToMany
  foreignKey: 'role_id',
  table: 'role_permissions', // TABLE DID NOT EXIST
  through: 'permissions',    // TABLE DID NOT EXIST
  fields: ['id', 'permission_name', 'resource', 'action'],
}
```

This was removed because:
- Referenced non-existent tables
- Caused test failures
- Provided no functional value
- Mixed relationship type patterns incorrectly

---

## Future Implementation

When granular permissions become necessary, implement as follows:

### Database Schema

```sql
-- Named permissions (system, business, tool actions)
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,  -- 'work_orders:assign' or 'system:maintenance'
  resource VARCHAR(50) NOT NULL,       -- 'work_orders' or 'system'
  action VARCHAR(50) NOT NULL,         -- 'assign' or 'maintenance'
  description TEXT,
  category VARCHAR(25) DEFAULT 'entity' CHECK (category IN ('entity', 'system', 'tool', 'business')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for role → permission assignments
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES users(id),
  UNIQUE(role_id, permission_id)
);

-- Indexes for performance
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_category ON permissions(category);
```

### Metadata Update (role-metadata.js)

```javascript
relationships: {
  permissions: {
    type: 'manyToMany',
    foreignKey: 'role_id',
    table: 'permissions',
    through: 'role_permissions',
    targetKey: 'permission_id',
    fields: ['id', 'name', 'resource', 'action', 'category'],
    description: 'Named permissions assigned to this role',
  },
  users: {
    type: 'hasMany',
    foreignKey: 'role_id',
    table: 'users',
    fields: ['id', 'email', 'first_name', 'last_name'],
  },
},
```

### Seed Data (Initial Migration)

```sql
-- Derive initial permissions from current entity metadata
INSERT INTO permissions (name, resource, action, category) VALUES
-- Entity CRUD (generated from entityPermissions)
('customers:create', 'customers', 'create', 'entity'),
('customers:read', 'customers', 'read', 'entity'),
('customers:update', 'customers', 'update', 'entity'),
('customers:delete', 'customers', 'delete', 'entity'),
-- ... for all entities

-- System permissions
('system:maintenance', 'system', 'maintenance', 'system'),
('system:view_audit_logs', 'system', 'view_audit_logs', 'system'),
('system:manage_feature_flags', 'system', 'manage_feature_flags', 'system'),

-- Business operations
('work_orders:assign', 'work_orders', 'assign', 'business'),
('invoices:approve', 'invoices', 'approve', 'business'),
('invoices:reject', 'invoices', 'reject', 'business'),

-- Tool permissions  
('export:bulk_csv', 'export', 'bulk_csv', 'tool'),
('reports:financial', 'reports', 'financial', 'tool');

-- Assign permissions to roles based on current hierarchy
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE 
  -- Admin gets everything
  r.name = 'admin'
  OR 
  -- Manager+ gets system permissions
  (r.priority >= 4 AND p.category IN ('system', 'business'))
  OR
  -- Dispatcher+ gets business operations
  (r.priority >= 3 AND p.category = 'business')
  -- Entity CRUD follows existing entityPermissions logic
  -- ... more complex mapping
;
```

### Integration Points

1. **Middleware** (`auth.js`): Add `hasNamedPermission(role, permissionName)` check
2. **permissions-loader.js**: Query database instead of deriving from metadata
3. **Admin UI**: Role permission editor (assign/revoke permissions)
4. **API**: `GET /api/roles/:id?include=permissions` returns actual data
5. **Sync script**: Keep metadata-derived and DB permissions in sync (or choose one SSOT)
6. **Audit**: Track permission grant/revoke in audit_logs

---

## When to Implement

Implement this system when ANY of the following become true:

1. **Custom roles needed**: Requirements for roles beyond the 5-tier hierarchy
2. **Runtime editing**: Admin needs to modify role capabilities without deployment
3. **Audit compliance**: Regulations require database-resident permission records
4. **Complex operations**: Business actions beyond CRUD (approve, assign, escalate)
5. **Multi-tenant**: Different tenants need different permission configurations

---

## Alternatives Considered

### A. Feature Flags Pattern
Extend `system_settings.feature_flags` for capability toggles.
- **Pros**: Zero schema change
- **Cons**: Not role-aware, global only

### B. Code-Only Named Permissions
Add `namedPermissions` to metadata without database storage.
- **Pros**: Single SSOT in code
- **Cons**: No runtime editing, no GUI management

### C. Hybrid View
Create a database VIEW exposing derived permissions.
- **Pros**: Queryable, metadata remains SSOT
- **Cons**: Not editable, view must sync on metadata change

**Chosen**: Defer all options until requirements clarify.

---

## Consequences

### Positive
- No premature complexity
- Current system remains simple and fast
- Clear path forward when needed

### Negative
- No database-queryable permission assignments
- No GUI for permission management
- Custom roles not supported without code change

### Neutral
- This ADR serves as documentation for future implementation

---

## References

- [AUTH.md](../../reference/AUTH.md) - Current authorization system
- [SECURITY.md](../../reference/SECURITY.md) - Security architecture
- [permissions-deriver.js](../../../backend/config/permissions-deriver.js) - Current derivation
- [role-metadata.js](../../../backend/config/models/role-metadata.js) - Role entity definition
