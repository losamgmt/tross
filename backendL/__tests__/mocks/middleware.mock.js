/**
 * Middleware Mock Factory
 * 
 * SRP: ONLY mocks middleware behavior (auth, permissions, etc.)
 * Use: Import and apply in test files
 */

const { MOCK_USERS } = require("../fixtures/users");

/**
 * Create a mock Express request object
 * 
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mocked request object
 */
function createMockRequest(overrides = {}) {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    user: null,
    method: "GET",
    path: "/",
    ...overrides,
  };
}

/**
 * Create a mock Express response object
 * 
 * @returns {Object} Mocked response object with chainable methods
 */
function createMockResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    end: jest.fn(),
    locals: {},
  };
  
  // Make chainable
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
  
  return res;
}

/**
 * Create a mock Express next function
 * 
 * @returns {jest.Mock} Mocked next function
 */
function createMockNext() {
  return jest.fn();
}

/**
 * Create a complete set of Express middleware mocks
 * 
 * @param {Object} requestOverrides - Properties to override in request
 * @returns {Object} { req, res, next }
 */
function createMiddlewareMocks(requestOverrides = {}) {
  return {
    req: createMockRequest(requestOverrides),
    res: createMockResponse(),
    next: createMockNext(),
  };
}

/**
 * Create a mock authenticated request (with user)
 * 
 * @param {Object} user - User fixture to attach (default: MOCK_USERS.admin)
 * @param {Object} overrides - Additional request properties
 * @returns {Object} Mocked authenticated request
 */
function createAuthenticatedRequest(user = MOCK_USERS.admin, overrides = {}) {
  return createMockRequest({
    user,
    headers: {
      authorization: `Bearer mock-token-${user.id}`,
    },
    ...overrides,
  });
}

/**
 * Create a mock unauthenticated request (no user)
 * 
 * @param {Object} overrides - Additional request properties
 * @returns {Object} Mocked unauthenticated request
 */
function createUnauthenticatedRequest(overrides = {}) {
  return createMockRequest({
    user: null,
    headers: {},
    ...overrides,
  });
}

/**
 * Create a mock auth middleware
 * 
 * @returns {Object} Mocked auth middleware functions
 */
function createMockAuth() {
  return {
    requireAuth: jest.fn((req, res, next) => next()),
    requireRole: jest.fn(() => (req, res, next) => next()),
    requirePermission: jest.fn(() => (req, res, next) => next()),
    optionalAuth: jest.fn((req, res, next) => next()),
  };
}

/**
 * Standard jest.mock() configuration for auth middleware
 */
const AUTH_MOCK_CONFIG = () => ({
  requireAuth: jest.fn((req, res, next) => next()),
  requireRole: jest.fn(() => (req, res, next) => next()),
  requirePermission: jest.fn(() => (req, res, next) => next()),
  optionalAuth: jest.fn((req, res, next) => next()),
});

/**
 * Reset all auth middleware mocks
 * 
 * @param {Object} auth - Auth middleware mock instance
 */
function resetAuthMocks(auth) {
  auth.requireAuth.mockReset();
  auth.requireRole.mockReset();
  auth.requirePermission.mockReset();
  auth.optionalAuth.mockReset();
}

/**
 * Mock auth.requireAuth to attach user to request
 * 
 * @param {Object} auth - Auth middleware mock
 * @param {Object} user - User fixture to attach (default: MOCK_USERS.admin)
 */
function mockRequireAuth(auth, user = MOCK_USERS.admin) {
  auth.requireAuth.mockImplementation((req, res, next) => {
    req.user = user;
    next();
  });
}

/**
 * Mock auth.requireAuth to reject with 401
 * 
 * @param {Object} auth - Auth middleware mock
 */
function mockRequireAuthUnauthorized(auth) {
  auth.requireAuth.mockImplementation((req, res, next) => {
    res.status(401).json({ error: "Unauthorized" });
  });
}

/**
 * Mock auth.requireRole to pass authorization
 * 
 * @param {Object} auth - Auth middleware mock
 * @param {string|Array<string>} roles - Role(s) to authorize
 */
function mockRequireRole(auth, roles) {
  auth.requireRole.mockImplementation((requiredRoles) => {
    return (req, res, next) => next();
  });
}

/**
 * Mock auth.requireRole to reject with 403
 * 
 * @param {Object} auth - Auth middleware mock
 */
function mockRequireRoleForbidden(auth) {
  auth.requireRole.mockImplementation((requiredRoles) => {
    return (req, res, next) => {
      res.status(403).json({ error: "Forbidden" });
    };
  });
}

/**
 * Mock auth.requirePermission to pass authorization
 * 
 * @param {Object} auth - Auth middleware mock
 * @param {string} permission - Permission to authorize
 */
function mockRequirePermission(auth, permission) {
  auth.requirePermission.mockImplementation((requiredPermission) => {
    return (req, res, next) => next();
  });
}

/**
 * Mock auth.requirePermission to reject with 403
 * 
 * @param {Object} auth - Auth middleware mock
 */
function mockRequirePermissionForbidden(auth) {
  auth.requirePermission.mockImplementation((requiredPermission) => {
    return (req, res, next) => {
      res.status(403).json({ error: "Forbidden" });
    };
  });
}

/**
 * Assert that response was called with specific status and body
 * 
 * @param {Object} res - Response mock
 * @param {number} status - Expected status code
 * @param {Object} body - Expected response body
 */
function assertResponse(res, status, body) {
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledWith(body);
}

/**
 * Assert that next was called (middleware passed)
 * 
 * @param {jest.Mock} next - Next function mock
 */
function assertNextCalled(next) {
  expect(next).toHaveBeenCalled();
}

/**
 * Assert that next was not called (middleware blocked)
 * 
 * @param {jest.Mock} next - Next function mock
 */
function assertNextNotCalled(next) {
  expect(next).not.toHaveBeenCalled();
}

module.exports = {
  // Factory functions
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMiddlewareMocks,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createMockAuth,
  
  // jest.mock() configs
  AUTH_MOCK_CONFIG,
  
  // Reset helpers
  resetAuthMocks,
  
  // Auth mock helpers
  mockRequireAuth,
  mockRequireAuthUnauthorized,
  mockRequireRole,
  mockRequireRoleForbidden,
  mockRequirePermission,
  mockRequirePermissionForbidden,
  
  // Assertion helpers
  assertResponse,
  assertNextCalled,
  assertNextNotCalled,
};
