# P1 Remediation Plan — Security · Correctness · Test Integrity

**Status:** 🚧 IN PROGRESS — Steps **1–9 ✅ COMPLETE** (2026-07-02); the **afterChange-action follow-up is ✅ RESOLVED** (2026-07-07 — reframed into a metadata-driven notification *foundation*; business-flow hook wiring is deferred by design). **Step 10 (code-value / ERROR_CODES sweep) remains.** See "Progress" for the full commit map, current gate baselines, and cold-resume instructions.
**Phase:** P1 (follows P0 hardening; precedes P2 architecture/cleanup)
**Prerequisite:** P0 complete — commit `78664fe` (`feat(security): P0 hardening`)
**Created:** June 30, 2026 · **Updated:** July 7, 2026
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

## Locked decisions (resolved 2026-06-30, refined 2026-07-02)

- **H7 principle:** runtime authorization → the **DB role-hierarchy loader**;
  **dev-auth + test-users + tests** → `backend/config/role-definitions.js`
  **directly** (intentional non-DB static). Remove the `constants.js` re-exports.
  **Dev-auth "log in as any role" is confirmed preserved** — it needs the *array*
  form of `ROLE_HIERARCHY` (from `role-definitions.js`); the loader returns the
  same array, so the fix is an import-path change only, zero behavior change.
  Non-DB roles remain **dev-only** (`devAuthEnabled = !production`, read-only tokens).
  Verified: only **3 files** import these from `constants`; also `ROLE_NAME_TO_PRIORITY`
  / `ROLE_DESCRIPTIONS` are re-exported (check consumers before removing).
- **M1/M13 (refined 2026-07-02 — supersedes the earlier "no signature change"):**
  field redaction belongs in the **service layer, across all operations**. The
  service methods are currently *inconsistent* (reads take a positional
  `rlsContext`; mutations take an `options` bag with none). **Unify all 8 methods to
  a trailing `options` bag with a nested `options.rlsContext`** (ADR-011 object);
  intrinsic params (`entityName`, `id`, `field`, `value`, `data`, `operations`) stay
  positional. This also deletes `findById`'s dual-detection heuristic. Redaction runs
  in-service via one `_redactForContext(data, metadata, options.rlsContext)` helper,
  applied only when `options.rlsContext?.role` is set (internal/no-role callers get
  full data). Executed as **7a (unify signatures) → 7b (add redaction) → 8 (nested
  relationship redaction)**. 7a is a breaking read-method signature change — **risk-
  laden; done in isolation.**
- **Code-value normalization (full sweep):** normalize all ad-hoc `AppError` codes to
  canonical `ERROR_CODES`; **extract `ERROR_CODES` into its own module**
  (`config/error-codes.js`) imported by `response-formatter` + every `AppError`
  caller; **centralize domain codes** (`IDEMPOTENCY_MISMATCH`, `APPROVAL_REQUIRED`,
  `IMMUTABLE_FIELD_VIOLATION`, `NOT_IMPLEMENTED`, `TOKEN_REFRESH_FAILED`) into a
  `DOMAIN_*` section; **split `UNAUTHORIZED`** case-by-case into `AUTH_INVALID_TOKEN` /
  `AUTH_TOKEN_EXPIRED` / `AUTH_REQUIRED`; flip `AppError`'s default `'INTERNAL_ERROR'`
  → `'SERVER_ERROR'`. Update all asserting tests in lockstep.
- **God-object (H1):** **not** in P1 — it is a dedicated **P2 "Decomposition
  mini-project"** with its own review.

> **Execution note (2026-07-02):** Steps **1–6** run now (each its own commit, full
> suite green between). **7a, 7b, 8** (the risk-laden signature unification +
> redaction) are **gated behind a dedicated re-inventory / reset checkpoint** and
> executed in isolation. Steps 9–10 follow.

## Progress (updated 2026-07-07)

