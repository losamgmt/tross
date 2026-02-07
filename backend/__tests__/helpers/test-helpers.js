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

// ============================================================================
// UNIVERSAL UNIQUE VALUE GENERATOR
// ============================================================================
// Use this for ALL test data that requires unique values.
// Centralized to prevent cross-test conflicts with unique constraints.

let _uniqueCounter = 0;
const _runId = Date.now();

/**
 * Get the next unique counter value and formatted variants
 * SINGLE SOURCE OF TRUTH for unique test values.
 *
 * All generated values comply with validation-rules.json patterns.
 *
 * @returns {Object} { num, id, suffix, email, priority, phone, firstName, lastName, ... }
 */
function getUniqueValues() {
  const num = ++_uniqueCounter;
  const id = `${_runId}_${num}`;

  // Convert number to letters for human-readable suffixes (1->A, 27->AA)
  // This is VALIDATION-SAFE for human names (letters only)
  let n = num;
  let suffix = "";
  while (n > 0) {
    n--;
    suffix = String.fromCharCode(65 + (n % 26)) + suffix;
    n = Math.floor(n / 26);
  }
  suffix = suffix || "A";

  // Priority: validation rules allow 1-100, seed data uses 1-5
  // Map num to range 10-99 using modulo, wrapping if needed
  const priority = 10 + ((num - 1) % 90);

  return {
    num, // Raw counter: 1, 2, 3...
    id, // Full unique ID: "1734567890123_1"
    suffix, // Letter suffix: "A", "B", "AA" (validation-safe)
    email: `test_${id}@example.com`, // Unique email
    priority, // Unique priority (10-99, avoids seed data 1-5)
    phone: `+1555${String(num).padStart(7, "0")}`, // Unique phone E.164 format

    // Human names - LETTERS ONLY per validation pattern ^[a-zA-Z\s'-]+$
    firstName: `Test${suffix}`, // e.g., "TestA", "TestAB"
    lastName: `User${suffix}`, // e.g., "UserA", "UserAB"
    name: `Test${suffix}`, // Generic name (letters only)

    // Role/entity names - allow alphanumeric per pattern ^[a-zA-Z0-9\s_-]+$
    roleName: `TestRole${suffix}`, // e.g., "TestRoleA" (no underscores for safety)
    companyName: `Company ${suffix}`, // e.g., "Company A"
  };
}

/**
 * Generate a unique value for a specific field type
 * @param {string} fieldType - Type of field (email, priority, phone, name, etc.)
 * @returns {*} Unique value appropriate for that field type
 */
function uniqueValue(fieldType) {
  const vals = getUniqueValues();

  const typeMap = {
    email: vals.email,
    priority: vals.priority,
    phone: vals.phone,
    name: vals.name,
    firstName: vals.name,
    first_name: vals.name,
    lastName: `Last${vals.suffix}`,
    last_name: `Last${vals.suffix}`,
    roleName: vals.roleName,
    role_name: vals.roleName,
    id: vals.id,
    suffix: vals.suffix,
    num: vals.num,
  };

  return typeMap[fieldType] ?? vals.id;
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
  // Universal unique value generators
  getUniqueValues,
  uniqueValue,
};
