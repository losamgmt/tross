# Testing Guide

Philosophy, patterns, and best practices for testing TrossApp.

---

## Current Coverage

All coverage metrics and test counts are dynamically reported by the test runners. Run the following commands to see current status:

```bash
# Backend coverage
cd backend && npm run test:all -- --coverage

# Frontend coverage  
cd frontend && flutter test --coverage
```

**Coverage Thresholds (enforced in CI):**
- Backend: 80% minimum for statements, branches, functions, and lines
- Frontend: Target 80% line coverage

---

## Testing Philosophy

**Why We Test:**
- **Confidence** to refactor without breaking things
- **Documentation** that never goes stale (tests are executable specs)
- **Regression prevention** - catch bugs before production
- **Design feedback** - hard-to-test code is poorly designed code

**Our Commitment:** Every feature has comprehensive test coverage.

---

## Test Pyramid Distribution

**Target Ratios:**
- Unit tests: ~80% (fast, isolated, comprehensive)
- Integration tests: ~20% (API + DB, contract validation)
- E2E tests: minimal (smoke tests only, stack connectivity)

**Run `npm test` to see current counts.**

---

## Testing Pyramid

```
       /\      E2E (Playwright)
      /  \     - Critical user journeys
     /____\    - Slow, expensive
    /      \   
   / Integration \   (Jest + Supertest)
  /   (API + DB)  \  - Endpoint testing
 /________________\ - Real database
/                  \
/    Unit Tests     \ (Jest)
/  (Models, Services)\ - Fast, isolated
/____________________\ - Mocked dependencies
```

**Rule:** Write more tests lower in the pyramid (faster feedback).

---

## Backend Testing

### Unit Tests (`__tests__/unit/`)

**What to test:**
- Model methods (CRUD operations)
- Service logic (business rules)
- Validators (input validation)
- Utilities (helpers, formatters)

**Example:** Model validation
```javascript
// __tests__/unit/models/Customer.validation.test.js
describe('Customer Model - Validation', () => {
  it('should require email', async () => {
    await expect(Customer.create({ name: 'Test' }))
      .rejects.toThrow('email is required');
  });

  it('should validate email format', async () => {
    await expect(Customer.create({ email: 'invalid' }))
      .rejects.toThrow('Invalid email format');
  });
});
```

**Best Practices:**
- Mock external dependencies (DB, APIs)
- Test one thing per test
- Use descriptive test names
- Fast (<5s timeout)

---

### Integration Tests (`__tests__/integration/`)

**What to test:**
- API endpoints (full request → response)
- Database interactions (real queries)
- Authentication flow
- Error handling

**Architecture:** Pattern-based testing with metadata-driven scenarios.

### Factory Pattern Architecture

The test factory system uses **registries** and **scenarios** to generate comprehensive tests from metadata:

```
__tests__/factory/
├── entity-registry.js    # Entity metadata (fields, validation, relationships)
├── route-registry.js     # Route metadata (endpoints, auth, params)
├── service-registry.js   # Service metadata (methods, dependencies)
├── runner.js             # Entity test runner
├── route-runner.js       # Route test runner
├── service-runner.js     # Service test runner
└── scenarios/            # Reusable test scenario modules
    ├── crud.scenarios.js       # Create, Read, Update, Delete
    ├── validation.scenarios.js # Field validation rules
    ├── rls.scenarios.js        # Row-level security
    ├── error.scenarios.js      # Error handling (unhappy paths)
    ├── search.scenarios.js     # Search and filtering
    ├── relationship.scenarios.js # Entity relationships
    ├── audit.scenarios.js      # Audit logging
    ├── lifecycle.scenarios.js  # Entity lifecycle events
    ├── computed.scenarios.js   # Computed/derived fields
    ├── field-access.scenarios.js # Field-level permissions
    ├── response.scenarios.js   # Response format validation
    ├── rls-filter.scenarios.js # RLS filter behavior
    ├── route.scenarios.js      # Route-specific scenarios
    └── service.scenarios.js    # Service layer scenarios
```

