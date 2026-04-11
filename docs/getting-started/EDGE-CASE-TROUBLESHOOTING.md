# Tross Edge Case Troubleshooting Guide

**Purpose:** Eliminate naiveté—when things go wrong, you know exactly where to look.

---

## 1. Error Handling: "Why is my error coming back wrong?"

### Architecture

```
AppError(msg, statusCode, code)
    ↓
Route throws / Middleware catches
    ↓
Global error handler (server.js:225)
    ↓ (pattern matching if no statusCode)
    ↓ "not found" → 404
    ↓ "invalid/required" → 400
    ↓ Default → 500
    ↓
ResponseFormatter.format() → JSON response
```

### Troubleshooting

| Symptom | Look Here |
|---------|-----------|
| All errors returning 500 | Missing `statusCode` on thrown error |
| Wrong error code | Check pattern matching in [server.js#L231-280](backend/server.js#L231) |
| DB constraint errors wrong | Check [db-error-handler.js](backend/utils/db-error-handler.js) PG error codes |
| Missing field name in error | `extractFieldFromError()` regex failed - constraint naming incorrect |

### Key Files
- [backend/utils/app-error.js](backend/utils/app-error.js) - Error class
- [backend/server.js#L225](backend/server.js#L225) - Global handler
- [backend/utils/db-error-handler.js](backend/utils/db-error-handler.js) - PG error mapping

---

## 2. Multi-hop RLS: "Customer can't see records through junction"

### Architecture

```
rlsRules: [{ access: { type: 'junction', junction: {
  table: 'customer_units',
  localKey: 'id',
  foreignKey: 'unit_id',
  filter: { customer_profile_id: 'customer_profile_id' },
  through: { ... } // Optional nested junction
}}}]
    ↓
matchRules(rules, role, operation)
    ↓
buildJunctionClause()
    ↓ (recurses if 'through' present)
    ↓
EXISTS (SELECT 1 FROM junction WHERE ... AND nested_clause)
```

### Troubleshooting

| Symptom | Look Here |
|---------|-----------|
| No results for customer | Check `customer_profile_id` is in rlsContext |
| All rules returning FALSE | Profile ID is null in rlsContext (`extractProfileIds()`) |
| "depth limit exceeded" | Chain > 3 hops (MAX_HOPS in constants.js) |
| Filter not matching | Wrong context key (camelCase vs snake_case) |

### Key Files
- [backend/db/helpers/rls/clause-builder.js#L145](backend/db/helpers/rls/clause-builder.js#L145) - `buildJunctionClause()`
- [backend/db/helpers/rls/rule-matcher.js](backend/db/helpers/rls/rule-matcher.js) - `matchRules()`
- [backend/middleware/row-level-security.js](backend/middleware/row-level-security.js) - `extractProfileIds()`

### Debug

```javascript
// Enable in constants.js
RLS_ENGINE: { DEBUG: true }
// Look for: 'RLS junction clause built', 'RLS rules matched'
```

---

## 3. Polymorphic Entities: "File attachment RLS failing"

### Architecture

```
Route: /work_orders/:id/files
    ↓
setPolymorphicContext('work_order')(req, res, next)
    ↓
req.polymorphicContext = { parentType: 'work_order', parentId: 123 }
    ↓
enforceRLS reads rlsContext.polymorphic
    ↓
buildPolymorphicParentClause()
    ↓
(entity_type = 'work_order' AND EXISTS (parent RLS check))
```

### Troubleshooting

| Symptom | Look Here |
|---------|-----------|
| "parentType required" error | Missing `setPolymorphicContext()` middleware |
| Wrong parent type | Route param name mismatch (default 'id') |
| Parent RLS fails | Parent entity's rlsRules for this role |
| "allowedTypes" rejection | Metadata has `polymorphic.allowedTypes` set |

### Key Files
- [backend/middleware/sub-entity.js](backend/middleware/sub-entity.js) - `setPolymorphicContext()`
- [backend/db/helpers/rls/clause-builder.js#L502](backend/db/helpers/rls/clause-builder.js#L502) - `buildPolymorphicParentClause()`
- [backend/config/models/file-attachment-metadata.js](backend/config/models/file-attachment-metadata.js) - Example

---

## 4. Cascade Delete: "Cannot delete - dependents exist"

### Architecture

```
metadata.dependents: [
  { table: 'audit_logs', foreignKey: 'resource_id', strategy: 'cascade' },
  { table: 'work_orders', foreignKey: 'customer_id', strategy: 'restrict' },
  { table: 'comments', foreignKey: 'author_id', strategy: 'nullify' },
]
    ↓
GenericEntityService.delete() → cascadeDeleteDependents()
    ↓ (in transaction)
    ↓ For each dependent:
    ↓   RESTRICT: Count → throw if > 0
    ↓   CASCADE: DELETE
    ↓   NULLIFY: UPDATE SET fk = NULL
    ↓   SOFT: UPDATE SET is_active = false
    ↓
DELETE parent
    ↓
COMMIT (or ROLLBACK on error)
```

### Troubleshooting

| Symptom | Look Here |
|---------|-----------|
| "Cannot delete: N dependents exist" | Add cascade or nullify strategy |
| Orphaned records | Missing dependent entry in metadata |
| Polymorphic cascade fails | Check `polymorphicType.value` matches DB |

### Key Files
- [backend/db/helpers/cascade-helper.js](backend/db/helpers/cascade-helper.js)
- [backend/services/generic-entity-service.js#L1274](backend/services/generic-entity-service.js#L1274) - `delete()`

---

## 5. Audit Logging: "No audit trail / wrong user"

### Architecture

```
Route handler:
  const auditContext = buildAuditContext(req);
    ↓
  GenericEntityService.create(entity, data, { auditContext })
    ↓
Internal:
  auditService.logCreate(tableName, id, auditContext)
    ↓
  INSERT INTO audit_logs (resource_type, resource_id, user_id, action, ...)
```

### Troubleshooting

| Symptom | Look Here |
|---------|-----------|
| No audit entries | `auditContext` not passed to service |
| user_id is null | req.user.userId missing / not decoded |
| IP address wrong | Missing X-Forwarded-For handling for proxies |
| Old values missing | `oldValues` not captured before update |

### Key Files
- [backend/db/helpers/audit-helper.js#L153](backend/db/helpers/audit-helper.js#L153) - `buildAuditContext()`
- [backend/services/audit-service.js](backend/services/audit-service.js)

---

## 6. Auth Flow: "Dev token rejected / Auth0 user not found"

### Architecture

```
Authorization: Bearer <token>
    ↓
verifyJwt(token, JWT_SECRET)
    ↓
decoded.provider === 'development'?
    ↓                         ↓
    YES                       NO (Auth0)
    ↓                         ↓
Look up in TEST_USERS    UserDataService.findOrCreateUser()
    ↓                         ↓
req.dbUser = testUser    req.dbUser = dbUser + JWT role
    ↓
SECURITY: Dev tokens are READ-ONLY
    ↓
If POST/PUT/DELETE → 403 Forbidden
```

### Troubleshooting

| Symptom | Look Here |
|---------|-----------|
| "Dev token in production" | `devAuthEnabled` should be false |
| "Dev user not found" | Sub/email not in TEST_USERS config |
| "Read-only" on writes | Dev tokens can't mutate (by design) |
| Auth0 user 404 | `findOrCreateUser` failed, check DB |
| Role mismatch | JWT role vs DB role conflict |

### Key Files
- [backend/middleware/auth.js](backend/middleware/auth.js)
- [backend/config/test-users.js](backend/config/test-users.js )
- [backend/services/user-data.js](backend/services/user-data.js) - `findOrCreateUser()`
- [backend/config/app-config.js](backend/config/app-config.js) - `devAuthEnabled`

---

## 7. Environment Config: "Missing env variable / wrong default"

### Architecture

```
env-manifest.js (SSOT for all env vars)
    ↓
Categories:
  SECURITY_CRITICAL: Never defaults, fail-fast
  OPERATIONAL: Defaults in dev/test only
  OPTIONAL: Always has defaults
    ↓
getEnvValue('VAR_NAME') or process.env.VAR_NAME
    ↓
app-config.js centralizes all access
    ↓
validateEnvironment() at startup → crash if missing critical vars
```

### Troubleshooting

| Symptom | Look Here |
|---------|-----------|
| "JWT_SECRET must be set" | No default allowed, even locally |
| Auth0 config missing | Skip validation in test mode only |
| DB connection fails | Check DB_* env vars vs constants.js defaults |
| Wrong environment detected | `NODE_ENV` value vs `ENVIRONMENTS` enum |

### Key Files
- [backend/config/env-manifest.js](backend/config/env-manifest.js) - Env var SSOT
- [backend/config/app-config.js](backend/config/app-config.js) - Centralized config
- [backend/config/app-mode.js](backend/config/app-mode.js) - Environment detection

---

## 8. Database Migrations: "Schema out of sync"

### Architecture

```
migrations/
  000_create_migrations_table.sql
  001_create_system_settings.sql
  002_rename_assigned_to_scheduled.sql
    ↓
npm run db:migrate
    ↓
run-migrations.js:
  1. Ensure schema_migrations table exists
  2. Get applied migrations from DB
  3. Get migration files from disk
  4. Apply pending in order (transactional)
  5. Record in schema_migrations with checksum
```

### Troubleshooting

| Symptom | Look Here |
|---------|-----------|
| "Migration already applied" | Checksum mismatch (file was edited) |
| Missing column | Migration not run / schema.sql out of sync |
| FK constraint fails | Migration order wrong (deps not created yet) |
| Rollback needed | Check DOWN comments in migration file |

### Commands
```bash
# Run pending migrations
npm run db:migrate

# Dry run (see what would run)
npm run db:migrate -- --dry-run

# Check current state
psql -c "SELECT * FROM schema_migrations ORDER BY version"
```

### Key Files
- [backend/scripts/run-migrations.js](backend/scripts/run-migrations.js)
- [backend/migrations/](backend/migrations/)
- [backend/schema-generated.sql](backend/schema-generated.sql) - Full schema (for fresh DBs)

### Fresh DB vs Migration
- **Fresh DB:** Run `schema-generated.sql` + all migrations
- **Existing DB:** Run only new migrations
- **CI:** Uses fresh DB each time (test isolation)

---

## Quick Reference: Where to Look

| Problem Area | First File | Second File |
|--------------|------------|-------------|
| 500 errors | server.js (global handler) | app-error.js |
| RLS filtering | clause-builder.js | rule-matcher.js |
| Auth failures | auth.js | jwt-helper.js |
| Create/Update issues | generic-entity-service.js | validation-deriver.js |
| Permission denied | permissions-loader.js | permissions-deriver.js |
| Missing fields | entity-metadata.js | validation-schema-builder.js |
| Sync failures | sync-entity-metadata.js | generate-schema.js |
| Test failures | factory/runner.js | factory/scenarios/* |

---

## Common Gotchas

1. **snake_case vs camelCase**: RLS context uses `customer_profile_id`, not `customerProfileId`
2. **Profile ID null**: User has no profile → direct access rules fail → check for staff fallback
3. **Enum not in Swagger**: Missing `enumKey` resolution in `metadataFieldToOpenAPI()`
4. **Dev token read-only**: By design—authenticate with Auth0 to mutate data
5. **Migration checksum**: Never edit applied migrations—create new ones
6. **CI sync check**: `npm run sync:all` must produce no git changes
7. **PARENT_DERIVED RLS**: Requires `setPolymorphicContext()` middleware on route

---

*This document covers the edges of the system. For happy-path understanding, see [METADATA-SSOT-AUDIT.md](METADATA-SSOT-AUDIT.md).*
