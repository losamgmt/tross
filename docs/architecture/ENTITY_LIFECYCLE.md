# Entity Lifecycle Management

## Overview

This document defines the architectural pattern for lifecycle states in Tross entities. It addresses the design question: when should an entity use `is_active` alone versus adding a `status` field?

## Core Principle

> **`is_active` controls visibility; `status` controls workflow.**

These fields serve distinct purposes and are **not mutually exclusive**. Many entities legitimately need both.

## Two-Tier System

### Tier 1: Universal Deactivation (`is_active`)

**Purpose:** Record visibility flag  
**Applies To:** ALL business entities  
**Meaning:** `false` = "deactivated" — hidden from normal queries, but data preserved

> **Terminology:** We use "deactivation" (not "soft delete") to distinguish from hard delete.
>
> - **Deactivation** = `is_active = false` (UPDATE operation, data preserved)
> - **Delete** = Hard DELETE (data removed permanently)

### Tier 2: Entity-Specific Lifecycle (`status`)

**Purpose:** Workflow state tracking  
**Applies To:** Only entities with multi-stage lifecycles  
**Meaning:** Current position in the entity's workflow

**Key Invariant:** `is_active = false` ALWAYS means "deactivated". The `status` field can never resurrect a deactivated record.

## Decision Criteria

### Add `status` Field When:

- Entity has distinct lifecycle stages
- Different business rules apply per state
- Status-based reporting is needed
- Workflow visibility is important to users
- Approval or activation processes exist

### Use Only `is_active` When:

- Entity has no meaningful workflow
- Entity is simply "exists" or "doesn't exist"
- Reference/lookup data only
- No business rules depend on intermediate states

## Architectural Decisions

### Decision: Separation of Concerns

**Why we separate `is_active` from `status`:**

- `is_active = false` means "deactivated" — hidden from normal queries
- `status` captures meaningful business workflow only
- Queries remain simple and consistent
- Avoids conflating "deactivated" with "suspended" or other states

### Decision: Status Values in Metadata

**Why status enums live in entity metadata files:**

- Single source of truth for all validation
- CHECK constraints derived, not duplicated
- Frontend and backend automatically synchronized
- Changes propagate through the entire stack

### Decision: Default to Operational State

**Why new records default to an operational status:**

- Minimizes special-case handling
- Matches user expectation (created = ready to use)
- Exceptions (like pending approval) are explicit in business rules

### Decision: Non-Nullable Status

**Why status fields have NOT NULL constraints:**

- Forces explicit lifecycle state
- Simplifies query logic (no NULL checks)
- Every record has a defined state

### Decision: HUMAN Entities Share Status

**Why User, Customer, and Technician have identical status values:**

- They represent the same lifecycle pattern (humans in the system)
- Simplifies authentication and authorization logic
- Allows consistent admin interfaces
- Operational concerns (like technician availability) are separate fields

## When NOT to Add Status

Entities that should NEVER have a status field:

- Pure reference data (lookup tables)
- Join/association tables
- Configuration entities
- Anything without a meaningful lifecycle

**The question to ask:** "Does this entity move through stages, or does it just exist?"

## Anti-Patterns

### Duplicating `is_active` Logic

Status values should NOT replicate the deactivation semantic. If you need "enabled/disabled", use `is_active`.

### Optional Status on Workflow Entities

If an entity needs status, it should be required with a sensible default.

### Mixing Status with is_active in Queries

Keep concerns separate. Filter by `is_active` for existence, by `status` for workflow state.

### Status on Reference Entities

Lookup tables, categories, and static reference data don't need lifecycle—just existence.

## Query Patterns

Standard patterns for lifecycle-aware queries:

1. **Active records in operational state** - Filter by both fields
2. **All non-deactivated records** - Filter only by `is_active = true`
3. **Records in specific lifecycle stage** - Filter by status with `is_active = true`
4. **Status distribution** - Group by status, partition by `is_active`

## Transition Validation

Not all status transitions are valid. The business logic should:

- Define which transitions are allowed
- Determine what side effects occur on transition
- Control who can perform each transition

## Audit Requirements

All status changes should be logged because:

- Status changes represent business events
- Compliance may require transition history
- Debugging requires understanding state changes

## SSOT Integration

Status values are defined in entity metadata files. From there:

- Database CHECK constraints are derived
- API validation is derived
- Swagger documentation is derived
- Frontend validation is synchronized

See `VALIDATION_ARCHITECTURE.md` for the derivation flow.

## References

- **Entity Metadata:** See `*-metadata.js` files for status definitions
- **Entity Contract:** See `DATABASE_ARCHITECTURE.md` for field requirements
- **Validation Flow:** See `VALIDATION_ARCHITECTURE.md`

---

**Architecture Status:** 🔒 **LOCKED** - This pattern applies to all entity lifecycle implementations
