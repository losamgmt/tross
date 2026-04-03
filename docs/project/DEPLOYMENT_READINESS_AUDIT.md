# Tross Deployment Readiness Audit

**Status:** PLANNING  
**Date:** March 27, 2026  
**Objective:** Verify complete readiness for metadata-driven entity deployment

---

## Executive Summary

This audit validates that adding/modifying fields on existing entities or creating new entities via the **Metadata SSOT** results in **automatic, complete propagation** through all system layers—with no manual intervention beyond:

1. Edit metadata file → `npm run sync:all` (local)
2. Push to main → Railway deployment (production)

---

## Audit Scope

### A. PROPAGATION COMPLETENESS (Metadata → All Layers)

Can a single metadata change fully propagate through:

| Layer | Generator/Consumer | Verification Method |
|-------|-------------------|---------------------|
| **Database Schema** | `generate-schema.js` → `schema-generated.sql` | Add field, verify SQL column |
| **API Routes** | `route-loader.js` → auto-mounted routes | New entity gets CRUD endpoints |
| **Validation Rules** | `validation-deriver.js` → Joi schemas | Field constraints enforced |
| **Swagger/OpenAPI** | `swagger.js` + `derived-constants.js` | `/api-docs` shows new fields |
| **Permissions** | `permissions-deriver.js` → RBAC matrix | Field access enforced by role |
| **RLS (Row-Level Security)** | `rls/clause-builder.js` → WHERE clauses | RLS rules filter correctly |
| **Frontend Models** | `entity-metadata.json` → Dart registry | Flutter reads new fields |
| **Frontend Dart Types** | `resource_type.dart` | Permission enum updated |
| **Test Factories** | `entity-factory.js` → test data | Factory generates valid data |
| **Test Scenarios** | `scenarios/*.js` → auto-tests | New field validates in tests |

### B. SECURITY AUDIT

| Area | What to Verify |
|------|----------------|
| **Authentication** | JWT validation, Auth0 integration, dev token isolation |
| **Authorization** | Role hierarchy, permission enforcement, field access |
| **Row-Level Security** | RLS clause generation, junction access, cache isolation |
| **Input Validation** | SQL injection (parameterized), XSS, payload validation |
| **Secrets Management** | No hardcoded secrets, env var patterns, test isolation |
| **CI/CD Security** | Workflow permissions, dependency review, audit checks |

### C. PROCESS AUDIT

| Concern | Verification |
|---------|--------------|
| **Idempotency** | `npm run sync:all` produces same output on repeated runs |
| **CI Validation** | CI checks for uncommitted sync output |
| **Migration Safety** | Schema changes don't break existing data |
| **Rollback Capability** | Can revert metadata + redeploy safely |

---

## Phase 1: Propagation Testing

### 1.1 Add Field to Existing Entity

**Test Case:** Add `service_region` (enum) field to `work_order`

```javascript
// In backend/config/models/work-order-metadata.js
fields: {
  // ... existing fields
  service_region: {
    type: 'enum',
    enumKey: 'serviceRegion',
    required: false,
    description: 'Geographic service region for routing',
  },
},
enums: {
  serviceRegion: {
    north: { color: 'blue', label: 'North Region' },
    south: { color: 'green', label: 'South Region' },
    east: { color: 'orange', label: 'East Region' },
    west: { color: 'purple', label: 'West Region' },
  },
},
```

**Verification Checklist:**

- [ ] `npm run sync:all` completes without errors
- [ ] `backend/generated/schema-generated.sql` contains `service_region` column with ENUM type
- [ ] `GET /api/work_orders` returns `service_region` field
- [ ] `POST /api/work_orders` accepts `service_region` in payload
- [ ] `GET /api-docs` shows `service_region` in WorkOrder schema
- [ ] Frontend `entity-metadata.json` includes field definition
- [ ] Validation rejects invalid enum values
- [ ] Tests pass (factory generates valid enum value)

### 1.2 Add New Entity

**Test Case:** Add `service_zone` entity

```javascript
// Create backend/config/models/service-zone-metadata.js
module.exports = {
  entityKey: 'service_zone',
  tableName: 'service_zones',
  displayName: 'Service Zone',
  pluralDisplayName: 'Service Zones',
  namePattern: 'SIMPLE',
  identityField: 'name',
  displayField: 'name',
  
  fields: {
    name: { type: 'string', required: true, maxLength: 100 },
    code: { type: 'string', required: true, maxLength: 10 },
    description: { type: 'text', required: false },
    is_active: { type: 'boolean', required: true, default: true },
  },
  
  requiredFields: ['name', 'code'],
  immutableFields: ['code'],
  searchableFields: ['name', 'code'],
  displayColumns: ['name', 'code', 'is_active'],
  
  entityPermissions: {
    create: 'manager',
    read: 'customer',
    update: 'manager',
    delete: 'admin',
  },
  
  rlsRules: [
    { id: 'all-read', roles: '*', operations: 'read', access: null },
    { id: 'manager-write', roles: 'manager', operations: ['create', 'update'], access: null },
    { id: 'admin-delete', roles: 'admin', operations: 'delete', access: null },
  ],
  rlsResource: 'service_zones',
  
  routeConfig: { useGenericRouter: true },
};
```

