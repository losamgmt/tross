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

Foreign keys use `type: 'foreignKey'` with `relatedEntity`:

```javascript
manager_id: {
  type: 'foreignKey',
  relatedEntity: 'user',      // Required: target entity key (snake_case)
  displayField: 'email',      // Optional: field shown in dropdowns
}
```

The sync script reads `relatedEntity` to populate frontend metadata. Do **not** use `references` or other custom properties—they will be ignored.

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

## See Also

- [Database Architecture](DATABASE_ARCHITECTURE.md) - Entity Contract and database patterns
- [Validation Architecture](VALIDATION_ARCHITECTURE.md) - How types flow to Joi validation
- `backend/config/field-types.js` - Definitive field type definitions
- `backend/config/geo-standards.js` - State/province/country enums
