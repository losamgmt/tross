/**
 * Test Authentication Utilities
 *
 * SINGLE SOURCE OF TRUTH for test authentication patterns.
 *
 * BEST PRACTICES ENFORCED:
 * 1. Token caching per role (avoid regeneration)
 * 2. Chainable auth header injection (DRY)
 * 3. Separation of unit vs integration patterns
 * 4. Per-describe user caching (integration tests)
 *
 * USAGE PATTERNS:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ UNIT TESTS (no database)                                       │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ const { getUnitTestToken } = require('./test-auth');           │
 * │                                                                 │
 * │ describe('Feature', () => {                                     │
 * │   let adminToken;                                               │
 * │   beforeAll(async () => {                                       │
 * │     adminToken = await getUnitTestToken('admin');               │
 * │   });                                                           │
 * │   // reuse adminToken in all tests                              │
 * │ });                                                             │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ INTEGRATION TESTS (with database)                              │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ const { createTestAuthContext } = require('./test-auth');      │
 * │                                                                 │
 * │ describe('Feature', () => {                                     │
 * │   const auth = createTestAuthContext();                         │
 * │                                                                 │
 * │   beforeAll(async () => {                                       │
 * │     await auth.createUser('admin');                             │
 * │     await auth.createUser('technician');                        │
 * │   });                                                           │
 * │                                                                 │
 * │   it('test', async () => {                                      │
 * │     const res = await request(app)                              │
 * │       .get('/api/users')                                        │
 * │       .set(auth.headerFor('admin'))                             │
 * │       .expect(200);                                             │
 * │   });                                                           │
 * │ });                                                             │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ withAuth HELPER (works with both)                              │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ const { withAuth } = require('./test-auth');                   │
 * │                                                                 │
 * │ // Instead of:                                                  │
 * │ request(app).get('/api').set('Authorization', `Bearer ${t}`);  │
 * │                                                                 │
 * │ // Use:                                                         │
 * │ withAuth(request(app).get('/api'), token);                     │
 * └─────────────────────────────────────────────────────────────────┘
 */

const { signJwt } = require('../../utils/jwt-helper');
const { TEST_JWT_SECRET } = require('../../config/test-constants');
const { JWT_PAYLOADS, TEST_USERS } = require('../fixtures/test-data');

// ============================================================================
// UNIT TEST TOKENS (No Database Required)
// ============================================================================

/**
 * Process-level cache for unit test tokens.
 * These are pure JWTs with no database state — safe to cache globally.
 * @type {Map<string, string>}
 */
const unitTokenCache = new Map();

/**
 * Get a cached JWT token for unit tests.
 *
 * CACHING: Tokens are cached per role per process. A single Jest worker
 * will reuse the same token for all 'admin' requests across all test files.
 *
 * WHEN TO USE:
 * - Unit tests that mock the database
 * - Tests that only need JWT validation, not DB user lookup
 * - Tests where req.user is sufficient (no req.dbUser needed)
 *
 * @param {string} role - Role name (admin, technician, manager, customer, dispatcher)
 * @param {Object} [overrides={}] - Optional claim overrides
 * @returns {Promise<string>} JWT token
 *
 * @example
 * // Typical usage - token is cached after first call
 * let adminToken;
 * beforeAll(async () => {
 *   adminToken = await getUnitTestToken('admin');
 * });
 */
async function getUnitTestToken(role = 'technician', overrides = {}) {
  const cacheKey = JSON.stringify({ role, ...overrides });

  if (unitTokenCache.has(cacheKey)) {
    return unitTokenCache.get(cacheKey);
  }

  const basePayload = JWT_PAYLOADS[role] || JWT_PAYLOADS.technician;
  const payload = {
    ...basePayload,
    // Ensure fresh timestamps
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    ...overrides,
  };

  const token = await signJwt(payload, TEST_JWT_SECRET, { expiresIn: '24h' });
  unitTokenCache.set(cacheKey, token);

  return token;
}

/**
 * Get an expired JWT token for testing auth rejection.
 *
 * @param {string} role - Role name
 * @returns {Promise<string>} Expired JWT token
 */
async function getExpiredToken(role = 'technician') {
  const basePayload = JWT_PAYLOADS[role] || JWT_PAYLOADS.technician;
  const payload = {
    ...basePayload,
    iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
  };

  // Sign without expiration option (using payload exp)
  return signJwt(payload, TEST_JWT_SECRET);
}

/**
 * Clear unit test token cache.
 * Call this in afterAll if you need fresh tokens between test files.
 */
function clearUnitTokenCache() {
  unitTokenCache.clear();
}

// ============================================================================
// INTEGRATION TEST CONTEXT (Database Required)
// ============================================================================

