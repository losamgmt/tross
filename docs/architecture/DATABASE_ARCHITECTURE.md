# Database Architecture & Schema Management

## Overview

This document defines the architectural principles for database schema design in Tross. It establishes the Entity Contract pattern and explains the rationale behind key decisions.

## Core Principle

> **Entity structure is declared in metadata (the single source of truth); the database schema is a derived artifact that materializes it.**

Entity metadata files are the authoring SSOT for data structure. The deployable schema is generated/composed from that metadata (plus static infrastructure parts), and the database is a materialization of it — never hand-authored as the source. All entities follow a standardized contract (below) that this metadata expresses, ensuring consistency across the application.

## Entity Contract v2.0

### Tier 1: Universal Fields (Required)

Every business entity MUST have these fields:

| Field          | Purpose                                                |
| -------------- | ------------------------------------------------------ |
| `id`           | Auto-incrementing primary key                          |
| Identity field | Human-readable unique identifier (varies by entity)    |
| `is_active`    | Deactivation flag (false = hidden from normal queries) |
| `created_at`   | Creation timestamp (cached from audit_logs)            |
| `updated_at`   | Auto-managed modification timestamp                    |

> **Tenancy (reserved).** The system is single-tenant today. `tenant_id` is the reserved canonical name for the future tenant-scoping Tier-1 field; it is intentionally NOT added until multi-tenancy is triggered (avoids a dead column). See [ADR-014: Tenancy Model & Evolution](decisions/014-tenancy-model-and-evolution.md).

### Tier 2: Lifecycle Fields (Optional)

Entities with workflow requirements add:

| Field    | Purpose                                             |
| -------- | --------------------------------------------------- |
| `status` | Lifecycle state (values defined in entity metadata) |

**See `ENTITY_LIFECYCLE.md` for when to add status fields.**

## Architectural Decisions

### Decision: Deactivation via `is_active`

**Terminology:**

- **Deactivation** = Set `is_active = false` (UPDATE operation, data preserved)
- **Delete** = Hard DELETE (data removed permanently from database)

**Why we use deactivation instead of hard deletes:**

- Preserves data for audit trails
- Enables easy reactivation if needed
- Maintains referential integrity
- Prevents orphaned foreign keys

**Invariant:** `is_active = false` means "deactivated" — always filter by `is_active = true` in normal queries.

### Decision: Identity Field Varies by Entity

**Why each entity chooses its own identity field:**

- Some entities use `name` (roles, skills)
- Some use `email` (users)
- Some use `title` (work orders)
- The identity field is the human-readable unique identifier

**Invariant:** Every entity has exactly ONE identity field with a UNIQUE constraint.

### Decision: Automatic Timestamps

**Why `updated_at` is trigger-managed:**

- Ensures consistency (no developer can forget)
- Single implementation for all tables
- Reduces boilerplate in application code

**Why `created_at` is a cache:**

- True source of truth is `audit_logs.created_at`
- Cached on entity for query performance
- Never updated after initial insert

### Decision: TIMESTAMPTZ for All Timestamps

**All timestamp columns use PostgreSQL `TIMESTAMPTZ` (WITH TIME ZONE):**

```sql
scheduled_start TIMESTAMPTZ,
created_at      TIMESTAMPTZ DEFAULT NOW(),
```

**Why TIMESTAMPTZ, not TIMESTAMP:**

| TIMESTAMP (without timezone) | TIMESTAMPTZ (with timezone) |
|------------------------------|------------------------------|
| Stores literal value as-is | Stores as UTC internally |
| Ignores input timezone | Converts input to UTC on write |
| Returns value as-is | Converts to session timezone on read |
| Prone to timezone bugs | Timezone-safe by design |

**Configuration:**

1. **Session timezone = UTC**: Set on each connection via `pool.on('connect')`
2. **Frontend sends ISO strings**: `"2026-03-15T17:00:00.000Z"` (explicit UTC)
3. **Backend returns UTC**: All reads return UTC ISO strings
4. **Frontend displays local**: Converts UTC to user's local timezone for display

**Flow example:**