**Example:** Entity factory test
```javascript
// __tests__/integration/customers-factory.test.js
const { runEntityTests } = require('../factory/runner');

// Automatically generates tests for CRUD, validation, RLS, search, 
// relationships, error handling, and more based on entity metadata
runEntityTests('customers');
```

**Example:** Route factory test
```javascript
// __tests__/integration/customers-routes.test.js
const { runRouteTests } = require('../factory/route-runner');
const app = require('../../server');
const db = require('../../db/connection');

// Generates auth, validation, and error tests from route metadata
runRouteTests('customers', { app, db });
```

**Specialized Tests:** Non-standard behavior tested in `specialized/` folder:
- `user-role-assignment.test.js` - Cross-entity workflows
- `entity-guards.test.js` - Protected entity deletion
- `audit-logging.test.js` - Audit trail compliance

**Best Practices:**
- Use test database (not dev/prod!)
- Clean database between tests
- Test auth/permissions
- Moderate speed (<10s timeout)

---

### Test Database Setup

**Configuration:** `jest.config.integration.json`
```javascript
{
  "testEnvironment": "node",
  "globalSetup": "./setup/jest.global.setup.js",
  "setupFilesAfterEnv": ["./setup/jest.integration.setup.js"]
}
```

**Global Setup:** Runs once before all tests
- Creates test database
- Runs migrations
- Seeds test data

**Per-Test Cleanup:**
```javascript
beforeEach(async () => {
  // Truncate tables (preserve schema)
  await truncateTables();
});
```

---

## Frontend Testing

### Running Frontend Tests

```bash
# From project root (recommended)
npm run test:frontend              # Smart test runner with retries
npm run test:frontend:failures     # Show only failures (clean output)
npm run test:frontend:coverage     # Run with coverage percentage

# Or directly with Flutter
flutter test --reporter=compact

# Run specific test suites
flutter test test/widgets/
flutter test test/providers/
flutter test test/services/
```

Run `flutter test` to see current test counts and coverage.

### Widget Tests (`test/widgets/`)

**What to test:**
- Widget rendering
- User interactions (taps, input)
- State changes
- Error states

**Example:** Button widget (using test helpers)
```dart
// test/widgets/atoms/custom_button_test.dart
import 'package:flutter_test/flutter_test.dart';
import '../../helpers/helpers.dart';  // Barrel file

void main() {
  testWidgets('CustomButton renders with text', (tester) async {
    await tester.pumpTestWidget(
      CustomButton(
        text: 'Click Me',
        onPressed: () {},
      ),
    );

    expect(find.text('Click Me'), findsWidgets);
  });

  testWidgets('CustomButton calls onPressed when tapped', (tester) async {
    bool pressed = false;

    await tester.pumpTestWidget(
      CustomButton(
        text: 'Click Me',
        onPressed: () => pressed = true,
      ),
    );

    await tester.tap(find.byType(ElevatedButton));
    expect(pressed, isTrue);
  });
}
```

---

### Provider Testing

**Testing state management:**
```dart
// test/providers/auth_provider_test.dart
void main() {
  test('AuthProvider initializes unauthenticated', () {
    final provider = AuthProvider();
    expect(provider.isAuthenticated, isFalse);
    expect(provider.user, isNull);
  });

  test('AuthProvider sets user on login', () async {
    final provider = AuthProvider();
    final user = User(id: 1, email: 'test@example.com');

    provider.login(user, 'fake-token');

    expect(provider.isAuthenticated, isTrue);
    expect(provider.user, equals(user));
  });
}
```

---

## E2E Testing (Playwright)

**Philosophy:**
- E2E tests prove the **stack connects** - not logic or contracts
- Unit tests verify logic (comprehensive)
- Integration tests verify API contracts (factory-driven)
- E2E smoke tests verify full-stack connectivity (minimal)

