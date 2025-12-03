# 🧪 TrossApp Testing Guide

**Comprehensive testing philosophy, patterns, and best practices for TrossApp**

---

## 📋 Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Test Structure](#test-structure)
4. [Database Layer](#database-layer)
5. [Writing Tests](#writing-tests)
6. [Test Helpers](#test-helpers)
7. [Running Tests](#running-tests)
8. [Coverage Requirements](#coverage-requirements)

---

## 🎯 Testing Philosophy

### Our Approach: Hybrid Testing Strategy

**Principle:** Test what matters, avoid over-mocking, keep it simple.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UNIT TESTS (Fast, Isolated)                             │
│    - Pure functions (JWT, bcrypt, validation)               │
│    - Business logic and utilities                           │
│    - Mock ONLY external APIs (Auth0)                        │
│    Speed: <100ms   Coverage: Business logic                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. INTEGRATION TESTS (Medium, Real DB)                     │
│    - Test with REAL PostgreSQL test database               │
│    - Verify SQL queries actually work                       │
│    - Test transactions, constraints, indexes                │
│    Speed: 1-5s     Coverage: DB interactions                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. E2E TESTS (Slow, Full Stack)                            │
│    - Test complete user flows                               │
│    - Frontend + Backend + Database                          │
│    Speed: 5-30s    Coverage: User stories                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Overview

### Test Directory Structure

```
backend/__tests__/
├── unit/                          # Fast, isolated tests
│   ├── db/
│   │   ├── models/
│   │   │   ├── Role.test.js      # Role model tests
│   │   │   └── User.test.js      # User model tests
│   ├── routes/
│   │   ├── auth.test.js          # Auth route tests
│   │   ├── roles.test.js         # Role route tests
│   │   └── users.test.js         # User route tests
│   ├── services/
│   │   ├── audit-service.test.js # Audit service tests
│   │   └── token-service.test.js
│   └── utils/
│       └── request-helpers.test.js # Helper utility tests
│
├── integration/                   # Real database tests
│   ├── db/
│   │   ├── role-crud-db.test.js  # Role CRUD with real DB
│   │   ├── user-crud-db.test.js  # User CRUD with real DB
│   │   └── token-service-db.test.js # Token service integration
│   └── routes/
│       ├── auth-flow.test.js     # Full auth flows
│       └── user-role-assignment.test.js # User-role operations
│
├── fixtures/                      # Test data
│   └── test-data.js              # Shared fixtures
│
├── helpers/                       # Test utilities
│   ├── test-db.js                # Database setup/teardown
│   ├── auth-helpers.js           # Token generation
│   └── test-server.js            # Express test app
│
└── setup/
    └── jest.setup.js             # Global test configuration
```

---

## 🗄️ Database Layer

### Critical Architecture Pattern

**Problem:** Services must use test database during tests, not production database.

**Solution:** Environment-aware connection configuration

```javascript
// db/connection.js - Production uses DB_* variables
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "trossapp_dev",
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// __tests__/helpers/test-db.js - Tests use TEST_DB_* variables
const testPool = new Pool({
  user: process.env.TEST_DB_USER || "test_user",
  host: process.env.TEST_DB_HOST || "localhost",
  database: process.env.TEST_DB_NAME || "trossapp_test",
  password: process.env.TEST_DB_PASSWORD,
  port: process.env.TEST_DB_PORT || 5434, // Different port!
});
```

### Test Database Setup

**Docker Compose (Recommended):**

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: trossapp_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass_secure_123
    ports:
      - "5434:5432" # Different port than dev DB
    tmpfs:
      - /var/lib/postgresql/data # In-memory for speed
```

**Start test database:**

```bash
docker-compose -f docker-compose.test.yml up -d
```

### Schema Synchronization

**Critical:** Test database must match production schema exactly.

```bash
# Apply schema to test database
psql -h localhost -p 5434 -U test_user -d trossapp_test < backend/schema.sql

# Or use npm script
npm run db:test:reset
```

---

## ✍️ Writing Tests

### Unit Test Pattern (AAA - Arrange, Act, Assert)

```javascript
describe("UserService", () => {
  describe("createUser", () => {
    it("should create user with valid data", async () => {
      // ✅ ARRANGE - Set up test data and mocks
      const userData = {
        email: "test@example.com",
        first_name: "John",
        last_name: "Doe",
        role_id: 2,
      };

      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, ...userData }],
      });

      // ✅ ACT - Execute the function under test
      const result = await UserService.createUser(userData);

      // ✅ ASSERT - Verify the results
      expect(result).toBeDefined();
      expect(result.email).toBe("test@example.com");
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.arrayContaining([userData.email]),
      );
    });
  });
});
```

### Integration Test Pattern

```javascript
describe("User CRUD Lifecycle (Integration)", () => {
  let testPool;

  beforeAll(async () => {
    // Connect to REAL test database
    testPool = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testPool);
  });

  beforeEach(async () => {
    // Clean slate for each test
    await testPool.query("TRUNCATE users CASCADE");
  });

  it("should create, read, update, and delete user", async () => {
    // CREATE
    const result = await testPool.query(
      "INSERT INTO users (email, first_name, last_name, role_id) VALUES ($1, $2, $3, $4) RETURNING *",
      ["test@example.com", "John", "Doe", 2],
    );
    const userId = result.rows[0].id;

    // READ
    const user = await testPool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    expect(user.rows[0].email).toBe("test@example.com");

    // UPDATE
    await testPool.query("UPDATE users SET first_name = $1 WHERE id = $2", [
      "Jane",
      userId,
    ]);
    const updated = await testPool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    expect(updated.rows[0].first_name).toBe("Jane");

    // DELETE
    await testPool.query("DELETE FROM users WHERE id = $1", [userId]);
    const deleted = await testPool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    expect(deleted.rows.length).toBe(0);
  });
});
```

---

## 🛠️ Test Helpers

### Assertion Helpers

```javascript
// __tests__/helpers/assertions.js

