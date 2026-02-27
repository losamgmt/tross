# ADR 008: Row-Level Security Field-Based Filtering

**Status:** Accepted  
**Date:** February 26, 2026

---

## Context

Row-Level Security (RLS) filtering was implemented with multiple policy handlers, each encoded with entity-specific logic:

```javascript
// OLD: Duplicated handlers with hardcoded field names
own_work_orders_only: (userId, metadata, offset) => 
  { where: `work_orders.customer_id = $${offset}`, params: [userId] }

own_invoices_only: (userId, metadata, offset) =>
  { where: `invoices.customer_id = $${offset}`, params: [userId] }

assigned_work_orders_only: (userId, metadata, offset) =>
  { where: `work_orders.assigned_technician_id = $${offset}`, params: [userId] }
```

This violated DRY (identical logic duplicated), encoded behavior in names (policy names ARE field names), and required new code for each entity/field combination.

**Additional complexity:** Some entities filter by foreign keys that reference profile tables, not users directly:
- `work_orders.customer_id` → `customers.id` (via `users.customer_profile_id`)
- `work_orders.assigned_technician_id` → `technicians.id` (via `users.technician_profile_id`)

---

## Decision

**The RLS policy value IS the filter configuration. No code — only data.**

### Value Semantics

| `rowLevelSecurity[role]` | Meaning |
|--------------------------|---------|
| `null` | No filter (all records visible) |
| `false` | Deny all access |
| `"$parent"` | Sub-entity: access controlled by parent entity |
| `"field_name"` | Shorthand: `{ field: "field_name", value: "userId" }` |
| `{ field, value }` | Filter: `WHERE table.field = $rlsContext[value]` |

### Context Values Available

The RLS middleware provides these values in `rlsContext`:

| Value Key | Source | Description |
|-----------|--------|-------------|
| `userId` | `users.id` | Current user's ID |
| `customerProfileId` | `users.customer_profile_id` | User's customer profile ID (if role=customer) |
| `technicianProfileId` | `users.technician_profile_id` | User's technician profile ID (if role=technician) |

### Example Metadata

```javascript
// work-order-metadata.js - uses profile IDs for FK relationships
rlsPolicy: {
  customer: { field: 'customer_id', value: 'customerProfileId' },
  technician: { field: 'assigned_technician_id', value: 'technicianProfileId' },
  dispatcher: null,
  manager: null,
  admin: null,
}

// notification-metadata.js - uses userId directly (simple case)
rlsPolicy: {
  customer: 'user_id',    // Shorthand for { field: 'user_id', value: 'userId' }
  technician: 'user_id',
  dispatcher: 'user_id',
  manager: 'user_id',
  admin: 'user_id',
}

// admin-panel (synthetic resource)
rlsPolicy: {
  customer: false,    // Deny
  technician: false,  // Deny
  dispatcher: false,  // Deny
  manager: false,     // Deny
  admin: null,        // All records
}
```

### Single Handler Implementation

```javascript
// rls-filter-helper.js
function buildRLSFilter(rlsContext, metadata, paramOffset) {
  const { filterConfig } = rlsContext;
  
  // null = all records
  if (filterConfig === null) {
    return { clause: '', params: [], noFilter: true };
  }
  
  // false = deny all
  if (filterConfig === false) {
    return { clause: '1 = 0', params: [] };
  }
  
  // '$parent' = sub-entity pattern (handled by sub-entity middleware, not here)
  // If this reaches the generic filter, it's a misconfiguration - fail closed
  if (filterConfig === '$parent') {
    return { clause: '1 = 0', params: [] };
  }
  
  // Normalize shorthand string to object
  const { field, value = 'userId' } = typeof filterConfig === 'string'
    ? { field: filterConfig }
    : filterConfig;
  
  // Get the actual filter value from context
  const filterValue = rlsContext[value];
  if (filterValue === undefined || filterValue === null) {
    // Fail-closed: if profile ID is missing, deny access
    return { clause: '1 = 0', params: [] };
  }
  
  return {
    clause: `${metadata.tableName}.${field} = $${paramOffset + 1}`,
    params: [filterValue]
  };
}
```

**Note:** The `$parent` marker is for sub-entities (like `file_attachment`). These use specialized middleware that filters by join to the parent entity. If `$parent` reaches the generic RLS filter, it's a configuration error and access is denied (fail-closed).

---

## Consequences

### Eliminated

- ❌ `own_record_only` policy (replaced by `'user_id'`)
- ❌ `own_work_orders_only` policy (replaced by `'customer_id'`)
- ❌ `own_invoices_only` policy (replaced by `'customer_id'`)
- ❌ `own_contracts_only` policy (replaced by `'customer_id'`)
- ❌ `assigned_work_orders_only` policy (replaced by `'assigned_technician_id'`)
- ❌ `all_records` policy name (replaced by `null`)
- ❌ `deny_all` policy name (replaced by `false`)
- ❌ `public_resource` policy name (handled at auth level, not RLS)
- ❌ `rlsFilterConfig` property (field is now in `rlsPolicy` directly)
- ❌ Policy handler switch/case logic

### Retained

- ✅ `$parent` marker for sub-entity access (requires join to parent)
- ✅ `rlsPolicy` property name in metadata (semantic consistency)
- ✅ `rowLevelSecurity` property name in permissions.json
- ✅ Single `buildRLSFilter()` function with pure data interpretation

### Benefits

1. **True SSOT**: Policy definition IS the implementation
2. **Zero code duplication**: One handler for all entities
3. **No new code needed**: Adding a new entity just requires metadata
4. **Self-documenting**: Reading `customer: 'customer_id'` is immediately clear
5. **Fail-closed by default**: Unknown values reject access

---

## Migration Checklist

1. ✅ Update entity metadata `rlsPolicy` values to field names
2. ✅ Update `permissions-deriver.js` to preserve new format
3. ✅ Update `row-level-security.js` middleware to extract field
4. ✅ Update `request-context.js` to include `filterField` in rlsContext
5. ✅ Rewrite `rls-filter-helper.js` with single handler
6. ✅ Remove `rlsFilterConfig` from metadata (no longer needed)
7. ✅ Update all tests to use new format
8. ✅ Regenerate `permissions.json` via `sync-permissions.js`

---

## Related

- [SECURITY.md](../../SECURITY.md) - Security architecture documentation
- [ADR-006](006-entity-naming-convention.md) - Entity naming conventions
- [ADR-007](007-file-attachments-architecture.md) - Sub-entity pattern reference
