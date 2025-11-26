# Validation Architecture

## Overview

TrossApp implements **centralized, multi-layer validation** with a single source of truth. This ensures frontend and backend validate data identically, catching errors early while maintaining independent security layers.

## Architecture Principles

### 1. **Single Source of Truth**
All validation rules are defined in `config/validation-rules.json` - a shared schema consumed by both frontend (Dart) and backend (Node.js).

### 2. **Permissive Policy**
We use **permissive validation** - accepting any TLD format in emails, allowing hyphens and apostrophes in names, etc. No fascist restrictions! 🚀

Policy quote from config:
```json
"policy": {
  "email": {
    "tldValidation": "permissive",
    "description": "Accept any TLD format - no fascist restrictions! 🚀"
  }
}
```

### 3. **Multi-Layer Validation**
Data is validated at **four independent layers** (defense in depth):

```
┌─────────────────────────────────────────────┐
│ LAYER 1: Frontend Form Validation          │
│ Purpose: Catch errors EARLY, provide UX    │
│ When: Before form submission                │
│ Uses: CentralizedValidators (Dart)          │
└─────────────────────────────────────────────┘
                    ↓
          [Submit Form]
                    ↓
┌─────────────────────────────────────────────┐
│ LAYER 2: Backend Joi Validation            │
│ Purpose: Never trust client, enforce rules │
│ When: Before database operations            │
│ Uses: Joi schemas (Node.js)                 │
│ Features: Enum validation, date validation  │
└─────────────────────────────────────────────┘
                    ↓
         [Joi Validates]
                    ↓
┌─────────────────────────────────────────────┐
│ LAYER 3: Model Validation                  │
│ Purpose: Business logic validation          │
│ When: Before INSERT/UPDATE                  │
│ Uses: Model.create(), Model.update()        │
└─────────────────────────────────────────────┘
                    ↓
       [Model Validates]
                    ↓
┌─────────────────────────────────────────────┐
│ LAYER 4: Database Constraints               │
│ Purpose: Final data integrity guarantees    │
│ When: INSERT/UPDATE operations              │
│ Uses: PostgreSQL CHECK, UNIQUE, NOT NULL    │
│ Features: Status enums, date types          │
└─────────────────────────────────────────────┘
```

**Why Four Layers?**
- **Layer 1 (Frontend)**: Best UX - instant feedback, no network round-trip
- **Layer 2 (Joi)**: Security boundary - semantic validation (e.g., Feb 30 is invalid)
- **Layer 3 (Model)**: Business rules - complex domain logic
- **Layer 4 (Database)**: Last resort - enforces constraints even if app layers fail

## Files & Responsibilities

### Shared Configuration

**`config/validation-rules.json`** - SINGLE SOURCE OF TRUTH
- Field definitions (email, firstName, lastName, etc.)
- Constraints (minLength, maxLength, pattern, required)
- Error messages (consistent across layers)
- Composite operations (createUser, updateRole, etc.)
- Policy settings (TLD validation, character restrictions)

### Backend

**`backend/utils/validation-loader.js`**
- Reads `validation-rules.json` on server startup
- Builds Joi schemas dynamically from rules
- Exports `buildCompositeSchema()` for operations
- **Enum Support**: Validates status fields against defined enums (e.g., `['draft', 'active', 'expired', 'cancelled']`)
- **Date Support**: Uses `Joi.date().iso()` for semantic date validation (rejects invalid dates like Feb 30)
- **Context-Aware Mapping**: Maps generic `status` field to entity-specific enums (userStatus, contractStatus, etc.)

**`backend/utils/validation-sync-checker.js`**
- Validates enum synchronization between Joi and PostgreSQL CHECK constraints
- Runs on server startup to detect configuration drift
- Queries database for CHECK constraint definitions
- Compares with validation-rules.json enums
- **Fails fast** if mismatches detected (prevents silent data corruption)

**`backend/validators/body-validators.js`**
- Creates validation middleware for routes
- Uses centralized schemas instead of hardcoded Joi
- Returns structured error responses

Example:
```javascript
const { buildCompositeSchema } = require('../utils/validation-loader');

const validateUserCreate = createValidator(
  buildCompositeSchema('createUser')
);
```

