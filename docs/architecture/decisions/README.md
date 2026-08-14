# Architecture Decision Records (ADRs)

This directory contains records of architectural decisions made for Tross.

## Format

Each ADR follows this structure:

- **Title:** Brief description
- **Status:** Accepted | Deprecated | Superseded
- **Context:** The issue motivating this decision
- **Decision:** What we decided to do
- **Consequences:** Impact of the decision

## Index

Each ADR records its own status (Accepted / Superseded / etc.) in its header — see the linked record.

1. [Provider Pattern for State Management](001-provider-pattern-state-management.md)
2. [Atomic Design System](002-atomic-design-system.md)
3. [Auth0 for Authentication](003-auth0-authentication.md)
4. [Routing & Navigation Strategy](004-routing-navigation-strategy.md)
5. [Testing Strategy & Coverage Approach](005-testing-strategy.md)
6. [Entity Naming Convention](006-entity-naming-convention.md)
7. [File Attachments Architecture](007-file-attachments-architecture.md)
8. [RLS Field-Based Filtering](008-rls-field-based-filtering.md)
9. [Granular Permissions Vision](009-granular-permissions-vision.md)
10. [Junction Entity CRUD Pattern](010-junction-entity-crud-pattern.md)
11. [Rule-Based RLS Engine](011-rule-based-rls-engine.md)
12. [Declarative Routing with go_router](012-declarative-routing-go-router.md)
13. [Transactional Write Path & Reactive-Action Atomicity (Unit of Work)](013-transactional-write-path-unit-of-work.md)
14. [Tenancy Model & Evolution](014-tenancy-model-and-evolution.md)
15. [API Versioning Strategy](015-api-versioning-strategy.md)

---

**Format:** Inspired by [Michael Nygard's ADR template](https://github.com/joelparkerhenderson/architecture-decision-record)
