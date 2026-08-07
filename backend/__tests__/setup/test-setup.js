/**
 * Centralized Test Setup
 *
 * SRP: ONLY provides pre-configured jest.mock() setup + fixtures for tests
 *
 * Usage in test files:
 * const { setupModuleMocks, MOCK_USERS } = require('../../setup/test-setup');
 * setupModuleMocks(); // at the TOP, before importing the module under test
 *
 * For DB/logger mocking in new tests, prefer the smart-mock factories documented
 * in docs/reference/TESTING.md (require('../mocks').createDBMock(), etc.).
 */

const {
  createMockRequest,
  createMockResponse,
  createMockNext,
  transactionMatchers,
} = require("../mocks");

// Re-export all fixtures for convenience
const fixtures = require("../fixtures");

// Register custom Jest matchers globally
if (transactionMatchers) {
  expect.extend(transactionMatchers);
}

/**
 * Setup module mocks using jest.mock()
 * Call at TOP of test file (before any imports)
 *
 * Example:
 * setupModuleMocks();
 * const User = require('../../db/models/User');
 */
function setupModuleMocks() {
  // Database connection
  jest.mock("../../db/connection", () => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  }));

  // Logger (always mock to prevent console spam)
  jest.mock("../../config/logger", () => ({
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    requestLogger: jest.fn((req, res, next) => next()),
    logSecurityEvent: jest.fn(),
  }));

  // Audit service
  jest.mock("../../services/audit/audit-service", () => ({
    log: jest.fn(),
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
    logAuth: jest.fn(),
    logError: jest.fn(),
    getCreator: jest.fn(),
    getLastEditor: jest.fn(),
    getDeactivator: jest.fn(),
    getHistory: jest.fn(),
  }));
}

/**
 * Setup auth middleware mocks
 * Call at TOP of test file for route tests
 */
function setupAuthMocks() {
  jest.mock("../../middleware/auth", () => ({
    requireAuth: jest.fn((req, res, next) => next()),
    requireRole: jest.fn(() => (req, res, next) => next()),
    requirePermission: jest.fn(() => (req, res, next) => next()),
    optionalAuth: jest.fn((req, res, next) => next()),
  }));
}

module.exports = {
  // Main setup function
  setupModuleMocks,
  setupAuthMocks,

  // Re-export all fixtures
  ...fixtures,

  // Re-export mock helpers for advanced usage
  createMockRequest,
  createMockResponse,
  createMockNext,
};
