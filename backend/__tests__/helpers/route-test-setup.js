/**
 * Centralized Route Test Setup
 *
 * Provides shared mock configuration and setup/teardown for route testing.
 * Follows DRY principle and Single Responsibility - tests should only test.
 * 
 * ARCHITECTURE:
 * - Data-driven validator mocking (no hardcoded validator names)
 * - Generic middleware patterns (auth, permissions, validation)
 * - SRP: One function per responsibility
 * - DRY: Zero duplication across route tests
 */

const express = require("express");

/**
 * Generic validator mock factory
 * Creates middleware that attaches validated data to req.validated
 * 
 * @param {string} validatorName - Name of the validator (for debugging)
 * @param {Function} [customLogic] - Optional custom validation logic
 * @returns {Function} Mock middleware function
 */
function createValidatorMock(validatorName, customLogic = null) {
  return jest.fn((req, res, next) => {
    if (!req.validated) req.validated = {};
    
    // If custom logic provided, execute it
    if (customLogic) {
      customLogic(req, res, next);
    } else {
      // Default: pass through (validation succeeds)
      next();
    }
  });
}

/**
 * Generic factory validator mock (returns middleware)
 * For validators like validatePagination({ maxLimit: 200 })
 * 
 * @param {string} validatorName - Name of the validator
 * @param {Function} [customLogic] - Optional custom logic for the returned middleware
 * @returns {Function} Mock factory that returns middleware
 */
function createFactoryValidatorMock(validatorName, customLogic = null) {
  return jest.fn((options) => (req, res, next) => {
    if (!req.validated) req.validated = {};
    
    if (customLogic) {
      customLogic(req, res, next, options);
    } else {
      next();
    }
  });
}

/**
 * Create complete validator mock configuration for jest.mock()
 * Data-driven: Generates ALL validator mocks from a list
 * 
 * CRITICAL: Direct middleware validators CANNOT be wrapped in jest.fn()
 * Express middleware chain breaks when jest.fn() wraps a middleware function.
 * Only factory validators (that return middleware) can use jest.fn().
 * 
 * @returns {Object} Complete validator module mock
 */
function createValidatorMockConfig() {
  // Direct middleware validators (called as middleware directly)
  // MUST be plain functions - jest.fn() breaks Express middleware chain!
  const directValidators = [
    'validateUserCreate',
    'validateProfileUpdate',
    'validateRoleAssignment',
    'validateRoleCreate',
    'validateRoleUpdate',
    'validateCustomerCreate',
    'validateCustomerUpdate',
    'validateTechnicianCreate',
    'validateTechnicianUpdate',
    'validateWorkOrderCreate',
    'validateWorkOrderUpdate',
    'validateInvoiceCreate',
    'validateInvoiceUpdate',
    'validateContractCreate',
    'validateContractUpdate',
    'validateInventoryCreate',
    'validateInventoryUpdate',
    'validateAuthCallback',
    'validateAuth0Token',
    'validateAuth0Refresh',
    'validateRefreshToken',
  ];
  
  // Factory validators (called with options, return middleware)
  // CAN use jest.fn() since they're not directly used as middleware
  const factoryValidators = {
    validatePagination: (options) => (req, res, next) => {
      if (!req.validated) req.validated = {};
      req.validated.pagination = { 
        page: 1, 
        limit: options?.maxLimit || 50, 
        offset: 0 
      };
      next();
    },
    
    validateQuery: (metadata) => (req, res, next) => {
      if (!req.validated) req.validated = {};
      if (!req.validated.query) req.validated.query = {};
      req.validated.query.search = req.query.search;
      req.validated.query.filters = req.query.filters || {};
      req.validated.query.sortBy = req.query.sortBy || 'created_at';
      req.validated.query.sortOrder = req.query.sortOrder || 'DESC';
      next();
    },
    
    validateIdParam: (options) => (req, res, next) => {
      const id = parseInt(req.params.id);
      if (!req.validated) req.validated = {};
      req.validated.id = id;
      req.validatedId = id; // Legacy support
      next();
    },
    
    validateSearch: (options) => (req, res, next) => {
      if (!req.validated) req.validated = {};
      req.validated.search = req.query.search || '';
      next();
    },
    
    validateSort: (options) => (req, res, next) => {
      if (!req.validated) req.validated = {};
      req.validated.sortBy = req.query.sortBy || 'created_at';
      req.validated.sortOrder = req.query.sortOrder || 'DESC';
      next();
    },
    
    validateFilters: (options) => (req, res, next) => {
      if (!req.validated) req.validated = {};
      req.validated.filters = req.query.filters || {};
      next();
    },
  };
  
  // Build mock config
  const mockConfig = {};
  
  // Add direct validators as PLAIN functions (not jest.fn wrapped)
  // This is critical - jest.fn() breaks Express middleware chain
  directValidators.forEach(name => {
    mockConfig[name] = (req, res, next) => next();
  });
  
  // Add factory validators
  Object.keys(factoryValidators).forEach(name => {
    mockConfig[name] = jest.fn(factoryValidators[name]);
  });
  
  return mockConfig;
}

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
 * GENERIC & DATA-DRIVEN: Works for ALL routes without modification
 *
 * @param {Object} mocks - Mock objects to configure
 * @param {Object} options - Configuration options
 * @param {Object} options.dbUser - User object to inject into req.dbUser
 * @param {Object} options.user - User object to inject into req.user (for audit logging)
 */
function setupRouteMocks(mocks, options = {}) {
  const {
    getClientIp,
    getUserAgent,
    authenticateToken,
    requirePermission,
    requireMinimumRole,
    enforceRLS,
  } = mocks;

  const dbUser = options.dbUser || {
    id: 1,
    email: "admin@example.com",
    role: "admin",
  };
  
  const user = options.user || {
    userId: 1,
  };

  // Clear all mocks first
  jest.clearAllMocks();

  // Setup request helper mocks
  if (getClientIp) {
    getClientIp.mockReturnValue("127.0.0.1");
  }

  if (getUserAgent) {
    getUserAgent.mockReturnValue("Jest Test Agent");
  }

  // Setup auth middleware mocks
  if (authenticateToken) {
    authenticateToken.mockImplementation((req, res, next) => {
      req.dbUser = dbUser;
      req.user = user;
      next();
    });
  }

  // Permission-based middleware (factory functions)
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
  
  // RLS middleware (factory function)
  if (enforceRLS) {
    enforceRLS.mockImplementation(() => (req, res, next) => {
      req.rlsPolicy = 'all_records';
      req.rlsUserId = dbUser.id;
      next();
    });
  }

  // All validators are already mocked via createValidatorMockConfig()
  // No per-validator setup needed - that's the whole point!
}

/**
 * Teardown mocks after each test
 * Call this in afterEach() blocks
 * 
 * CRITICAL: Use clearAllMocks NOT resetAllMocks
 * - clearAllMocks() clears call history, keeps implementations ✅
 * - resetAllMocks() removes implementations, breaks next test file ❌
 */
function teardownRouteMocks() {
  jest.clearAllMocks();
}

module.exports = {
  // App setup
  createRouteTestApp,
  
  // Mock configuration (use in jest.mock() calls)
  createValidatorMockConfig,
  createValidatorMock,
  createFactoryValidatorMock,
  
  // Setup/teardown (use in beforeEach/afterEach)
  setupRouteMocks,
  teardownRouteMocks,
};