/**
 * Create a scoped authentication context for integration tests.
 *
 * Creates REAL database users with proper foreign keys. Users and tokens
 * are cached per-describe block to avoid redundant DB inserts.
 *
 * ISOLATION: Each describe block should create its own context. Users
 * are created with unique IDs per test file to avoid conflicts.
 *
 * @returns {TestAuthContext} Authentication context with user/token management
 *
 * @example
 * describe('User API', () => {
 *   const auth = createTestAuthContext();
 *
 *   beforeAll(async () => {
 *     await auth.createUser('admin');
 *     await auth.createUser('technician');
 *   });
 *
 *   it('admin can list users', async () => {
 *     const res = await request(app)
 *       .get('/api/users')
 *       .set(auth.headerFor('admin'))
 *       .expect(200);
 *   });
 *
 *   it('technician cannot list users', async () => {
 *     await request(app)
 *       .get('/api/users')
 *       .set(auth.headerFor('technician'))
 *       .expect(403);
 *   });
 * });
 */
function createTestAuthContext() {
  // Per-context cache (scoped to describe block)
  const users = new Map();
  const tokens = new Map();

  return {
    /**
     * Create a test user in the database and cache the token.
     *
     * @param {string} role - Role name (admin, technician, etc.)
     * @param {Object} [userData={}] - Optional user data overrides
     * @returns {Promise<{user: Object, token: string}>}
     */
    async createUser(role, userData = {}) {
      if (users.has(role)) {
        return { user: users.get(role), token: tokens.get(role) };
      }

      // Import lazily to avoid circular dependency
      const { createTestUser } = require('./test-db');
      const result = await createTestUser({ role, ...userData });

      users.set(role, result.user);
      tokens.set(role, result.token);

      return result;
    },

    /**
     * Get token for a previously created user.
     *
     * @param {string} role - Role name
     * @returns {string} JWT token
     * @throws {Error} If user hasn't been created
     */
    tokenFor(role) {
      if (!tokens.has(role)) {
        throw new Error(
          `No token for role '${role}'. Call auth.createUser('${role}') in beforeAll first.`,
        );
      }
      return tokens.get(role);
    },

    /**
     * Get authorization header object for a role.
     *
     * @param {string} role - Role name
     * @returns {Object} Header object for .set()
     *
     * @example
     * request(app).get('/api').set(auth.headerFor('admin'))
     */
    headerFor(role) {
      return { Authorization: `Bearer ${this.tokenFor(role)}` };
    },

    /**
     * Get user object for a previously created user.
     *
     * @param {string} role - Role name
     * @returns {Object} User object
     */
    userFor(role) {
      if (!users.has(role)) {
        throw new Error(
          `No user for role '${role}'. Call auth.createUser('${role}') in beforeAll first.`,
        );
      }
      return users.get(role);
    },

    /**
     * Check if a user has been created for this context.
     *
     * @param {string} role - Role name
     * @returns {boolean}
     */
    hasUser(role) {
      return users.has(role);
    },

    /**
     * Get all created roles in this context.
     *
     * @returns {string[]} Array of role names
     */
    getRoles() {
      return Array.from(users.keys());
    },

    /**
     * Clear context cache. Call in afterAll if needed.
     */
    clear() {
      users.clear();
      tokens.clear();
    },
  };
}

// ============================================================================
// CHAINABLE AUTH HELPERS
// ============================================================================

/**
 * Add authorization header to a supertest request.
 *
 * Chainable helper to eliminate repetitive .set('Authorization', ...) calls.
 *
 * @param {Object} request - Supertest request object
 * @param {string} token - JWT token
 * @returns {Object} The same request with auth header added
 *
 * @example
 * // Instead of:
 * request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
 *
 * // Use:
 * withAuth(request(app).get('/api/users'), token);
 *
 * // Or chain:
 * withAuth(request(app).get('/api/users'), token)
 *   .expect(200)
 *   .expect('Content-Type', /json/);
 */
function withAuth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

/**
 * Create a bearer token header object.
 *
 * @param {string} token - JWT token
 * @returns {Object} Header object { Authorization: 'Bearer ...' }
 *
 * @example
 * request(app).get('/api').set(bearerHeader(token));
 */
function bearerHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ============================================================================
// ROLE PRESETS
// ============================================================================

/**
 * Standard roles available in tests.
 * @constant {string[]}
 */
const TEST_ROLES = ['admin', 'manager', 'dispatcher', 'technician', 'customer'];

/**
 * Check if a role is valid.
 *
 * @param {string} role - Role name to check
 * @returns {boolean}
 */
function isValidTestRole(role) {
  return TEST_ROLES.includes(role);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Unit test helpers (no DB)
  getUnitTestToken,
  getExpiredToken,
  clearUnitTokenCache,

  // Integration test helpers (with DB)
  createTestAuthContext,

  // Chainable helpers
  withAuth,
  bearerHeader,

  // Utilities
  TEST_ROLES,
  isValidTestRole,
};
