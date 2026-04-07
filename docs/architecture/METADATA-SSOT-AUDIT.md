# Tross Metadata SSOT Architecture Audit

**Date:** Session Continuation  
**Auditor:** GitHub Copilot (Claude Opus 4.5)  
**Scope:** Complete layer-by-layer review of the metadata-driven SSOT system

---

## Executive Summary

The Tross metadata SSOT architecture is **production-ready**. After reviewing all 12 layers, the system demonstrates:

- ✅ **Single Source of Truth**: All configuration derives from `*-metadata.js` files
- ✅ **Fail-Fast Validation**: 26+ checks at module load time prevent invalid configs
- ✅ **Zero Manual Sync**: Automated pipeline keeps all artifacts in sync
- ✅ **Defense-in-Depth Security**: Permissions → RLS → Field Access layering
- ✅ **Test Coverage**: Factory system auto-discovers and tests all entities

**Verdict:** Ready to add new fields and entities via metadata alone.

---

## Layer-by-Layer Analysis

### Layer 1: Metadata Source & Auto-Discovery

**Files:** `config/models/index.js`, `config/entity-metadata-validator.js`

**How it works:**
- `models/index.js` auto-discovers all `*-metadata.js` files via `fs.readdirSync`
- Each metadata file MUST export `entityKey` (explicit, not derived from filename)
- `entity-metadata-validator.js` runs 26+ validation checks at module load time

**Key validations:**
- Required fields: `entityKey`, `tableName`, `primaryKey`, `fields`, `fieldAccess`
- Field type validation: `type` must be valid (string, enum, foreignKey, etc.)
- Enum resolution: `enumKey` references validated against entity's `enums` object
- FK validation: All `foreignKey` fields must have valid `references` config
- RLS rules: Schema-validated for structure correctness
- Relationship consistency: FK fields must exist in `fields`

**Fail-fast behavior:** Any validation error throws at startup, preventing server from running with invalid metadata.

---

### Layer 2: Sync Pipeline Scripts

**Files:** `scripts/sync-entity-metadata.js`, `sync-permissions.js`, `sync-config.js`, `generate-resource-types.js`

**Pipeline:** `npm run sync:all` executes in order:
1. `sync:metadata` → `frontend/assets/config/entity-metadata.json`
2. `sync:permissions` → `config/permissions.json`
3. `sync:config` → `frontend/assets/config/nav-config.json`, `frontend/assets/config/permissions.json`
4. `generate:resource-types` → `frontend/lib/models/permission.dart`

**Key contracts:**
- `transformModel()` ensures consistent shape (arrays never `null`)
- CI verifies idempotency: running sync produces no git changes
- All derived files have "DO NOT EDIT" headers

---

### Layer 3: Schema Generation

**Files:** `scripts/generate-schema.js`, `scripts/compose-schema.js`

**6-Phase Pipeline:**
1. **LOAD** - Read all metadata from `config/models`
2. **NORMALIZE** - Apply defaults, resolve shared fields
3. **VALIDATE** - Catch configuration errors early
4. **SORT** - Topological sort via Kahn's algorithm for FK dependencies
5. **GENERATE** - Build CREATE TABLE statements
6. **ASSEMBLE** - Combine with header/footer/static sections

