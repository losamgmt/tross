# Field Type Standards

> **Purpose**: Reference for standardized field types across Tross

---

## Overview

Tross uses semantic field types rather than formatted strings. An email field has `type: 'email'`, not `type: 'string', format: 'email'`.

### Key Principles

1. **Semantic Types** - The type answers "what IS this field?" - an email field IS an email
2. **Flat Fields** - No JSONB except truly dynamic user-defined data (e.g., `saved_views.settings`)
3. **Composable Patterns** - Generators for field groups (addresses, human names)
4. **Single Source of Truth** - Field definitions live in code, not documentation

### Key Files

| Purpose | File Path |
|---------|-----------|
| Geographic SSOT | `backend/config/geo-standards.js` |
| Field Type SSOT | `backend/config/field-types.js` |
| Entity Metadata | `backend/config/models/*-metadata.js` |
| Validation Deriver | `backend/config/validation-deriver.js` |
| Frontend Sync Script | `scripts/sync-entity-metadata.js` |

---

## Type Reference

For definitive field definitions, see `backend/config/field-types.js`.

### Supported Types

| Type | Description | Database Column |
|------|-------------|-----------------|
| `string` | Short text with explicit maxLength | `VARCHAR(n)` |
| `text` | Long-form text (descriptions, notes) | `TEXT` |
| `email` | Email address | `VARCHAR(255)` |
| `phone` | Phone number (E.164 format) | `VARCHAR(20)` |
| `url` | Web URL | `VARCHAR(2048)` |
| `integer` | Whole number | `INTEGER` |
| `decimal` | Precise decimal (currency) | `DECIMAL(n,m)` |
| `boolean` | True/false | `BOOLEAN` |
| `date` | Date only | `DATE` |
| `time` | Time only (no timezone) | `TIME` |
| `timestamp` | Date and time (with timezone) | `TIMESTAMPTZ` |
| `enum` | Constrained values | `VARCHAR(50)` |
| `foreignKey` | References another entity | `INTEGER` FK |
| `object` | Dynamic structure (rare - only `saved_views`) | `JSONB` |

### Date/Time Handling

- **`timestamp`** → Uses `TIMESTAMPTZ` (WITH TIME ZONE). PostgreSQL stores as UTC internally and converts on read based on session timezone. Frontend sends ISO UTC strings, displays in user's local timezone.
- **`date`** → Uses `DATE`. No timezone conversion. Stored as literal date.
- **`time`** → Uses `TIME` (WITHOUT TIME ZONE). For recurring daily times like "opens at 9:00 AM". No timezone conversion.

See `DATABASE_ARCHITECTURE.md` for complete timezone handling details.

### JSONB Policy

JSONB is **only** for truly dynamic user-defined data:

| Use Case | Decision |
|----------|----------|
| User-defined view settings | ✅ JSONB (dynamic structure) |
| Addresses, preferences, contact info | ❌ Flatten to individual columns |

---

## Foreign Key Pattern

Foreign keys use `type: 'foreignKey'` with `references`:

```javascript
manager_id: {
  type: 'foreignKey',
  references: 'user',         // Required: target entity key (snake_case) - aligns with SQL REFERENCES
  displayField: 'email',      // Optional: field shown in dropdowns
}
```

The sync script reads `references` to populate frontend metadata and schema generation uses it for SQL `REFERENCES` constraints.

---

## Address Pattern

Addresses use composable field generators:

```javascript
const { createAddressFields, createAddressFieldAccess } = require('../field-types');

// Generates: billing_line1, billing_line2, billing_city, billing_state, billing_postal_code, billing_country
fields: {
  ...createAddressFields('billing'),
}
```

See `backend/config/field-types.js` for full generator API.

---

## Field Traits System (Field-Centric Architecture)

**Status:** ✅ Migration Complete (April 2026)

All 34 entities have been migrated to the field-centric architecture. Field properties (required, immutable, searchable, filterable, sortable) are now defined directly on field definitions instead of separate arrays.

### Atomic Traits

