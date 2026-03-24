/**
 * TestContext - The Single Source of Truth for Test Infrastructure
 *
 * This module provides the ONLY way to set up test infrastructure.
 * All test setup, authentication, cleanup, and request building flows
 * through this module.
 *
 * DESIGN PRINCIPLES:
 * 1. Single Responsibility: Context manages lifecycle, not test logic
 * 2. Open/Closed: Extend via composition, not modification
 * 3. Dependency Inversion: Tests depend on abstraction (TestContext)
 *
 * CHANGE PROPAGATION:
 * - Modify token generation → ALL tests get new behavior
 * - Modify cleanup logic → ALL tests get new cleanup
 * - Add new role → ALL tests can use it immediately
 *
 * @example
 * // Integration test
 * const { createTestContext } = require('../core');
 *
 * describe('Admin API', () => {
 *   const ctx = createTestContext({ roles: ['admin', 'technician'] });
 *
 *   beforeAll(() => ctx.setup());
 *   afterAll(() => ctx.teardown());
 *
 *   test('admin can view sessions', async () => {
 *     const res = await ctx.get('/api/admin/sessions').as('admin').execute();
 *     expect(res.status).toBe(200);
 *   });
 * });
 */

const request = require('supertest');
const app = require('../../server');
const {
  createTestUser,
  cleanupTestDatabase,
  getTestPool,
  setupTestDatabase,
} = require('../helpers/test-db');
const { getUnitTestToken, getExpiredToken } = require('../helpers/test-auth');

// ============================================================================
// TestContext Class - Core Infrastructure
// ============================================================================

/**
 * TestContext provides a unified interface for all test setup operations.
 *
 * Features:
 * - Automatic user creation by role
 * - Cached token management
 * - Fluent request builder
 * - Lifecycle management (setup/teardown)
 * - Pool access for direct DB operations
 *
 * @class TestContext
 */
class TestContext {
  /**
   * Instance cache for sharing contexts across describe blocks.
   * Key: JSON.stringify(options)
   * @type {Map<string, TestContext>}
   */
  static #instanceCache = new Map();

  /**
   * Create a new TestContext.
   *
   * @param {Object} options - Configuration options
   * @param {string[]} [options.roles=['admin']] - Roles to create users for
   * @param {boolean} [options.setupDatabase=false] - Run schema setup
   * @param {boolean} [options.unitTest=false] - Unit test mode (no DB users)
   */
  constructor(options = {}) {
    this._options = {
      roles: options.roles || ['admin'],
      setupDatabase: options.setupDatabase || false,
      unitTest: options.unitTest || false,
    };

    // State
    this._users = new Map();      // role -> { user, token }
    this._tokens = new Map();     // role -> token (quick access)
    this._pool = null;            // Database pool reference
    this._isSetup = false;
    this._customData = new Map(); // For test-specific data
  }

  // ==========================================================================
  // Factory Methods
  // ==========================================================================

  /**
   * Create a new TestContext (recommended for most tests).
   *
   * @param {Object} options - Configuration options
   * @returns {TestContext} New context instance
   *
   * @example
   * const ctx = TestContext.create({ roles: ['admin', 'technician'] });
   */
  static create(options = {}) {
    return new TestContext(options);
  }

  /**
   * Get or create a shared TestContext for the given configuration.
   * Use this when multiple describe blocks need the same setup.
   *
   * @param {Object} options - Configuration options
   * @returns {TestContext} Shared context instance
   *
   * @example
   * // In multiple test files that need same users
   * const ctx = TestContext.shared({ roles: ['admin'] });
   */
  static shared(options = {}) {
    const key = JSON.stringify(options);
    if (!TestContext.#instanceCache.has(key)) {
      TestContext.#instanceCache.set(key, new TestContext(options));
    }
    return TestContext.#instanceCache.get(key);
  }

  /**
   * Create context for unit tests (no database).
   *
   * @param {Object} options - Configuration options
   * @returns {TestContext} Unit test context
   *
   * @example
   * const ctx = TestContext.unit({ roles: ['admin'] });
   */
  static unit(options = {}) {
    return new TestContext({ ...options, unitTest: true });
  }

  /**
   * Clear all shared contexts (call in globalTeardown).
   */
  static clearCache() {
    TestContext.#instanceCache.clear();
  }

  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================