**What to test in E2E:**
- Health check and database connectivity
- Authentication flow (tokens work end-to-end)
- Cross-entity business workflows (customer → work order → invoice)
- Role-based permission enforcement
- File storage API (upload, download, permissions)

**Test Files:**
- `e2e/stack-health.spec.ts` - Health checks + CRUD connectivity (19 tests)
- `e2e/file-storage.spec.ts` - File API smoke tests (11 tests)

**Helper Modules:**
- `e2e/helpers/auth.ts` - Token generation (`getDevToken`, `getDevTokenWithRequest`)
- `e2e/helpers/users.ts` - Test user creation/cleanup
- `e2e/helpers/cleanup.ts` - Post-test data cleanup
- `e2e/config/constants.ts` - Centralized URLs and test data

---

### E2E Token Helpers

**Two helpers for different contexts:**

```typescript
// In beforeAll (no request fixture available)
import { getDevToken, DevRole } from './helpers';

let adminToken: string;
test.beforeAll(async () => {
  adminToken = await getDevToken('admin');
});

// In test body (use Playwright's request fixture)
import { getDevTokenWithRequest } from './helpers';

test('manager can list users', async ({ request }) => {
  const token = await getDevTokenWithRequest(request, 'manager');
  const response = await request.get(`${URLS.API}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(response.ok()).toBe(true);
});
```

---

### E2E Constants Pattern

**Centralized configuration** prevents hardcoded values and duplication:

```typescript
// e2e/config/constants.ts
import { BACKEND_PORT, FRONTEND_PORT } from '../../config/ports';

export const URLS = {
  BACKEND: `http://localhost:${BACKEND_PORT}`,
  FRONTEND: `http://localhost:${FRONTEND_PORT}`,
  API: `http://localhost:${BACKEND_PORT}/api`,
  HEALTH: `http://localhost:${BACKEND_PORT}/api/health`
};

export const TEST_DATA = {
  PHONES: {
    CUSTOMER: '+15550100',    // E.164 format required
    TECHNICIAN: '+15550101'
  },
  EMAIL: {
    unique: (prefix) => `${prefix}-${Date.now()}@e2etest.trossapp.dev`
  },
  PREFIXES: {
    CUSTOMER: 'e2e-customer',
    TECHNICIAN: 'e2e-tech'
  }
};
```

**Usage in tests:**
```typescript
import { URLS, TEST_DATA } from './config/constants';

test('Create customer', async ({ request }) => {
  const response = await request.post(`${URLS.API}/customers`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      email: TEST_DATA.EMAIL.unique(TEST_DATA.PREFIXES.CUSTOMER),
      phone: TEST_DATA.PHONES.CUSTOMER  // E.164: +15550100
    }
  });
});
```

**Phone Validation:** All phone numbers must use E.164 international format:
- ✅ Valid: `+15550100`, `+442071838750`
- ❌ Invalid: `555-0100`, `(555) 010-0000`

---

### E2E Scope

**Focus:** Stack connectivity and business workflows  
**Not duplicated in E2E:** Validation, error handling, CRUD edge cases

> **Why?** All validation, permissions, and CRUD behavior is comprehensively tested in the integration test factory (`__tests__/factory/`). E2E smoke tests prove the full stack connects without duplicating that coverage.

---

### Run E2E Tests

```bash
npx playwright test                     # Full smoke suite
npx playwright test --ui                # Interactive mode
npx playwright test smoke.spec.ts       # Core business workflow
npx playwright test roles-permissions   # Permission enforcement
```

---

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)
```javascript
test('should calculate total price', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(30);
});
```

### Mocking External Dependencies
```javascript
// Mock database
jest.mock('../../../db/connection');
const db = require('../../../db/connection');

