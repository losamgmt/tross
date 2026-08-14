# ADR 015: API Versioning Strategy

**Status:** Accepted (unversioned now; strategy defined, deferred)
**Date:** 2026-08-14
**Category:** Architecture / API
**Related:** ADR-006 (Entity Naming) · `reference/API.md`

---

## Context

The REST API is generated from entity metadata and mounted at `/api/{tableName}` — **unversioned**. The only
consumer today is the first-party Flutter application, which is built and deployed **in lockstep** from the same
repository, so there is no version skew to manage. `API.md` previously listed "Versioned" as a principle, which
did not match reality (no version segment exists anywhere).

For a platform intended to become a **commercial product**, an unversioned API is a forward-thinking gap: the
day an external or independently-deployed consumer exists, a breaking change has no boundary to protect it. This
ADR closes the gap at the *decision* level (YAGNI on the machinery) and corrects the doc claim.

## Decision

### 1. Remain unversioned while the only client ships in lockstep

The first-party Flutter client evolves with the backend in one repo and one deploy. Introducing versioning
machinery now would be speculative complexity with no consumer to protect. Routes stay `/api/{resource}`.

### 2. Additive-by-default change policy

- **Non-breaking (ship freely, unversioned):** new endpoints, new optional fields, new enum values, new
  relationships. The metadata-driven contract makes most evolution additive by construction.
- **Breaking (requires a version):** removing/renaming a field or endpoint, changing a type, tightening
  validation, or changing response shape — only when a live *external* contract depends on the old shape.

### 3. When needed, use URI-path versioning via the generic mount path

The chosen mechanism is **URI-path versioning** (`/api/v2/{resource}`), selected over header/media-type
versioning for being explicit, cache-friendly, and trivially routable. Because every entity is mounted through
the generic route-loader's configurable mount path, a new version is an **additive mount** (`/api/v2/...`
alongside `/api/...`), not per-entity code. The OpenAPI spec is versioned alongside, and the previous version
enters a documented deprecation window before removal.

### 4. Keep the docs honest

`API.md` states the current unversioned reality and points here for the strategy (done). This ADR is the SSOT
for *how* versioning will work; it is not implemented until triggered.

## Consequences

**Positive**
- No premature versioning infrastructure; the metadata contract keeps most change additive.
- A clear, **additive** path (a new mount prefix) when a breaking change against an external consumer is
  unavoidable — consistent with the "generic router, zero per-entity code" architecture.
- The documentation no longer overstates a capability that does not exist.

**Trade-offs (accepted)**
- Until versioning exists, a breaking change would require coordinating the lockstep client — acceptable while
  that client is the only consumer.

## Trigger

The first **external / independently-deployed** API consumer, or the first unavoidable **breaking change** to a
contract a live external consumer depends on — whichever comes first.

## Alternatives considered

- **Header / media-type versioning** (`Accept: application/vnd.tross.v2+json`) — rejected as the default: less
  visible, harder to cache and to hit from a browser/curl, and it hides the version from URLs and logs.
- **Version now** — rejected (YAGNI; no external consumer; adds machinery + a dead `v1` with no purpose).
