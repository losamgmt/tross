# Architecture

**Philosophy:** Simple, secure, testable. Every decision optimizes for maintainability.

## Core Principles

### KISS (Keep It Simple, Stupid)

- Single Responsibility Principle everywhere
- No premature optimization
- Explicit over clever
- Delete code > Add code

### One Task Per Unit, One Unit Per Task

- Every function does exactly ONE thing
- Every responsibility has exactly ONE implementation
- When duplication exists, **unify** into a single implementation
- Never create "wrapper" or "shim" functions—make the core function inherently flexible
- If two functions exist for the same task, one must be deleted

### Unified Data Flow

- All middleware reads from ONE canonical location on the request object
- No optional parameters that create branching logic
- No fallbacks or defaults that mask configuration errors
- Fail hard on misconfiguration—don't silently handle missing data

### Security-First

- Defense in depth: Auth0 + RBAC + RLS + validation
- Zero trust architecture
- Fail closed, never open
- Audit everything

### Test-Driven Quality

- Comprehensive coverage across all layers
- Unit → Integration → E2E pyramid (properly shaped)
- Fast feedback loops
- Tests as executable documentation

---

## System Architecture

### Stack

- **Frontend:** Flutter (web + mobile)
- **Backend:** Node.js + Express + PostgreSQL
- **Auth:** Auth0 OAuth2/OIDC
- **Storage:** Cloudflare R2 (S3-compatible)
- **Testing:** Jest + Flutter Test + Playwright
- **Infrastructure:** Docker Compose

### Data Flow

```
Client (Flutter)
  ↓ HTTP/JSON
API (Express) → Auth Middleware → RBAC → RLS
  ↓ SQL                              ↓ R2
Database (PostgreSQL)        Object Storage (Cloudflare)
```

---

## Key Architectural Decisions

### 1. Provider Pattern (State Management)

**Decision:** Use Provider for global state, StatefulWidget for local UI state.

**Why:**

- Native to Flutter ecosystem
- Minimal boilerplate
- Excellent DevTools integration
- Scales from simple to complex

**Trade-offs:**

- ❌ Less opinionated than BLoC
- ✅ Lower learning curve
- ✅ Faster development velocity

---

### 2. Atomic Design System

**Decision:** Atoms → Molecules → Organisms → Templates → Pages

**Why:**

- Reusability by default
- Clear component hierarchy
- Easy to test in isolation
- Design system emerges naturally

**Trade-offs:**

- ❌ More files initially
- ✅ Less duplication long-term
- ✅ Enforces composition

---

### 3. Auth0 for Authentication

**Decision:** Delegate auth to Auth0, not build in-house.

**Why:**

- Security is their core competency
- OAuth2/OIDC compliance out-of-box
- MFA, social login, passwordless ready
- Reduces attack surface

**Trade-offs:**

- ❌ Vendor dependency
- ✅ Professional security
- ✅ Focus on business logic

**Dev Mode:** File-based dev users (`backend/config/test-users.js`) for fast local development.

---

### 4. Triple-Tier Security

**Decision:** Three layers of protection.

**Layers:**

1. **Auth0** - Identity verification
2. **RBAC** - Role-based permissions
3. **RLS** - Row-level security (data isolation)

**Why:**

- Defense in depth
- Each layer catches different attack vectors
- Graceful degradation

**Unified Security Flow:**

```
authenticateToken        → Sets req.dbUser
attachEntityContext      → Sets req.entityMetadata (from metadata registry)
requirePermission('op')  → Reads req.entityMetadata.rlsResource, checks permission
enforceRLS               → Reads req.entityMetadata.rlsResource, applies RLS policy
```

**Critical Principle:**

- Security middleware does NOT accept resource as a parameter
- Resource is ALWAYS read from `req.entityMetadata.rlsResource`
- Every entity-aware route MUST first attach entity context via middleware
- This creates ONE code path, not conditional "if passed X use X else Y"

---

