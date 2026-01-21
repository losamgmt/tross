# Refactoring Agenda

> **Status:** HISTORICAL DOCUMENT  
> This document tracked the unified middleware refactoring.  
> **Phases 1-3: COMPLETE.** Phase 4 items are optional test polish.  
> For current architecture, see [ARCHITECTURE.md](architecture/ARCHITECTURE.md).

---

## Foundational Principles

Before reading any task, internalize these principles. They govern every decision.

### One Task Per Unit, One Unit Per Task

Every function does exactly ONE thing. Every responsibility has exactly ONE implementation.

**When duplication exists:** UNIFY into a single implementation. Delete the extras.

**Never create wrappers.** If `functionA` calls `functionB` with slightly different arguments, you don't have composition—you have duplication. Make `functionB` inherently flexible, then delete `functionA`.

### Unified Data Flow

All middleware reads from ONE canonical location. No optional parameters. No fallbacks.

```javascript
// ❌ WRONG: Optional parameter with fallback
const enforceRLS = (resource) => (req, res, next) => {
  const r = resource || req.entityMetadata?.rlsResource;  // TWO PATHS!
};

// ✅ RIGHT: One path, one source
const enforceRLS = (req, res, next) => {
  const resource = req.entityMetadata.rlsResource;  // ONLY source
};
```

**Usage drives implementation.** All callers pass data THE SAME WAY. The implementation has ONE path because there IS only one input shape.

### Fail Hard on Misconfiguration

Missing `req.entityMetadata`? That's a bug—the route is misconfigured. Don't "handle" it with fallbacks. Throw an error.

### Name Types Are Field-Level Metadata

`HUMAN`, `SIMPLE`, `COMPUTED` describe how the **name field** is constructed—like a validation rule for that specific field. This is NOT entity classification.

---

## SSOT Module Reference

These modules are the Single Sources of Truth. NO duplication of their contents elsewhere.

| Module | Purpose | Rule |
|--------|---------|------|
| `roles` table (database) | Role definitions with `priority` | DATABASE is the source of truth |
| `status-enums.js` | All status field values | NO IMPORTS (dependency-free) |
| `entity-types.js` | Name field type enum | NO IMPORTS (dependency-free) |
| `config/models/*.js` | All entity metadata | One file per entity |
| `derived-constants.js` | Computes from metadata | Lazy-load, cache, getters |

> **Note:** `role-definitions.js` is a **FALLBACK ONLY** for tests and pre-DB bootstrap.
> The database `roles` table is the true SSOT.
> At server startup, `role-hierarchy-loader.js` reads roles from DB and caches in memory.
> Production permission checks use this cached data, NOT the fallback constants.
> See `backend/config/role-hierarchy-loader.js` for the initialization pattern.

---

## Phase 1: Unified Middleware ✅ COMPLETE

**Goal:** One code path for permission and RLS. Delete wrapper functions.

**Status:** COMPLETED (Jan 16, 2026)

### 1.1 Unify requirePermission ✅

- `requirePermission(operation)` - reads resource from `req.entityMetadata.rlsResource`
- `genericRequirePermission` - DELETED
- Routes use `attachEntity` → `requirePermission('read')` pattern

### 1.2 Unify enforceRLS ✅

- `enforceRLS` (no args) - reads resource from `req.entityMetadata.rlsResource`  
- `genericEnforceRLS` - DELETED
- Routes use `attachEntity` → `enforceRLS` pattern

### 1.3 entities.js Route Factory ✅

Uses `attachEntity` → unified middleware pattern.

### 1.4 export.js and stats.js ✅

Uses `extractEntity` → unified middleware pattern.

### 1.5 Entity Context on Other Routes ✅

`audit.js`, `files.js`, `preferences.js`, `roles-extensions.js` - All use appropriate entity attachment.

**Phase 1 Success Criteria Met:**
- ✅ ZERO conditional logic in middleware for "which input shape"
- ✅ ONE `requirePermission(operation)` function (no resource arg)
- ✅ ONE `enforceRLS` function (no args)
- ✅ ZERO "generic" wrapper functions
- ✅ EVERY entity-aware route sets `req.entityMetadata` via middleware