### Frontend

**`frontend/assets/config/validation-rules.json`** (copy of shared config)
- Bundled as Flutter asset
- Loaded at app startup
- Available to all validators

**`frontend/lib/config/validation_rules.dart`**
- Loads `validation-rules.json` from assets
- Exports `ValidationRules` singleton
- Exports `CentralizedValidators` with rule-based validation

**`frontend/lib/widgets/organisms/forms/generic_form.dart`**
- Uses `CentralizedValidators.email()`, etc.
- Validates before form submission
- Shows field-specific errors

Example:
```dart
await ValidationRules.load(); // In main()

// In form validators:
FormValidators.email = (dynamic value) {
  return CentralizedValidators.email(value);
};
```

## Adding New Validation Rules

### Step 1: Update `config/validation-rules.json`

Add field definition:
```json
"fields": {
  "newField": {
    "type": "string",
    "required": true,
    "minLength": 3,
    "maxLength": 50,
    "pattern": "^[a-zA-Z0-9_]+$",
    "errorMessages": {
      "required": "Field is required",
      "pattern": "Field can only contain letters, numbers, and underscores"
    }
  }
}
```

Add to composite operation:
```json
"compositeValidations": {
  "createThing": {
    "requiredFields": ["newField"],
    "optionalFields": [],
    "description": "Validation rules for creating a thing"
  }
}
```

### Step 2: Backend Automatically Uses It

```javascript
// backend/validators/body-validators.js
const validateThingCreate = createValidator(
  buildCompositeSchema('createThing')
);
```

That's it! No manual Joi schema writing needed.

### Step 3: Frontend Uses Centralized Validator

```dart
// frontend/lib/config/validation_rules.dart
// Add to CentralizedValidators if custom logic needed

// OR use generic string field validation:
FormValidators.newField = (dynamic value) {
  return CentralizedValidators._validateStringField(
    value,
    'newField',
    ValidationRules.instance,
  );
};
```

### Step 4: Copy Config to Frontend Assets

```bash
cp config/validation-rules.json frontend/assets/config/
```

Restart both backend and frontend to load new rules.

## Enum and Date Validation (Enhanced)

### Enum Validation

**Purpose**: Validate status fields against PostgreSQL CHECK constraints at the application layer.

**Why**: Defense in depth - catch invalid enum values before they reach the database, providing better error messages and preventing database errors.

**Implementation**:

1. **Define enums in validation-rules.json**:
```json
"contractStatus": {
  "type": "string",
  "required": false,
  "enum": ["draft", "active", "expired", "cancelled"],
  "errorMessages": {
    "enum": "Contract status must be one of: draft, active, expired, cancelled"
  }
}
```

2. **Backend automatically validates**:
```javascript
// validation-loader.js builds Joi schema:
if (fieldDef.enum && Array.isArray(fieldDef.enum)) {
  schema = schema.valid(...fieldDef.enum);
}
```

3. **Context-aware field mapping**:
```javascript
// Maps generic "status" to entity-specific enum based on operation name
const isContractOperation = operationName.toLowerCase().includes('contract');
const statusField = isContractOperation ? 'contractStatus' : 'status';
```

**Supported Status Enums**:
- `userStatus`: `['pending_activation', 'active', 'suspended']`
- `customerStatus`: `['pending', 'active', 'suspended']`
- `technicianStatus`: `['available', 'on_job', 'off_duty', 'suspended']`
- `workOrderStatus`: `['pending', 'assigned', 'in_progress', 'completed', 'cancelled']`
- `invoiceStatus`: `['draft', 'sent', 'paid', 'overdue', 'cancelled']`
- `contractStatus`: `['draft', 'active', 'expired', 'cancelled']`
- `inventoryStatus`: `['in_stock', 'low_stock', 'out_of_stock', 'discontinued']`
- `priority`: `['low', 'normal', 'high', 'urgent']` (work orders only)

### Date Validation

**Purpose**: Semantic date validation beyond basic format checking.

**Why**: PostgreSQL DATE type accepts strings like "2024-02-30" during parsing but stores NULL. Joi catches these at the application boundary.

**Implementation**:

