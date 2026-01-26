# Field Type Standards Implementation Plan

> **Created**: January 23, 2026  
> **Status**: Backend Complete (Phases 0-5) ✅  
> **Purpose**: Reference for standardized field types across TrossApp

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Design Decisions](#design-decisions)
3. [Phase 0: Foundation](#phase-0-foundation-complete) ✅
4. [Phase 1: Complete Field Type Standards](#phase-1-complete-field-type-standards) ✅
5. [Phase 2: Flatten Preferences](#phase-2-flatten-preferences) ✅
6. [Phase 3: Flatten Customer Addresses](#phase-3-flatten-customer-addresses) ✅
7. [Phase 4: Add Work Order Location](#phase-4-add-work-order-location) ✅
8. [Phase 5: Refactor All Entity Metadata](#phase-5-refactor-all-entity-metadata) ✅
9. [Phase 6: Frontend Address UI](#phase-6-frontend-address-ui) ✅
10. [Phase 7: Documentation & Cleanup](#phase-7-documentation-cleanup) ⏳
11. [Appendix: Complete Type Reference](#appendix-complete-type-reference)

---

## Executive Summary

### Goal
Establish a **Single Source of Truth (SSOT)** for field types across all layers of TrossApp, enabling:
- Zero-hardcoding field additions
- Consistent validation frontend/backend
- Type-safe field handling
- Extensible patterns for future needs

### Key Files Created
- `backend/config/geo-standards.js` - Geographic data (countries, states/provinces)
- `backend/config/field-type-standards.js` - Field definitions and generators

### Key Principles
1. **Semantic Types** - Email IS an email, not "string with format"
2. **Flat Fields** - No JSONB except truly dynamic user-defined data
3. **Composable Patterns** - Generators for field groups (addresses, human names)
4. **Safe Iteration** - Each phase independently deployable and reversible

---

## Design Decisions

### Decision 1: Semantic Types vs Formatted Strings
**Chosen**: Semantic types (`type: 'email'`) over formatted strings (`type: 'string', format: 'email'`)

**Rationale**: The type answers "what IS this field?" - an email field IS an email.

### Decision 2: JSONB Policy
**Chosen**: JSONB ONLY for truly dynamic user-defined data

| Use Case | Decision |
|----------|----------|
| `saved_views.settings` | KEEP as JSONB (user-defined structure) |
| `user_preferences.preferences` | FLATTEN to individual columns |
| `customer.billing_address` | FLATTEN to 6 address columns |

### Decision 3: Eliminated Types
- **`number`** - Removed. Use `integer` or `decimal` instead.
- **`richtext`** - Not implemented. Add later if needed.

### Decision 4: Text Size Limits
All text types have explicit limits (security/performance):
- `string`: Varies by field (100-255 typical)
- `text`: 2,000-50,000 depending on use case

---

## Phase 0: Foundation (COMPLETE ✅)

**Status**: ✅ Complete  
**Completed**: January 23, 2026

### What Was Done

#### 1. Created `geo-standards.js`
**Location**: `backend/config/geo-standards.js`

```javascript
// Exports:
SUPPORTED_COUNTRIES      // ['US', 'CA'] - extensible
DEFAULT_COUNTRY          // 'US'
US_STATES               // 56 entries (50 states + DC + territories)
CA_PROVINCES            // 13 entries
ALL_SUBDIVISIONS        // Combined for enum validation
COUNTRY_NAMES           // Display names
SUBDIVISION_NAMES       // Display names

// Helper functions:
isValidCountry(code)
isValidSubdivision(code)
isValidSubdivisionForCountry(code, country)
getSubdivisionsForCountry(country)
getSubdivisionName(code, country)
getCountryName(code)
```

#### 2. Created `field-type-standards.js`
**Location**: `backend/config/field-type-standards.js`

```javascript
// FIELD constants:
FIELD.EMAIL              // { type: 'email', maxLength: 255 }
FIELD.PHONE              // { type: 'phone', maxLength: 50 }
FIELD.FIRST_NAME         // { type: 'string', maxLength: 100 }
FIELD.LAST_NAME          // { type: 'string', maxLength: 100 }
FIELD.NAME               // { type: 'string', maxLength: 200 }
FIELD.SUMMARY            // { type: 'string', maxLength: 200 }
FIELD.DESCRIPTION        // { type: 'string', maxLength: 2000 }
FIELD.ADDRESS_LINE1      // { type: 'string', maxLength: 255 }
FIELD.ADDRESS_LINE2      // { type: 'string', maxLength: 255 }
FIELD.ADDRESS_CITY       // { type: 'string', maxLength: 100 }
FIELD.ADDRESS_STATE      // { type: 'string', maxLength: 10 }
FIELD.ADDRESS_POSTAL_CODE // { type: 'string', maxLength: 20 }
FIELD.ADDRESS_COUNTRY    // { type: 'string', maxLength: 2 }

// Generators:
createAddressFields(prefix, options)
createAddressFieldAccess(prefix, minRole, options)
```

#### 3. Updated `validation-loader.js`
Added semantic types to switch statement:
- `email` → `Joi.string().email()`
- `phone` → `Joi.string().pattern(E.164)`

#### 4. Updated `validation-deriver.js`
- Imports `FIELD.*` from field-type-standards
- Imports `ALL_SUBDIVISIONS`, `SUPPORTED_COUNTRIES` from geo-standards
- `SHARED_FIELD_DEFS` now uses `...FIELD.*` spread

#### 5. Created Unit Tests
- `backend/__tests__/unit/config/geo-standards.test.js` - 38 tests
- `backend/__tests__/unit/config/field-type-standards.test.js` - 38 tests

### Verification
```bash
npm run test:unit  # 1942 tests passing
```

---

## Phase 1: Complete Field Type Standards

**Status**: ✅ Complete  
**Completed**: January 23, 2026  
**Dependencies**: Phase 0 (complete)

### Tasks

#### 1.1 Add Missing Types to `validation-loader.js`

Update the switch statement in `buildFieldSchema()`:

```javascript
case 'text':
  // Long-form plain text (same as string, semantic difference)
  schema = Joi.string();
  break;

case 'time':
  // Time only (HH:MM or HH:MM:SS)
  schema = Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/);
  break;

case 'decimal':
  // Precise decimal (for currency)
  schema = Joi.number();
  if (fieldDef.precision !== undefined) {
    schema = schema.precision(fieldDef.precision);
  }
  break;

case 'url':
  // URL/URI
  schema = Joi.string().uri();
  break;
```

#### 1.2 Add Missing FIELD.* Constants

Add to `field-type-standards.js`:

```javascript
// Text hierarchy
TITLE: { type: 'string', maxLength: 100 },
NOTES: { type: 'text', maxLength: 10000 },
TERMS: { type: 'text', maxLength: 50000 },

// Identifiers
IDENTIFIER: { type: 'string', maxLength: 20, immutable: true, unique: true },
SKU: { type: 'string', maxLength: 50, immutable: true, unique: true },

// Currency
CURRENCY: { type: 'decimal', precision: 2, min: 0 },

// URL
URL: { type: 'url', maxLength: 2000 },
```

#### 1.3 Update Tests

Add tests for:
- New types in `field-type-standards.test.js`
- New Joi mappings in validation tests

#### 1.4 Verification Gate
```bash
npm run test:unit  # All tests pass
```

---

## Phase 2: Flatten Preferences

**Status**: ✅ Complete  
**Completed**: January 23, 2026  
**Dependencies**: Phase 1

### Context
Currently `user_preferences.preferences` is a JSONB column containing:
```json
{
  "theme": "system",
  "density": "comfortable",
  "notifications_enabled": true,
  "items_per_page": 25
}
```

We're flattening this to individual columns for type safety and consistency.

### Tasks

#### 2.1 Database Migration

**File**: `backend/migrations/YYYYMMDD_flatten_preferences.sql`

```sql
-- UP: Add individual preference columns
ALTER TABLE user_preferences
  ADD COLUMN theme VARCHAR(20) DEFAULT 'system',
  ADD COLUMN density VARCHAR(20) DEFAULT 'comfortable',
  ADD COLUMN notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN items_per_page INTEGER DEFAULT 25;

-- Migrate data from JSONB to flat columns
UPDATE user_preferences SET
  theme = COALESCE(preferences->>'theme', 'system'),
  density = COALESCE(preferences->>'density', 'comfortable'),
  notifications_enabled = COALESCE((preferences->>'notifications_enabled')::boolean, true),
  items_per_page = COALESCE((preferences->>'items_per_page')::integer, 25);

-- Keep preferences JSONB temporarily for rollback safety
```

#### 2.2 Update Backend

**File**: `backend/config/models/preferences-metadata.js`

- Remove JSONB field definition
- Add flat field definitions using `FIELD.*`:
  ```javascript
  theme: { type: 'enum', values: ['system', 'light', 'dark'] },
  density: { type: 'enum', values: ['compact', 'comfortable', 'spacious'] },
  notifications_enabled: { type: 'boolean' },
  items_per_page: { type: 'integer', min: 10, max: 100 },
  ```

**File**: `backend/services/preferences-service.js`

- Update to read/write flat columns instead of JSONB

#### 2.3 Update Frontend

```bash
cd scripts && node sync-entity-metadata.js
```

- Preferences UI should auto-update to use flat fields

#### 2.4 Verification Gate
```bash
npm run test:unit
npm run test:integration  # Preferences CRUD works
flutter test
```

#### 2.5 Cleanup Migration (After Verification Period)
```sql
ALTER TABLE user_preferences DROP COLUMN preferences;
```

---

## Phase 3: Flatten Customer Addresses

**Status**: ✅ Complete  
**Completed**: January 23, 2026  
**Dependencies**: Phase 1

### Context
Currently customers have:
- `billing_address` (JSONB)
- `service_address` (JSONB)

We're converting to flat fields using our address pattern.

### Tasks

#### 3.1 Database Migration

**File**: `backend/migrations/YYYYMMDD_flatten_customer_addresses.sql`

```sql
-- UP: Add flat billing address columns
ALTER TABLE customers
  ADD COLUMN billing_line1 VARCHAR(255),
  ADD COLUMN billing_line2 VARCHAR(255),
  ADD COLUMN billing_city VARCHAR(100),
  ADD COLUMN billing_state VARCHAR(10),
  ADD COLUMN billing_postal_code VARCHAR(20),
  ADD COLUMN billing_country VARCHAR(2) DEFAULT 'US';

-- Add flat service address columns
ALTER TABLE customers
  ADD COLUMN service_line1 VARCHAR(255),
  ADD COLUMN service_line2 VARCHAR(255),
  ADD COLUMN service_city VARCHAR(100),
  ADD COLUMN service_state VARCHAR(10),
  ADD COLUMN service_postal_code VARCHAR(20),
  ADD COLUMN service_country VARCHAR(2) DEFAULT 'US';

-- Migrate billing_address JSONB to flat columns
UPDATE customers SET
  billing_line1 = billing_address->>'line1',
  billing_line2 = billing_address->>'line2',
  billing_city = billing_address->>'city',
  billing_state = billing_address->>'state',
  billing_postal_code = billing_address->>'postal_code',
  billing_country = COALESCE(billing_address->>'country', 'US')
WHERE billing_address IS NOT NULL;

-- Migrate service_address JSONB to flat columns
UPDATE customers SET
  service_line1 = service_address->>'line1',
  service_line2 = service_address->>'line2',
  service_city = service_address->>'city',
  service_state = service_address->>'state',
  service_postal_code = service_address->>'postal_code',
  service_country = COALESCE(service_address->>'country', 'US')
WHERE service_address IS NOT NULL;
```

#### 3.2 Update Backend

**File**: `backend/config/models/customer-metadata.js`

```javascript
const { createAddressFields, createAddressFieldAccess } = require('../field-type-standards');

// In fields section:
fields: {
  ...createAddressFields('billing'),
  ...createAddressFields('service'),
  // ... other fields
},

// In fieldAccess section:
fieldAccess: {
  ...createAddressFieldAccess('billing', 'customer'),
  ...createAddressFieldAccess('service', 'customer'),
  // ... other field access
},
```

Remove: `billing_address`, `service_address` JSONB field definitions

#### 3.3 Update Frontend

```bash
cd scripts && node sync-entity-metadata.js
```

- Address fields appear as groups (detected by `_line1`, `_city`, etc. suffixes)

#### 3.4 Verification Gate
```bash
npm run test:unit
npm run test:integration  # Customer CRUD with addresses
flutter test
# Manual: Create/edit customer, verify addresses save correctly
```

#### 3.5 Cleanup Migration
```sql
ALTER TABLE customers 
  DROP COLUMN billing_address,
  DROP COLUMN service_address;
```

---

## Phase 4: Add Work Order Location

**Status**: ✅ Complete  
**Completed**: January 23, 2026  
**Dependencies**: Phases 1, 3  
**Note**: This was the original user request that sparked this entire architecture effort!

### Context
Work orders need a location/address to indicate where work is performed. This uses the same address pattern established in Phases 0-3.

### Tasks

#### 4.1 Database Migration

**File**: `backend/migrations/YYYYMMDD_add_work_order_location.sql`

```sql
-- UP: Add location columns to work orders
ALTER TABLE work_orders
  ADD COLUMN location_line1 VARCHAR(255),
  ADD COLUMN location_line2 VARCHAR(255),
  ADD COLUMN location_city VARCHAR(100),
  ADD COLUMN location_state VARCHAR(10),
  ADD COLUMN location_postal_code VARCHAR(20),
  ADD COLUMN location_country VARCHAR(2) DEFAULT 'US';

-- Optional: Add index for geographic searches
CREATE INDEX idx_work_orders_location_state ON work_orders(location_state);
CREATE INDEX idx_work_orders_location_city ON work_orders(location_city);
```

#### 4.2 Update Backend Metadata

**File**: `backend/config/models/work-order-metadata.js`

```javascript
const { createAddressFields, createAddressFieldAccess } = require('../field-type-standards');

// In fields section:
fields: {
  ...createAddressFields('location'),
  // ... other fields
},

// In fieldAccess section:
fieldAccess: {
  ...createAddressFieldAccess('location', 'customer'),  // or 'operator' based on access needs
  // ... other field access
},
```

#### 4.3 Frontend Updates

```bash
cd scripts && node sync-entity-metadata.js
```

- Work order form will automatically gain address fields
- May need UI adjustment if address should appear in specific position on form

#### 4.4 Optional: Link to Customer Address

Consider adding a "Copy from Customer" feature:
```javascript
// In work order form - copy service address from linked customer
onCopyFromCustomer: () => {
  setLocationLine1(customer.service_line1);
  setLocationCity(customer.service_city);
  // ... etc
}
```

#### 4.5 Verification Gate
```bash
npm run test:unit
npm run test:integration  # Work order CRUD with location
flutter test
# Manual: Create work order, set location, verify it saves and displays correctly
```

---

## Phase 5: Refactor All Entity Metadata

**Status**: ✅ Complete  
**Completed**: January 23, 2026  
**Dependencies**: Phases 1-4

### Context
Comprehensive audit and refactor of all 13 entity metadata files to use:
- `FIELD.*` constants instead of inline definitions
- Semantic types (`type: 'email'`) not format patterns
- Consistent field naming and constraints

### Entities to Refactor

| Entity | File | Priority Notes |
|--------|------|----------------|
| users | user-metadata.js | email, phone, name fields |
| customers | customer-metadata.js | email, phone, addresses (done in Phase 3) |
| technicians | technician-metadata.js | email, phone, name fields |
| vendors | vendor-metadata.js | email, phone, addresses |
| work_orders | work-order-metadata.js | location (done in Phase 4), description |
| quotes | quote-metadata.js | description, terms |
| invoices | invoice-metadata.js | description, terms, totals |
| products | product-metadata.js | SKU, description |
| equipment | equipment-metadata.js | model, serial, description |
| interactions | interaction-metadata.js | notes/description |
| parts_and_labor | parts-labor-metadata.js | descriptions |
| saved_views | saved-views-metadata.js | Keep settings JSONB! |
| user_preferences | preferences-metadata.js | (done in Phase 2) |

### Tasks

#### 5.1 Create Refactoring Checklist

For each entity, check:
- [ ] Uses `FIELD.*` for common fields (email, phone, name, description)
- [ ] Uses semantic types (no `type: 'string', format: 'email'`)
- [ ] Addresses use `createAddressFields()` pattern
- [ ] No inline regex patterns that should be centralized
- [ ] Consistent `maxLength` values per field type

#### 5.2 Refactor One Entity at a Time

Pattern for each:
```javascript
// Before
email: {
  type: 'string',
  format: 'email',
  maxLength: 255,
  required: true
},

// After
const { FIELD } = require('../field-type-standards');
// ...
email: { ...FIELD.EMAIL, required: true },
```

#### 5.3 Run Tests After Each Entity
```bash
npm run test:unit
flutter test
```

#### 5.4 Sync Frontend After All Entities
```bash
cd scripts && node sync-entity-metadata.js
```

#### 5.5 Verification Gate
```bash
npm run test:unit
npm run test:integration
flutter test
# Manual: Spot-check create/edit forms for various entities
```

---

## Phase 6: Frontend Address UI Component

**Status**: ✅ Complete  
**Dependencies**: Phases 1-3 (complete)

### Context
Address fields now render as coherent groups with proper row layouts using the generic metadata-driven system. No specialized `AddressFieldGroup` widget is needed - the existing `GenericForm`, `DetailPanel`, and `FormSection` widgets handle address layout automatically based on `fieldGroups` and `rows` metadata.

### Implemented Solution

#### 6.1 Metadata-Driven Row Layouts

Instead of a specialized widget, address layouts are defined in backend entity metadata using `rows` hints:

**File**: `backend/config/models/customer-metadata.js`

```javascript
fieldGroups: {
  billing_address: {
    label: 'Billing Address',
    fields: ['billing_line1', 'billing_line2', 'billing_city', 'billing_state', 'billing_postal_code', 'billing_country'],
    rows: [['billing_city', 'billing_state', 'billing_postal_code']], // These 3 render on same row
    order: 3,
  },
}
```

#### 6.2 FieldGroup Model Extended

**File**: `frontend/lib/models/entity_metadata.dart`

```dart
class FieldGroup {
  final String label;
  final List<String> fields;
  final int order;
  final List<List<String>> rows; // Row layout hints

  // Helper methods
  bool isInRow(String fieldName);
  List<String>? getRowFor(String fieldName);
}
```

#### 6.3 GenericForm/DetailPanel Row Rendering

Both `GenericForm` and `DetailPanel` now detect row layouts and render fields in `Row` widgets with `Expanded` children:

```dart
// Check if this field is part of a row layout
final row = group.getRowFor(fieldName);
if (row != null && row.length > 1) {
  // Build row of fields with Expanded
  final rowWidgets = row.map((f) => Expanded(child: _buildField(f))).toList();
  fieldWidgets.add(Row(children: rowWidgets));
}
```

#### 6.4 Backend Address Field Generators

Flat address fields are generated using reusable helpers:

**File**: `backend/config/field-type-standards.js`

```javascript
// Generate 6 flat address fields with geo-standard enums
const fields = createAddressFields('billing');
// => { billing_line1, billing_line2, billing_city, billing_state, billing_postal_code, billing_country }

// Generate field access rules for all 6 fields
const access = createAddressFieldAccess('billing', 'customer', { updateRole: 'dispatcher' });
```

#### 6.5 Geo Standards Flow

State/Country enum values flow from `geo-standards.js` through `field-type-standards.js` to entity metadata, synced to frontend `entity-metadata.json`. Frontend forms render appropriate dropdowns automatically based on field type `enum` with the geo values.

### Entities Using Address Groups

| Entity | Address Groups | Row Layout |
|--------|---------------|------------|
| customer | billing_address, service_address | city \| state \| postal_code |
| work_order | location_address | city \| state \| postal_code |

### Why Generic Over Specialized

1. **Single pattern** - Same row layout system works for any field grouping, not just addresses
2. **Backend SSOT** - Layout defined in metadata, not hardcoded in widgets
3. **Sync-based** - Changes to backend metadata automatically flow to frontend
4. **Extensible** - Can add flex ratios, responsive breakpoints later in metadata

#### 6.6 Verification Gate
```bash
dart analyze --fatal-infos  # No issues
node scripts/sync-entity-metadata.js  # Syncs row hints to frontend
# Manual: View customer/work_order forms, verify city|state|zip row layout
```

---

## Phase 7: Documentation & Cleanup

**Status**: ⏳ In Progress  
**Dependencies**: Phases 1-6

### Tasks

#### 7.1 Update ARCHITECTURE.md

Add section on Field Type Standards:
- Link to this plan document
- Explain semantic types concept
- Explain SSOT flow

#### 7.2 Update API.md

Document any API changes from flattening:
- Preference endpoints now return flat fields
- Customer endpoints return flat address fields
- Work order endpoints include location fields

#### 7.3 Archive Old Patterns

Document deprecated patterns for historical reference:
- JSONB preferences pattern
- JSONB address pattern
- `type: 'string', format: 'email'` pattern

#### 7.4 Run Full Cleanup Migrations

After 1-2 weeks in production with dual columns:
```sql
-- preferences-cleanup.sql
ALTER TABLE user_preferences DROP COLUMN preferences;

-- customer-cleanup.sql  
ALTER TABLE customers DROP COLUMN billing_address, DROP COLUMN service_address;
```

#### 7.5 Final Verification
```bash
npm run test:all
flutter test
npm run lint
# E2E tests
```

---

## Appendix

### A. Complete Type Reference

| Type | Backend Joi | Frontend Dart | DB Column | maxLength |
|------|-------------|---------------|-----------|-----------|
| `string` | `Joi.string()` | `String` | `VARCHAR(n)` | varies |
| `text` | `Joi.string()` | `String` | `TEXT` | 2K-50K |
| `email` | `Joi.string().email()` | `String` | `VARCHAR(255)` | 255 |
| `phone` | `Joi.string().pattern(/^\+?[1-9]\d{1,14}$/)` | `String` | `VARCHAR(20)` | 20 |
| `url` | `Joi.string().uri()` | `String` | `VARCHAR(2048)` | 2048 |
| `integer` | `Joi.number().integer()` | `int` | `INTEGER` | - |
| `decimal` | `Joi.number()` | `double` | `DECIMAL(n,m)` | - |
| `boolean` | `Joi.boolean()` | `bool` | `BOOLEAN` | - |
| `date` | `Joi.date()` | `DateTime` | `DATE` | - |
| `time` | `Joi.string().pattern(/.../)` | `TimeOfDay` | `TIME` | - |
| `timestamp` | `Joi.date().iso()` | `DateTime` | `TIMESTAMPTZ` | - |
| `enum` | `Joi.string().valid(...values)` | `String` | `VARCHAR(50)` | - |
| `foreignKey` | `Joi.number().integer()` | `int` | `INTEGER` FK | - |
| `object` | (only saved_views) | `Map` | `JSONB` | - |

### B. FIELD Constants Reference

| Constant | Type | maxLength | Notes |
|----------|------|-----------|-------|
| `FIELD.EMAIL` | email | 255 | Standard email |
| `FIELD.PHONE` | phone | 20 | E.164 format |
| `FIELD.FIRST_NAME` | string | 50 | Person name |
| `FIELD.LAST_NAME` | string | 50 | Person name |
| `FIELD.NAME` | string | 100 | Business/entity name |
| `FIELD.TITLE` | string | 150 | Document/item title |
| `FIELD.SUMMARY` | string | 255 | Short summary |
| `FIELD.DESCRIPTION` | text | 5000 | Long description |
| `FIELD.NOTES` | text | 10000 | Internal notes |
| `FIELD.TERMS` | text | 50000 | Legal terms |
| `FIELD.SKU` | string | 50 | Product SKU |
| `FIELD.IDENTIFIER` | string | 100 | General identifier |
| `FIELD.URL` | url | 2048 | Web URL |
| `FIELD.CURRENCY` | decimal | - | min: 0, precision: 2 |
| `FIELD.ADDRESS_LINE1` | string | 255 | Street address |
| `FIELD.ADDRESS_LINE2` | string | 255 | Apt/Suite/Unit |
| `FIELD.ADDRESS_CITY` | string | 100 | City name |
| `FIELD.ADDRESS_STATE` | enum | - | US_STATES + CA_PROVINCES |
| `FIELD.ADDRESS_POSTAL_CODE` | string | 20 | ZIP/Postal code |
| `FIELD.ADDRESS_COUNTRY` | enum | - | SUPPORTED_COUNTRIES |

### C. Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Geographic SSOT | `backend/config/geo-standards.js` |
| Field Type SSOT | `backend/config/field-type-standards.js` |
| Validation Loader | `backend/utils/validation-loader.js` |
| Validation Deriver | `backend/config/validation-deriver.js` |
| Geo Standards Tests | `backend/__tests__/unit/config/geo-standards.test.js` |
| Field Standards Tests | `backend/__tests__/unit/config/field-type-standards.test.js` |
| Entity Metadata | `backend/config/models/*-metadata.js` |
| Frontend Sync Script | `scripts/sync-entity-metadata.js` |
| This Plan | `docs/architecture/FIELD_TYPE_STANDARDS_PLAN.md` |

### D. Rollback Strategy

Each phase has its own rollback path:

| Phase | Rollback Strategy |
|-------|-------------------|
| Phase 0-1 | Revert code changes; no DB impact |
| Phase 2 | Re-enable JSONB reads; preferences column still exists |
| Phase 3 | Re-enable JSONB reads; address columns still exist |
| Phase 4 | Drop location columns (no prior data) |
| Phase 5 | Revert metadata files to prior versions |
| Phase 6 | Revert widget changes; forms still work with individual fields |
| Phase 7 | N/A (documentation only) |

---

## Change Log

| Date | Phase | Changes |
|------|-------|---------|  
| 2026-01-23 | 0 | Created geo-standards.js, field-type-standards.js, tests |
| 2026-01-23 | 1 | Added validation layer support for all semantic types (116 tests) |
| 2026-01-23 | 2 | Flattened preferences JSONB to 6 individual columns, uses generic router |
| 2026-01-23 | 3 | Flattened customer addresses to 12 flat columns (billing_*, service_*) |
| 2026-01-23 | 4 | Added work_order location with 6 flat columns (location_*) |
| 2026-01-23 | 5 | Refactored all 13 entities to use FIELD.* constants, foreignKey types |
| 2026-01-23 | - | Backend complete! 2019 unit tests passing |
| 2026-01-27 | 6 | Frontend address UI: row layouts via fieldGroups.rows, GenericForm/DetailPanel row rendering |

---

*Last Updated: January 27, 2026*  
*Author: Development Team + AI Assistant*
