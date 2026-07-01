# P1 Remediation Plan — Security · Correctness · Test Integrity

**Status:** 📋 PLANNED — not started
**Phase:** P1 (follows P0 hardening; precedes P2 architecture/cleanup)
**Prerequisite:** P0 complete — commit `78664fe` (`feat(security): P0 hardening`)
**Created:** June 30, 2026
**Owner:** _unassigned_

---

> **🗂️ Living plan.** This is an active plan for work not yet started. It is safe
> to edit, re-sequence, and check off as steps land. The **code, tests, and git
> history are the source of truth** for actual status.

## Purpose

P0 closed every security/correctness *hardening* item (token encryption, RLS
invariant, canonical error envelope, dev-auth tightening, bcrypt guard) and all
suites are green. **P1** is the next tier: a batch of smaller, high-signal
**security + correctness + test-integrity** fixes. Larger architecture/perf/cleanup
work is **P2** (see the bottom of this doc).

Same working rhythm as P0: **each step is its own commit, with the full suite green
before moving to the next.**

## Known-good baseline (run this first, before any P1 work)

Prove the committed starting point is still green so any later red is provably from
P1, not pre-existing drift.

```bash
# Backend unit (no DB)              → expect 3087 passed, 101 suites
cd backend && npm run test:unit

# Backend integration (needs Docker test DB on :5433)
npm run db:test:start                          # from repo root
cd backend && npm run test:integration         # → expect 2309 passed, 29 suites

# Frontend                          → expect 5801 passed
cd frontend && flutter test

# Optional quick gates
cd backend && npm run lint
cd frontend && dart analyze
```

`NODE_ENV`/`JWT_SECRET` are set by the test setup automatically. The integration
run is the only one needing an external dependency (Docker).

## Locked decisions (resolved 2026-06-30)

- **H7 principle:** runtime authorization → the **DB role-hierarchy loader**;
  **dev-auth + test-users + tests** → `backend/config/role-definitions.js`
  **directly** (intentional non-DB static). Remove the `constants.js` re-export.
  **Dev-auth "log in as any role" is confirmed preserved** — it needs the *array*
  form of `ROLE_HIERARCHY` (from `role-definitions.js`); the loader returns an
  *object* map, so the fix is an import-path change only, zero behavior change.
  Non-DB roles remain **dev-only** (`devAuthEnabled = !production`, read-only tokens).
- **M1/M13:** field redaction belongs in the **service layer**. **No signature
  change** — the service already receives `rlsContext`, which carries
  `role` + `userId` + `operation`. Delivered in **two tiers** (below).
- **Code-value normalization:** **full sweep** of `AppError`/emitted codes to the
  canonical `ERROR_CODES`, via a shared constant, with tests updated in lockstep.
- **God-object (H1):** **not** in P1 — it is a dedicated **P2 "Decomposition
  mini-project"** with its own review.

## Step-by-step batch

| # | Item | Type | Area | Risk |
|---|------|------|------|------|
| 1 | T2 — gitignore generated schema | hygiene | repo | trivial |
| 2 | M12 — field-access fail-closed | security | backend | tiny |
| 3 | M2 — IN/NIN array cap | security (DoS) | backend | small |
| 4 | M3 — role-metadata legacy immutableFields | cleanup | backend | small |
| 5 | H7 — role SSOT drift | correctness | backend | medium (blast radius) |
| 6 | H3 — transaction-boundary doc/guard | correctness | backend | small |
| 7 | M1/M13 Tier 1 — service field redaction | security | backend | medium |
| 8 | M1/M13 Tier 2 — nested relationship redaction | security | backend | medium |
| 9 | Test integrity — H17/H18/H19/H2 | test quality | backend | medium (test-only) |
| 10 | Code-value normalization — full sweep | consistency | backend/frontend | medium (mechanical) |

---

### Step 1 — T2: stop tracking the generated schema
- **Problem:** `backend/generated/schema-generated.sql` is git-tracked and **not**
  ignored; it's a derived artifact that shouldn't be in version control.
- **Fix:** `git rm --cached backend/generated/schema-generated.sql`; add
  `backend/generated/schema-generated.sql` (or `backend/generated/`) to
  `.gitignore`.
