# Documentation

TrossApp documentation hub.

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

## Getting Started

| Doc | Purpose |
|-----|---------|
| [Quick Start](QUICK_START.md) | Get running in 5 minutes |
| [Development](DEVELOPMENT.md) | Daily workflow, code organization |

---

## Architecture & Design

| Doc | Purpose |
|-----|---------|
| [Architecture](ARCHITECTURE.md) | Core patterns, KISS, security-first |
| [Security](SECURITY.md) | Triple-tier: Auth0 + RBAC + RLS |
| [Authentication](AUTH.md) | Dual auth strategy, JWT, sessions |
| [API](API.md) | REST conventions, OpenAPI |

---

## Quality & Operations

| Doc | Purpose |
|-----|---------|
| [Testing](TESTING.md) | Philosophy, pyramid, patterns |
| [CI/CD](CI_CD_GUIDE.md) | Pipeline, automation |
| [Health Monitoring](HEALTH_MONITORING.md) | Observability, alerts |
| [Rollback](ROLLBACK.md) | Emergency procedures |
| [Deployment](DEPLOYMENT.md) | Infrastructure, environment config |

---

## Deep Dives

### Architecture

| Doc | Purpose |
|-----|---------|
| [Database Architecture](architecture/DATABASE_ARCHITECTURE.md) | Entity Contract v2.0, schema design |
| [Entity Lifecycle](architecture/ENTITY_LIFECYCLE.md) | `is_active` vs `status` patterns |
| [Schema-Driven UI](architecture/SCHEMA_DRIVEN_UI.md) | Single source of truth |
| [Validation Architecture](architecture/VALIDATION_ARCHITECTURE.md) | Multi-layer validation |
| [Architecture Lock](architecture/ARCHITECTURE_LOCK.md) | Frozen patterns |

### Decisions

[Architecture Decision Records](architecture/decisions/) - ADRs for key choices

