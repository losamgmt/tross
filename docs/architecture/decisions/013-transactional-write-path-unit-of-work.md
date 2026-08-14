# ADR 013: Transactional Write Path & Reactive-Action Atomicity (the Unit of Work)

**Status:** Accepted
**Date:** August 13, 2026
**Related:** REL-1 (`hooks-async-reliability`); builds on ADR-011 (Rule-Based RLS Engine); ADR-007 (File Attachments) is a noted exception; the hook model is specified in `ENTITY-EXPANSION-DESIGN.md`.

---

## Context

### The principle we hold

Tross has exactly **one canonical write primitive**: `GenericEntityService` (GES) `create` / `update` / `delete` / `batch`. Every entity mutation funnels through it — HTTP routes never write to the database directly, and the Flutter client is 100% generic (`GenericEntityService → HttpApiClient → /{entity}`). This is DRY and SRP applied at the *system* level: exactly one place owns "how a write happens."

### The problem

The write primitive did not honor that principle uniformly. `delete()` and `batch()` opened a real transaction (`BEGIN/COMMIT/ROLLBACK`), but `create()` and `update()` did **not**:

- The `INSERT`/`UPDATE` auto-committed via the connection pool.
- `afterChange` hooks — the reactive actions (notifications, cascade creates/updates, recomputes) — then ran **post-commit**, and their failures were **logged, not retried, and never rolled back**.
- Audit was written post-commit as a separate statement.

The consequence is **silent side-effect loss** and **partial state**: a committed row whose reactive action failed ("work order saved, but its invoice was never generated"), or a committed change with no audit row. Reactive actions were effectively running *in isolation* from the write that triggered them — the opposite of the single-primitive principle. (Notably, `ENTITY-EXPANSION-DESIGN.md` always *described* the atomic flow — "evaluate afterChange hooks → commit transaction"; the code had simply diverged from it.)

## Decision

Make the canonical write primitive a single, reentrant, transaction-aware **Unit of Work** that every context composes through.

### 1. Transaction propagation (join-or-create)

Each mutation **joins the caller's transaction if one exists, otherwise opens its own** — the semantics named `REQUIRED` in Spring, expressed here as:

```js
const ownTransaction = !options.client;
const client = options.client || (await db.getClient());
// ... BEGIN (if own) → do the work on `client` → COMMIT (if own) ...
```

The pg `client` **is** the Unit of Work. `delete()` already worked this way; `create()` / `update()` adopt it under REL-1 Stage 1 (see Rollout). When invoked from `batch()` — or from a hook — the caller threads its `client`, and the primitive *joins* that transaction instead of starting a new one.

### 2. Reentrancy — hooks compose the primitive, they do not reimplement it

A hook-triggered write is not a different mechanism; it is the **same** `create` / `update` invoked recursively, with the parent's `client` threaded through. The reactive-action handlers (`create_entity`, `update_entity`, `compute`, `notification`) pass `client: context.tx` into their nested GES calls, so cascades run **inside the same Unit of Work**. Recursion is bounded by the cascade-depth cap and `skipHooks`.

### 3. Atomicity (all-or-nothing)

Within one mutation, **the write + its `afterChange` actions (and their cascade writes) + the audit row all commit together or all roll back**. A failed reactive action **aborts the whole Unit of Work**: `evaluateAfterHooks` propagates the failure whenever a transaction is present — it is the single enforcement point, so the rule lives in exactly one place. Audit joins the same transaction and, inside a Unit of Work, a failed audit also rolls the write back (no committed change without its audit row). `beforeChange` is unchanged — it runs **before** the write and can block (`403`) or require approval (`202`).

### 4. The boundary: transactional vs. durable-async side-effects

This atomicity is correct **because every reactive action today is a database operation** (an in-app notification row, an entity create/update, a `SUM` recompute) — all can join the DB transaction. **External** side-effects (real email/SMS/push, third-party integration sync — the anticipated `external` action type) are **not** transactional and must **never** run inside a DB transaction: a `COMMIT` that later fails cannot un-send an email. Those belong to a **durable transactional outbox + worker** — write the *intent* inside the transaction, and a drainer delivers it with retry + dead-letter + idempotency. That mechanism (deferred as REL-1 Stage 2) also subsumes the inbound integrations webhook queue, which shares this exact fragility. Until it exists, no reactive action performs external I/O.

## Consequences

**Positive**

- **No silent side-effect loss** and **no partial state** — the headline reliability win.
- **No committed change without its audit row.**
- **One mental model, one tool for every write**, in every context (route, hook, batch, cascade) — the "unified tapestry." DRY and SRP hold end-to-end.
- **Testable** by mirroring the existing `batch` / `delete` rollback + savepoint tests.

**Trade-offs (accepted)**

- A buggy reactive action can now **fail a user's write** — an availability cost traded for correctness. Bounded by the cascade-depth cap; only 3/34 entities declare hooks today, so the engine is lightly exercised.
- In-transaction cascades extend transaction/lock duration. Current actions are bounded (single-row writes, `SUM` recomputes); a genuinely expensive or external side-effect is the signal to move it to the Stage-2 outbox.

**Rollout (REL-1 Stage 1)**

- 1.1 — audit write accepts a transaction client (joins the UoW; fails it on error). ✅
- 1.2 — reactive-action layer becomes transaction-aware (client threading + failure propagation). ✅
- 1.3a — `withTransaction` gains propagation (`{ client }` → join-or-create); becomes the shared primitive. ✅
- 1.3b — `runAfterChangeHooks` orchestrator: the reactive step defined once, shared by `create` / `update`. ✅
- 1.3 — `create()` composes `withTransaction` (INSERT + afterChange hooks + audit atomic). ✅
- 1.4 — `update()` composes `withTransaction` (oldRecord + beforeChange + UPDATE + afterChange + audit atomic; approval/block roll back a no-op). ✅
- 1.4b — `delete()` and `batch()` retire their hand-rolled `BEGIN/COMMIT/ROLLBACK` and compose `withTransaction` (one primitive everywhere; batch keeps savepoints). ⏳
- 1.5 — atomicity integration tests (rollback-on-hook-failure, cascade-in-parent-txn, audit-in-txn). ⏳
- Stage 2 (deferred) — durable outbox + drainer for external / async side-effects; unifies the webhook queue.

**Known exceptions (outside the canonical funnel today)**

- `file_attachments` is written by `attachment-service` outside GES (binary + object-storage + polymorphic-parent concerns; governed by ADR-007). Its DB-row half is a candidate to fold into GES later.
- `users.auth0_id` is linked at login by `auth-user-service` (just-in-time provisioning). Low concern — `users` declares no hooks.
