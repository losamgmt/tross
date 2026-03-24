# Test Authentication Best Practices

> **Single Source of Truth**: [`backend/__tests__/core/`](../../backend/__tests__/core/)

This document describes the **STRICT** authentication patterns for Tross tests.

## Quick Reference

| Test Type | Approach | DB Required |
|-----------|----------|-------------|
| Unit | `TestContext.unit()` | No |
| Integration | `createTestContext({ roles: [...] })` | Yes |

## The Recommended Pattern: TestContext

### Integration Tests (Recommended)

```javascript
const { createTestContext } = require('../core');

describe('User API', () => {
  const ctx = createTestContext({ roles: ['admin', 'technician'] });

  beforeAll(() => ctx.setup());
  afterAll(() => ctx.teardown());

  test('admin can list users', async () => {
    const res = await ctx.get('/api/users').as('admin').execute();
    expect(res.status).toBe(200);
  });

  test('technician cannot access admin endpoint', async () => {
    const res = await ctx.get('/api/admin/data').as('technician').execute();
    expect(res.status).toBe(403);
  });
});
```

### Unit Tests (No Database)

```javascript
const { TestContext } = require('../core');

describe('Feature', () => {
  const ctx = TestContext.unit({ roles: ['admin', 'technician'] });

  beforeAll(() => ctx.setup());
  afterAll(() => ctx.teardown());

  test('admin can access', async () => {
    const res = await ctx.get('/api/users').as('admin').execute();
    expect(res.status).toBe(200);
  });
});
```

## Anti-Patterns (AVOID)

### ❌ Per-Test Token Generation

```javascript
// BAD: Creates new token/user for EVERY test
it('test 1', async () => {
  const user = await createTestUser('admin');
  await request(app).get('/api').set('Authorization', `Bearer ${user.token}`);
});

it('test 2', async () => {
  const user = await createTestUser('admin'); // DUPLICATE!
  await request(app).get('/api').set('Authorization', `Bearer ${user.token}`);
});
```

### ❌ Direct signJwt() Calls

```javascript
// BAD: Hardcoded payload, no caching, no abstraction
const token = await signJwt(
  { sub: 'dev|admin', email: 'admin@test.com', role: 'admin', provider: 'development' },
  JWT_SECRET,
  { expiresIn: '1h' }
);
```

### ❌ Repeated Auth Header Setup

```javascript
// BAD: Repeated in every request
.set('Authorization', `Bearer ${token}`)
.set('Authorization', `Bearer ${token}`)
.set('Authorization', `Bearer ${token}`)
```

## Correct Patterns

### ✅ Cached Token Generation

```javascript
// GOOD: Generate once, reuse everywhere
let adminToken;
beforeAll(async () => {
  adminToken = await getUnitTestToken('admin');
});
```

### ✅ Using withAuth()

```javascript
// GOOD: Clean, chainable
await withAuth(request(app).get('/api/users'), adminToken).expect(200);
```

### ✅ Using createTestAuthContext()

```javascript
// GOOD: Scoped to describe, auto-cached
const auth = createTestAuthContext();
beforeAll(() => auth.createUser('admin'));
// Use auth.tokenFor('admin') or auth.headerFor('admin')
```

## API Reference

### `getUnitTestToken(role, overrides?)`

Get a cached JWT token for unit tests (no database).

```javascript
const token = await getUnitTestToken('admin');
const customToken = await getUnitTestToken('technician', { email: 'custom@test.com' });
```

**Caching**: Tokens are cached per `{role, overrides}` combination at process level.

### `getExpiredToken(role)`

Get an expired JWT token for testing auth rejection.

```javascript
const expiredToken = await getExpiredToken('technician');
```

### `createTestAuthContext()`

Create a scoped auth context for integration tests.

```javascript
const auth = createTestAuthContext();

// Methods:
await auth.createUser('admin');           // Create DB user + token
auth.tokenFor('admin');                   // Get token
auth.headerFor('admin');                  // Get { Authorization: 'Bearer ...' }
auth.userFor('admin');                    // Get user object
auth.hasUser('admin');                    // Check if created
auth.getRoles();                          // ['admin', 'technician', ...]
auth.clear();                             // Clear cache
```

### `withAuth(request, token)`

Chainable auth header helper.

```javascript
await withAuth(request(app).get('/api'), token).expect(200);
```

### `bearerHeader(token)`

Create header object for `.set()`.

```javascript
request(app).get('/api').set(bearerHeader(token));
```

## Migration Guide

### From Old Pattern to TestContext

**Before (old pattern):**
```javascript
const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');

describe('Tests', () => {
  let adminToken;
  
  beforeAll(async () => {
    const admin = await createTestUser('admin');
    adminToken = admin.token;
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });

  test('example', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${adminToken}`);
  });
});
```

**After (TestContext):**
```javascript
const { createTestContext } = require('../core');

describe('Tests', () => {
  const ctx = createTestContext({ roles: ['admin'] });
  
  beforeAll(() => ctx.setup());
  afterAll(() => ctx.teardown());

  test('example', async () => {
    const response = await ctx.get('/api/endpoint').as('admin').execute();
  });
});
```

### Benefits
- **Single import** - `require('../core')` provides everything
- **Fluent API** - `.as('admin').execute()` instead of `.set('Authorization', ...)`
- **SSOT** - Change token generation once, affects all tests

## Performance Impact

| Pattern | Tokens/Run | DB Inserts | Time Impact |
|---------|------------|------------|-------------|
| Per-test (anti-pattern) | ~50 | ~50 | Slow |
| Per-describe (correct) | ~15 | ~15 | Fast |
| Cached (optimal) | ~10 | ~10 | Fastest |

## Available Roles

- `admin`
- `manager`
- `dispatcher`
- `technician`
- `customer`
- `viewer`