```
User (Denver, UTC-7): Picks 5:00 PM local
Frontend: Sends "2026-03-16T00:00:00.000Z" (midnight UTC)
PostgreSQL: Stores as UTC (thanks to TIMESTAMPTZ)
Backend: Returns "2026-03-16T00:00:00.000Z"
Frontend: Displays "Mar 15, 2026 5:00 PM" (local)
```

**Pure TIME fields:**

For time-only fields (without date, e.g., "store opens at 9:00 AM"), use `TIME` without timezone. These are recurring daily times and don't need timezone conversion.

### Decision: Status Values in Metadata

**Why status enums are NOT hardcoded in schema:**

- Entity metadata files are the SSOT
- CHECK constraints can be derived from metadata
- Keeps all entity configuration in one place
- Easier to modify and keep synchronized

### Decision: Foreign Key Policies

**Why we use `ON DELETE SET NULL`:**

- Prevents cascade deletes that could be destructive
- Leaves clear trail (NULL indicates "was referenced, now gone")
- Application can handle NULL explicitly

**When to use `ON DELETE CASCADE`:**

- Only for true composition (child cannot exist without parent)
- Examples: refresh_tokens when user is hard deleted

## Schema Management Principles

### Single Source of Truth

- **Entity metadata is the declarative SSOT** for entity structure; non-entity infrastructure tables live in static schema parts.
- The deployable schema is a **derived, composed build artifact** — generated from metadata + infrastructure parts, never hand-edited.
- Deployment is a parameterized tool with pluggable **strategies**: a *clean rebuild* (provision the full desired state) and a *migrate* (apply the incremental difference between current and desired). Both source from the same declarative metadata.
- Dev and test databases are materialized from the same source.

### Idempotent Migrations

- Migrations must be safe to run multiple times
- Use `IF NOT EXISTS` and `IF EXISTS` guards
- Each migration documents WHAT and WHY

### Environment Isolation

- Development and test databases are separate
- Same schema, different data
- Tests never affect development data

## Query Patterns

### Standard Filtering

All normal queries should filter by existence:

- `WHERE is_active = true` for basic queries
- Add `AND status = ?` when filtering by lifecycle

### Indexing Strategy

- Always index `is_active` for filtering performance
- Composite indexes on common filter combinations
- Status fields get their own index when frequently queried

## Connection Architecture

### Platform Agnostic

The database connection layer automatically adapts to deployment platform:

- Detects platform from environment
- Supports both connection strings and individual variables
- Pool sizing adjusts for environment

### Test Isolation

Test environment uses separate:

- Database name
- Port
- Connection pool (smaller, faster cleanup)

This ensures tests never interfere with development.

### Health & Monitoring

- Connection retry logic with backoff
- Slow query logging
- Graceful shutdown (drain connections before exit)

## Evolution Guidelines

Entities evolve through their **metadata**, not by hand-editing schema. The deployable schema and any migrations are produced from the updated metadata by the deployment tooling; the schema files are derived artifacts that are never edited directly.

### Adding or Changing an Entity

1. Declare or update the entity in its metadata (honoring the Entity Contract above).
2. Regenerate/compose the deployable schema, and produce a migration via the *migrate* strategy when evolving existing databases.
3. Apply to dev and test from the same source.

Migrations remain forward-only and idempotent. For the concrete commands and step-by-step procedure, see the development guide (the single home for that workflow).

## Anti-Patterns

### Skipping `is_active`

Every business entity needs deactivation capability. The only exceptions are:

- Join tables (many-to-many relationships)
- System tables (migrations tracking, etc.)

### Nullable Status on Workflow Entities

If an entity has a status field, it should have a DEFAULT and NOT NULL constraint.

### Hard Deletes for Business Data

Use deactivation (`is_active = false`) for business data. Hard deletes are only for:

- Test cleanup
- GDPR "right to erasure" compliance
- True system-level cleanup

### Duplicating Status Values

Status values are defined ONCE in entity metadata. Database CHECK constraints should be derived, not hand-maintained.

## References

- **Entity Lifecycle:** See `ENTITY_LIFECYCLE.md` for status field patterns
- **Entity Metadata:** See `config/models/*-metadata.js` for definitions
- **Migrations:** See `backend/migrations/README.md` for migration workflow

---

**Architecture Status:** 🔒 **LOCKED** - Entity Contract v2.0 is frozen
