# ADR 014: Tenancy Model & Evolution

**Status:** Accepted (single-tenant now; multi-tenant path defined, deferred)
**Date:** 2026-08-14
**Category:** Architecture / Data Model / Security
**Related:** ADR-011 (Rule-Based RLS Engine) · ADR-009 (Granular Permissions, deferred)

---

## Context

Tross is **single-tenant by design**: it serves one family of companies (PREM / ARKE) operating on **shared
data**. Two concepts are easy to conflate and must be kept distinct:

- **Multi-entity ("company/organization")** — a *within-tenant* data dimension. Several companies exist inside
  the one tenant and share the data plane; a record may belong to a company. This is a normal foreign-key
  dimension, **not** isolation.
- **Multi-tenancy** — isolation of separate customers' data from one another. This is a *future* capability,
  gated behind a "productize / sell the platform to external organizations" trigger (the same trigger as
  ADR-009's granular permissions).

The risk this ADR addresses: **nothing in the codebase or the constitutional docs currently names the tenant
boundary.** Without a named seam, an otherwise-reasonable decision (a global cache, a singleton config, an
un-scoped query) can silently *foreclose* the future conversion — turning an additive migration into a rewrite.
The goal is single-tenant simplicity today with the tenant boundary kept a **dormant but first-class seam**.

## Decision

### 1. Stay single-tenant; model "company" as an ordinary within-tenant dimension

The multi-company need is met with a normal `organization` (company) entity and an `organization_id` foreign key
on company-scoped entities — resolved through the existing metadata + RLS machinery like any other relationship.
This delivers "multi-company" today with **zero** tenancy complexity. It is explicitly **not** a tenant boundary.

### 2. Keep the tenant boundary a dormant, first-class seam (additive conversion)

Multi-tenancy, when triggered, must be an **additive migration** — never a rewrite. The substrate is already
well-positioned; this ADR commits to preserving that:

- **Data model** — conversion adds a `tenant_id` column (a Tier-1 field on tenant-scoped entities). Today the
  system behaves as a single implicit tenant. `tenant_id` is *not* added now (YAGNI + no dual state), but the
  Entity Contract reserves it as the canonical name.
- **RLS (ADR-011)** — the grant-based `rlsRules` array absorbs a **`tenant` scope additively**: a tenant-scoping
  predicate is AND-ed into every entity's access, layered *above* the existing per-role grants, without
  rewriting any current rule. Deny-by-default already makes "no tenant match → no rows" natural.
- **Identity** — users belong to a tenant (future `users.tenant_id`); the Auth0 organization/tenant claim maps
  to it at token exchange. The internal JWT carries the tenant, so `rlsContext` gains one key.
- **Configuration & permissions** — per-tenant metadata/permission configuration is the multi-tenant extension
  of ADR-009 (granular permissions); the two decisions ship together when the trigger fires.

### 3. Fitness function (guard the seam)

- **Now (single-tenant):** no code may introduce a process-global singleton whose identity would need to be
  tenant-scoped later — caches, in-memory registries, and rate-limit buckets must be keyed by a value that can
  gain a tenant prefix without a structural change. (The RLS clause cache is already keyed
  `entity:operation:role`, so a `tenant` term is a pure addition.)
- **On conversion:** a CI check asserts that **every** tenant-scoped query passes through the tenant predicate
  (analogous to RLS deny-by-default) — no path may read across tenants. This test is authored *with* the
  `tenant_id` migration, not before.

## Consequences

**Positive**
- Single-tenant simplicity today; the "multi-company" requirement is met with an ordinary FK dimension.
- Conversion is **additive**: `tenant_id` column + one RLS scope + an identity claim mapping — not a rewrite.
- The boundary is *named*, so it can be defended by review and (later) by a fitness function.

**Trade-offs (accepted)**
- A small ongoing discipline cost: reviewers must keep singletons tenant-neutral.
- The tenant column is deliberately absent until the trigger, so the conversion migration is real work — but
  bounded and well-understood.

## When to implement multi-tenancy

When the platform is sold to / operated for **external organizations** whose data must be isolated from one
another (the ADR-009 trigger #5). Until then, single-tenant + the within-tenant company dimension is correct.

## Alternatives considered

- **Add `tenant_id` now** — rejected (YAGNI; introduces a dual/implicit-tenant state and dead columns with no
  consumer, violating "SSOT vocabulary must be live").
- **Schema-per-tenant / database-per-tenant isolation** — deferred; a heavier model to evaluate at the trigger
  against the row-scoped (`tenant_id` + RLS) approach this ADR favors for its additive fit with the existing engine.
