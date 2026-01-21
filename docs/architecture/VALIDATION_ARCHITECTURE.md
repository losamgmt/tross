# Validation Architecture

## Purpose

This document explains **why** TrossApp validates data the way it does, and the architectural decisions behind our multi-layer validation strategy.

For implementation details, see the code itself:
- `backend/config/models/*-metadata.js` - field definitions
- `backend/utils/validation-deriver.js` - Joi schema derivation
- `frontend/lib/services/metadata/` - frontend validation loading

---

## Core Principle: Single Source of Truth

**Decision**: Entity metadata files are THE authoritative source for all field definitions.

**Why**: 
- Eliminates drift between frontend/backend validation rules
- Enables automatic derivation of Joi schemas, Swagger docs, and form validation
- Changes propagate automatically - update once, effects everywhere
- Code becomes self-documenting - read metadata to understand constraints

**Alternative Rejected**: Separate validation config files (e.g., JSON schema files, separate Joi definitions). This approach leads to drift and requires manual synchronization.

---

## Multi-Layer Validation

**Decision**: Validate data at four independent layers.

```
Frontend Form → Backend Joi → Model Logic → Database Constraints
```

**Why Each Layer Exists**:

| Layer | Purpose | Why Not Skip It? |
|-------|---------|------------------|
| Frontend | Instant UX feedback | Users shouldn't wait for network round-trip |
| Backend Joi | Security boundary | Never trust client input, period |
| Model | Business logic | Complex rules that span multiple fields |
| Database | Final guarantee | Protects data even if app layers fail |

**Why Not Just Database Constraints?**
- Poor UX: users see cryptic DB errors instead of friendly messages
- Late detection: round-trip to DB for every validation
- Limited expressiveness: can't encode complex business rules in CHECK constraints

**Why Not Just Frontend Validation?**
- Security: client validation is bypassable
- Incomplete: can't verify business rules that require server state

---

## Permissive Validation Policy

**Decision**: Accept the widest reasonable range of valid input.

**Why**:
- Real-world data is messy - names have apostrophes, hyphens, accents
- Email TLDs change constantly - don't hardcode allowed TLDs
- Overly strict patterns reject legitimate users
- Better to accept edge cases than frustrate users

**Guideline**: If in doubt, be permissive. Add restrictions only when there's a clear security or data integrity reason.

---

## HUMAN Entity Alignment

**Decision**: User, Customer, and Technician entities share identical lifecycle status definitions.

**Why**:
- All three represent people in the system
- Enables potential data synchronization between profiles
- Simplifies reasoning about "what states can a person be in?"
- Reduces cognitive load - learn one pattern, apply everywhere

**Decision**: Technician operational state is separate from lifecycle status.

**Why**:
- Lifecycle status (admin-controlled): "Is this account active?"
- Operational state (self-managed): "Is this technician currently available for jobs?"
- Different concerns, different actors, separate fields
- Avoids overloading a single field with multiple meanings

---

## Derivation Over Duplication

**Decision**: Derive validation schemas at runtime rather than maintaining separate definitions.

**Why**:
- DRY principle - one source, many consumers
- Impossible to have drift if there's only one definition
- Changes are atomic - update metadata, everything updates
- Testable - can verify derivation logic produces expected output

**Implementation Notes**:
- Backend: `validation-deriver.js` generates Joi schemas from metadata
- Frontend: `sync-entity-metadata.js` exports metadata to JSON asset
- Swagger: `derived-constants.js` generates OpenAPI schemas from metadata

---

## Metadata-First Development

When adding or modifying validation:

1. **Start with metadata** - define the field in `*-metadata.js`
2. **Update database** - add column/constraint to `schema.sql`
3. **Sync** - run `sync-entity-metadata.js`
4. **Done** - derivation handles everything else

**Why this order?**
- Metadata is the SSOT - start there
- Database is the final enforcement layer - must match
- Sync propagates to frontend automatically
- No manual Joi schema writing, no manual Swagger updates

---

## Error Message Philosophy

**Decision**: Return structured, actionable error messages.

**Why**:
- Frontend can display field-specific errors inline
- Debugging is faster with specific information
- API consumers can programmatically handle specific cases
- Users understand what to fix

**What We Avoid**:
- Generic "validation failed" errors
- Exposing internal error details (security risk)
- Stack traces in production responses

---

## Testing Strategy

**Decision**: Test the derivation logic, not individual field values.

**Why**:
- Field values change - tests shouldn't break when adding an enum value
- Derivation logic is stable - test that metadata → Joi schema works correctly
- Parity tests verify frontend/backend use same source, not same values

---

## Related Decisions

- [ENTITY_CONTRACT.md](./ENTITY_CONTRACT.md) - how metadata files are structured
- [DATABASE_DESIGN.md](../database/DATABASE_DESIGN.md) - database constraint philosophy
- [SYNC_ARCHITECTURE.md](./SYNC_ARCHITECTURE.md) - frontend/backend synchronization

---

*This document describes architectural decisions. For current field definitions, read the metadata files directly.*