**Verification Checklist:**

- [ ] Auto-discovered (no manual registration)
- [ ] `npm run sync:all` completes
- [ ] Schema SQL includes CREATE TABLE
- [ ] Route `/api/service_zones` responds
- [ ] Swagger includes ServiceZone tag and schema
- [ ] Permissions derived correctly
- [ ] Frontend metadata includes new entity
- [ ] Create integration test file → tests pass

### 1.3 Modify Field Constraints

**Test Case:** Change `work_order.notes` from optional to required

```javascript
// Before
notes: { type: 'text', required: false },
// After
notes: { type: 'text', required: true },
```

**Verification Checklist:**

- [ ] Sync regenerates validation rules
- [ ] API rejects POST/PATCH without `notes`
- [ ] Frontend validation matches
- [ ] Existing tests updated or flagged

### 1.4 Add RLS Rule

**Test Case:** Add "technician sees assigned work orders" rule

```javascript
rlsRules: [
  // ... existing rules
  {
    id: 'technician-assigned',
    roles: 'technician',
    operations: 'read',
    access: {
      type: 'direct',
      field: 'assigned_technician_id',
      value: 'user_id',
    },
  },
],
```

**Verification Checklist:**

- [ ] RLS clause generated correctly
- [ ] Technician only sees assigned work orders
- [ ] No cache collision with other rules
- [ ] Test factory generates scenario automatically

---

## Phase 2: Security Deep Dive

### 2.1 Authentication

| Check | Location | Expected Behavior |
|-------|----------|-------------------|
| JWT validation | `middleware/auth.js` | Invalid tokens → 401 |
| Dev token rejection (prod) | `middleware/auth.js:55-70` | Dev tokens → 403 in production |
| Missing token | `middleware/auth.js:25-35` | No token → 401 |
| Token expiry | `jwt-helper.js` | Expired → 401 |
| Auth0 verification | `Auth0Strategy.js` | JWKS validation against Auth0 |

### 2.2 Authorization

| Check | Location | Expected Behavior |
|-------|----------|-------------------|
| Role priority | `permissions-loader.js` | Lower priority → 403 on forbidden ops |
| Field access control | `field-access-controller.js` | Fields hidden/redacted by role |
| Entity permissions | `requirePermission` middleware | Operation denied → 403 |
| Minimum role check | `hasMinimumRole()` | Returns false for insufficient roles |

### 2.3 Row-Level Security

| Check | Location | Expected Behavior |
|-------|----------|-------------------|
| Direct field match | `clause-builder.js` | `WHERE customer_id = $1` |
| Junction access | `clause-builder.js` | Subquery via junction table |
| Parent inheritance | `clause-builder.js` | Inherits parent RLS filter |
| Cache isolation | `rls/index.js` | Different entities → different cache keys |
| Admin bypass | `rule-matcher.js` | `access: null` → no filter |

### 2.4 Input Validation

| Check | Location | Expected Behavior |
|-------|----------|-------------------|
| Parameterized queries | `db/*.js` | All queries use `$1, $2, ...` |
| Joi validation | `validate` middleware | Invalid input → 400 |
| Type coercion | `validation-deriver.js` | Types enforced per field |
| Length limits | Field constraints | Exceeds max → 400 |
| Enum values | Validation schema | Invalid enum → 400 |

### 2.5 Secrets Management

| Check | Location | Expected Behavior |
|-------|----------|-------------------|
| No hardcoded secrets | Global grep | Zero matches |
| JWT_SECRET fail-fast | `app-config.js:jwt.secret` | Throws if undefined (prod) |
| Test secret isolation | `app-mode.js:TEST_JWT_SECRET` | Different from prod |
| Auth0 secrets | `auth0.js` | From env vars only |
| CI secrets | `.github/workflows/ci-cd.yml` | `secrets.*` references |

---

## Phase 3: Process Verification

### 3.1 Sync Idempotency

```bash
# Run sync twice, diff should be empty
npm run sync:all
cp -r frontend/assets/config frontend/assets/config.backup
npm run sync:all
diff -r frontend/assets/config frontend/assets/config.backup
# Expected: No differences
```

### 3.2 CI Validation

Verify CI catches uncommitted sync changes:

```yaml
# From ci-cd.yml - already implemented
- name: Verify sync scripts are idempotent
  run: |
    npm run sync:all
    if [ -n "$(git status --porcelain)" ]; then
      exit 1
    fi
```

### 3.3 Migration Safety

- [ ] Adding optional field: Safe (NULL default)
- [ ] Adding required field: Requires DEFAULT or backfill
- [ ] Removing field: Breaking (requires migration)
- [ ] Renaming field: Breaking (requires migration)
- [ ] Changing type: Case-by-case analysis

