# Testing Guide

Philosophy, patterns, and best practices for testing TrossApp.

---

## Testing Philosophy

**Why We Test:**
- **Confidence** to refactor without breaking things
- **Documentation** that never goes stale (tests are executable specs)
- **Regression prevention** - catch bugs before production
- **Design feedback** - hard-to-test code is poorly designed code

**Our Commitment:** Every feature has comprehensive test coverage.

---

## Test Statistics

**Backend:** 1675+ tests across 98 test files  
**Frontend:** 1553+ Flutter widget/integration tests  
**E2E:** 188 Playwright tests (4 browsers × 47 scenarios)  
**Execution Time:** <70 seconds (backend suite, parallelized)  
**Coverage:** Comprehensive (unit + integration + E2E)

**Test Distribution:**
- Unit tests: ~70% (fast, isolated)
- Integration tests: ~25% (API + DB)
- E2E tests: ~5% (critical user flows)

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

**Example:** API endpoint
```javascript
// __tests__/integration/customers-api.test.js
describe('GET /api/customers', () => {
  it('should return paginated customers', async () => {
    const response = await request(app)
      .get('/api/customers?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body).toHaveProperty('pagination');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/customers');

    expect(response.status).toBe(401);
  });
});
```

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

### Widget Tests (`test/widgets/`)

**What to test:**
- Widget rendering
- User interactions (taps, input)
- State changes
- Error states

**Example:** Button widget
```dart
// test/widgets/atoms/custom_button_test.dart
void main() {
  testWidgets('CustomButton renders with text', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CustomButton(
          text: 'Click Me',
          onPressed: () {},
        ),
      ),
    );

    expect(find.text('Click Me'), findsOneWidget);
    expect(find.byType(ElevatedButton), findsOneWidget);
  });

  testWidgets('CustomButton calls onPressed when tapped', (tester) async {
    bool pressed = false;

    await tester.pumpWidget(
      MaterialApp(
        home: CustomButton(
          text: 'Click Me',
          onPressed: () => pressed = true,
        ),
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

**What to test:**
- Critical user journeys (auth, CRUD workflows)
- Business workflows (customer → work order → invoice)
- Error handling and edge cases
- Cross-browser compatibility (Chromium, Firefox, WebKit, Mobile Chrome)

**Architecture:** 188 tests across 4 browsers (47 scenarios × 4 = 188)

**Test Files:**
- `e2e/api.spec.ts` - Complete business workflows
- `e2e/auth.spec.ts` - Authentication flows
- `e2e/error-handling.spec.ts` - Validation and error cases
- `e2e/user-management.spec.ts` - User CRUD operations
- `e2e/role-management.spec.ts` - Role CRUD operations

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

**Focus:** Business workflows and user journeys  
**Not tested in E2E:** Backend security internals (RLS, permissions)

> **Why?** Row-level security (RLS) is thoroughly tested in backend integration tests. E2E uses development tokens (no database user IDs) for convenience. See `backend/__tests__/integration/*-api.test.js` for RLS coverage.

---

### Run E2E Tests

```bash
npx playwright test                # Full suite (188 tests)
npx playwright test --ui           # Interactive mode
npx playwright test auth.spec.ts   # Single file
npx playwright test --project=chromium  # Single browser
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

---

## Test Organization

### File Naming
```
__tests__/
  unit/
    models/
      Customer.crud.test.js       # CRUD operations
      Customer.validation.test.js # Validation logic
      Customer.rls.test.js        # Row-level security
    services/
      auth-service.test.js
  integration/
    customers-api.test.js         # Full API tests
    auth-flow.test.js
```

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

Run these tests against **https://trossapp.vercel.app** after every production deployment:

#### 1. Authentication & Session
- [ ] Visit https://trossapp.vercel.app
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
- [ ] View role list (5 core roles)
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
- [ ] Visit https://tross-api-production.up.railway.app/api/health
- [ ] Should return JSON: `{"status":"ok",...}`
- [ ] Check database health in response

### Automated E2E Tests (Against Production)

```bash
# Run E2E tests against production backend
BACKEND_URL=https://tross-api-production.up.railway.app npm run test:e2e

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