  /**
   * Set up the test context.
   * Call this in beforeAll().
   *
   * @returns {Promise<TestContext>} This context for chaining
   *
   * @example
   * beforeAll(() => ctx.setup());
   */
  async setup() {
    if (this._isSetup) {
      return this;
    }

    // Database setup if requested
    if (this._options.setupDatabase && !this._options.unitTest) {
      await setupTestDatabase();
    }

    // Get pool reference
    if (!this._options.unitTest) {
      this._pool = getTestPool();
    }

    // Create users for each requested role
    for (const role of this._options.roles) {
      if (this._options.unitTest) {
        // Unit test: just get tokens, no DB users
        const token = await getUnitTestToken(role);
        this._tokens.set(role, token);
        this._users.set(role, { user: { role }, token });
      } else {
        // Integration test: create real DB users
        const { user, token } = await createTestUser(role);
        this._users.set(role, { user, token });
        this._tokens.set(role, token);
      }
    }

    this._isSetup = true;
    return this;
  }

  /**
   * Clean up the test context.
   * Call this in afterAll().
   *
   * @returns {Promise<void>}
   *
   * @example
   * afterAll(() => ctx.teardown());
   */
  async teardown() {
    if (!this._options.unitTest) {
      await cleanupTestDatabase();
    }
    this._users.clear();
    this._tokens.clear();
    this._customData.clear();
    this._isSetup = false;
  }

  /**
   * Clean specific tables (for afterEach cleanup).
   *
   * @param {...string} tables - Table names to truncate
   * @returns {Promise<void>}
   *
   * @example
   * afterEach(() => ctx.truncate('audit_logs', 'refresh_tokens'));
   */
  async truncate(...tables) {
    if (this._options.unitTest || !this._pool) {
      return;
    }

    for (const table of tables) {
      await this._pool.query(
        `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`
      );
    }
  }

  // ==========================================================================
  // Token & User Accessors
  // ==========================================================================

  /**
   * Create an additional test user (for tests that need extra users).
   * Unlike setup() roles, these users are created on-demand.
   *
   * @param {string} role - Role for the new user
   * @returns {Promise<{ user: Object, token: string }>}
   *
   * @example
   * const testUser = await ctx.createUser("technician");
   * // Use testUser.user.id, testUser.token, etc.
   */
  async createUser(role) {
    if (this._options.unitTest) {
      const token = await getUnitTestToken(role);
      return { user: { role }, token };
    }
    return await createTestUser(role);
  }

  /**
   * Get token for a role.
   *
   * @param {string} role - Role name
   * @returns {string} JWT token
   * @throws {Error} If role not created in setup
   */
  token(role) {
    const token = this._tokens.get(role);
    if (!token) {
      const available = Array.from(this._tokens.keys()).join(', ');
      throw new Error(
        `Token for role '${role}' not available. ` +
        `Available roles: [${available}]. ` +
        `Add '${role}' to the roles array in TestContext.create().`
      );
    }
    return token;
  }

  /**
   * Get user data for a role.
   *
   * @param {string} role - Role name
   * @returns {Object} User object with id, email, role, etc.
   */
  user(role) {
    const data = this._users.get(role);
    if (!data) {
      throw new Error(`User for role '${role}' not available.`);
    }
    return data.user;
  }

  /**
   * Get both user and token for a role.
   *
   * @param {string} role - Role name
   * @returns {{ user: Object, token: string }}
   */
  auth(role) {
    const data = this._users.get(role);
    if (!data) {
      throw new Error(`Auth for role '${role}' not available.`);
    }
    return data;
  }

  /**
   * Get an expired token for testing auth rejection.
   *
   * @param {string} [role='technician'] - Role name
   * @returns {Promise<string>} Expired JWT token
   */
  async expiredToken(role = 'technician') {
    return getExpiredToken(role);
  }

  // ==========================================================================
  // Shorthand Accessors (Most Common Roles)
  // ==========================================================================

  /** @returns {string} Admin token */
  get adminToken() { return this.token('admin'); }

  /** @returns {string} Technician token */
  get techToken() { return this.token('technician'); }

  /** @returns {string} Manager token */
  get managerToken() { return this.token('manager'); }

  /** @returns {string} Customer token */
  get customerToken() { return this.token('customer'); }

  /** @returns {string} Dispatcher token */
  get dispatcherToken() { return this.token('dispatcher'); }

  /** @returns {string} Viewer token */
  get viewerToken() { return this.token('viewer'); }