db.query.mockResolvedValue({ rows: [{ id: 1, name: 'Test' }] });
```

### Testing Async Code
```javascript
test('should fetch user asynchronously', async () => {
  const user = await User.findById(1);
  expect(user).toHaveProperty('email');
});
```

### Testing Error Handling
```javascript
test('should throw error for invalid data', async () => {
  await expect(User.create({ email: 'invalid' }))
    .rejects
    .toThrow('Invalid email format');
});
```

### Error Scenarios (Unhappy Path Testing)

The factory system includes comprehensive error scenario testing via `error.scenarios.js`:

```javascript
// Automatically generated error tests include:
- updateNonExistent()     // 404 for missing entity
- deleteNonExistent()     // 404 for missing entity  
- noAuthReturns401()      // Authentication required
- invalidJsonBody()       // Malformed JSON handling
- emptyBodyOnCreate()     // Empty body rejection
- nullRequiredField()     // Required field validation
- invalidEnumRejected()   // Enum value validation
- invalidEmailRejected()  // Email format validation
- xssHandledSafely()      // XSS input handling
- paginationEdgeCases()   // Boundary conditions
- sortByInvalidField()    // Invalid sort handling
- errorResponseStructure()// Consistent error format
- concurrentOperationsSafe() // Race condition handling
```

**Philosophy:** Every "happy path" has corresponding "unhappy path" tests. Error handling is not optional coverage—it's critical for production reliability.

---

## Test Organization

### Backend Test Structure
```
backend/__tests__/
├── factory/                      # Pattern-based test generation
│   ├── entity-registry.js        # Entity metadata definitions
│   ├── route-registry.js         # Route metadata definitions
│   ├── service-registry.js       # Service metadata definitions
│   ├── runner.js                 # Entity test runner
│   ├── route-runner.js           # Route test runner
│   ├── service-runner.js         # Service test runner
│   ├── data/                     # Test data generators
│   └── scenarios/                # 14 reusable scenario modules
│       ├── crud.scenarios.js
│       ├── validation.scenarios.js
│       ├── rls.scenarios.js
│       ├── error.scenarios.js    # Unhappy path testing
│       ├── search.scenarios.js
│       └── ... (10 more)
├── unit/                         # Isolated unit tests
│   ├── models/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   └── middleware/
├── integration/                  # API + database tests
│   ├── *-factory.test.js         # Factory-generated entity tests
│   ├── *-routes.test.js          # Factory-generated route tests
│   ├── *-api.test.js             # Endpoint-specific tests
│   └── specialized/              # Non-standard workflows
├── fixtures/                     # Test data
├── helpers/                      # Shared test utilities
├── mocks/                        # Mock implementations
└── setup/                        # Jest configuration
```

### Frontend Test Structure
```
frontend/test/
├── widgets/                      # Widget tests (by atomic design)
│   ├── atoms/
│   ├── molecules/
│   └── organisms/
├── providers/                    # State management tests
├── services/                     # API service tests
├── screens/                      # Screen integration tests
└── helpers/                      # Shared test utilities
```

### File Naming Conventions
- `*.test.js` - Test files (Jest auto-discovers)
- `*-factory.test.js` - Factory-generated tests
- `*-routes.test.js` - Route-specific tests
- `*.scenarios.js` - Reusable scenario modules

### Test Structure
```javascript
describe('CustomerModel', () => {
  describe('create()', () => {
    it('should create customer with valid data', async () => { });
    it('should reject duplicate email', async () => { });
    it('should require name field', async () => { });
  });

  describe('update()', () => {
    it('should update existing customer', async () => { });
    it('should reject invalid status', async () => { });
  });
});
```

---

## Running Tests

### Backend
```bash
cd backend

# All tests
npm test

# Specific suite
npm test -- customers

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

### Frontend
```bash
cd frontend

# All tests
flutter test

# Specific file
flutter test test/widgets/atoms/custom_button_test.dart

# Coverage
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

---

## Performance Optimization

### Parallel Execution
Jest runs tests in parallel by default:
```javascript
// jest.config.js
{
  "maxWorkers": "50%",  // Use half of CPU cores
}
```

### Test Timeouts
```javascript
// Per-test timeout
test('slow operation', async () => {
  // ...
}, 15000);  // 15s timeout

