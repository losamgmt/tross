# Architecture Lock - Tross

**Status:** 🔒 **LOCKED** - Core patterns frozen

## Overview

This document certifies which architectural patterns are locked and explains the change management process. Locked patterns represent battle-tested decisions that should not be modified without significant justification.

## Locked Patterns

### 1. Entity Contract v2.0

**What's locked:**

- Tier 1 universal fields (id, identity field, is_active, created_at, updated_at)
- Tier 2 optional lifecycle field (status)
- Deactivation via is_active (never use status for deactivation)
- Automatic timestamp management

**See:** `DATABASE_ARCHITECTURE.md`

### 2. Two-Tier Lifecycle System

**What's locked:**

- `is_active` = record visibility (universal deactivation flag)
- `status` = workflow state (entity-specific)
- These fields serve different purposes and both may be needed
- `is_active = false` always means "deactivated" regardless of status

**Terminology:**

- **Deactivation** = `is_active = false` (UPDATE, data preserved)
- **Delete** = Hard DELETE (data removed permanently)

**See:** `ENTITY_LIFECYCLE.md`

### 3. SSOT Pattern

**What's locked:**

- Entity metadata files as the single source of truth
- All validation, documentation, and UI derived from metadata
- No parallel definitions of the same information
- Runtime derivation over static duplication

**See:** `VALIDATION_ARCHITECTURE.md`

### 4. Triple-Tier Security

**What's locked:**

- Auth0 for identity verification
- RBAC for role-based permissions
- RLS for row-level data isolation
- Defense in depth (each layer catches different attack vectors)

**See:** `ARCHITECTURE.md` (Security section)

### 5. Role Hierarchy SSOT

**What's locked:**

- Database `roles` table is the Single Source of Truth for role priorities
- At server startup, `role-hierarchy-loader.js` reads from DB and caches in memory
- Permission checks use the in-memory cache (O(1) lookups)
- `role-definitions.js` is FALLBACK ONLY (tests + pre-DB bootstrap)

**Initialization sequence (server.js):**

1. Database connection established
2. `initRoleHierarchy(db)` called to load roles from DB
3. Routes registered (permissions system is now ready)
4. Server accepts requests

**See:** `backend/config/role-hierarchy-loader.js`

### 6. Naming Conventions

**What's locked:**

- Snake case for database fields
- Camel case for JavaScript
- Status values: lowercase with underscores
- Identity field varies by entity (name, email, title, etc.)

### 7. Schema-Driven UI

**What's locked:**

- Database schema drives UI generation
- Metadata fetched at runtime
- Generic components introspect metadata
- Customization layer for overrides

**See:** `SCHEMA_DRIVEN_UI.md`

## Anti-Patterns (Never Do This)

### Import role-definitions.js in production code

The `role-definitions.js` file is FALLBACK ONLY. For production permission checks:

- Use `role-hierarchy-loader.js` accessor functions
- Role data is loaded from database at startup
- Never import role constants directly in middleware or services

### Merge `is_active` and `status`

The fields serve different purposes. Don't use status values like "deleted" or "inactive" — use `is_active = false` for deactivation.

### Skip CHECK constraints on status

If an entity has a status field, constrain the allowed values.

### Use status for authentication decisions alone

Always check both: `is_active` (does record exist?) AND `status` (what's its lifecycle state?).

### Hardcode enum values in multiple places

Define once in metadata, derive everywhere else.

## Change Management

To modify a locked pattern:

1. **Open issue** with rationale
2. **Architecture review** - discuss alternatives and trade-offs
3. **Breaking change analysis** - identify migration path
4. **Update ADR** with superseding decision
5. **Major version consideration** if breaking contracts

## Future Entity Guidelines

When adding new entities:

1. **Start with Tier 1** - add universal fields per Entity Contract
2. **Evaluate workflow needs** - does entity have lifecycle states?
3. **Add Tier 2 if needed** - status field with CHECK constraint
4. **Create metadata file** - defines all entity configuration
5. **Derive everything** - validation, docs, UI from metadata

## Quality Invariants

These should always be true:

- Zero circular dependencies in core modules
- Zero hardcoded enum values (all in metadata)
- All migrations idempotent (safe to run multiple times)
- All entity behavior derived from metadata

## References

- [Entity Contract](DATABASE_ARCHITECTURE.md)
- [Lifecycle Pattern](ENTITY_LIFECYCLE.md)
- [Validation SSOT](VALIDATION_ARCHITECTURE.md)
- [Core Architecture](ARCHITECTURE.md)

---

**This architecture is LOCKED. Review required for changes.**
