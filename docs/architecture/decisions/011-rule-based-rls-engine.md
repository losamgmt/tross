# ADR 011: Rule-Based Row-Level Security Engine

**Status:** Complete  
**Date:** March 9, 2026  
**Supersedes:** ADR-008 (replaced - RLS now uses rlsRules exclusively)

---

## Context

### Problem Statement

ADR-008 established field-based RLS filtering with simple configurations:
- `null` = no filter
- `false` = deny all
- `{ field, value }` = direct column match

This works for **direct ownership** patterns (customer owns work_order via `customer_id` field), but **fails for junction-based access**:

```
Customer → customer_units (junction) → Units
Customer → property_roles (junction) → Properties → Units
```

Currently, `units` has `rlsPolicy.customer: false` because there's no mechanism to express "access via junction table."

### Business Requirements

1. **Customer-to-Unit Access**: Customers see units they own via `customer_units` junction
2. **Board Member Summary Access**: Board members (via `property_roles`) see aggregate summaries of all units at their property
3. **Multiple Access Paths**: A customer who is BOTH unit owner AND board member should have BOTH access types
4. **Generic Solution**: Must work for ANY entity/junction combination, not just units

### Gap Analysis (Resolved)

| Entity Type | Support | Notes |
|-------------|---------|-------|
| Primary (customers) | ✅ Direct field match | - |
| Primary (work_orders) | ✅ Direct field match | - |
| Sub-entity (files) | ✅ `$parent` + middleware | - |
| Junction (customer_units) | ✅ Direct field match | - |
| Via-Junction (units) | ✅ Junction access type | Customers access units via `customer_units` |
| Multi-hop (assets via unit) | ✅ Parent access type | Assets inherit unit's junction RLS |

---

## Decision

### Core Principle: Declarative Grant Rules

Replace implicit `rlsPolicy` object with explicit `rlsRules` array. Each rule is a **grant** that authorizes access. **No matching grant = implicit deny.**

### Rule Structure

```javascript
/**
 * @typedef {Object} RLSRule
 * @property {string} id - Unique identifier for debugging/audit
 * @property {string} description - Human-readable purpose
 * @property {string[]} roles - Roles this rule applies to
 * @property {string[]} operations - Operations granted: 'read', 'create', 'update', 'delete', 'summary', '*'
 * @property {null|DirectAccess|JunctionAccess} access - How access is determined
 */

/**
 * @typedef {Object} DirectAccess
 * @property {'direct'} type
 * @property {string} field - Column on target table
 * @property {string} value - Context key: 'userId', 'customerProfileId', 'technicianProfileId'
 */

/**
 * @typedef {Object} JunctionAccess
 * @property {'junction'} type
 * @property {string} via - Junction table name
 * @property {string} [sourceField='id'] - FK in junction pointing to target entity's PK
 * @property {string[]} [through] - Multi-hop: field path for non-PK joins
 * @property {Object} match - Filter on junction to link to user: { field: contextKey }
 * @property {Object} [filter] - Additional conditions on junction table
 */
```

### Access Types

| Type | SQL Pattern | Use Case |
|------|-------------|----------|
| `null` | No WHERE clause | Full access (admin/staff) |
| `direct` | `WHERE target.field = $value` | Direct ownership (customer_id, user_id) |
| `junction` | `WHERE EXISTS (SELECT 1 FROM junction WHERE ...)` | Via junction table |
| `junction` + `through` | `WHERE EXISTS (SELECT 1 FROM junction WHERE junction.field = target.field AND ...)` | Multi-hop via related field |

### Filter Syntax

Simple object → parameterized SQL. No operators.

```javascript
// Simple equality
{ role: 'board' }
// → role = 'board'

// Array = IN clause
{ role: ['board', 'manager'] }
// → role IN ('board', 'manager')

// Multiple conditions = AND
{ role: 'board', is_active: true }
// → role = 'board' AND is_active = true
```

### Rule Matching Algorithm

```
Input: (entity, operation, userRole, userContext)

1. Get entity.rlsRules[]
2. Filter rules where:
   - rule.roles includes userRole
   - rule.operations includes operation OR includes '*'
3. If no matching rules → DENY (return WHERE 1=0)
4. For each matching rule, generate SQL clause based on access type
5. Combine all clauses with OR
6. Return combined WHERE clause with parameters
```

### Example: Unit Metadata

