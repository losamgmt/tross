/**
 * Logger Mock Factory
 * 
 * SRP: ONLY mocks logger behavior
 * Use: Prevent console spam in tests
 */

/**
 * Create a mock logger
 * 
 * @returns {Object} Mocked logger with all methods
 */
function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

/**
 * Standard jest.mock() configuration for logger
 */
const LOGGER_MOCK_CONFIG = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

/**
 * Reset all logger mocks
 * 
 * @param {Object} logger - Logger mock instance
 */
function resetLoggerMocks(logger) {
  logger.info.mockReset();
  logger.warn.mockReset();
  logger.error.mockReset();
  logger.debug.mockReset();
}

/**
 * Mock logger to suppress all output
 * 
 * @param {Object} logger - Logger mock instance
 */
function mockLoggerSilent(logger) {
  logger.info.mockImplementation(() => {});
  logger.warn.mockImplementation(() => {});
  logger.error.mockImplementation(() => {});
  logger.debug.mockImplementation(() => {});
}

module.exports = {
  createMockLogger,
  LOGGER_MOCK_CONFIG,
  resetLoggerMocks,
  mockLoggerSilent,
};