---

## Phase 4: Coverage Verification

### 4.1 Test Coverage Requirements

| Area | Target | Verification |
|------|--------|--------------|
| Unit tests | 80%+ | `npm run test:coverage` |
| Integration tests | All entities | Factory test runner |
| RLS tests | All rules | `rls.scenarios.js` |
| Permission tests | All operations | `rls.scenarios.js` |
| Validation tests | All fields | `validation.scenarios.js` |

### 4.2 Security Test Coverage

| Test Type | Location | Count |
|-----------|----------|-------|
| Auth tests | `__tests__/unit/auth/*.test.js` | Verify |
| RLS tests | `__tests__/unit/rls/*.test.js` | Verify |
| Permission tests | Factory scenarios | Auto-generated |

---

## Audit Execution Plan

### Day 1: Propagation Testing

1. Execute Phase 1.1 (Add field) - 2 hours
2. Execute Phase 1.2 (Add entity) - 2 hours
3. Execute Phase 1.3 (Modify constraint) - 1 hour
4. Execute Phase 1.4 (Add RLS rule) - 1 hour
5. Document findings - 1 hour

### Day 2: Security Deep Dive

1. Execute Phase 2.1-2.3 (Auth/Authz/RLS) - 3 hours
2. Execute Phase 2.4-2.5 (Validation/Secrets) - 2 hours
3. Run security tooling (npm audit, dependency-review) - 1 hour
4. Document findings - 1 hour

### Day 3: Process & Coverage

1. Execute Phase 3 (Process verification) - 2 hours
2. Execute Phase 4 (Coverage verification) - 2 hours
3. Compile final report - 2 hours
4. Remediation planning (if needed) - 2 hours

---

## Success Criteria

### PASS: Complete Deployment Readiness

- [ ] All Phase 1 propagation tests pass
- [ ] All Phase 2 security checks verify
- [ ] All Phase 3 process checks pass
- [ ] Phase 4 coverage meets targets
- [ ] Zero high/critical security findings
- [ ] Zero data leakage vectors identified

### CONDITIONAL PASS: Minor Remediation Required

- Minor documentation gaps
- Non-blocking test coverage gaps
- Low-severity findings with clear remediation

### FAIL: Not Ready for Deployment

- Propagation breaks at any layer
- Security vulnerabilities identified
- RLS bypass possible
- Secrets exposed
- Critical coverage gaps

---

## Appendix A: File Inventory

### Metadata SSOT Files

```
backend/config/models/
├── index.js                    # Auto-discovery loader
├── entity-metadata.types.js    # JSDoc types
├── asset-metadata.js
├── contract-metadata.js
├── customer-metadata.js
├── customer-unit-metadata.js
├── invoice-metadata.js
├── invoice-item-metadata.js
├── payment-metadata.js
├── property-metadata.js
├── property-role-metadata.js
├── unit-metadata.js
├── user-metadata.js
├── work-order-metadata.js
├── work-order-item-metadata.js
├── work-order-note-metadata.js
├── work-order-photo-metadata.js
├── ... (plus additional entities)
```

### Sync Scripts

```
scripts/
├── sync-entity-metadata.js     # → frontend/assets/config/entity-metadata.json
├── sync-permissions.js         # → config/permissions.json
├── sync-config.js              # → frontend/assets/config/permissions.json
├── generate-resource-types.js  # → frontend/lib/generated/resource_type.dart
├── generate-schema.js          # → backend/generated/schema-generated.sql
├── compose-schema.js           # → backend/schema.sql
```

### Security-Critical Files

```
backend/
├── middleware/
│   ├── auth.js                 # JWT validation
│   ├── row-level-security.js   # RLS enforcement
│   └── permission.js           # RBAC middleware
├── config/
│   ├── app-config.js           # Secrets management
│   ├── permissions-loader.js   # Permission matrix
│   └── permissions-deriver.js  # Derives from metadata
├── db/helpers/rls/
│   ├── index.js                # RLS entry point
│   ├── clause-builder.js       # WHERE clause generation
│   ├── rule-matcher.js         # Rule selection
│   └── filter-parser.js        # Filter parsing
├── services/auth/
│   ├── AuthStrategy.js         # Strategy interface
│   ├── Auth0Strategy.js        # Production auth
│   ├── DevAuthStrategy.js      # Development auth
│   └── AuthStrategyFactory.js  # Strategy selection
```

---

## Appendix B: Quick Commands

```bash
# Run full sync
npm run sync:all

# Regenerate schema
npm run generate:schema
npm run compose:schema

# Run all backend tests
npm run test --workspace=backend

# Run specific test category
npm run test:unit --workspace=backend
npm run test:integration --workspace=backend

# Check for security vulnerabilities
npm audit --audit-level=high
npm audit --workspace=backend --audit-level=high

# Lint check
npm run lint --workspace=backend

# Export OpenAPI spec
npm run docs:api:export
```

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Auditor | | | |
| Tech Lead | | | |
| Security | | | |