1. **Define date fields in validation-rules.json**:
```json
"startDate": {
  "type": "date",
  "format": "date",
  "required": false,
  "errorMessages": {
    "required": "Start date is required",
    "format": "Start date must be a valid date in ISO format (YYYY-MM-DD)"
  }
}
```

2. **Backend uses semantic validation**:
```javascript
// validation-loader.js:
if (fieldDef.type === 'date' || fieldDef.format === 'date') {
  schema = Joi.date().iso(); // Rejects invalid dates like Feb 30
}
```

3. **Both snake_case and camelCase supported**:
```json
"start_date": { "type": "date", ... },
"startDate": { "type": "date", ... }
```

**Common Date Fields**:
- `start_date` / `startDate`: Contract/subscription start
- `end_date` / `endDate`: Contract/subscription end
- `due_date` / `dueDate`: Invoice/work order due date

### Validation Sync Checker

**Purpose**: Ensure Joi enum definitions stay synchronized with PostgreSQL CHECK constraints.

**Why**: Prevent configuration drift - if someone updates the database schema but forgets to update validation-rules.json (or vice versa), the app fails fast on startup rather than silently accepting invalid data.

**How it works**:

1. **On server startup** (`backend/server.js`):
```javascript
const { validateEnumSync } = require('./utils/validation-sync-checker');
await validateEnumSync(db); // Runs after db.testConnection()
```

2. **Queries PostgreSQL CHECK constraints**:
```sql
SELECT constraint_definition 
FROM pg_constraint 
WHERE contype = 'c' -- CHECK constraints
  AND constraint_definition LIKE '%IN (%'
```

3. **Compares with validation-rules.json**:
```javascript
const joiEnum = ['draft', 'active', 'expired', 'cancelled'].sort();
const dbEnum = ['active', 'cancelled', 'draft', 'expired'].sort();
// Arrays must match exactly
```

4. **Fails fast if mismatch**:
```
[ValidationSync] ❌ Enum mismatches detected:
  contractStatus (contracts.status):
    Joi:      [cancelled, draft, expired, active]
    Database: [draft, active, expired, cancelled, terminated]
    Missing in Joi: [terminated]

Error: Validation enum definitions do not match database CHECK constraints.
Update validation-rules.json or database schema to sync.
```

**Benefits**:
- Catches configuration drift immediately
- Prevents silent data corruption
- Self-documenting - clearly shows which enums are validated
- Safe deployments - server won't start with mismatched config

**Mapped Fields**:
```javascript
const FIELD_TO_DB_MAPPING = {
  userStatus: 'users.status',
  customerStatus: 'customers.status',
  technicianStatus: 'technicians.status',
  workOrderStatus: 'work_orders.status',
  invoiceStatus: 'invoices.status',
  contractStatus: 'contracts.status',
  inventoryStatus: 'inventory.status',
  priority: 'work_orders.priority',
};
```

## Error Handling

### Frontend Validation Errors
Caught **before submission**, displayed inline on form fields:
```dart
[VALIDATION] Field 0: Email = "invalid-email"
[VALIDATION] Error: "Email must be a valid email address"
[VALIDATION] All valid: false
// Form submit button remains disabled
```

### Backend Validation Errors
Returned as **structured 400 responses**:
```json
{
  "error": "Validation Error",
  "message": "Email must be a valid email address",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ],
  "timestamp": "2025-11-10T17:12:45.123Z"
}
```

Frontend should parse `details` array and map to form fields:
```dart
catch (e) {
  if (e is ValidationException) {
    setState(() {
      _fieldErrors[0] = e.errors['email']; // Map to field index
    });
  }
}
```

## Testing Strategy

### 1. **Unit Tests** - Validate Individual Rules
```javascript
// backend/__tests__/unit/validation-loader.test.js
test('email validator accepts permissive TLDs', () => {
  const schema = buildFieldSchema(emailRules, 'email');
  expect(schema.validate('user@example.grace')).toHaveNoError();
});
```

```dart
// frontend/test/config/validation_rules_test.dart
test('email validator accepts permissive TLDs', () {
  final error = CentralizedValidators.email('user@example.grace');
  expect(error, isNull);
});
```