  /** @returns {Object} Admin user */
  get adminUser() { return this.user('admin'); }

  /** @returns {Object} Technician user */
  get techUser() { return this.user('technician'); }

  /** @returns {Object} Database pool */
  get pool() { return this._pool; }

  // ==========================================================================
  // Request Builder Methods (Fluent API)
  // ==========================================================================

  /**
   * Create a GET request builder.
   *
   * @param {string} endpoint - API endpoint
   * @returns {TestRequest} Fluent request builder
   *
   * @example
   * const res = await ctx.get('/api/users').as('admin').execute();
   */
  get(endpoint) {
    return this._createRequest('get', endpoint);
  }

  /**
   * Create a POST request builder.
   *
   * @param {string} endpoint - API endpoint
   * @returns {TestRequest} Fluent request builder
   *
   * @example
   * const res = await ctx.post('/api/users')
   *   .as('admin')
   *   .send({ email: 'new@test.com' })
   *   .execute();
   */
  post(endpoint) {
    return this._createRequest('post', endpoint);
  }

  /**
   * Create a PUT request builder.
   *
   * @param {string} endpoint - API endpoint
   * @returns {TestRequest} Fluent request builder
   */
  put(endpoint) {
    return this._createRequest('put', endpoint);
  }

  /**
   * Create a PATCH request builder.
   *
   * @param {string} endpoint - API endpoint
   * @returns {TestRequest} Fluent request builder
   */
  patch(endpoint) {
    return this._createRequest('patch', endpoint);
  }

  /**
   * Create a DELETE request builder.
   *
   * @param {string} endpoint - API endpoint
   * @returns {TestRequest} Fluent request builder
   */
  delete(endpoint) {
    return this._createRequest('delete', endpoint);
  }

  /**
   * Create a raw supertest request for advanced use cases.
   *
   * @returns {Object} supertest(app) object
   */
  raw() {
    return request(app);
  }

  /**
   * Internal: Create a TestRequest instance.
   * @private
   */
  _createRequest(method, endpoint) {
    return new TestRequest(this, method, endpoint);
  }

  // ==========================================================================
  // Custom Data Storage (For Test-Specific State)
  // ==========================================================================

  /**
   * Store custom data in the context (e.g., created entity IDs).
   *
   * @param {string} key - Data key
   * @param {*} value - Data value
   * @returns {TestContext} This context for chaining
   */
  set(key, value) {
    this._customData.set(key, value);
    return this;
  }

  /**
   * Retrieve custom data from the context.
   *
   * @param {string} key - Data key
   * @returns {*} Stored value
   */
  data(key) {
    return this._customData.get(key);
  }

  /**
   * Check if custom data exists.
   *
   * @param {string} key - Data key
   * @returns {boolean}
   */
  has(key) {
    return this._customData.has(key);
  }
}


// ============================================================================
// TestRequest Class - Fluent Request Builder
// ============================================================================

/**
 * Fluent request builder for test assertions.
 *
 * This class wraps supertest and provides a chainable API
 * for building authenticated requests.
 *
 * @class TestRequest
 */
class TestRequest {
  /**
   * Create a new TestRequest.
   *
   * @param {TestContext} ctx - Parent context
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   */
  constructor(ctx, method, endpoint) {
    this._ctx = ctx;
    this._method = method;
    this._endpoint = endpoint;
    this._role = null;
    this._token = null;
    this._body = null;
    this._query = {};
    this._headers = {};
    this._attach = null;
  }

  /**
   * Authenticate as a specific role.
   *
   * @param {string} role - Role name (must be in context's roles)
   * @returns {TestRequest} This request for chaining
   *
   * @example
   * ctx.get('/api/users').as('admin')
   */
  as(role) {
    this._role = role;
    return this;
  }

  /**
   * Use a custom token (for edge cases like expired tokens).
   *
   * @param {string} token - JWT token
   * @returns {TestRequest} This request for chaining
   */
  withToken(token) {
    this._token = token;
    return this;
  }

  /**
   * Make request unauthenticated (explicit).
   *
   * @returns {TestRequest} This request for chaining
   */
  unauthenticated() {
    this._role = null;
    this._token = null;
    return this;
  }

  /**
   * Set request body.
   *
   * @param {Object} body - Request body
   * @returns {TestRequest} This request for chaining
   *
   * @example
   * ctx.post('/api/users').as('admin').send({ name: 'Test' })
   */
  send(body) {
    this._body = body;
    return this;
  }