```javascript
// unit-metadata.js
rlsRules: [
  {
    id: 'unit-owner-crud',
    description: 'Unit owners can read/update their units',
    roles: ['customer'],
    operations: ['read', 'update'],
    access: {
      type: 'junction',
      via: 'customer_units',
      sourceField: 'unit_id',
      match: { customer_id: 'customerProfileId' }
    }
  },
  {
    id: 'board-member-summary',
    description: 'Board members see summary of all units at their properties',
    roles: ['customer'],
    operations: ['summary'],
    access: {
      type: 'junction',
      via: 'property_roles',
      through: ['property_id'],  // property_roles.property_id = units.property_id
      match: { customer_id: 'customerProfileId' },
      filter: { role: ['board', 'manager'] }
    }
  },
  {
    id: 'staff-full-access',
    description: 'Staff can perform all operations on all units',
    roles: ['technician', 'dispatcher', 'manager', 'admin'],
    operations: ['*'],
    access: null
  }
]
```

### Generated SQL

**Customer reading units (rule: unit-owner-crud):**
```sql
SELECT * FROM units u
WHERE EXISTS (
  SELECT 1 FROM customer_units cu
  WHERE cu.unit_id = u.id
    AND cu.customer_id = $1
)
```

**Customer requesting summary (rules: unit-owner-crud + board-member-summary):**
```sql
SELECT * FROM units u
WHERE EXISTS (
  SELECT 1 FROM customer_units cu
  WHERE cu.unit_id = u.id AND cu.customer_id = $1
)
OR EXISTS (
  SELECT 1 FROM property_roles pr
  WHERE pr.property_id = u.property_id
    AND pr.customer_id = $1
    AND pr.role IN ('board', 'manager')
)
```

---

## Design Principles

### 1. Grant-Only Model
- Rules only GRANT access, never deny
- No matching grant = implicit deny
- Simplifies reasoning: "Which rules allow this?"

### 2. OR Combination
- Multiple matching rules combine with OR
- Any single rule granting access is sufficient
- Supports multiple access paths to same data

### 3. Operations Are Explicit
- Each rule declares which operations it grants
- `'*'` wildcard for "all operations"
- Supports custom operations like `'summary'`

### 4. PostgreSQL Native
- No abstract query languages
- Filter objects map directly to parameterized SQL
- EXISTS subqueries for junction access (efficient with indexes)