function assertSuccessResponse(response, expectedStatus = 200) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(true);
  expect(response.body.timestamp).toBeDefined();
}

function assertErrorResponse(response, expectedStatus, expectedError) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBe(expectedError);
}

function assertPaginatedResponse(response, minCount = 0) {
  assertSuccessResponse(response);
  expect(response.body.data).toBeArray();
  expect(response.body.count).toBeGreaterThanOrEqual(minCount);
}
```

### Authentication Helpers

```javascript
// __tests__/helpers/auth-helpers.js

const { generateToken } = require("../../services/token-service");

async function createTestToken(userOverrides = {}) {
  const defaultUser = {
    id: 1,
    email: "test@example.com",
    role: "technician",
  };

  const user = { ...defaultUser, ...userOverrides };
  return generateToken(user);
}

function mockAuthMiddleware(userOverrides = {}) {
  return (req, res, next) => {
    req.dbUser = {
      id: 1,
      email: "admin@test.com",
      role: "admin",
      ...userOverrides,
    };
    next();
  };
}
```

---

## 🏃 Running Tests

### Quick Reference

```bash
# Run all unit tests (fast - under 5 seconds)
npm run test:unit

# Run all integration tests (requires test database)
npm run test:integration

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- User.test.js

# Run tests in watch mode
npm test -- --watch

# Run tests matching pattern
npm test -- --testNamePattern="should create user"
```

### Jest Configuration

```javascript
// jest.config.unit.json - Fast unit tests
{
  "testEnvironment": "node",
  "testMatch": ["**/__tests__/unit/**/*.test.js"],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}

// jest.config.integration.json - Database tests
{
  "testEnvironment": "node",
  "testMatch": ["**/__tests__/integration/**/*.test.js"],
  "testTimeout": 30000  // Longer timeout for DB operations
}
```

---

## 📊 Coverage Requirements

### Target Coverage (Per File)

- **Critical Files (100% required):**
  - Models (User.js, Role.js)
  - Route handlers (auth.js, users.js, roles.js)
  - Core services (audit-service.js, token-service.js)
  - Security middleware (auth.js)

- **Supporting Files (80% minimum):**
  - Utilities
  - Helper functions
  - Configuration files

### Current Coverage Status

```
✅ 100% Coverage:
- db/models/Role.js
- db/models/User.js
- routes/auth.js
- routes/users.js
- routes/roles.js
- services/audit-service.js
- utils/request-helpers.js

⚠️ Needs Improvement:
- services/token-service.js (2 integration tests hanging)
```

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

---

## 🎓 Best Practices

### DO ✅

1. **Test behavior, not implementation**
   - Test WHAT the code does, not HOW it does it
   - Focus on inputs and outputs

2. **Use descriptive test names**

   ```javascript
   it("should return 401 when token is missing");
   it("should create user with valid data");
   it("should prevent deletion of protected roles");
   ```

3. **Keep tests independent**
   - Each test should run in isolation
   - Use `beforeEach` to reset state

4. **Test edge cases**
   - Empty inputs, null values, invalid data
   - Boundary conditions (min/max values)
   - Error scenarios

5. **Use real database for integration tests**
   - Mocking database calls misses SQL errors
   - Test actual constraints, indexes, triggers

### DON'T ❌

1. **Don't test external libraries**
   - Trust that `bcrypt`, `jwt`, `express` work
   - Test YOUR code that uses them

2. **Don't over-mock in integration tests**
   - Integration tests verify things work together
   - Only mock external APIs (Auth0, email)

3. **Don't write brittle tests**
   - Avoid testing exact SQL strings
   - Don't rely on specific timing

4. **Don't share state between tests**
   - Each test should be completely independent
   - Use database transactions or truncate tables

---

## 🔧 Troubleshooting

### Tests Hanging

**Symptom:** Jest doesn't exit after tests complete

**Common Causes:**

1. Database connections not closed
2. Timers still running
3. Event listeners not cleaned up

**Solution:**

```javascript
afterAll(async () => {
  await testPool.end(); // Close database connection
  await new Promise((resolve) => setTimeout(resolve, 100)); // Let cleanup finish
});
```

### Tests Fail in CI but Pass Locally

**Common Causes:**

1. Database not initialized in CI
2. Environment variables not set
3. Port conflicts

**Solution:**

- Add database setup to CI workflow
- Use GitHub Actions secrets for env vars
- Use dynamic port allocation

### "Cannot find module" Errors

**Cause:** Module path incorrect

**Solution:**

```javascript
// Use relative paths from test file
const User = require("../../../db/models/User");

// Or use absolute paths with Jest moduleNameMapper
const User = require("@/db/models/User");
```

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest API](https://github.com/visionmedia/supertest)
- [Testing Node.js + PostgreSQL](https://node-postgres.com/guides/testing)
- [TrossApp Testing Documentation](./README.md)

---

---

**TrossApp Testing Guide** - Comprehensive testing philosophy and best practices

