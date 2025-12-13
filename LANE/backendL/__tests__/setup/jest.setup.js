/**
 * Jest Setup File
 * Global configuration and setup for all tests
 */

// Mock logger GLOBALLY (before any other imports that use logger)
// Must match the actual export structure from config/logger.js
jest.mock("../../config/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
  requestLogger: jest.fn((req, res, next) => next()),
  logSecurityEvent: jest.fn(),
}));

const { setTestEnv, cleanupTestEnv } = require("../helpers/test-helpers");
const { DATABASE } = require("../../config/constants");
const testLogger = require("../../config/test-logger");

// Set up test environment variables
// Uses constants.js for single source of truth
setTestEnv({
  NODE_ENV: "test",
  JWT_SECRET: "test-secret-key-for-jest",
  AUTH_MODE: "development",
  USE_TEST_AUTH: "true",
  // Disable database connections in tests
  DATABASE_URL: "mock://localhost",
  POSTGRES_HOST: DATABASE.TEST.HOST,
  POSTGRES_PORT: DATABASE.TEST.PORT.toString(),
  POSTGRES_DB: DATABASE.TEST.NAME,
  POSTGRES_USER: DATABASE.TEST.USER,
  POSTGRES_PASSWORD: DATABASE.TEST.PASSWORD,
});

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce test noise
global.console = {
  ...console,
  // Uncomment to silence logs in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
  // info: jest.fn()
};

// Global setup before all tests
beforeAll(async () => {
  testLogger.log("🧪 Starting TrossApp test suite...");
});

// Global cleanup after all tests
afterAll(async () => {
  testLogger.log("✅ TrossApp test suite completed");
  cleanupTestEnv();

  // Close database connection pool to prevent hanging
  try {
    const { pool } = require("../../db/connection");
    await pool.end();
    testLogger.log("🔌 Database pool closed");
  } catch (error) {
    // Pool might already be closed, ignore
  }
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  // Additional cleanup if needed
});

// Global test utilities
global.testUtils = {
  // Common matchers
  expectValidTimestamp: (timestamp) => {
    expect(timestamp).toBeDefined();
    expect(new Date(timestamp)).toBeInstanceOf(Date);
    expect(Date.now() - new Date(timestamp).getTime()).toBeLessThan(5000); // Within 5 seconds
  },

  expectValidJWT: (token) => {
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // JWT has 3 parts
  },

  expectErrorResponse: (response, expectedStatus, expectedMessage) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty("error");
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("timestamp");
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
    global.testUtils.expectValidTimestamp(response.body.timestamp);
  },
};