### 5. Metadata is SSOT
- Rules live in entity metadata files
- No separate permissions.json for RLS (only for resource-level auth)
- Changes require code deployment (intentional - security shouldn't be runtime-configurable)

### 6. Fail Closed
- Invalid configuration → deny access
- Missing context values → deny access
- Cycle detection at startup → fail fast

---

## Architecture

### File Structure

```
backend/db/helpers/rls/
├── index.js              # Main export: buildRLSFilter()
├── rule-matcher.js       # Match rules by (entity, operation, role)
├── clause-builder.js     # Build SQL clause from access config
├── filter-parser.js      # Convert filter object to SQL conditions
├── path-validator.js     # Startup validation: cycles, schema, hop limits
└── sql-cache.js          # Memoization for compiled SQL shapes
```

### Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        enforceRLS Middleware                      │
│   Attaches rlsContext: { userId, customerProfileId, role, ... }  │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                         buildRLSFilter()                          │
│   Input: (entity, operation, rlsContext)                          │
│   Output: { clause, params, applied }                             │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
┌─────────────────────┐                     ┌─────────────────────┐
│   Rule Matcher      │                     │    SQL Cache        │
│   Filter by role,   │                     │    Check hit/miss   │
│   operation         │                     │    for shape key    │
└─────────┬───────────┘                     └─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   Clause Builder    │
│   For each rule:    │
│   - direct → WHERE  │
│   - junction → EXISTS│
│   Combine with OR   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Filter Parser     │
│   { field: val }    │
│   → SQL conditions  │
└─────────────────────┘
```

### Service Integration

`GenericEntityService` read/count methods receive `rlsContext` through a **unified
trailing `options` bag** and pass it straight to `buildRLSFilter()`. Routes build the
context with `buildRlsContext(req)` (which reads `req.rlsContext` set by `enforceRLS`)
and nest it under `options.rlsContext`:

```javascript
const rlsContext = buildRlsContext(req);

await GenericEntityService.findById('work_order', id, { rlsContext });
await GenericEntityService.findAll('work_order', { page, limit, rlsContext });
await GenericEntityService.findByField('user', 'email', email, { rlsContext });
await GenericEntityService.count('work_order', { filters, rlsContext });
```

Omitting `rlsContext` (internal/system reads) skips RLS filtering entirely; when a
context **is** supplied but no rule matches the role, the filter denies (`1=0`).

### Field redaction & nested relationships

RLS (above) decides **which rows** a caller sees. A second, independent layer —
**field redaction** — decides **which fields** of those rows the caller may read.
After RLS filtering and relationship assembly, the service applies
`_redactForContext(data, metadata, rlsContext)` at the output boundary of
`findById` / `findAll` / `create` / `update` / `batch`. It delegates to
`filterDataByRole(data, metadata, rlsContext.role, 'read')` **only when a role is
present** — internal/system callers (no `rlsContext`, or no `role`) receive full
records, mirroring the RLS skip-for-system behavior. (Auth identifiers such as
`password_hash` are stripped unconditionally by a separate sanitizer.)

**Known limitation — nested relationship includes are stripped under redaction.**
`filterDataByRole` keeps only keys declared in the entity's `fieldAccess`.
Relationship names (`units`, `invoices`, `workOrders`, …) are **not** `fieldAccess`
keys, so nested relationship data attached by `loadRelationships`
(`hasMany`/`hasOne`/`manyToMany`) is removed for **any** role-bearing read — even
admin. Therefore, today:

- **No field leak:** nested relationship rows never reach a redacted response, so
  their inner fields cannot leak. Row-level access to `manyToMany` targets is
  additionally guarded by a boot invariant (`validateRelationships` requires every
  M:M target to define `rlsRules`).
- **`?include=` is inert under redaction:** although the param is validated and the
  loader runs, the included relationships are stripped before the response. Nested
  data currently surfaces only for internal/no-role callers.

**Update — scalar FK display labels ARE embedded and redaction-safe (UDN, 2026-08).**
Distinct from nested *rows*: every user-facing entity now has a real per-strategy
display column (`name` for HUMAN/SIMPLE, the identifier for COMPUTED), and the generic
read path (`findAll` / `findByField`) LEFT JOINs each FK target to project a single
scalar `<fk>_display` label (via `buildForeignKeyDisplayClauses`). Redaction stays
Tier-1 and safe: `filterDataByRole` keeps `<fk>_display` **iff** the FK id field is
itself readable by the caller's role (the label inherits the id's permission), so a
label never outlives its id. This resolves the former FK-display N+1 (the client reads
the embedded label, zero lookups) *without* embedding nested rows — the Tier-2
nested-relationship case below remains separate and still deferred.

**Deferred feature — Tier-2 nested redaction (revisit if `?include=` response-embedding is adopted).**
To make `?include=` response-visible *and* field-safe, a future change should:

1. Redact each nested row by its **target** entity's `fieldAccess` + caller role
   (the relationship loader already resolves target metadata via
   `_findMetadataByTable` and receives `rlsContext`); and
2. Let relationship keys **survive** Tier-1 — e.g. declare relationship names in the
   parent's `fieldAccess` as a presence-gate, and make `_redactForContext`
   relationship-aware (redact own columns, preserve the already-redacted nested data).

This was deliberately deferred during the P1 in-service redaction work (the
route→service redaction move): there is no active leak. The frontend Related-tab
has since shipped, but it deliberately loads each related list via a **separate
filtered list call** (`getAll(targetEntity, { filters: { <fk>: parentId } })` in
`RelationshipSection` — the junction entity for M:M, the target entity for
`hasMany`), so every related list flows through the normal `findAll` → RLS
row-filter → `_redactForContext` path and is already field-safe. Nothing in the
frontend consumes `?include=` embedding, so this remains a **latent** task: it
becomes relevant only if a future feature embeds nested relationship rows inside a
single parent response via `?include=`. Closes review findings **H4 / M13** as
*mitigated*.

### Caching Strategy

**Key:** `${entityName}:${operation}:${role}`  
**Value:** Compiled SQL template with parameter positions  
**Scope:** Process lifetime (no TTL - metadata doesn't change at runtime)  
**Invalidation:** Restart required for metadata changes

```javascript
// Cache stores SQL shape, not actual values
cache.set('unit:read:customer', {
  template: 'EXISTS (SELECT 1 FROM customer_units cu WHERE cu.unit_id = {target}.id AND cu.customer_id = $1)',
  paramKeys: ['customerProfileId']
});

// At runtime, just fill in param values
function applyTemplate(cached, context) {
  return {
    clause: cached.template.replace('{target}', tableName),
    params: cached.paramKeys.map(k => context[k])
  };
}
```

---

## Backward Compatibility

### Migration Strategy

1. **Phase 1:** New engine supports both `rlsPolicy` (old) and `rlsRules` (new)
2. **Phase 2:** Migrate entities one-by-one to `rlsRules`
3. **Phase 3:** Remove `rlsPolicy` support after all migrated

### Compatibility Layer

```javascript
// In rule-matcher.js
function getRulesForEntity(metadata) {
  // New format: use directly
  if (metadata.rlsRules) {
    return metadata.rlsRules;
  }
  
  // Old format: convert on-the-fly
  if (metadata.rlsPolicy) {
    return convertLegacyPolicy(metadata.rlsPolicy);
  }
  
  // No RLS defined: deny all
  return [];
}

function convertLegacyPolicy(rlsPolicy) {
  return Object.entries(rlsPolicy).map(([role, config]) => {
    if (config === null) {
      return { roles: [role], operations: ['*'], access: null };
    }
    if (config === false) {
      return null; // No grant rule = deny
    }
    if (config === '$parent') {
      return { roles: [role], operations: ['*'], access: { type: 'parent' } };
    }
    // { field, value } or string shorthand
    const normalized = typeof config === 'string'
      ? { field: config, value: 'userId' }
      : config;
    return {
      roles: [role],
      operations: ['*'],
      access: { type: 'direct', ...normalized }
    };
  }).filter(Boolean);
}
```

---

## Constraints & Limits

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max hop depth | 5 | Prevent pathological queries |
| Max rules per entity | 50 | Sanity limit |
| Max filter conditions | 10 | Query complexity bound |
| Allowed filter operators | `=`, `IN` | Simplicity, SQL injection prevention |

---

## Validation

### Startup Validation

1. **Schema validation:** All referenced tables/columns exist
2. **Cycle detection:** No circular junction references
3. **Hop limit:** No paths exceed max depth
4. **Context keys:** All `value` references are valid context keys

### Test Matrix

| Test Case | Expected |
|-----------|----------|
| No matching rules | WHERE 1=0 (deny) |
| Single direct rule | WHERE field = $1 |
| Single junction rule | WHERE EXISTS (...) |
| Multiple rules same role | OR combination |
| Wildcard operations | Matches any operation |
| Invalid context value | WHERE 1=0 (deny) |
| Multi-hop junction | Nested EXISTS |
| Filter with IN clause | role IN (...) |

---

## Implementation Plan

### Phase 1: Foundation (~4 hours)
- [x] Create `db/helpers/rls/` module structure
- [x] Define TypeScript types in `entity-metadata.types.js`
- [x] Implement `rule-matcher.js` (no legacy conversion - rlsRules only)
- [x] Implement `filter-parser.js`
- [x] Unit tests for rule matching and filter parsing

### Phase 2: SQL Generation (~3 hours)
- [x] Implement `clause-builder.js` for all access types
- [x] Implement `sql-cache.js` memoization
- [x] Implement `path-validator.js` startup checks
- [x] Unit tests for clause generation

### Phase 3: Integration (~2 hours)
- [x] Update middleware `row-level-security.js` to use new engine
- [x] Remove `rls-filter-helper.js` (deleted)
- [x] Integration tests with existing routes

### Phase 4: Metadata Migration (~2 hours)
- [x] Add `rlsRules` to ALL 20 entity metadata files
- [x] Add `validateRlsRules()` to `entity-metadata-validator.js`
- [x] Unit tests: 4407 tests passing
- [x] Integration tests: customer accessing owned units
- [x] Integration tests: board member summary access

### Phase 5: Cleanup (~2 hours)
- [x] Remove legacy `rlsPolicy` from all entities
- [x] Remove `rlsPolicy` validation from validator (no-op stub remains for safety)
- [x] Update documentation
- [x] Full regression testing (4407 backend + 6263 frontend tests passing)

---

## Success Criteria

1. ✅ Customer can list units they own via `customer_units` junction
2. ✅ Board member can access unit summaries at their properties
3. ✅ Customer who is both owner AND board member has both access types
4. ✅ All existing RLS tests pass (backward compatible)
5. ✅ No N+1 queries - single efficient SQL generated
6. ✅ Startup validation catches misconfigurations

---

## References

- ADR-008: RLS Field-Based Filtering (this extends)
- ADR-010: Junction Entity CRUD Pattern
- `backend/db/helpers/rls-filter-helper.js` (current implementation)
- `backend/middleware/row-level-security.js` (middleware)
