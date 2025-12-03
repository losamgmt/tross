# Data Validation Framework

---

## Philosophy

**Validate EVERY data boundary. Never trust ANY source.**

Defense-in-depth across 5 boundaries:

1. **HTTP** - Route params, query strings, bodies
2. **External APIs** - Auth0, third-party services
3. **JSON** - API responses, storage, external data
4. **Functions** - Internal service/model calls
5. **Database** - Final safety net

---

## Architecture

### Backend: `backend/validators/`

**Core Validators** (`type-coercion.js`):

- `toSafeInteger()` - General numeric IDs
- `toSafeUserId()` - User IDs (handles dev tokens)
- `toSafeString()` - Text coercion
- `toSafeEmail()` - Email format validation
- `toSafeBoolean()` - Boolean coercion
- `toSafeUuid()` - UUID v4 validation
- `toSafePagination()` - Page/limit defaults

**Middleware** (`param-validators.js`):

- `validateIdParam()` - Single route param
- `validateIdParams()` - Multiple route params
- `validatePagination()` - Query string pagination

**Logging** (`validation-logger.js`):

- WARNING-level logs for production observability
- Tracks coercions, failures, dev tokens

### Frontend: `frontend/lib/utils/validators.dart`

**Data Validators**:

- `toSafeInt()`, `toSafeString()`, `toSafeBool()`, `toSafeDateTime()`, `toSafeEmail()`
- Mirror backend behavior for consistency

**Form Validators**:

- `required()`, `email()`, `minLength()`, `maxLength()`, `integer()`, `positive()`
- Return `String?` for error messages

---

## Validation Layers

```
HTTP Request → Route Middleware (400 on fail, blocks)
            → Model Methods (null on fail, prevents NaN)
            → Service Layer (validates internal calls)
            → Database (receives clean data)

External API → Backend Validation (toSafe*() all fields)
             → Never trust Auth0/third-party responses

API Response → Frontend JSON Validation (fromJson)
             → Throws on critical fields, null on optional
```

---

## Design Decisions

### Why Three Layers?

**Defense-in-depth.** Route validation blocks bad requests early (400), model validation prevents NaN in SQL, service validation catches bugs in internal calls.

### Why Dev Token Handling?

Auth0 dev tokens (`dev|tech001`) follow string format but aren't database IDs. `toSafeUserId()` returns `null` to prevent PostgreSQL `invalid input syntax` crashes.

### Why WARNING Logs?

Production observability without noise. INFO floods logs, WARNING surfaces validation events for security/debugging without alert fatigue.

### Why Symmetric Backend/Frontend?

Consistent behavior across stack. Developers switch contexts easily, onboarding simplified, fewer surprises.

### Why Throw vs Null (Frontend)?

Critical fields (email, id) throw `ArgumentError` - app can't function without them. Optional fields return `null` for graceful degradation.

---

## Special Cases

**Dev Tokens:** `toSafeUserId('dev|tech001')` → `null` (logs warning)

**Auth0 Name Splitting:** Full name in `name` field split to first/last with fallbacks

**Email Validation:** Backend returns `null`, frontend throws - different error handling contexts

---

## Implementation Checklist

New endpoints/models must validate:

- [ ] Route params with `validateIdParam()`
- [ ] Query strings with `validatePagination()` or custom validators
- [ ] Model method IDs with `toSafeInteger()`
- [ ] Service layer calls with `toSafeUserId()`
- [ ] External API responses with `toSafe*()` functions
- [ ] Frontend JSON with `fromJson()` validators
- [ ] Add unit tests for null/invalid/edge cases

---

## Code References

**Backend Implementation:**

- `backend/validators/` - All validators
- `backend/routes/users.js`, `backend/routes/roles.js` - Route middleware usage
- `backend/db/models/User.js`, `backend/db/models/Role.js` - Model layer validation
- `backend/services/audit-service.js` - Service layer examples
- `backend/middleware/auth/auth0-auth.js` - External API validation

**Frontend Implementation:**

- `frontend/lib/utils/validators.dart` - All validators
- `frontend/lib/models/user.dart`, `frontend/lib/models/role.dart` - JSON validation
- `frontend/lib/services/auth_profile_service.dart` - Profile data validation

**Tests:**

- `backend/__tests__/unit/validators/type-coercion.test.js` - 87 validator tests
- `backend/__tests__/unit/validators/middleware.test.js` - Middleware integration tests

---

## Related Docs

- **Testing:** `docs/testing/TESTING_GUIDE.md`
- **Auth:** `docs/auth/AUTH_GUIDE.md`
- **Database:** `docs/DATABASE_ARCHITECTURE.md`
- **API:** `docs/api/`