```javascript
const { TRAITS } = require('../field-types');

// 6 atomic field properties
TRAITS.REQUIRED    // required: true
TRAITS.IMMUTABLE   // immutable: true
TRAITS.SEARCHABLE  // searchable: true
TRAITS.FILTERABLE  // filterable: true
TRAITS.SORTABLE    // sortable: true
TRAITS.READONLY    // readonly: true
```

### Composite Trait Sets

```javascript
const { TRAIT_SETS } = require('../field-types');

// Pre-composed for common patterns
TRAIT_SETS.IDENTITY      // SEARCHABLE + FILTERABLE + SORTABLE (name fields)
TRAIT_SETS.PK            // READONLY + IMMUTABLE + FILTERABLE + SORTABLE (primary key)
TRAIT_SETS.LOOKUP        // FILTERABLE + SORTABLE (dropdown/filter fields)
TRAIT_SETS.FILTER_ONLY   // FILTERABLE (foreign keys, filters)
TRAIT_SETS.TIMESTAMP     // READONLY + FILTERABLE + SORTABLE (created_at, updated_at)
TRAIT_SETS.FULLTEXT      // SEARCHABLE (text fields)
TRAIT_SETS.JUNCTION_FK   // REQUIRED + IMMUTABLE + FILTERABLE (M:M FKs)
TRAIT_SETS.SEARCHABLE_LOOKUP // SEARCHABLE + FILTERABLE + SORTABLE
```

### withTraits() Helper

Compose field definitions with traits:

```javascript
const { withTraits, FIELD, TRAITS, TRAIT_SETS } = require('../field-types');

fields: {
  name: withTraits(FIELD.NAME, TRAITS.REQUIRED, TRAIT_SETS.IDENTITY),
  description: withTraits(FIELD.DESCRIPTION, TRAITS.SEARCHABLE),
  status: withTraits({ type: 'enum', enumKey: 'status' }, TRAIT_SETS.LOOKUP),
}
```

### TIER1_FIELDS (Standard Field Groups)

Spread-ready groups for standard entity fields:

```javascript
const { TIER1_FIELDS } = require('../field-types');

// All entities get core fields
fields: {
  ...TIER1_FIELDS.CORE,     // id, is_active, created_at, updated_at
  // or
  ...TIER1_FIELDS.WITH_STATUS,  // CORE + status enum
  
  // Entity-specific fields
  name: withTraits(FIELD.NAME, TRAITS.REQUIRED, TRAIT_SETS.IDENTITY),
}
```

### Foreign Key Helpers

```javascript
const { createForeignKey, createJunctionFields } = require('../field-types');

// Standard FK with default FILTER_ONLY traits
customer_id: createForeignKey('customer', { required: true, traits: TRAIT_SETS.LOOKUP })

// Junction table with full M:M structure
fields: {
  ...createJunctionFields('visit', 'technician'),  // Creates id, FKs, timestamps
}
```

### Entity Categories

| Category | Field Pattern | Example Entities |
|----------|---------------|------------------|
| Standard | `TIER1_FIELDS.CORE/WITH_STATUS` | customer, work_order, invoice |
| Junction | `createJunctionFields()` | visit_technician, customer_unit |
| System | `TIER1.*` individual + `withTraits` | audit_log, notification, preferences |

### Accessor Functions

All consumers use accessor functions that derive values from field-level properties:

```javascript
const { getRequiredFields, getSearchableFields } = require('../metadata-accessors');

// These extract values from field definitions
const required = getRequiredFields(metadata);  // ['name', 'email']
const searchable = getSearchableFields(metadata);  // ['name', 'description']
```

---

## See Also

- [Database Architecture](DATABASE_ARCHITECTURE.md) - Entity Contract and database patterns
- [Validation Architecture](VALIDATION_ARCHITECTURE.md) - How types flow to Joi validation
- [Metadata SSOT Audit](METADATA-SSOT-AUDIT.md) - Complete architecture audit
- `backend/config/field-types.js` - Definitive field type definitions
- `backend/config/metadata-accessors.js` - Accessor functions for field properties
- `backend/config/geo-standards.js` - State/province/country enums