- **Verify:** the schema-generate/sync script still recreates it locally and in CI;
  confirm nothing imports the committed path expecting it present.
- **Done when:** `git ls-files` no longer lists it; regeneration recreates it;
  suites green.

### Step 2 — M12: field-access fails closed
- **Problem:** `backend/utils/field-access-controller.js` → `hasFieldPermission`
  only guards `requiredRole === 'none'`. An **undefined** `requiredRole` (e.g.
  `canAccessField` called with an unknown operation) resolves to the lowest role
  index and returns **true** — fail-**open** on write-checks.
- **Fix (root):** in `hasFieldPermission`, `if (!requiredRole || requiredRole === 'none') return false;`.
  `getFieldsForOperation` already guards `requiredRole && …`, so it's unaffected.
- **Tests:** `canAccessField(undefined operation) → false`;
  `hasFieldPermission(role, undefined) → false`; existing field-access tests green.

### Step 3 — M2: cap IN / NIN filter arrays (DoS guard)
- **Problem:** `backend/services/entity/query-builder-service.js` →
  `buildFilterClause` `in`/`nin` branch splits comma values with **no length cap**
  → an attacker can force `IN ($1 … $10000)`. (Parameterized, so no injection —
  but a resource-abuse vector.)
- **Fix:** add `MAX_IN_VALUES` (e.g. `100`, in `config/constants.js`); if
  `values.length > MAX` throw
  `AppError('Too many values for "<op>" filter (max 100)', 400, ERROR_CODES.VALIDATION_FAILED)`.
- **Tests:** at-cap succeeds; over-cap → 400 (unit on `buildFilterClause` + an
  integration filter test).

### Step 4 — M3: finish the role-metadata migration
- **Problem:** `backend/config/models/role-metadata.js` still uses the legacy
  `immutableFields: ['name','priority']` array (1 of 34 not migrated to
  field-centric `immutable: true`) → emits a deprecation warning every run.
- **Fix:** mark `name` and `priority` fields `immutable: true`; delete the array.
- **Done when:** no deprecation warning; role validation still passes.

### Step 5 — H7: remove role-hierarchy dual authority
- **Problem:** `backend/config/constants.js` re-exports the **static**
  `ROLE_HIERARCHY`/`ROLE_PRIORITY_TO_NAME` (from `role-definitions.js`), while the
  runtime SSOT is the DB via `role-hierarchy-loader.js`. Because `constants.js` is
  imported everywhere, this quietly elevates the fallback and risks drift.
- **Fix (per the locked H7 principle):**
  - Remove the two re-exports from `constants.js`.
  - `backend/routes/dev-auth.js` and `backend/config/test-users.js` → import the
    static list **directly** from `role-definitions.js` (intentional non-DB).
  - Tests asserting the canonical definition → import from `role-definitions.js`.
  - Any runtime-authorization consumer → use the loader.
- **Care:** run the **full** suite (broadest blast radius of the batch).
- **Tests:** existing role tests green; dev-auth "any role" flow still works.

### Step 6 — H3: document + guard the create/update transaction boundary
- **Problem:** `generic-entity-service` `create()`/`update()` use auto-commit
  `db.query`, then run `afterChange` hooks + audit **post-commit** (only `delete()`
  wraps `BEGIN/COMMIT/ROLLBACK`). Defensible (reactive) but undocumented and
  nested hook ops aren't rollback-safe.
- **Fix (P1 scope = document + guard, not a rewrite):** clear JSDoc on the
  post-commit semantics; ensure nested hook-invoked service ops pass `skipHooks`
  (verify the recursion guard). Full transactionalization is **P2**.
- **Tests:** assert `afterChange` fires after persist and `skipHooks` prevents
  recursion.

### Step 7 — M1/M13 Tier 1: field redaction in the service (top-level)
- **Problem:** role-based field redaction (`filterDataByRole`) is applied **only**
  in `backend/routes/entities.js` (5 sites) — direct service callers skip it.
