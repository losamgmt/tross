# Documentation

Tross documentation hub.

---

## Philosophy

**Document WHY, not HOW**

- Architecture decisions and rationale
- Design patterns and trade-offs
- Constraints and evolution guidance
- Code is self-documenting (tests are executable specs)

**Evergreen content only**

- No brittle metrics (test counts, version numbers)
- No implementation details (they go stale)
- Concepts, philosophies, decisions, designs

---

## 🚀 Getting Started

| Doc                                                   | Purpose                           |
| ----------------------------------------------------- | --------------------------------- |
| [Quick Start](getting-started/QUICK_START.md)         | Get running in 5 minutes          |
| [Development](getting-started/DEVELOPMENT.md)         | Daily workflow, code organization |
| [Troubleshooting](getting-started/TROUBLESHOOTING.md) | Common issues & solutions         |
| [Edge-Case Troubleshooting](getting-started/EDGE-CASE-TROUBLESHOOTING.md) | Deep debugging map — where to look when things break |

---

## 🏗️ Architecture

| Doc                                                                | Purpose                             |
| ------------------------------------------------------------------ | ----------------------------------- |
| [Architecture Overview](architecture/ARCHITECTURE.md)              | Core patterns, KISS, security-first |
| [Database Architecture](architecture/DATABASE_ARCHITECTURE.md)     | Entity Contract v2.0, schema design |
| [Entity Expansion Design](architecture/ENTITY-EXPANSION-DESIGN.md) | Field-centric metadata redesign     |
| [Entity Lifecycle](architecture/ENTITY_LIFECYCLE.md)               | `is_active` vs `status` patterns    |
| [ERD](architecture/ERD.md)                                         | Entity relationship diagram         |
| [Schema-Driven UI](architecture/SCHEMA_DRIVEN_UI.md)               | Single source of truth              |
| [Validation Architecture](architecture/VALIDATION_ARCHITECTURE.md) | Multi-layer validation              |
| [Field Types](architecture/FIELD_TYPES.md)                         | Semantic field types & traits       |
| [Platform Utilities](architecture/PLATFORM_UTILITIES.md)           | Cross-platform (web/mobile) utilities |
| [Architecture Lock](architecture/ARCHITECTURE_LOCK.md)             | Frozen patterns                     |
| [Architecture Decisions](architecture/decisions/)                  | ADRs for key choices                |

---

## 📚 Reference

| Doc                                                         | Purpose                           |
| ----------------------------------------------------------- | --------------------------------- |
| [API](reference/API.md)                                     | REST conventions, OpenAPI         |
| [OpenAPI Spec](reference/openapi.json)                      | Generated API specification       |
| [Authentication](reference/AUTH.md)                         | Dual auth strategy, JWT, sessions |
| [Security](reference/SECURITY.md)                           | Triple-tier: Auth0 + RBAC + RLS   |
| [Environment Variables](reference/ENVIRONMENT_VARIABLES.md) | Full variable catalog             |
| [Environment Contract](reference/environment-contract.md)   | 3-mode model + mode-derived flags |
| [Service Layer Standards](reference/service-layer-standards.md) | Service structure & health-check scope |
| [Testing](reference/TESTING.md)                             | Philosophy, pyramid, patterns     |
| [Test Authentication](reference/test-authentication.md)     | TestContext auth patterns         |
| [Validation Rules](reference/validation-rules.json)         | Generated validation-rule spec    |

---

## ⚙️ Operations

| Doc                                                        | Purpose                            |
| ---------------------------------------------------------- | ---------------------------------- |
| [Deployment](operations/DEPLOYMENT.md)                     | Infrastructure, environment config |
| [CI/CD](operations/CI_CD_GUIDE.md)                         | Pipeline, automation               |
| [Health Monitoring](operations/HEALTH_MONITORING.md)       | Observability, alerts              |
| [Rollback](operations/ROLLBACK.md)                         | Emergency procedures               |
| [Secrets Management](operations/SECRETS.md)                | GitHub secrets configuration       |
| [Branch Protection](operations/BRANCH_PROTECTION_SETUP.md) | GitHub branch rules                |
| [R2 CORS Config](operations/r2-cors-config.md)             | Cloudflare R2 bucket configuration |

---

## ✨ Features

| Doc                                                       | Purpose                              |
| --------------------------------------------------------- | ------------------------------------ |
| [Notifications](features/NOTIFICATIONS.md)                | Real-time notification system design |
| [Admin Frontend](features/ADMIN_FRONTEND_ARCHITECTURE.md) | Flutter admin panel architecture     |

---

## 📋 Project

| Doc                                                              | Purpose                        |
| ---------------------------------------------------------------- | ------------------------------ |
| [Project Overview](project/PROJECT_OVERVIEW.md)                  | Architecture & documentation map |
| [MVP Scope](project/MVP_SCOPE.md)                                | Original project scope         |
| [Implementation Plan](project/plans/IMPLEMENTATION-PLAN.md)      | Metadata implementation plan (historical record) |
| [Metadata Completion](project/plans/METADATA-COMPLETION-PLAN.md) | Metadata completion coordinator (historical record) |
| [Frontend Reading Plan](project/FRONTEND_READING_PLAN.md)        | Junction-entity frontend plan (historical record) |
| [Audits](project/audits/)                                        | Technical audits & reviews     |
| [Process](project/process/)                                      | Development process docs       |
