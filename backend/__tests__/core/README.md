# TestContext Pattern - Integration Test Infrastructure

## Overview

TestContext is the **Single Source of Truth** for all integration test setup. It provides:
- Automatic user/token creation for requested roles
- Fluent request builder API
- Database pool access
- Lifecycle management (setup/teardown)

## Quick Start

```javascript
const { createTestContext } = require("../core");

describe("My Feature Tests", () => {
  const ctx = createTestContext({ roles: ["admin", "technician"] });

  beforeAll(() => ctx.setup());
  afterAll(() => ctx.teardown());

  test("should work for admin", async () => {
    const response = await ctx.get("/api/endpoint").as("admin").execute();
    expect(response.status).toBe(200);
  });
});
```

## API Reference

### Factory Methods

```javascript
// Standard integration test context
const ctx = createTestContext({ roles: ["admin", "user"] });

// Unit test context (no DB)
const ctx = TestContext.unit();

// Shared context (for describe blocks sharing state)
const ctx = TestContext.shared({ roles: ["admin"] });
```

### Lifecycle

```javascript
beforeAll(() => ctx.setup());   // Creates users/tokens
afterAll(() => ctx.teardown()); // Cleanup

// Optional - clean tables between tests
afterEach(() => ctx.truncate("audit_logs", "refresh_tokens"));
```

### Request Builder (Fluent API)

```javascript
// GET request
await ctx.get("/api/health").execute();

// With authentication
await ctx.get("/api/admin/data").as("admin").execute();

// Without authentication
await ctx.get("/api/public").unauthenticated().execute();

// POST with body
await ctx.post("/api/users").as("admin").send({ name: "Test" }).execute();

// PUT with body
await ctx.put("/api/users/1").as("admin").send({ name: "Updated" }).execute();

// DELETE
await ctx.delete("/api/users/1").as("admin").execute();

// PATCH
await ctx.patch("/api/users/1").as("admin").send({ status: "active" }).execute();
```

### Accessors

```javascript
// Get token for role
ctx.token("admin")  // Returns JWT string

// Get user object for role
ctx.user("admin")   // Returns { id, email, role, ... }

// Shorthand getters
ctx.adminToken      // Same as ctx.token("admin")
ctx.adminUser       // Same as ctx.user("admin")

// Database pool access
ctx.pool            // Returns pg Pool instance
await ctx.pool.query("SELECT * FROM users WHERE id = $1", [userId]);

// Create additional users within tests
const newUser = await ctx.createUser("viewer");
// newUser.user.id, newUser.token
```

## Migration Guide

### Before (Old Pattern)
```javascript
const request = require("supertest");
const app = require("../../server");
const { createTestUser, cleanupTestDatabase } = require("../helpers/test-db");

describe("Tests", () => {
  let adminToken;
  
  beforeAll(async () => {
    const admin = await createTestUser("admin");
    adminToken = admin.token;
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });

  test("example", async () => {
    const response = await request(app)
      .get("/api/endpoint")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
  });
});
```

### After (TestContext Pattern)
```javascript
const { createTestContext } = require("../core");

describe("Tests", () => {
  const ctx = createTestContext({ roles: ["admin"] });
  
  beforeAll(() => ctx.setup());
  afterAll(() => ctx.teardown());

  test("example", async () => {
    const response = await ctx.get("/api/endpoint").as("admin").execute();
    expect(response.status).toBe(200);
  });
});
```

## The "Change One Place" Principle

| What Changes | Where to Change |
|--------------|-----------------|
| Token generation | `test-context.js` → All tests get new behavior |
| Cleanup logic | `test-context.js` → All tests get new cleanup |
| New role support | `test-context.js` → All tests can use immediately |
| Auth header format | `test-context.js` → All requests updated |
| Request defaults | `test-context.js` → All tests inherit |

## ESLint Enforcement

Custom ESLint rules prevent regression:

- `no-direct-supertest` - Forces use of ctx.get/post/etc
- `no-direct-createTestUser` - Forces use of ctx.createUser
- `no-manual-auth-header` - Forces use of .as() method
- `require-test-context` - Ensures TestContext import

## Files

- `backend/__tests__/core/test-context.js` - Core TestContext class
- `backend/__tests__/core/index.js` - Unified exports
- `backend/__tests__/eslint/test-rules.js` - Custom ESLint rules
