/**
 * Test Core - Unified Test Infrastructure
 *
 * This is the SINGLE IMPORT for all test infrastructure.
 * All tests should import from this module exclusively.
 *
 * @example
 * const { createTestContext } = require('../core');
 *
 * describe('Feature', () => {
 *   const ctx = createTestContext({ roles: ['admin'] });
 *   beforeAll(() => ctx.setup());
 *   afterAll(() => ctx.teardown());
 *
 *   test('works', async () => {
 *     const res = await ctx.get('/api/feature').as('admin').execute();
 *     expect(res.status).toBe(200);
 *   });
 * });
 */

// Core classes
const { TestContext, TestRequest, createTestContext } = require('./test-context');

// Re-export helpers that may be needed for edge cases
// (Prefer TestContext methods over direct usage)
const {
  createTestUser,
  cleanupTestDatabase,
  getTestPool,
  setupTestDatabase,
  createCustomerProfile,
  createTechnicianProfile,
  createWorkOrder,
  linkUserToCustomerProfile,
  linkUserToTechnicianProfile,
} = require('../helpers/test-db');

const {
  getUnitTestToken,
  getExpiredToken,
  withAuth,
  bearerHeader,
  createTestAuthContext,
} = require('../helpers/test-auth');

// Test data fixtures
const { JWT_PAYLOADS, TEST_USERS } = require('../fixtures/test-data');

// Test constants
const {
  TEST_ROLES,
  TEST_JWT_SECRET,
  TEST_PAGINATION,
  TEST_PERFORMANCE,
} = require('../../config/test-constants');

// HTTP constants for assertions
const { HTTP_STATUS } = require('../../config/constants');

// ============================================================================
// Factory Shortcuts
// ============================================================================

/**
 * Create a unit test context (no database).
 *
 * @param {string[]} roles - Roles to create tokens for
 * @returns {TestContext}
 *
 * @example
 * const ctx = unitContext(['admin', 'technician']);
 */
function unitContext(roles = ['admin']) {
  return TestContext.unit({ roles });
}

/**
 * Create an integration test context with common roles.
 *
 * @param {Object} options - Additional options
 * @returns {TestContext}
 *
 * @example
 * const ctx = integrationContext(); // admin + technician
 */
function integrationContext(options = {}) {
  return TestContext.create({
    roles: ['admin', 'technician', 'customer'],
    ...options,
  });
}

/**
 * Create an admin-only test context.
 *
 * @returns {TestContext}
 */
function adminContext() {
  return TestContext.create({ roles: ['admin'] });
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Common response assertions.
 */
const assertions = {
  /**
   * Assert response is successful with data.
   *
   * @param {Object} res - Response object
   * @param {Object} [expectedShape] - Expected body.data shape
   */
  isSuccess(res, expectedShape) {
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    if (expectedShape) {
      expect(res.body.data).toMatchObject(expectedShape);
    }
  },

  /**
   * Assert response is created (201).
   *
   * @param {Object} res - Response object
   */
  isCreated(res) {
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  },

  /**
   * Assert response is unauthorized.
   *
   * @param {Object} res - Response object
   */
  isUnauthorized(res) {
    expect(res.status).toBe(401);
  },

  /**
   * Assert response is forbidden.
   *
   * @param {Object} res - Response object
   */
  isForbidden(res) {
    expect(res.status).toBe(403);
  },

  /**
   * Assert response is not found.
   *
   * @param {Object} res - Response object
   */
  isNotFound(res) {
    expect(res.status).toBe(404);
  },

  /**
   * Assert response is bad request.
   *
   * @param {Object} res - Response object
   */
  isBadRequest(res) {
    expect(res.status).toBe(400);
  },

  /**
   * Assert response has pagination.
   *
   * @param {Object} res - Response object
   */
  hasPagination(res) {
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('total');
  },

  /**
   * Assert response data is an array.
   *
   * @param {Object} res - Response object
   * @param {number} [minLength] - Minimum array length
   */
  isArray(res, minLength = 0) {
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(minLength);
  },
};

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Core classes
  TestContext,
  TestRequest,
  createTestContext,

  // Factory shortcuts
  unitContext,
  integrationContext,
  adminContext,

  // Assertion helpers
  assertions,

  // Constants
  HTTP_STATUS,
  TEST_ROLES,
  TEST_JWT_SECRET,
  TEST_PAGINATION,
  TEST_PERFORMANCE,

  // Legacy helpers (prefer TestContext methods)
  // Exposed for edge cases and gradual migration
  createTestUser,
  cleanupTestDatabase,
  getTestPool,
  setupTestDatabase,
  createCustomerProfile,
  createTechnicianProfile,
  createWorkOrder,
  linkUserToCustomerProfile,
  linkUserToTechnicianProfile,
  getUnitTestToken,
  getExpiredToken,
  withAuth,
  bearerHeader,
  createTestAuthContext,

  // Test data
  JWT_PAYLOADS,
  TEST_USERS,
};