### 5. Entity Contract v2.0

**Decision:** Standardized schema across all entities.

**TIER 1 - Universal Fields:**

```sql
id SERIAL PRIMARY KEY
[identity_field] VARCHAR(X) UNIQUE NOT NULL
is_active BOOLEAN DEFAULT true NOT NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
```

**TIER 2 - Lifecycle State (Optional):**

```sql
status VARCHAR(50) DEFAULT 'active'
  CHECK (status IN ([entity_specific_values]))
```

**Field Separation:**

- `is_active` = Record visibility (deactivation flag)
- `status` = What lifecycle stage? (pending, active, suspended, etc.)

**Why:**

- Consistent patterns reduce cognitive load
- Deactivation (`is_active=false`) preserves data while hiding records
- Status enables workflow modeling

---

### 6. Strategy Pattern for Auth

**Decision:** Pluggable auth strategies (Auth0Strategy, DevelopmentStrategy).

**Why:**

- Single interface: `authenticate(credentials)`
- Easy to swap strategies (dev ↔ prod)
- Testable in isolation

**Implementation:**

```javascript
// backend/services/auth/index.js
const strategy = AppConfig.devAuthEnabled
  ? new DevelopmentStrategy()
  : new Auth0Strategy();

const user = await strategy.authenticate(credentials);
```

---

### 7. Schema-Driven UI

**Decision:** Backend schema introspection drives frontend forms.

**Why:**

- Single source of truth (schema.sql)
- Validation rules shared (backend ↔ frontend)
- Changes propagate automatically

**Implementation:**

- `GET /api/schema/:entity` returns field metadata
- Flutter uses metadata to build dynamic forms
- Validation rules embedded in metadata

---

### 8. Comprehensive Testing Strategy

**Decision:** Unit → Integration → E2E pyramid with high coverage.

**Coverage:**

- Extensive test coverage across unit, integration, and E2E
- Unit: Fast, isolated logic tests
- Integration: API + DB tests
- E2E: Critical user flows (Playwright)

**Why:**

- Confidence to refactor
- Regression prevention
- Documentation via tests

**Performance:**

- Unit tests: <5s timeout
- Integration tests: <10s timeout
- Full suite: <70s (parallelized)

---

### 9. Single Source of Truth (SSOT) Pattern

**Decision:** Every piece of information has exactly ONE canonical source.

**SSOT Modules:**

- `config/models/*-metadata.js` - Entity definitions including field types, constraints, and allowed values
- `derived-constants.js` - Computes constants FROM metadata at runtime
- `validation-deriver.js` - Derives Joi schemas FROM metadata
- `sync-entity-metadata.js` - Syncs to frontend entity-metadata.json

**Why:**

- Change one place, effects propagate everywhere
- No drift between duplicated definitions
- Runtime derivation from metadata = always in sync

**Anti-Pattern:**

```javascript
// ❌ WRONG: Hardcoded list that duplicates metadata
const STATUS_VALUES = ["pending", "active", "suspended"];

// ✅ RIGHT: Derive from metadata
const STATUS_VALUES = entityMetadata.fields.status.enum;
```

---

### 10. Metadata-Driven Architecture

**Decision:** Entity behavior is defined by metadata, not code.

**Entity Metadata Defines:**

- Table name, primary key, identity field
- Name field type (HUMAN, SIMPLE, COMPUTED)
- RLS resource and per-role policies
- Required fields, immutable fields
- Field-level access control per role
- Searchable, filterable, sortable fields
- Relationships and dependents

**Why:**

- Adding an entity = adding a metadata file, not writing routes
- Consistent behavior emerges from consistent metadata structure
- UI can introspect metadata to auto-generate forms

**Name Field Types (Field-Level Metadata):**

- `HUMAN` - Uses `first_name + last_name` fields
- `SIMPLE` - Uses direct `name` field
- `COMPUTED` - Auto-generated identifier (e.g., WO-2024-001)

