/**
 * Database Connection Mock Factory
 * 
 * SRP: ONLY mocks database connection behavior
 * Use: Import and apply in test files
 */

/**
 * Create a mock database connection
 * 
 * @returns {Object} Mocked db connection with query method
 */
function createMockDb() {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
}

/**
 * Standard jest.mock() configuration for db/connection
 * Use at top of test files
 */
const DB_MOCK_CONFIG = () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
});

/**
 * Reset all database mocks
 * Call in beforeEach() or afterEach()
 * 
 * @param {Object} db - Database mock instance
 */
function resetDbMocks(db) {
  db.query.mockReset();
  db.connect.mockReset();
  db.end.mockReset();
}

/**
 * Setup db.query to return specific result
 * 
 * @param {Object} db - Database mock instance
 * @param {Object} result - Query result to return
 */
function mockQuery(db, result) {
  db.query.mockResolvedValue(result);
}

/**
 * Setup db.query to return specific result once
 * 
 * @param {Object} db - Database mock instance  
 * @param {Object} result - Query result to return
 */
function mockQueryOnce(db, result) {
  db.query.mockResolvedValueOnce(result);
}

/**
 * Setup db.query to reject with error
 * 
 * @param {Object} db - Database mock instance
 * @param {Error|string} error - Error to throw
 */
function mockQueryError(db, error) {
  const err = typeof error === "string" ? new Error(error) : error;
  db.query.mockRejectedValue(err);
}

/**
 * Setup db.query to reject with error once
 * 
 * @param {Object} db - Database mock instance
 * @param {Error|string} error - Error to throw
 */
function mockQueryErrorOnce(db, error) {
  const err = typeof error === "string" ? new Error(error) : error;
  db.query.mockRejectedValueOnce(err);
}

/**
 * Chain multiple query responses
 * Useful for methods that make multiple queries
 * 
 * @param {Object} db - Database mock instance
 * @param {Array<Object>} results - Array of query results
 */
function mockQueryChain(db, results) {
  results.forEach((result) => {
    db.query.mockResolvedValueOnce(result);
  });
}

module.exports = {
  createMockDb,
  DB_MOCK_CONFIG,
  resetDbMocks,
  mockQuery,
  mockQueryOnce,
  mockQueryError,
  mockQueryErrorOnce,
  mockQueryChain,
};
