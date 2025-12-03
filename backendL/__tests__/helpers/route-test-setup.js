/**
 * Centralized Route Test Setup
 *
 * Provides shared mock configuration and setup/teardown for route testing.
 * Follows DRY principle and Single Responsibility - tests should only test.
 */

const express = require("express");

/**
 * Create a configured Express test app with a router
 * @param {Router} router - Express router to mount
 * @param {string} path - Path to mount router at (default: '/api/users')
 * @returns {Express} Configured test app
 */
function createRouteTestApp(router, path = "/api/users") {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

/**
 * Setup standard mock implementations for route tests
 * Call this in beforeEach() blocks
 *
 * @param {Object} mocks - Mock objects to configure
 * @param {Object} mocks.getClientIp - request-helpers getClientIp mock
 * @param {Object} mocks.getUserAgent - request-helpers getUserAgent mock
 * @param {Object} mocks.authenticateToken - auth middleware mock
 * @param {Object} mocks.requirePermission - auth middleware factory mock
 * @param {Object} mocks.requireMinimumRole - auth middleware factory mock
 * @param {Object} mocks.validateIdParam - validation middleware mock
 * @param {Object} mocks.validateUserCreate - validation middleware mock (users)
 * @param {Object} mocks.validateProfileUpdate - validation middleware mock (users)
 * @param {Object} mocks.validateRoleAssignment - validation middleware mock (users)
 * @param {Object} mocks.validateRoleCreate - validation middleware mock (roles)
 * @param {Object} mocks.validateRoleUpdate - validation middleware mock (roles)
 * @param {Object} mocks.validatePagination - query validation middleware mock
 * @param {Object} options - Configuration options
 * @param {Object} options.dbUser - User object to inject into req.dbUser
 */
function setupRouteMocks(mocks, options = {}) {
  const {
    getClientIp,
    getUserAgent,
    authenticateToken,
    requirePermission,
    requireMinimumRole,
    validateIdParam,
    validateUserCreate,
    validateProfileUpdate,
    validateRoleAssignment,
    validateRoleCreate,
    validateRoleUpdate,
    validatePagination,
  } = mocks;

  const dbUser = options.dbUser || {
    id: 1,
    email: "admin@example.com",
    role: "admin",
  };

  // Clear all mocks first
  jest.clearAllMocks();

  // Setup request helper mocks
  if (getClientIp) {
    getClientIp.mockReturnValue("192.168.1.1");
  }

  if (getUserAgent) {
    getUserAgent.mockReturnValue("jest-test-agent");
  }

  // Setup auth middleware mocks
  if (authenticateToken) {
    authenticateToken.mockImplementation((req, res, next) => {
      req.dbUser = dbUser;
      next();
    });
  }

  // New permission-based middleware (factory functions)
  if (requirePermission) {
    requirePermission.mockImplementation(() => (req, res, next) => {
      next();
    });
  }

  if (requireMinimumRole) {
    requireMinimumRole.mockImplementation(() => (req, res, next) => {
      next();
    });
  }

  // Setup validation middleware mocks
  if (validateIdParam) {
    // validateIdParam() is now a factory function that returns middleware
    validateIdParam.mockImplementation(() => (req, res, next) => {
      const id = parseInt(req.params.id);
      // Set both for backward compatibility
      req.validatedId = id;
      if (!req.validated) req.validated = {};
      req.validated.id = id;
      next();
    });
  }

  // User validation mocks
  if (validateUserCreate) {
    validateUserCreate.mockImplementation((req, res, next) => {
      next();
    });
  }

  if (validateProfileUpdate) {
    validateProfileUpdate.mockImplementation((req, res, next) => {
      next();
    });
  }

  if (validateRoleAssignment) {
    validateRoleAssignment.mockImplementation((req, res, next) => {
      next();
    });
  }

  // Role validation mocks
  if (validateRoleCreate) {
    validateRoleCreate.mockImplementation((req, res, next) => {
      next();
    });
  }

  if (validateRoleUpdate) {
    validateRoleUpdate.mockImplementation((req, res, next) => {
      next();
    });
  }

  // Query validation mocks
  if (validatePagination) {
    validatePagination.mockImplementation(() => (req, res, next) => {
      if (!req.validated) req.validated = {};
      req.validated.pagination = { page: 1, limit: 50, offset: 0 };
      next();
    });
  }
}

/**
 * Teardown mocks after each test
 * Call this in afterEach() blocks
 */
function teardownRouteMocks() {
  jest.resetAllMocks();
}

module.exports = {
  createRouteTestApp,
  setupRouteMocks,
  teardownRouteMocks,
};
