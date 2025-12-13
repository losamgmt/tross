/**
 * Jest Setup File - Integration Tests
 * Global configuration for integration tests with real test database
 */

const { setTestEnv, cleanupTestEnv } = require("../helpers/test-helpers");
const {
  setupTestDatabase,
  teardownTestDatabase,
} = require("../helpers/test-db");
const { DATABASE } = require("../../config/constants");
const testLogger = require("../../config/test-logger");

// Set up test environment variables
// Uses constants.js for single source of truth
setTestEnv({
  NODE_ENV: "test",
  JWT_SECRET: "test-secret-key-for-jest-integration",
  AUTH_MODE: "development",
  USE_TEST_AUTH: "true",
  // Test database configuration from constants
  TEST_DB_HOST: DATABASE.TEST.HOST,
  TEST_DB_PORT: DATABASE.TEST.PORT.toString(),
  TEST_DB_NAME: DATABASE.TEST.NAME,
  TEST_DB_USER: DATABASE.TEST.USER,
  TEST_DB_PASSWORD: DATABASE.TEST.PASSWORD,
});

// Global test timeout (integration tests need more time)
jest.setTimeout(30000);

// Note: Database setup is now handled by globalSetup (jest.global.setup.js)
// This runs ONCE before all test files, preventing race conditions

// Global setup before each test FILE (not each test)
beforeAll(async () => {
  testLogger.log("🧪 Integration test file starting...");
});

// Global cleanup after each test FILE
afterAll(async () => {
  testLogger.log("✅ Integration test file completed");
  cleanupTestEnv();
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global test utilities for integration tests
// These extend the base utilities from jest.setup.js
global.testUtils = {
  // Common matchers from base setup
  expectValidTimestamp: (timestamp) => {
    expect(timestamp).toBeDefined();
    expect(new Date(timestamp)).toBeInstanceOf(Date);
    expect(Date.now() - new Date(timestamp).getTime()).toBeLessThan(5000);
  },

  expectValidJWT: (token) => {
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  },

  expectErrorResponse: (response, expectedStatus, expectedMessage) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty("error");
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("timestamp");
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
    expect(response.body.timestamp).toBeDefined();
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  },

  // Database-specific matchers for integration tests
  expectQueryResult: (result, expectedRowCount = null) => {
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("rowCount");
    expect(Array.isArray(result.rows)).toBe(true);

    if (expectedRowCount !== null) {
      expect(result.rowCount).toBe(expectedRowCount);
      expect(result.rows).toHaveLength(expectedRowCount);
    }
  },

  // Expect PostgreSQL timestamp format
  expectPostgresTimestamp: (timestamp) => {
    expect(timestamp).toBeDefined();
    expect(new Date(timestamp)).toBeInstanceOf(Date);
    expect(Date.now() - new Date(timestamp).getTime()).toBeLessThan(10000); // Within 10 seconds
  },

  // Expect valid UUID v4
  expectUUIDv4: (uuid) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  },
};
