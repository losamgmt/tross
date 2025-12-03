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
Data is validated at **three independent layers**:

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
│ LAYER 2: Backend Middleware Validation     │
│ Purpose: Never trust client, enforce rules │
│ When: Before database operations            │
│ Uses: Joi schemas (Node.js)                 │
└─────────────────────────────────────────────┘
                    ↓
         [Joi Validates]
                    ↓
┌─────────────────────────────────────────────┐
│ LAYER 3: Database Constraints               │
│ Purpose: Final data integrity guarantees    │
│ When: INSERT/UPDATE operations              │
│ Uses: PostgreSQL CHECK, UNIQUE, NOT NULL    │
└─────────────────────────────────────────────┘
```

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

### User Fields
- **email**: String, required, max 255 chars, permissive TLD validation
- **firstName**: String, required, 1-100 chars, letters/spaces/hyphens/apostrophes only
- **lastName**: String, required, 1-100 chars, letters/spaces/hyphens/apostrophes only
- **roleId**: Integer, optional, min 1, max 2147483647

### Role Fields
- **name**: String, required, 2-100 chars, alphanumeric/spaces/underscores/hyphens
- **priority**: Integer, optional, 1-100, default 50
- **description**: String, optional, max 500 chars, nullable

### Future Fields
- **password**: String, 8-128 chars, complexity requirements
- **phone**: String, international E.164 format
- **url**: String, max 2048 chars, http/https only

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

## Benefits of This Architecture

1. **Consistency**: Frontend and backend use identical rules - no surprises
2. **Maintainability**: Update rules in ONE place, both layers adapt
3. **Early Error Detection**: Frontend catches most errors before submission
4. **Security**: Backend validates independently - never trusts client
5. **Clear Error Messages**: Centralized messages ensure consistent UX
6. **Testability**: Can verify frontend/backend produce same results
7. **Versioning**: Safe evolution of validation rules over time
8. **Documentation**: Self-documenting with examples in JSON schema

## Future Enhancements

- **API Endpoint**: `GET /api/validation-rules` for dynamic rule fetching
- **Admin UI**: Edit validation rules without code changes
- **Custom Validators**: Plugin system for complex domain logic
- **Localization**: Multi-language error messages
- **Performance**: Cache compiled Joi schemas
- **Analytics**: Track which validation rules fail most often

---

**TrossApp Validation Architecture** - Defense-in-depth validation framework