---

## Phase 2: Unified Request Context ✅ COMPLETE

**Goal:** All validated data in `req.validated.*`

**Status:** ✅ COMPLETE (2025-01-16)

### 2.1 Standardize Validated Data Location ✅

| Property | Purpose | Status |
|----------|---------|--------|
| `req.validated.body` | Validated request body | ✅ |
| `req.validated.query` | Validated query params | ✅ |
| `req.validated.id` | Validated ID param | ✅ |
| `req.validated.pagination` | Pagination config | ✅ |

---

### 2.2 Fix Inconsistent Naming ✅

**Changes Applied:**
- ✅ `req.validatedBody` → `req.validated.body` (generic-entity.js, entities.js)
- ✅ Removed duplicate ID validation from `extractEntity` (SRP)
- ✅ Manual `parseInt(req.params.id)` → Use `validateIdParam` middleware

---

### 2.3 Use validateIdParam Consistently ✅

**Files Updated:**
- ✅ `admin.js` - 3 routes converted to `validateIdParam({ paramName: 'userId|sessionId' })`
- ✅ `auth.js` - 1 route converted to `validateIdParam({ paramName: 'userId' })`
- ✅ `entities.js` - Already using `validateIdParam()` in route chains

**Pattern:** `validateIdParam({ paramName })` → sets `req.validated[paramName]`

---

## Phase 3: Cleanup ✅ COMPLETE

**Status:** COMPLETED (Jan 16, 2026)

### 3.1 Rename Entity Category to Name Type ✅

**Completed:** `NAME_TYPES` in `entity-types.js`, `nameType` in metadata files.

---

### 3.2 Standardize Service Exports ✅

Already following pattern - static classes for stateless, singletons for stateful.

---

### 3.3 Consolidate Audit Services ✅

`AdminLogsService` merged into `AuditService` - single service handles all audit queries.

---

### 3.4 Create Rate Limit Factory ⏭️

**Deferred:** Low priority - current handlers work correctly.

---

### 3.5 Remove Dead Code ✅

- ✅ Orphaned entity validators in `body-validators.js` - REMOVED
- ✅ Unused `validateSlugParam` - REMOVED from param-validators.js
- ✅ Legacy `validateFilters` - REMOVED (replaced by `validateQuery`)
- ✅ `FIELD_TO_RULE_MAP` - Replaced with `SYSTEM_MANAGED_FIELDS` Set
- ✅ `preferences-validators.js` - Fixed wrong import (now from metadata)

---

## Phase 4: Tests and Docs ⏭️ DEFERRED

**Status:** Low priority polish - tests already passing.

### 4.1 Tests Use Constants

Most test files already import from SSOT modules. Remaining hardcoded strings are low-risk.

---

### 4.2 Derive Test Table Names

`test-db-setup.js` could generate TRUNCATE list from metadata - low priority optimization.

---

### 4.3 Consolidate Test Fixtures

Minor duplication in fixtures - works correctly as-is.

---

## ✅ REFACTORING COMPLETE

**Phases 1-3 DONE.** Phase 4 items are low-priority polish that can be addressed opportunistically.

---

## Execution Order

1. **Phase 1** (Middleware) - Core architectural change
2. **Phase 2** (Request Context) - Consistency cleanup
3. **Phase 3** (Cleanup) - Remove cruft
4. **Phase 4** (Tests) - Align tests with new patterns

**Rule:** Each change leaves tests passing. Run `npm test` after each step.

---

## Success Criteria

After all changes:

- [x] ZERO conditional logic in middleware for "which input shape"
- [x] ONE `requirePermission(operation)` function (no resource arg)
- [x] ONE `enforceRLS` function (no args)
- [x] ZERO "generic" wrapper functions
- [x] EVERY entity-aware route sets `req.entityMetadata` via middleware
- [x] EVERY validated input lives under `req.validated`
- [x] Dead code removed (orphaned validators, unused exports)
- [ ] ALL constants imported from SSOT modules (tests - low priority)
- [ ] ZERO hardcoded role/status/entity strings in codebase (tests - low priority)
