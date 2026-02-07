/**
 * Route Test Helper
 * Clean, unified test infrastructure for route CRUD tests
 *
 * PHILOSOPHY:
 * - Global setup handles module mocks (ONCE per file)
 * - beforeEach resets ALL mocks to fresh state
 * - Each test is pure: arrange, act, assert
 * - No shared state, no contamination
 *
 * NOTE: For generic entity routes (customers, users, roles, etc.),
 * see generic-entity-routes.test.js which tests the entities.js router factory.
 * This helper is used for specialized routes like auth.js.
 *
 * USAGE:
 * const { setupRouteTest } = require('../../helpers/route-test-helper');
 *
 * setupRouteTest({
 *   routerPath: '../../../routes/auth',
 *   routePath: '/api/auth',
 * });
 *
 * Then use global test helpers in your tests:
 * - testApp (fresh Express app)
 * - testMocks (all mocks)
 */

const express = require("express");
const request = require("supertest");

/**
 * Standard mock implementations for all routes
 * Ensures consistency across all test files
 */
const STANDARD_MOCKS = {
  // Auth middleware - always passes
  auth: {
    authenticateToken: jest.fn((req, res, next) => {
      req.dbUser = { id: 1, role: "dispatcher" };
      req.user = { userId: 1 };
      next();
    }),
    requirePermission: jest.fn(() => (req, res, next) => next()),
  },

  // RLS middleware - always passes with 'all_records' policy
  rls: {
    enforceRLS: jest.fn(() => (req, res, next) => {
      req.rlsPolicy = "all_records";
      req.rlsUserId = 1;
      next();
    }),
  },

  // Validators - all pass-through with validated structure
  validators: {
    validatePagination: jest.fn(() => (req, res, next) => {
      if (!req.validated) req.validated = {};
      req.validated.pagination = { page: 1, limit: 50, offset: 0 };
      next();
    }),
    validateQuery: jest.fn(() => (req, res, next) => {
      if (!req.validated) req.validated = {};
      if (!req.validated.query) req.validated.query = {};
      req.validated.query.search = req.query.search;
      req.validated.query.filters = req.query.filters || {};
      req.validated.query.sortBy = req.query.sortBy || "created_at";
      req.validated.query.sortOrder = req.query.sortOrder || "DESC";
      next();
    }),
    validateIdParam: jest.fn(() => (req, res, next) => {
      const id = parseInt(req.params.id);
      if (!req.validated) req.validated = {};
      req.validated.id = id;
      next();
    }),
  },

  // Request helpers
  requestHelpers: {
    getClientIp: jest.fn(() => "127.0.0.1"),
    getUserAgent: jest.fn(() => "Jest Test Agent"),
  },

  // Audit service
  auditService: {
    log: jest.fn().mockResolvedValue(true),
  },
};

/**
 * Create fresh Express app for testing
 * @param {string} routePath - API route path (e.g., '/api/customers')
 * @param {Object} router - Express router to mount
 * @returns {Express.Application}
 */
function createTestApp(routePath, router) {
  const app = express();
  app.use(express.json());
  app.use(routePath, router);
  return app;
}

/**
 * Reset all standard mocks to fresh state
 * Call in beforeEach()
 */
function resetAllMocks() {
  jest.clearAllMocks();

  // Reset auth mocks
  STANDARD_MOCKS.auth.authenticateToken.mockImplementation((req, res, next) => {
    req.dbUser = { id: 1, role: "dispatcher" };
    req.user = { userId: 1 };
    next();
  });
  STANDARD_MOCKS.auth.requirePermission.mockImplementation(
    () => (req, res, next) => next(),
  );

  // Reset RLS mocks
  STANDARD_MOCKS.rls.enforceRLS.mockImplementation(() => (req, res, next) => {
    req.rlsPolicy = "all_records";
    req.rlsUserId = 1;
    next();
  });

  // Reset validator mocks
  STANDARD_MOCKS.validators.validatePagination.mockImplementation(
    () => (req, res, next) => {
      if (!req.validated) req.validated = {};
      req.validated.pagination = { page: 1, limit: 50, offset: 0 };
      next();
    },
  );

  STANDARD_MOCKS.validators.validateQuery.mockImplementation(
    () => (req, res, next) => {
      if (!req.validated) req.validated = {};
      if (!req.validated.query) req.validated.query = {};
      req.validated.query.search = req.query.search;
      req.validated.query.filters = req.query.filters || {};
      req.validated.query.sortBy = req.query.sortBy || "created_at";
      req.validated.query.sortOrder = req.query.sortOrder || "DESC";
      next();
    },
  );

  STANDARD_MOCKS.validators.validateIdParam.mockImplementation(
    () => (req, res, next) => {
      const id = parseInt(req.params.id);
      if (!req.validated) req.validated = {};
      req.validated.id = id;
      next();
    },
  );

  // Reset request helpers
  STANDARD_MOCKS.requestHelpers.getClientIp.mockReturnValue("127.0.0.1");
  STANDARD_MOCKS.requestHelpers.getUserAgent.mockReturnValue("Jest Test Agent");

  // Reset audit service
  STANDARD_MOCKS.auditService.log.mockResolvedValue(true);
}

/**
 * Get standard beforeEach hook
 * @returns {Function} beforeEach hook that resets all mocks
 */
function getStandardBeforeEach() {
  return () => {
    resetAllMocks();
  };
}

module.exports = {
  STANDARD_MOCKS,
  createTestApp,
  resetAllMocks,
  getStandardBeforeEach,
};