This is field-level metadata describing how the name is constructed—like a validation pattern for the name field. It is NOT an entity classification.

---

### 11. Unified Request Context

**Decision:** All validated data and context lives in canonical locations on the request object.

**Request Shape (After Middleware):**

```javascript
req.dbUser; // Authenticated user (from authenticateToken)
req.entityMetadata; // Entity metadata (from attachEntity/extractEntity)
req.rlsPolicy; // RLS policy for this user+resource (from enforceRLS)
req.validated = {
  body, // Validated request body
  query, // Validated query params
  params, // Validated URL params
  pagination, // Pagination config
};
```

**Why:**

- Every handler knows exactly where to find validated data
- No guessing between `req.validatedBody` vs `req.validated.body`
- Middleware can be composed without coordination on naming

---

### 12. Entity Naming Convention (SSOT)

**Decision:** All entity naming is EXPLICIT in metadata. Zero derivation. Zero pattern matching.

**Metadata Properties (Required):**

```javascript
module.exports = {
  entityKey: "work_order", // Internal key, FK columns, code refs
  tableName: "work_orders", // Database table AND API URL path
  rlsResource: "work_orders", // Permission checks (usually = tableName)
  displayName: "Work Order", // UI singular label
  displayNamePlural: "Work Orders", // UI plural label
  // ... other fields
};
```

**Usage Pattern:**

| Context                    | Use This Property   | Example Value |
| -------------------------- | ------------------- | ------------- |
| Code variables, FK columns | `entityKey`         | `work_order`  |
| SQL queries, API URLs      | `tableName`         | `work_orders` |
| Permission checks          | `rlsResource`       | `work_orders` |
| UI "Create X"              | `displayName`       | `Work Order`  |
| UI nav items               | `displayNamePlural` | `Work Orders` |

**URL Pattern (RESTful):**

```
GET    /api/work_orders          ← List entities
POST   /api/work_orders          ← Create entity
GET    /api/work_orders/123      ← Get entity
PATCH  /api/work_orders/123      ← Update entity
DELETE /api/work_orders/123      ← Delete entity
POST   /api/work_orders/123/files   ← Upload file (sub-resource)
GET    /api/work_orders/123/files   ← List files (sub-resource)
```

**Why:**

- Adding entity = ONE metadata file, zero hardcoded maps to update
- Zero derivation = zero bugs from naming assumptions
- Zero backward compatibility = zero cruft, zero ambiguity
- Frontend syncs from backend via `sync-entity-metadata.js`

**Forbidden:**

- ❌ Deriving `entityKey` from filename
- ❌ Hardcoded singular→plural maps
- ❌ Pattern matching or pluralization logic
- ❌ Accepting multiple URL formats (e.g., both `work_order` and `work_orders`)
- ❌ `normalizeEntityName()` or `_entityEndpoint()` functions

**Validation (Fail Fast):**

```javascript
const REQUIRED = [
  "entityKey",
  "tableName",
  "rlsResource",
  "displayName",
  "displayNamePlural",
];
for (const prop of REQUIRED) {
  if (!metadata[prop]) throw new Error(`Missing required: ${prop}`);
}
```

---

## Locked Patterns

**Status:** 🔒 **LOCKED** - Do not modify without review

These patterns are frozen and battle-tested:

1. ✅ Entity Contract v2.0 (TIER 1 + TIER 2)
2. ✅ Field separation (`is_active` vs `status`)
3. ✅ Triple-tier security (Auth0 + RBAC + RLS)
4. ✅ Strategy Pattern for auth
5. ✅ Provider Pattern for state
6. ✅ Atomic Design System
7. ✅ Schema-driven UI
8. ✅ Testing pyramid
9. ✅ Generic file storage (sub-resource pattern: `/api/:tableName/:id/files`)
10. ✅ SSOT pattern (one source per piece of information)
11. ✅ Metadata-driven entity behavior
12. ✅ Unified request context (`req.validated`, `req.entityMetadata`)
13. ✅ One task per unit, one unit per task
14. ✅ Entity Naming Convention (explicit `entityKey`, `tableName`, `rlsResource` in metadata)