### 2. **Integration Tests** - Validate End-to-End
```javascript
// backend/__tests__/integration/users.test.js
test('POST /api/users rejects invalid email', async () => {
  const response = await request(app)
    .post('/api/users')
    .send({ email: 'not-an-email', ... });
  
  expect(response.status).toBe(400);
  expect(response.body.details[0].field).toBe('email');
});
```

### 3. **Consistency Tests** - Verify Frontend/Backend Match
```javascript
// tests/validation-consistency.test.js
const frontendValidators = require('../frontend/test/validation_mocks');
const backendSchema = buildCompositeSchema('createUser');

testCases.forEach(({ input, shouldPass }) => {
  test(`"${input.email}" ${shouldPass ? 'passes' : 'fails'} consistently`, () => {
    const frontendResult = frontendValidators.email(input.email);
    const backendResult = backendSchema.validate(input);
    
    if (shouldPass) {
      expect(frontendResult).toBeNull();
      expect(backendResult.error).toBeUndefined();
    } else {
      expect(frontendResult).not.toBeNull();
      expect(backendResult.error).toBeDefined();
    }
  });
});
```

## Validation Rules Versioning

The schema includes versioning for safe evolution:
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-11-10",
  "metadata": {
    "changelog": [
      {
        "version": "1.0.0",
        "date": "2025-11-10",
        "changes": [
          "Initial centralized validation schema",
          "Permissive email TLD validation policy"
        ]
      }
    ]
  }
}
```

### Breaking Changes
When making breaking changes (stricter validation, new required fields):
1. Increment version: `1.0.0` → `2.0.0`
2. Update `lastUpdated` date
3. Add changelog entry
4. Test both frontend and backend
5. Deploy backend first (more permissive during transition)
6. Deploy frontend (stricter validation active)

### Non-Breaking Changes
Minor fixes, error message updates:
1. Increment patch: `1.0.0` → `1.0.1`
2. Update `lastUpdated` date
3. Add changelog entry
4. Deploy both at same time

## Current Validation Fields

### Common Fields (All Entities)
- **email**: String, required, max 255 chars, permissive TLD validation
- **firstName** / **first_name**: String, required, 1-100 chars, letters/spaces/hyphens/apostrophes
- **lastName** / **last_name**: String, required, 1-100 chars, letters/spaces/hyphens/apostrophes
- **phone**: String, optional, international format
- **description**: String, optional, max 500-2000 chars depending on entity

### Date Fields (ISO 8601 Format)
- **startDate** / **start_date**: Date, optional, semantic validation (rejects invalid dates)
- **endDate** / **end_date**: Date, optional, semantic validation
- **dueDate** / **due_date**: Date, optional, semantic validation

### Status Enum Fields (Context-Aware)
- **userStatus**: Enum `['pending_activation', 'active', 'suspended']`
- **customerStatus**: Enum `['pending', 'active', 'suspended']`
- **technicianStatus**: Enum `['available', 'on_job', 'off_duty', 'suspended']`
- **workOrderStatus**: Enum `['pending', 'assigned', 'in_progress', 'completed', 'cancelled']`
- **invoiceStatus**: Enum `['draft', 'sent', 'paid', 'overdue', 'cancelled']`
- **contractStatus**: Enum `['draft', 'active', 'expired', 'cancelled']`
- **inventoryStatus**: Enum `['in_stock', 'low_stock', 'out_of_stock', 'discontinued']`
- **priority**: Enum `['low', 'normal', 'high', 'urgent']` (work orders only)

### User Fields
- **roleId** / **role_id**: Integer, optional, min 1, max 2147483647

### Role Fields
- **roleName**: String, required, 2-100 chars, alphanumeric/spaces/underscores/hyphens
- **rolePriority**: Integer, optional, 1-100, default 50
- **roleDescription**: String, optional, max 500 chars

### Entity-Specific Fields
- **contract_number** / **contractNumber**: String, required for contracts, unique
- **invoice_number** / **invoiceNumber**: String, required for invoices, unique
- **customer_id** / **customerId**: Integer, foreign key reference
- **technician_id** / **technicianId**: Integer, foreign key reference
- **work_order_id** / **workOrderId**: Integer, foreign key reference
- **sku**: String, required for inventory, unique identifier
- **quantity**: Integer, non-negative, for inventory items
- **amount**, **total**, **tax**: Decimal/Numeric, for financial entities
- **hourly_rate** / **hourlyRate**: Decimal, for technicians
- **value**: Decimal, for contracts

## Debugging Validation Issues

### Enable Debug Logs

**Backend:**
```javascript
// backend/validators/body-validators.js (already has debug logs)
console.log('[VALIDATOR] Incoming request body:', req.body);
console.log('[VALIDATOR] Validation failed:', error.details);
```

**Frontend:**
```dart
// frontend/lib/config/validation_rules.dart
print('[ValidationRules] ✅ Loaded validation rules v$version');