- **Fix:** apply redaction at the **output boundary** of the service read paths
  (`findById`, `list`, and the entity returned by `create`/`update`) using
  `filterDataByRole(data, metadata, rlsContext.role, 'read')`. **Skip when
  `rlsContext` is null** (system/internal calls) — mirrors how RLS skips system
  contexts. Then remove the now-redundant route-level calls.
  - No signature change: `rlsContext.role`/`.operation` already available.
  - Always redact output with `'read'` (what the user may *see*).
- **Tests:** direct service read redacts for a low-privilege role; system context
  (null) returns full data; route responses unchanged.

### Step 8 — M1/M13 Tier 2: redact nested relationship rows
- **Problem:** included relationship data (from `relationship-loader`) isn't
  redacted — each related row should be filtered by **its own** target metadata.
- **Fix:** redact nested relationship results using each relationship's target
  entity metadata + the same `rlsContext.role`. Closes the relationship-data gap
  (ties to H4).
- **Tests:** an included relationship omits fields the requester can't read.

### Step 9 — Test integrity (test-only; no production risk)
- **H17:** `backend/__tests__/fixtures/roles.js` uses non-canonical roles
  (`client` not `customer`, missing `customer`/`manager`, inverted priorities).
  Reconcile to the canonical 5 (customer 1 … admin 5) + correct priorities; fix
  dependent tests.
- **H18:** `factory/scenarios/hooks.scenarios.js` asserts only status ranges;
  rewrite to assert *which* hook fired (approval → 202 + approvalInfo + task;
  cascade-depth cap = 3; blocking `beforeChange`).
- **H19:** `rls.scenarios.js` `sensitiveFieldsHidden` — populate the field in the
  DB, verify it's present, then verify the API omits it (not just absent).
- **H2:** add hook **integration** unit tests (beforeChange-blocks-create,
  afterChange non-blocking fires, `skipHooks` recursion guard, cascade cap).

### Step 10 — Code-value normalization (full sweep)
- **Problem:** the error-envelope *shape* is canonical (P0), but `AppError` code
  *strings* are ad-hoc (`UNAUTHORIZED`, `BAD_REQUEST`, `INTERNAL_ERROR`,
  `NOT_FOUND`) rather than the canonical `ERROR_CODES`
  (`AUTH_REQUIRED`, `VALIDATION_FAILED`, `SERVER_ERROR`, `RESOURCE_NOT_FOUND`).
- **Fix:** sweep all `new AppError(...)` / emitted codes to `ERROR_CODES`; have
  callers import the shared `ERROR_CODES` constant (no hand-typed strings); update
  every test asserting an old code string in lockstep. Preserve intentional
  domain codes (e.g. `IDEMPOTENCY_MISMATCH`).
- **Also:** point `error-response-security.test.js` at the **real** server error
  handler (it currently tests an inline mock).

---

## Deferred to P2 (architecture / performance / cleanup — not this batch)

- **H1** — decompose the `generic-entity-service` god object (dedicated
  mini-project: strangler extraction of `HookEvaluator` / `FilterBuilder` /
  `ValidationOrchestrator` / `PaginationBuilder` / `CascadeHandler` /
  `DerivedValues`; `RelationshipLoader` is the precedent). Sequence **after** P1.
- **H14** — move the last frontend per-entity hardcoding (`work_order` field
  dependency, `user` action) into metadata.
- **H16** — FK lookup N+1 on initial table load → prefetch/batch.
- **T4 / T6 / T7** — remove deprecated `isJunction` emit; delete inert `auditable`
  trait; delete dead `POLYMORPHIC` structure-type.
- **T8** — vendor-decouple `integration_sync` (`qb_*`/`stripe_*` → generic table;
  needs a migration).
- **M4–M11, M16–M30, L1–L3** — assorted polish (CSP dev guard, per-file upload
  size, table virtualization, a11y `Semantics`, FE fail-loud envelope, field
  validators, etc.).

## Verified non-issues (do not action)

- **M15** — export `GET /:entity/fields` is already gated by
  `authenticateToken + extractEntity + requirePermission('read')`; `enforceRLS`
  is correctly N/A for a metadata-only endpoint (no rows). Dropped from the backlog.

---

_Cross-reference: the full findings record (Waves 1–4, H/M/L, T1–T8, P0 log) lives
in the review notes; this plan is the actionable P1 subset._