// Global timeout (jest.config.js)
{
  "testTimeout": 5000  // 5s for unit tests
}
```

### Database Optimization
- Use transactions for faster cleanup
- Index test queries
- Minimize test data

---

## Debugging Tests

### Backend
```bash
# Verbose output
npm test -- --verbose

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand customers
```

### Frontend
```bash
# Print debugging
debugPrint('Widget tree: ${tester.allWidgets}');

# Run single test
flutter test test/widgets/atoms/custom_button_test.dart
```

---

## CI/CD Integration

**GitHub Actions:** Tests run on every push/PR
```yaml
# .github/workflows/test.yml
- name: Run backend tests
  run: |
    cd backend
    npm test

- name: Run frontend tests
  run: |
    cd frontend
    flutter test
```

**Pre-commit Hook:**
```bash
# .git/hooks/pre-commit
#!/bin/bash
cd backend && npm test
cd ../frontend && flutter test
```

---

## Test Quality Metrics

**Good Test Characteristics:**
- ✅ **Fast** - Unit tests <5s, integration <10s
- ✅ **Isolated** - No shared state between tests
- ✅ **Repeatable** - Same result every time
- ✅ **Self-checking** - Assert expected outcomes
- ✅ **Timely** - Written with/before code (TDD)

**Bad Test Smells:**
- ❌ Flaky tests (pass/fail randomly)
- ❌ Slow tests (>10s for integration)
- ❌ Tests testing implementation details
- ❌ No assertions (just smoke tests)
- ❌ Tests dependent on execution order

---

## Production Smoke Tests

**Purpose:** Verify production deployment is working end-to-end after each release.

### Manual Smoke Test Checklist

Run these tests against the production frontend URL after every deployment:

#### 1. Authentication & Session
- [ ] Visit the production frontend URL
- [ ] Click "Login" button
- [ ] Auth0 login page loads
- [ ] Login with test credentials (or create new user)
- [ ] Redirects back to app successfully
- [ ] Health badge shows "Healthy" (green)
- [ ] User menu shows logged-in state

#### 2. User CRUD Operations
- [ ] Navigate to Users page
- [ ] Create new user (email, first_name, last_name, role)
- [ ] Verify new user appears in list
- [ ] Edit user details
- [ ] Verify changes saved
- [ ] View user details
- [ ] Delete user (if admin)

#### 3. Role Management
- [ ] Navigate to Roles page
- [ ] View role list (core roles present)
- [ ] Create new custom role
- [ ] Verify role appears
- [ ] Try to delete core role (should fail with permission error)
- [ ] Verify error handling works

#### 4. Permissions & Security
- [ ] Try accessing admin-only features as non-admin (should reject)
- [ ] Verify RBAC enforcing correctly
- [ ] Check browser console for errors (should be clean except source maps)
- [ ] Verify no CORS errors

#### 5. Backend Health
- [ ] Visit the production API health endpoint (`/api/health`)
- [ ] Should return JSON: `{"status":"ok",...}`
- [ ] Check database health in response

### Automated E2E Tests (Against Production)

```bash
# Run E2E tests against production backend
# Set BACKEND_URL environment variable to production API URL
BACKEND_URL=<production-api-url> npm run test:e2e

# Note: Uses dev tokens, not Auth0
# Good for API testing, not auth flow testing
```

**Configuration:** See `.env.production.example` for environment setup.

**When to Run:**
- After every production deployment
- Before major feature releases
- Monthly as part of health check

**Expected Results:**
- All tests pass
- No console errors (except harmless source map warnings)
- Health badge green
- Auth flow working end-to-end

---

## Next Steps

- **[Development Guide](DEVELOPMENT.md)** - Daily dev workflow
- **[Architecture](ARCHITECTURE.md)** - System design
- **[API Documentation](API.md)** - Endpoint reference