// frontend/lib/widgets/organisms/forms/generic_form.dart
print('[VALIDATION] Field $index: $label = "$value"');
print('[VALIDATION] Error: $error');
```

### Common Issues

**Issue:** Frontend accepts, backend rejects
- **Cause:** Validation rules out of sync
- **Fix:** Copy `validation-rules.json` to frontend assets, restart both

**Issue:** Backend accepts, frontend rejects
- **Cause:** Frontend using old hardcoded validator
- **Fix:** Update FormValidators to use `CentralizedValidators`

**Issue:** Email with dots rejected
- **Cause:** TLD validation too strict
- **Fix:** Set `"tldRestriction": false` in email field definition

**Issue:** Rules not loading
- **Cause:** Asset not bundled or path incorrect
- **Fix:** Check `pubspec.yaml` includes `assets/config/validation-rules.json`

**Issue:** Invalid status value returns 400 instead of expected error
- **Cause:** Using wrong status value for entity (e.g., `'completed'` for contracts instead of `'active'`)
- **Fix:** Check entity-specific status enum values - contracts use `['draft', 'active', 'expired', 'cancelled']`, not work order statuses

**Issue:** Date validation accepts Feb 30
- **Cause:** Using string type instead of date type
- **Fix:** Set `"type": "date", "format": "date"` in field definition to enable `Joi.date().iso()` semantic validation

**Issue:** Server fails to start with "Validation enum definitions do not match"
- **Cause:** Joi enums in validation-rules.json don't match PostgreSQL CHECK constraints
- **Fix:** Update validation-rules.json enums to match database schema, or vice versa. Check error message for specific mismatches.
- **Example**: If DB added `'terminated'` status but validation-rules.json still has old enum

**Issue:** Context-aware status field not working
- **Cause:** Operation name doesn't match expected pattern
- **Fix:** Ensure operation name includes entity keyword (e.g., `createContract`, `updateInvoice`). Mapping uses `operationName.toLowerCase().includes('contract')` pattern matching.

## Benefits of This Architecture

1. **Consistency**: Frontend and backend use identical rules - no surprises
2. **Maintainability**: Update rules in ONE place, both layers adapt
3. **Early Error Detection**: Frontend catches most errors before submission
4. **Security**: Backend validates independently - never trusts client
5. **Clear Error Messages**: Centralized messages ensure consistent UX
6. **Testability**: Can verify frontend/backend produce same results
7. **Versioning**: Safe evolution of validation rules over time
8. **Documentation**: Self-documenting with examples in JSON schema
9. **Defense in Depth**: Four independent validation layers prevent data corruption
10. **Semantic Validation**: Catches logic errors (invalid dates) not just format errors
11. **Fail Fast**: Validation sync checker prevents server startup with mismatched config
12. **Context-Aware**: Same field name (`status`) validates differently per entity

## Future Enhancements

- **API Endpoint**: `GET /api/validation-rules` for dynamic rule fetching
- **Admin UI**: Edit validation rules without code changes
- **Custom Validators**: Plugin system for complex domain logic
- **Localization**: Multi-language error messages
- **Performance**: Cache compiled Joi schemas
- **Analytics**: Track which validation rules fail most often
- **Cross-Field Validation**: Ensure `end_date > start_date`, etc.
- **Conditional Validation**: Required fields based on other field values

---

**TrossApp Validation Architecture** - Defense-in-depth validation framework
