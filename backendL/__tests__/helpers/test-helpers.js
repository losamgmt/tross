/**
 * Test Helpers
 * Utilities for creating test applications and mocking dependencies
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const { AUTH } = require("../../config/constants");
const { TEST_USERS, JWT_PAYLOADS } = require("../fixtures/test-data");

/**
 * Create test application with minimal setup
 * @param {Object} options - Configuration options
 * @returns {Express} Express application for testing
 */
function createTestApp(options = {}) {
  const app = express();

  // Basic middleware
  app.use(express.json());

  // Add test routes if specified
  if (options.routes) {
    options.routes.forEach((route) => {
      app.use(route.path, route.handler);
    });
  }

  return app;
}

/**
 * Generate valid JWT token for testing
 * @param {string} userType - Type of user (admin, technician, etc.)
 * @param {Object} overrides - Payload overrides
 * @returns {string} JWT token
 */
function generateTestToken(userType = "technician", overrides = {}) {
  const payload = {
    ...JWT_PAYLOADS[userType],
    ...overrides,
  };

  const secret = process.env.JWT_SECRET || "test-secret-key";
  return jwt.sign(payload, secret);
}

/**
 * Generate expired JWT token for testing
 * @param {string} userType - Type of user
 * @returns {string} Expired JWT token
 */
function generateExpiredToken(userType = "technician") {
  return generateTestToken(userType, {
    iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
  });
}

/**
 * Create authorization header for testing
 * @param {string} token - JWT token
 * @returns {Object} Authorization header object
 */
function createAuthHeader(token) {
  return {
    authorization: `Bearer ${token}`,
  };
}

/**
 * Mock database query responses
 * @param {Object} mockDb - Database mock object
 * @param {string} method - Method to mock (query, etc.)
 * @param {*} returnValue - Value to return
 */
function mockDbResponse(mockDb, method, returnValue) {
  mockDb[method] = jest.fn().mockResolvedValue(returnValue);
}

/**
 * Mock user data service
 * @param {Object} user - User data to return
 * @returns {Object} Mocked service
 */
function mockUserDataService(user = TEST_USERS.technician) {
  return {
    findOrCreateUser: jest.fn().mockResolvedValue({
      id: 1,
      ...user,
      created_at: new Date(),
      updated_at: new Date(),
    }),
    findByAuth0Id: jest.fn().mockResolvedValue(user),
    updateProfile: jest
      .fn()
      .mockResolvedValue({ ...user, updated_at: new Date() }),
  };
}

/**
 * Mock JWT verification
 * @param {Object} payload - Payload to return when verifying
 */
function mockJwtVerify(payload = JWT_PAYLOADS.technician) {
  const jwt = require("jsonwebtoken");
  jwt.verify = jest.fn().mockReturnValue(payload);
  return jwt;
}

/**
 * Mock Auth0 authentication service
 * @param {Object} options - Mock configuration
 * @returns {Object} Mocked Auth0 service
 */
function mockAuth0Service(options = {}) {
  return {
    authenticate: jest.fn().mockResolvedValue({
      token: "mock-jwt-token",
      user: options.user || TEST_USERS.technician,
      refresh_token: "mock-refresh-token",
      expires_in: 3600,
    }),
    verifyToken: jest
      .fn()
      .mockResolvedValue(options.payload || JWT_PAYLOADS.technician),
    getUserProfile: jest
      .fn()
      .mockResolvedValue(options.user || TEST_USERS.technician),
    refreshToken: jest.fn().mockResolvedValue({ token: "new-mock-token" }),
    logout: jest.fn().mockResolvedValue(true),
    getProviderName: jest.fn().mockReturnValue(AUTH.PROVIDERS.AUTH0),
    isConfigured: options.isConfigured !== false,
  };
}

/**
 * Mock development authentication service
 * @param {Object} options - Mock configuration
 * @returns {Object} Mocked DevAuth service
 */
function mockDevAuthService(options = {}) {
  return {
    authenticate: jest.fn().mockResolvedValue({
      token: generateTestToken(),
      user: options.user || TEST_USERS.technician,
    }),
    verifyToken: jest
      .fn()
      .mockResolvedValue(options.payload || JWT_PAYLOADS.technician),
    getUserProfile: jest
      .fn()
      .mockResolvedValue(options.user || TEST_USERS.technician),
    getProviderName: jest.fn().mockReturnValue(AUTH.PROVIDERS.DEVELOPMENT_JWT),
  };
}

/**
 * Set test environment variables
 * @param {Object} envVars - Environment variables to set
 */
function setTestEnv(envVars = {}) {
  const defaultEnv = {
    NODE_ENV: "test",
    JWT_SECRET: "test-secret-key",
    AUTH_MODE: "development",
    USE_TEST_AUTH: "true",
  };

  Object.assign(process.env, defaultEnv, envVars);
}

/**
 * Clean up test environment
 */
function cleanupTestEnv() {
  // Reset mocks
  jest.clearAllMocks();
  jest.resetModules();

  // Clean up environment variables if needed
  delete process.env.TEST_JWT_SECRET;
}

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after specified time
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert response structure
 * @param {Object} response - Response object to test
 * @param {Object} expected - Expected response structure
 */
function assertResponseStructure(response, expected) {
  expect(response.body).toMatchObject(expected);
  expect(response.body.timestamp).toBeDefined();
  expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
}

module.exports = {
  createTestApp,
  generateTestToken,
  generateExpiredToken,
  createAuthHeader,
  mockDbResponse,
  mockUserDataService,
  mockJwtVerify,
  mockAuth0Service,
  mockDevAuthService,
  setTestEnv,
  cleanupTestEnv,
  sleep,
  assertResponseStructure,
};