Steps **1–9 complete** + the **afterChange-action follow-up resolved** (notification
foundation, 2026-07-07) — each sub-step its own commit, each gated. Current green
baseline: backend unit **3115 / 102 suites**, backend integration **2306 / 30
suites**, frontend untouched (a test-file rename only). Working tree **clean**; **35
commits ahead of `origin/main` — local-only, no push (locked decision #1)**.

### ⭐ Cold-resume — start here
1. Confirm state: `git status` (clean), `git --no-pager log --oneline -12` (HEAD = `1e6fba9`).
2. Start the Docker test DB (`npm run db:test:start` from repo root), then re-run the
   baselines in "Known-good baseline" above — expect **unit 3115/102**, **integration 2306/30**.
3. Remaining work: **Step 10** (ERROR_CODES sweep) — the **afterChange follow-up is done**
   (notification foundation; see below). Then P1 is done.
4. Full operational detail (per-step notes, blast-radius sweeps, decisions) lives in
   agent memory `/memories/repo/p1-plan-and-handoff.md` — including the notification
   foundation contract and the **schema.sql drift** concern (below).

### Commit map (all P1 commits, newest last)
| Step | Commit | Outcome |
|------|--------|---------|
| plan | `5f10ac6` · `37bc8b5` | P1 plan + locked 2026-07-02 decisions |
| 1 · T2 | `4fdd7cd` | untracked + ignored `backend/generated/` |
| 2 · M12 | `73fd544` | `hasFieldPermission` fails closed; +3 tests |
| 3 · M2 | `0bd25ae` | IN/NIN filter cap 100 → 400; +3 tests |
| 4 · M3 | `71d42d7` | ✅ verified non-issue (no change) |
| 5 · H7 | `13c9180` | removed role re-exports from `constants` |
| 6 · H3 | `cf33453` | documented create/update txn-boundary semantics |
| 7a.1 | `d5c9140` | unify `findById`/`findByField` → `options.rlsContext` |
| 7a.2 | `6f39040` | unify `findAll` → `options.rlsContext` |
| 7a.3 | `eb9c926` | harmonize `count` → `options.filters` + `rlsContext` |
| 7a.4 | `30ddf1f` | ADR-011 service-integration note |
| 7b.1a | `adad936` | add `_redactForContext` helper + 6 tests |
| 7b.1b | `61f63a5` | wire read redaction (findById/findAll); −2 route calls |
| 7b.2a | `5267454` | wire `update` redaction; −1 route call |
| 7b.2b | `297edc9` | wire `create` redaction (route supplies role ctx); −1 route call |
| 7b.3 | `ec88c82` | wire `batch` redaction; −last route call + unused import |
| 8.1 | `93195eb` | lock nested-relationship stripping (regression tests) |
| 8.2 | `3b4bb00` | ADR-011 Tier-1/Tier-2 doc; closes H4/M13 (Path B) |
| 9.1 · H17 | `b540b0d` | canonicalize `MOCK_ROLES` fixture |
| 9.2 · H19 | `d021ad6` | harden `sensitiveFieldsHidden` (no null-in-DB false pass) |
| 9.3 · H2 | `b641444` | hook integration test + **fix approval-workflow double bug** |
| 9.4 · H18 | `bd91dc8` | tighten `hooks.scenarios` to branch-coherent asserts |
| A · notify | `acf55fa` | remove 6 inert afterChange notify/log hooks |
| A · notify | `7e1f03f` | afterChange validation fails fast on unknown action id |
| A · notify | `5de6ec5` | unify notification recipient → `{match, value}` (F1) |
| A · notify | `c6653fa` | startup fails fast on malformed notification recipient (F2) |
| A · notify | `4c45a28` | frontend tap-nav reads `resource_type`/`resource_id` |
| A · notify | `2327fec` | rename frontend toast `NotificationService` → `FeedbackService` |
| A · notify | `6cafea8` | `notifications.user_id` ON DELETE CASCADE + migration 004 |
| A · notify | `1e6fba9` | fix `NOTIFICATIONS.md` drift + document boundary/recipient contract |

### Key outcomes & decisions since the checkpoint
- **7a (behavior-preserving):** all `GenericEntityService` read/count methods now take
  a trailing `options` bag with nested `options.rlsContext`; `findById`'s
  dual-detection heuristic removed; `count` harmonized to `options.filters`.
- **7b (security):** field redaction moved out of the routes entirely into the service
  via `_redactForContext` at every read/write output boundary (internal/no-role callers
  get full data). **Zero `filterDataByRole` calls remain in `routes/`.** Behavior-identical
  because `req.rlsContext.role === req.dbUser.role`.
- **8 — chose Path B (minimal safe close-out):** nested relationship includes are stripped
  by Tier-1 redaction today (relationship keys aren't in `fieldAccess`), so **no field
  leak** (row-level M:M already guarded by the P0.2 boot invariant); `?include=` is inert
  under redaction. The full **Tier-2 feature** (make includes response-visible + redact
  nested rows by target metadata) is **documented as deferred** in ADR-011 — revisit when
  the frontend Related-tab ships.
- **9.3 uncovered + fixed a real double bug — high-value approval was silently OFF:**
  (1) `hook-service.evaluateWhen` only understood symbol operators (`>`,`=`), but
  `invoice`/`quote`/`recommendation` hooks used word-forms (`gt`/`eq`) → the `when`
  condition never matched. Fixed the 3 metadata files, added `HOOK_WHEN_OPERATORS` SSOT
  (`constants.js`), refactored `evaluateWhen` to an introspectable map, and made the
  metadata validator **fail-fast** on an unknown `when.operator`. (2) `AppError` dropped
  its 4th arg → `approvalInfo` never reached the envelope; added a `details` param
  (`AppError(message, statusCode, code, details)`) — verified the approval throw was the
  only 4-arg caller backend-wide.

### ⚠️ Remaining P1 work
- ✅ **Follow-up (from 9.3) — afterChange action wiring — RESOLVED (2026-07-07),
  reframed.** Rather than naïvely wire the broken `notify_*` actions (their
  `{field: 'customer_id'}` recipients put a *profile* id into `notifications.user_id`),
  this became a proper **notification foundation**: the inert hooks were removed;
  recipient resolution was unified to `recipient: { match, value }` (resolves against
  the `users` table, 0..N users) with **fail-fast startup validation**;
  `notifications.user_id` now **cascades**; and `docs/features/NOTIFICATIONS.md`
  documents the single write primitive, the Path A/B trigger boundary, and the
  recipient contract. **No business hooks are wired — by design** (platform foundation,
  not app flows). Full detail: agent memory `/memories/repo/notifications-identity-kb.md`.
  - ⚠️ **Open concern surfaced here — `schema.sql` drift.** `backend/schema.sql` is
    hand-maintained and has diverged from `npm run compose:schema` (a full regen would
    *remove* hand-added seed-idempotency unique indexes and *add* ~414 lines of demo
    seed data), so it is **unsafe to regenerate wholesale**. The CASCADE change was
    applied surgically. Reconciling the generator ↔ `schema.sql` (so `compose:schema`
    is idempotent) is a worthwhile **separate task**.
- **Step 10 — code-value / ERROR_CODES sweep** (see below). **NOTE:** 9.3 already added
  the `AppError` 4th `details` param — Step 10's `AppError` work must preserve it.

## Step-by-step batch

> **Status:** items **1–9 are ✅ complete** (see the commit map in "Progress" above)
> and the **afterChange-action follow-up is ✅ resolved** (notification foundation,
> 2026-07-07); only **item 10** remains. The rows/sections below are the original plan
> spec, kept for reference.

| # | Item | Type | Area | Risk |
|---|------|------|------|------|
| 1 | T2 — gitignore generated schema | hygiene | repo | trivial |
| 2 | M12 — field-access fail-closed | security | backend | tiny |
| 3 | M2 — IN/NIN array cap | security (DoS) | backend | small |
| 4 | M3 — role-metadata immutableFields | ✅ non-issue | backend | none (misdiagnosis) |
| 5 | H7 — role SSOT drift | correctness | backend | medium (blast radius) |
| 6 | H3 — transaction-boundary doc/guard | correctness | backend | small |
| 7a | M1/M13 — unify service signatures (`options.rlsContext`) | refactor | backend | **high (blast radius)** 🚧 isolate |
| 7b | M1/M13 — in-service field redaction (all ops) | security | backend | medium 🚧 isolate |
| 8 | M1/M13 — nested relationship redaction (Tier 2) | security | backend | medium 🚧 isolate |
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
- **Fix (root):** in `hasFieldPermission`, fail closed on a falsy **or unresolvable**
  required role — `if (!requiredRole || requiredRole === 'none') return false;` and
  treat `requiredIndex < 0` (unknown role string → `indexOf === -1`) as denied.
  `getFieldsForOperation` already guards `requiredRole && …`, so it's unaffected.
  (`field-access-controller` already uses the runtime loader, so H7 doesn't touch it.)
- **Tests:** `canAccessField(undefined operation) → false`;
  `hasFieldPermission(role, undefined) → false`; unknown-role → false; existing tests green.

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

### Step 4 — M3: role-metadata immutableFields → ✅ VERIFIED NON-ISSUE (no action)
- **Original claim:** `role-metadata.js` uses a legacy top-level `immutableFields`
  array that emits a deprecation warning.
- **Verified false (2026-07-02):** the `immutableFields: ['name','priority']` in
  role-metadata is **nested inside `systemProtected`** (fields locked on *protected
  role records*) — a legitimate, purposeful config, **not** the deprecated top-level
  `metadata.immutableFields` array. Confirmed empirically: `metadata.immutableFields`
  is `undefined`; `getImmutableFields(role)` returns `[]` with **no** deprecation
  warning (and `metadata-accessors` suppresses warnings in test env regardless). No
  metadata file uses a top-level `immutableFields` array. **Changing it would break
  protected-role field-locking.** No action taken.

### Step 5 — H7: remove role-hierarchy dual authority
- **Problem:** `backend/config/constants.js` re-exports the **static**
  `ROLE_HIERARCHY`/`ROLE_PRIORITY_TO_NAME` (from `role-definitions.js`), while the
  runtime SSOT is the DB via `role-hierarchy-loader.js`. Because `constants.js` is
  imported everywhere, this quietly elevates the fallback and risks drift.
- **Verified consumers (small):** only **3 files** import `ROLE_HIERARCHY` from
  `constants` — `backend/routes/dev-auth.js` (prod: `.includes`, `.join`, and the
  `supported_roles` response payload) + `field-access.scenarios.js` and
  `rls.scenarios.js` (tests). `ROLE_PRIORITY_TO_NAME` has **zero** `constants`
  consumers. `constants` also re-exports `ROLE_NAME_TO_PRIORITY` / `ROLE_DESCRIPTIONS`
  — grep those before removing.
- **Fix:**
  - Remove the role re-exports from `constants.js`.
  - `dev-auth.js` → import `ROLE_HIERARCHY` **directly** from `role-definitions.js`
    (intentional non-DB source; needs the array form). `test-users.js` likewise if used.
  - The 2 test scenarios → import from `role-definitions.js`.
  - Any runtime-authorization consumer → use the loader.
- **Care:** run the **full** suite. **Tests:** role tests green; dev-auth "any role" works.

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

### Step 7a — M1/M13: unify service signatures (🚧 risk-laden — isolate)
- **Problem:** `generic-entity-service` methods are inconsistent — reads take a
  positional `rlsContext` (`findById` even sniffs options-vs-rlsContext
  heuristically); mutations take an `options` bag with no `rlsContext`.
- **Fix:** unify all 8 methods to a trailing `options` bag with a **nested
  `options.rlsContext`** (ADR-011 object). Intrinsic params stay positional:
  `findById(entityName, id, options)`, `findAll(entityName, options)`,
  `findByField(entityName, field, value, options)`, `count(entityName, options)`
  (harmonize `filters` → `options.filters`), `create(entityName, data, options)`,
  `update(entityName, id, data, options)`, `delete(entityName, id, options)`,
  `batch(entityName, operations, options)`. Delete `findById`'s dual-detection.
- **Execution:** full call-site sweep first
  (`grep GenericEntityService.(findById|findAll|findByField|count)` across backend +
  tests); update ALL call-sites (routes **and** internal service-to-service) + tests.
  **Behavior-preserving — no redaction yet.**
- **Done when:** full suite green with the unified signatures.

### Step 7b — M1/M13: in-service field redaction, all operations (🚧 isolate)
- **Fix:** add `_redactForContext(data, metadata, options.rlsContext)` →
  `filterDataByRole(data, metadata, rlsContext.role, 'read')` when
  `options.rlsContext?.role` is set, else return data untouched (internal/system
  callers = full data). Apply at the return of `findById`/`findAll`/`findByField` and
  the returned entity of `create`/`update` (+ `batch` results). Remove the 5
  route-level `filterDataByRole` calls.
- **Tests:** direct service read redacts for a low-privilege role; no-role context
  returns full data; route responses unchanged.

### Step 8 — M1/M13: nested relationship redaction (Tier 2, 🚧 isolate)
- **Fix:** redact included relationship rows (from `relationship-loader`) using each
  relationship's **target** metadata + the same `options.rlsContext.role`. Closes the
  relationship-data gap (ties to H4).
- **Tests:** an included relationship omits fields the requester can't read.

### Step 9 — Test integrity (test-only; no production risk)
- **H17:** `backend/__tests__/fixtures/roles.js` uses non-canonical roles
  (`client` not `customer`, missing `customer`/`manager`, inverted priorities —
  `admin` = 1 not 5 — and `PROTECTED_ROLES` references a `customer` that doesn't
  exist in `MOCK_ROLES`). Reconcile to the canonical 5 (customer 1 … admin 5) +
  correct priorities; grep `MOCK_ROLES`/`ACTIVE_ROLES` consumers and fix dependent tests.
- **H18:** `factory/scenarios/hooks.scenarios.js` asserts only status ranges;
  rewrite to assert *which* hook fired (approval → 202 + approvalInfo + task;
  cascade-depth cap = 3; blocking `beforeChange`).
- **H19:** `rls.scenarios.js` `sensitiveFieldsHidden` — populate the field in the
  DB, verify it's present, then verify the API omits it (not just absent).
- **H2:** add hook **integration** unit tests (beforeChange-blocks-create,
  afterChange non-blocking fires, `skipHooks` recursion guard, cascade cap).

### Step 10 — Code-value normalization (full sweep)
- **Scope (verified):** ~**100 `new AppError(...)` calls across 23 files**; **7 test
  files** assert code strings. Distinct ad-hoc codes: `BAD_REQUEST`×31,
  `UNAUTHORIZED`×10, `NOT_FOUND`×10, `SERVICE_UNAVAILABLE`×5, `INTERNAL_ERROR`×4,
  `FORBIDDEN`×2, `VALIDATION_ERROR`×1, `CONFLICT`×1 (+ domain codes).
- **Extract:** move `ERROR_CODES` out of `response-formatter.js` into its own module
  `config/error-codes.js`; import it in `response-formatter`, `AppError` callers, and
  the global handler. Flip `AppError`'s default `'INTERNAL_ERROR'` → `'SERVER_ERROR'`.
- **Canonical mappings:** `BAD_REQUEST`/`VALIDATION_ERROR` → `VALIDATION_FAILED`,
  `NOT_FOUND` → `RESOURCE_NOT_FOUND`, `INTERNAL_ERROR` → `SERVER_ERROR`,
  `SERVICE_UNAVAILABLE` → `SERVER_UNAVAILABLE`, `CONFLICT` → `RESOURCE_CONFLICT`,
  `FORBIDDEN` → `AUTH_INSUFFICIENT_PERMISSIONS`.
- **`UNAUTHORIZED`×10 — split case-by-case:** `AUTH_INVALID_TOKEN` /
  `AUTH_TOKEN_EXPIRED` / `AUTH_REQUIRED` by context.
- **Domain codes — centralize:** add a `DOMAIN_*` section to `ERROR_CODES` for
  `IDEMPOTENCY_MISMATCH`, `APPROVAL_REQUIRED`, `IMMUTABLE_FIELD_VIOLATION`,
  `NOT_IMPLEMENTED`, `TOKEN_REFRESH_FAILED` (one registry, no strays).
- **Tests:** update all 7 asserting test files in lockstep; point
  `error-response-security.test.js` at the **real** server error handler (currently
  tests an inline mock).

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
- **M3** — role-metadata's `immutableFields` is nested in `systemProtected`
  (protected-role field-locking), not the deprecated top-level array; no warning,
  nothing to migrate. Dropped from the backlog (see Step 4).

---

_Cross-reference: the full findings record (Waves 1–4, H/M/L, T1–T8, P0 log) lives
in the review notes; this plan is the actionable P1 subset._
