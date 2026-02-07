# Database Architecture & Schema Management

## Overview

This document defines the architectural principles for database schema design in Tross. It establishes the Entity Contract pattern and explains the rationale behind key decisions.

## Core Principle

> **The database schema is the source of truth for data structure.**

All entities follow a standardized contract ensuring consistency across the application.

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

- Master schema lives in `backend/schema.sql`
- Migrations apply incremental changes
- Both dev and test databases use same schema

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

### Adding an Entity

1. Follow Entity Contract v2.0 (Tier 1 required)
2. Determine if Tier 2 status field needed
3. Create migration for existing databases
4. Update master schema
5. Add entity metadata file

### Modifying Schema

1. Create migration (never edit schema.sql directly for existing tables)
2. Migration must be idempotent
3. Update schema.sql to reflect final state
4. Apply to both dev and test

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