**Auto-generated columns (Tier 1):**
```sql
id SERIAL PRIMARY KEY,
is_active BOOLEAN NOT NULL DEFAULT TRUE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**Output:** `backend/schema-generated.sql`

---

### Layer 4: Route Loading & API Mounting

**Files:** `config/route-loader.js`, `routes/entities.js`

**Dynamic router generation:**
```javascript
for (const [entityName, metadata] of Object.entries(allMetadata)) {
  if (metadata.useGenericRouter) {
    const router = createEntityRouter(metadata);
    app.use(`/api/${metadata.tableName}`, router);
  }
}
```

**Middleware chain:**
```
authenticateToken → attachEntity → requirePermission → enforceRLS → validateBody → handler
```

**Key insight:** Routes are NOT hardcoded—they're generated at module load time from metadata.

---

### Layer 5: Generic Entity Service

**File:** `services/generic-entity-service.js`

**Methods:**
- `findAll()` - Pagination, search, filters, RLS via `buildRLSFilter()`
- `findById()` - Single record with RLS enforcement
- `create()` - Auto-identifiers for COMPUTED entities, derived FKs
- `update()` - Immutable field protection, RLS verification
- `delete()` - Cascade tracking, polymorphic cascade support

**Security:**
- All queries inject RLS WHERE clauses via `buildRLSFilter()`
- `stripAuthIdentifiers()` removes sensitive fields from responses
- Audit trails via `auditService.log()` for create/update/delete

---

### Layer 6: Validation Derivation

**Files:** `config/validation-deriver.js`, `middleware/generic-entity.js`, `validators/validation-schema-builder.js`

**Flow:**
1. `validation-deriver.js` transforms metadata fields → validation rules
2. `validation-schema-builder.js` builds Joi schemas from rules
3. `genericValidateBody()` middleware enforces validation

**Role-aware filtering:**
```javascript
// Higher-priority roles see more fields
const visibleFields = filterFieldsByRole(fields, userRole);
const schema = buildJoiSchema(visibleFields);
```

**Enum resolution:** Both inline `values` arrays and `enumKey` references supported.

---

### Layer 7: Permissions & RBAC

**Files:** `config/permissions-deriver.js`, `config/permissions-loader.js`, `middleware/auth.js`

**Derivation flow:**
1. `permissions-deriver.js` reads metadata's `fieldAccess` + `entityPermissions`
2. `deriveMinimumRole()` calculates minimum role for each CRUD operation
3. `permissions-loader.js` caches and provides `hasPermission()` function
4. `requirePermission()` middleware checks user role against derived permissions

**Disabled operations:**
```javascript
// entityPermissions.create = null means no API access
{ minimumRole: null, minimumPriority: 0, disabled: true }
```

---

### Layer 8: RLS Engine

**Files:** `db/helpers/rls/index.js`, `rule-matcher.js`, `clause-builder.js`

**Grant-only model:** No matching rule = implicit deny (`WHERE 1=0`).

**Access types:**
- `null` → Full access (no filter)
- `direct` → `WHERE table.field = $context_value`
- `junction` → `EXISTS (SELECT 1 FROM junction_table WHERE ...)`
- `parent` → Delegates to parent entity's RLS rules

**Caching:** Deterministic outcomes (full-access, deny) cached per entity/operation/role.

**Integration:** `buildRLSFilter()` called in all service methods, injecting WHERE clauses.

---

### Layer 9: Swagger/API Docs

**Files:** `config/swagger.js`, `config/derived-constants.js`

**Auto-generation:**
- `getSwaggerEntityConfigs()` returns CRUD path templates
- `metadataFieldToOpenAPI()` converts field types to OpenAPI types
- `getSwaggerEntitySchemas()` builds component schemas

**Enum resolution (fixed in previous session):**
```javascript
if (field.enumKey) {
  const enumDef = enums[field.enumKey];
  base.enum = Array.isArray(enumDef) ? enumDef : Object.keys(enumDef);
}
```

---

### Layer 10: Frontend Consumption

**Files:** `frontend/lib/services/entity_metadata.dart`, `models/entity_metadata.dart`

**Loading:**
```dart
await EntityMetadataRegistry.instance.initialize();
// Loads assets/config/entity-metadata.json
```

**Usage:**
- `EntityMetadata` model maps to backend structure
- `FieldDefinition` drives form fields, validation, display
- `JsonMetadataProvider` reads permissions for nav visibility
- `NavMenuBuilder` uses metadata for menu structure

**Release mode:** Fails fast if JSON load fails (no stale defaults in production).

---

### Layer 11: Test Factory System

**Files:** `__tests__/factory/entity-registry.js`, `entity-factory.js`, `runner.js`, `scenarios/*`

**Auto-discovery:**
```javascript
const allMetadata = require("../../config/models");
function getAllEntityNames() {
  return Object.keys(allMetadata);
}
```

**Self-selecting scenarios:**
```javascript
function createWithRequiredFields(meta, ctx) {
  const caps = getCapabilities(meta);
  if (!caps.canCreate) return; // Scenario N/A
  // ... test implementation
}
```

**Data generation:** Delegates to `validation-data-generator.js` which reads from same validation rules as API.

---

### Layer 12: CI/CD Pipeline

**File:** `.github/workflows/ci-cd.yml`

**Jobs:**
| Job | Purpose |
|-----|---------|
| `backend-unit` | Unit tests + lint + **sync idempotency check** |
| `backend-integration` | Tests with PostgreSQL |
| `security` | `npm audit` + dependency review |
| `frontend` | Flutter analyze + test |
| `build-web` | Web build for Vercel |
| `build-android` | APK (main only) |
| `build-ios` | Unsigned IPA (main only) |
| `e2e` | Playwright against Railway |

**Critical check:**
```bash
npm run sync:all
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Sync scripts produced changes"
  exit 1
fi
```

---

## Adding New Fields: Checklist

To add a field to an existing entity:

1. **Edit metadata:** `backend/config/models/{entity}-metadata.js`
   - Add to `fields` object with type, constraints
   - Add to `fieldAccess` with role permissions
   - If required, add to `requiredFields` array

2. **Run sync:** `npm run sync:all`
   - Regenerates: schema.sql, entity-metadata.json, permissions.json, etc.

3. **Apply migration:** (for existing database)
   ```sql
   ALTER TABLE {table} ADD COLUMN {field} {type};
   ```

4. **Verify:**
   - `npm run test:unit --workspace=backend`
   - `npm run test:integration --workspace=backend`

5. **Commit:** Both metadata changes AND synced artifacts

---

## Adding New Entities: Checklist

1. **Create metadata:** `backend/config/models/{entity}-metadata.js`
   - Export with `entityKey` explicitly defined
   - Include all required fields per Layer 1 validation

2. **Run sync:** `npm run sync:all`
   - Auto-generates: schema DDL, frontend JSON, routes (if `useGenericRouter: true`)

3. **Apply schema:** Run `schema-generated.sql` or create migration

4. **Create test fixtures:** `backend/__tests__/fixtures/{entity}.fixtures.js`

5. **Run tests:** Factory auto-discovers and tests new entity

---

## Identified Strengths

1. **True SSOT:** Changing metadata cascades through all layers automatically
2. **Fail-fast validation:** Invalid configs crash at startup, not runtime
3. **Self-documenting:** Swagger/OpenAPI auto-generated from same source
4. **Security layering:** Permissions → RLS → Field Access (defense in depth)
5. **Test coverage:** Factory pattern ensures all entities tested consistently
6. **CI enforcement:** Sync idempotency prevents manual artifact editing

---

## No Critical Issues Found

The audit found no blocking issues. The architecture is well-designed and consistently implemented across all 12 layers.

---

## Field-Centric Migration (Completed April 6, 2026)

### Status: ✅ COMPLETE

All 34 entities have been migrated from legacy arrays to field-centric trait definitions.

### What Changed

**Before (Legacy Format):**
```javascript
requiredFields: ['name', 'email'],
searchableFields: ['name', 'description'],
filterableFields: ['id', 'name', 'status', 'created_at'],
sortableFields: ['id', 'name', 'created_at'],
immutableFields: [],
```

**After (Field-Centric):**
```javascript
fields: {
  ...TIER1_FIELDS.WITH_STATUS,
  name: withTraits(FIELD.NAME, TRAITS.REQUIRED, TRAIT_SETS.IDENTITY),
  description: withTraits(FIELD.DESCRIPTION, TRAITS.SEARCHABLE),
  customer_id: createForeignKey('customer', { required: true }),
}
```

### Entity Classification

| Category | Count | Pattern Used |
|----------|-------|--------------|
| Standard entities | 23 | `TIER1_FIELDS.CORE` or `TIER1_FIELDS.WITH_STATUS` |
| Junction tables | 5 | `createJunctionFields(entity1, entity2)` |
| System entities | 6 | `TIER1.*` individual fields + `withTraits` |

### Key Infrastructure

| Component | Purpose |
|-----------|---------|
| `TRAITS` | 6 atomic traits (REQUIRED, IMMUTABLE, SEARCHABLE, FILTERABLE, SORTABLE, READONLY) |
| `TRAIT_SETS` | 8 pre-composed sets (IDENTITY, PK, LOOKUP, FILTER_ONLY, TIMESTAMP, etc.) |
| `withTraits()` | Composes base field definition with traits |
| `TIER1_FIELDS.CORE` | id, is_active, created_at, updated_at |
| `TIER1_FIELDS.WITH_STATUS` | CORE + status enum |
| `createForeignKey()` | FK with configurable traits |
| `createJunctionFields()` | Complete M:M junction structure |

### Accessor Functions (Derivation)

All consumers now use accessor functions that derive values from field-level properties:

```javascript
const { getRequiredFields, getImmutableFields } = require('../metadata-accessors');

// Returns array derived from fields where required: true
const required = getRequiredFields(metadata);
```

### Consumers Updated

- `GenericEntityService` - Uses `getRequiredFields()`, `getImmutableFields()`
- `sync-entity-metadata.js` - Uses all 5 accessors for frontend JSON generation
- `validation-deriver.js` - Uses `getRequiredFields()`
- Test factories - Uses accessor functions for behavioral tests

### Verification

```bash
# No legacy arrays remain (except role-metadata.js protected record config)
grep -r "requiredFields:\|searchableFields:\|filterableFields:" backend/config/models/
# Should return 0 matches for root-level arrays

# All 5248 tests pass
npm test --workspace=backend
```

---

## Phase 2A-0 Infrastructure (Added April 3, 2026)

New infrastructure supporting the field-centric migration:

### Metadata Accessors (`config/metadata-accessors.js`)
Provides backwards-compatible access to field properties during migration:

| Function | Purpose |
|----------|---------|
| `getRequiredFields(meta)` | Returns required fields (field-level first, fallback to array) |
| `getImmutableFields(meta)` | Returns immutable fields |
| `getSearchableFields(meta)` | Returns searchable fields |
| `getFilterableFields(meta)` | Returns filterable fields |
| `getSortableFields(meta)` | Returns sortable fields |
| `getFieldAccess(meta, field)` | Returns field access rules |
| `getAllHooks(meta)` | Returns all beforeChange/afterChange hooks |
| `checkLegacyUsage(meta)` | Migration helper: identifies legacy patterns |

**Migration Support:** Logs deprecation warnings (disabled in test mode) when legacy patterns used.

### Action Handlers (`config/action-handlers.js`)
Generic interpreters for hook actions:

| Handler | Purpose |
|---------|---------|
| `notification` | Send notification to user(s) |
| `create_entity` | Create a new entity record |
| `update_entity` | Update an existing entity |
| `compute` | Recalculate a derived value |

**Key Functions:**
- `resolveValue(spec, context)` — Resolve field references or static values
- `resolveCompute(name, context)` — Resolve computed values (`now`, `currentUserId`)
- `executeAction(config, context)` — Execute a single action
- `executeActions(configs, context)` — Execute multiple actions in sequence

### Actions Registry (`config/actions.json`)
Central JSON registry for reusable workflow actions:

```json
{
  "$schema": "./actions-schema.json",
  "actions": {
    "action_id": { "type": "notification|create_entity|...", ... }
  }
}
```

**Validation:** JSON Schema (`actions-schema.json`) validates action definitions at load time.

---

## Recommendations (Optional Enhancements)

1. **Add ADR index:** Document architectural decisions in `docs/adr/`
2. **Schema migration tooling:** Consider Knex migrations for production DB changes
3. **Metadata versioning:** Track metadata.json schema version for frontend compatibility
4. **Performance monitoring:** Add RLS clause generation timing metrics

---

*This audit confirms the Tross metadata SSOT system is ready for production field/entity additions.*
