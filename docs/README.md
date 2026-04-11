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
| [Environment Variables](reference/ENVIRONMENT_VARIABLES.md) | Configuration reference           |
| [Testing](reference/TESTING.md)                             | Philosophy, pyramid, patterns     |

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
| [Project Status](project/PROJECT_STATUS.md)                      | Architecture quick reference   |
| [MVP Scope](project/MVP_SCOPE.md)                                | Original project scope         |
| [Implementation Plan](project/plans/IMPLEMENTATION-PLAN.md)      | Current implementation roadmap |
| [Metadata Completion](project/plans/METADATA-COMPLETION-PLAN.md) | 85%→100% completion tracker    |
| [Audits](project/audits/)                                        | Technical audits & reviews     |
| [Process](project/process/)                                      | Development process docs       |