  /**
   * Set query parameters.
   *
   * @param {Object} params - Query parameters
   * @returns {TestRequest} This request for chaining
   *
   * @example
   * ctx.get('/api/users').as('admin').query({ page: 1, limit: 10 })
   */
  query(params) {
    this._query = { ...this._query, ...params };
    return this;
  }

  /**
   * Set custom headers.
   *
   * @param {string} name - Header name
   * @param {string} value - Header value
   * @returns {TestRequest} This request for chaining
   */
  header(name, value) {
    this._headers[name] = value;
    return this;
  }

  /**
   * Set idempotency key header.
   *
   * @param {string} key - Idempotency key
   * @returns {TestRequest} This request for chaining
   */
  idempotencyKey(key) {
    this._headers['Idempotency-Key'] = key;
    return this;
  }

  /**
   * Attach a file (for multipart uploads).
   *
   * @param {string} field - Field name
   * @param {Buffer|string} file - File content or path
   * @param {string} [filename] - Filename
   * @returns {TestRequest} This request for chaining
   */
  attach(field, file, filename) {
    this._attach = { field, file, filename };
    return this;
  }

  /**
   * Execute the request and return the response.
   *
   * @returns {Promise<Object>} Supertest response
   *
   * @example
   * const res = await ctx.get('/api/users').as('admin').execute();
   * expect(res.status).toBe(200);
   */
  async execute() {
    // Build supertest request
    let req = request(app)[this._method](this._endpoint);

    // Apply query params
    if (Object.keys(this._query).length > 0) {
      req = req.query(this._query);
    }

    // Apply authentication
    const token = this._token || (this._role ? this._ctx.token(this._role) : null);
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }

    // Apply custom headers
    for (const [name, value] of Object.entries(this._headers)) {
      req = req.set(name, value);
    }

    // Apply body
    if (this._body !== null) {
      req = req.send(this._body);
    }

    // Apply file attachment
    if (this._attach) {
      const { field, file, filename } = this._attach;
      req = req.attach(field, file, filename);
    }

    return req;
  }

  // ==========================================================================
  // Assertion Shortcuts
  // ==========================================================================

  /**
   * Execute and expect specific status.
   *
   * @param {number} status - Expected HTTP status
   * @returns {Promise<Object>} Response
   *
   * @example
   * const res = await ctx.get('/api/admin').as('tech').expect(403);
   */
  async expect(status) {
    const res = await this.execute();
    if (res.status !== status) {
      throw new Error(
        `Expected status ${status}, got ${res.status}. ` +
        `Body: ${JSON.stringify(res.body)}`
      );
    }
    return res;
  }

  /**
   * Execute and expect success (200-299).
   *
   * @returns {Promise<Object>} Response
   */
  async expectSuccess() {
    const res = await this.execute();
    if (res.status < 200 || res.status >= 300) {
      throw new Error(
        `Expected success status, got ${res.status}. ` +
        `Body: ${JSON.stringify(res.body)}`
      );
    }
    return res;
  }

  /**
   * Execute and expect 401 Unauthorized.
   *
   * @returns {Promise<Object>} Response
   */
  async expectUnauthorized() {
    return this.expect(401);
  }

  /**
   * Execute and expect 403 Forbidden.
   *
   * @returns {Promise<Object>} Response
   */
  async expectForbidden() {
    return this.expect(403);
  }

  /**
   * Execute and expect 404 Not Found.
   *
   * @returns {Promise<Object>} Response
   */
  async expectNotFound() {
    return this.expect(404);
  }

  /**
   * Execute and expect 400 Bad Request.
   *
   * @returns {Promise<Object>} Response
   */
  async expectBadRequest() {
    return this.expect(400);
  }
}


// ============================================================================
// Convenience Factory Function
// ============================================================================

/**
 * Create a new TestContext (shorthand for TestContext.create).
 *
 * @param {Object} options - Configuration options
 * @returns {TestContext} New context instance
 *
 * @example
 * const ctx = createTestContext({ roles: ['admin', 'technician'] });
 */
function createTestContext(options = {}) {
  return TestContext.create(options);
}


// ============================================================================
// Exports
// ============================================================================

module.exports = {
  TestContext,
  TestRequest,
  createTestContext,
};
