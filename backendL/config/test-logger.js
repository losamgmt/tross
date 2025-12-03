/**
 * Test Logger - Silent during test execution
 *
 * Provides same interface as console.log/error but:
 * - Silent during test execution (NODE_ENV=test)
 * - Captures logs for test assertions if needed
 * - Falls back to console in non-test environments
 *
 * Usage:
 *   const testLogger = require('../config/test-logger');
 *   testLogger.log('Test setup complete');
 *   testLogger.error('Test failed:', error);
 */

const isTest = process.env.NODE_ENV === 'test';

// Captured logs for test assertions
const logs = [];
const errors = [];

const testLogger = {
  /**
   * Log info message
   * Silent during tests, otherwise uses console.log
   */
  log: (...args) => {
    if (isTest) {
      logs.push(args.join(' '));
    } else {
      console.log(...args);
    }
  },

  /**
   * Log error message
   * Silent during tests, otherwise uses console.error
   */
  error: (...args) => {
    if (isTest) {
      errors.push(args.join(' '));
    } else {
      console.error(...args);
    }
  },

  /**
   * Get captured logs (for test assertions)
   */
  getLogs: () => [...logs],

  /**
   * Get captured errors (for test assertions)
   */
  getErrors: () => [...errors],

  /**
   * Clear captured logs
   */
  clear: () => {
    logs.length = 0;
    errors.length = 0;
  },

  /**
   * Check if running in test mode
   */
  isTestMode: () => isTest,
};

module.exports = testLogger;
