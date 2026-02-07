# Schema-Driven UI Architecture

## Overview

This document explains the philosophy and architectural decisions behind Tross's schema-driven UI approach.

## Core Principle

> **The database schema (via entity metadata) drives UI generation automatically.**

Adding a field should not require updating multiple files across frontend and backend. Instead, one change to the source of truth propagates everywhere.

## The Problem This Solves

In traditional architectures, adding a field requires updating:

- Database schema
- Backend model
- Frontend model
- Table configuration
- Form configuration
- Validation rules
- TypeScript/Dart types

This creates:

- Synchronization burden
- Drift between layers
- Maintenance overhead
- Bug surface area

## The Solution

Entity metadata serves as the single definition point. From there:

- Backend derives validation (Joi schemas)
- Backend derives API documentation (Swagger/OpenAPI)
- Frontend derives form fields and validation
- UI components render based on field types

## Architectural Decisions

### Decision: Introspection Over Configuration

**Why we introspect rather than duplicate:**

- Schema IS the source of truth
- No configuration files to keep in sync
- Changes propagate automatically
- Less code overall

### Decision: Generic Components

**Why we build generic table/form components:**

- One component handles all entities
- Consistent look and feel
- New entities work immediately
- Reduces frontend code significantly

### Decision: Field Type Inference

**Why we infer UI types from schema types:**

- Email fields → email validation
- Boolean fields → toggle widgets
- Text fields → textarea widgets
- Foreign keys → select widgets
- Reduces per-field configuration

### Decision: Customization Layer

**Why we allow overrides:**

- Defaults work for most cases
- Edge cases need customization
- Overrides merge with introspected schema
- Custom labels, ordering, computed fields

### Decision: Runtime Metadata Fetch

**Why frontend fetches metadata at runtime:**

- Always up-to-date
- No frontend rebuild for schema changes
- Metadata can be cached client-side
- Single source remains backend

## How It Works

### The Flow

1. **Entity metadata** defines fields with types and constraints
2. **Backend sync** generates frontend-readable metadata file
3. **Frontend provider** loads metadata on startup
4. **Generic components** introspect metadata to render

### Field Metadata Properties

For each field, metadata includes:

- Data type (string, number, boolean, etc.)
- Required/optional
- Allowed values (for enums)
- Length constraints
- Format patterns
- UI hints (if field name implies type)

### UI Generation

Generic components:

- Read field list from metadata
- Determine appropriate widget per field type
- Apply validation rules from metadata
- Render consistently across entities

## Benefits

### For Development

- **Single place to change:** Entity metadata
- **Faster iterations:** Add field, refresh page
- **Less code:** Delete thousands of lines of config

### For Maintenance

- **Self-documenting:** Metadata describes UI behavior
- **Type-safe:** Constraints become validation
- **Consistent:** All entities behave the same way

### For Features

- **New entities:** Just add metadata, UI appears
- **Custom fields:** Show up automatically
- **Relationship changes:** UI adapts

## Trade-offs

### Pros

- Dramatically reduced duplication
- Automatic propagation of changes
- Consistent behavior and appearance
- Faster development of CRUD screens

### Cons

- Initial infrastructure investment
- Highly custom UIs still need custom code
- Debugging requires understanding the flow
- Runtime dependency on metadata

## When NOT to Use

Schema-driven UI works best for:

- Standard CRUD operations
- Admin dashboards
- Data management screens

Consider custom UI for:

- Complex multi-step workflows
- Heavily branded consumer experiences
- Non-CRUD interactions
- Performance-critical paths

## Integration with SSOT

This pattern connects to the broader SSOT architecture:

- Entity metadata is THE source
- Validation derives from metadata
- Swagger derives from metadata
- Frontend derives from metadata

All roads lead back to `*-metadata.js` files.

## References

- **Metadata Pattern:** See `config/models/*-metadata.js`
- **Validation Flow:** See `VALIDATION_ARCHITECTURE.md`
- **Entity Contract:** See `DATABASE_ARCHITECTURE.md`

---

**Architecture Status:** 🔒 **LOCKED** - Schema-driven UI is a core pattern