**To modify a locked pattern:**

1. Open GitHub issue with rationale
2. Discuss alternatives and trade-offs
3. Update ADR with superseding decision
4. Update this document

---

## Evolution Guidelines

### Adding New Entities

**Single File Change:** Create ONE metadata file with explicit properties. Everything flows from there.

1. **Create metadata file:** `backend/config/models/{entity-name}-metadata.js`

   ```javascript
   module.exports = {
     // REQUIRED: Explicit Naming (no derivation!)
     entityKey: "service_request", // snake_case, singular
     tableName: "service_requests", // snake_case, matches DB table
     rlsResource: "service_requests", // Permission resource (usually = tableName)
     displayName: "Service Request", // UI singular
     displayNamePlural: "Service Requests", // UI plural

     // REQUIRED: Entity Contract v2.0
     primaryKey: "id",
     identityField: "request_number", // Unique business identifier

     // TIER 1 fields (mandatory for all entities)
     // id, is_active, created_at, updated_at

     // TIER 2 status (if entity has lifecycle)
     // status field with allowed values

     // Field definitions, access control, etc.
   };
   ```

2. **Create database migration:** `backend/migrations/YYYYMMDDHHMMSS_create_service_requests.js`

3. **Update schema.sql:** Add table definition

4. **Run sync:** `npm run sync:metadata` → Updates `frontend/assets/config/entity-metadata.json`

5. **Add tests:** Model + API tests

**That's it.** No hardcoded maps to update. No route files to create. Routes auto-mount at `/api/{tableName}`.

### Adding New Features

1. Write tests first (TDD)
2. Implement smallest possible change
3. Refactor for clarity
4. Update docs if architecture changes

### Refactoring

1. Tests must pass before and after
2. One pattern at a time
3. Commit frequently
4. Document breaking changes

---

## Anti-Patterns (Avoid)

❌ **Mixing concerns** - Keep models, routes, services separate  
❌ **Premature optimization** - Profile before optimizing  
❌ **Clever code** - Explicit > Clever  
❌ **Copy-paste** - Extract to shared function  
❌ **Skipping tests** - Tests are not optional  
❌ **Hardcoding config** - Use environment variables  
❌ **Ignoring errors** - Handle or log, never swallow  
❌ **Wrapper functions** - Don't wrap; unify into one flexible function  
❌ **Optional parameters with fallbacks** - Require explicit input, fail on missing  
❌ **Multiple data sources** - One canonical source, derive everything else  
❌ **Conditional code paths** - One path, one shape, always  
❌ **Deriving entity names** - All naming explicit in metadata, never from filename  
❌ **Hardcoded entity maps** - No `_entityEndpoint()` or `ENTITY_URL_MAP`; use metadata  
❌ **Pattern matching for pluralization** - No `entityName + 's'`; use explicit `tableName`  
❌ **Backward compatibility shims** - One convention, zero ambiguity, zero cruft  
❌ **Multiple URL formats** - Accept only `tableName` format, reject variations

---

## Further Reading

- [Architecture Decision Records](decisions/) - All ADRs including:
  - [Entity Naming Convention](decisions/006-entity-naming-convention.md) - Explicit metadata-driven naming
  - [File Attachments Architecture](decisions/007-file-attachments-architecture.md) - Sub-resource pattern, download URLs
- [Database Architecture](DATABASE_ARCHITECTURE.md) - Schema design details
- [Entity Lifecycle](ENTITY_LIFECYCLE.md) - Status field patterns
- [Validation Architecture](VALIDATION_ARCHITECTURE.md) - Multi-tier validation
- [Testing Guide](../reference/TESTING.md) - Test philosophy and patterns
- [Security Guide](../reference/SECURITY.md) - Security implementation details
