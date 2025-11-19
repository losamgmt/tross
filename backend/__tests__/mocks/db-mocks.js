/**
 * Smart Database Connection Mocks
 * 
 * PHILOSOPHY:
 * - Simulates realistic DB responses (rows array + count)
 * - Understands query patterns (SELECT, COUNT, INSERT, UPDATE, DELETE)
 * - Tracks query history for assertions
 * - Override-capable for error simulation
 * 
 * USAGE:
 *   const { createDBMock } = require('./mocks/db-mocks');
 *   
 *   jest.mock('../../db/connection', () => createDBMock({
 *     rows: [{ id: 1, name: 'Test' }],
 *     count: 1
 *   }));
 */

/**
 * Create intelligent DB connection mock
 * Simulates PostgreSQL query responses with realistic structure
 * 
 * @param {Object} options - Configuration options
 * @param {Array} options.rows - Default rows to return (can be overridden per test)
 * @param {number} options.count - Default count for COUNT queries
 * @param {Object} options.overrides - Optional override functions for error simulation
 * @param {Function} options.overrides.query - Override query logic
 * @returns {Object} Mock db connection with smart query method
 */
function createDBMock(options = {}) {
  const { rows = [], count = 0, overrides = {} } = options;

  const queryMock = jest.fn((sql, params) => {
    // ⚠️ Override escape hatch (for error simulation only!)
    if (overrides.query) {
      return overrides.query(sql, params);
    }

    // Detect query type from SQL string
    const sqlLower = sql.toLowerCase().trim();

    // COUNT queries
    if (sqlLower.includes('count(*)') || sqlLower.includes('count (*)')) {
      return Promise.resolve({
        rows: [{ count: String(count) }],
        rowCount: 1,
        command: 'SELECT',
      });
    }

    // INSERT queries (RETURNING clause)
    if (sqlLower.startsWith('insert')) {
      const insertedRow = rows.length > 0 ? rows[0] : {};
      return Promise.resolve({
        rows: [insertedRow],
        rowCount: 1,
        command: 'INSERT',
      });
    }

    // UPDATE queries (RETURNING clause)
    if (sqlLower.startsWith('update')) {
      const updatedRow = rows.length > 0 ? rows[0] : {};
      return Promise.resolve({
        rows: [updatedRow],
        rowCount: rows.length > 0 ? 1 : 0,
        command: 'UPDATE',
      });
    }

    // DELETE queries (RETURNING clause)
    if (sqlLower.startsWith('delete')) {
      const deletedRow = rows.length > 0 ? rows[0] : {};
      return Promise.resolve({
        rows: [deletedRow],
        rowCount: rows.length > 0 ? 1 : 0,
        command: 'DELETE',
      });
    }

    // SELECT queries (default)
    return Promise.resolve({
      rows: rows,
      rowCount: rows.length,
      command: 'SELECT',
    });
  });

  return {
    query: queryMock,
    
    // Utility methods for test assertions and control
    __setRows: (newRows) => {
      rows.splice(0, rows.length, ...newRows);
    },
    __setCount: (newCount) => {
      options.count = newCount;
    },
    __reset: () => {
      queryMock.mockClear();
    },
  };
}

/**
 * Create DB mock that simulates connection failures
 * Useful for testing error handling and retry logic
 * 
 * @param {Error} error - Error to throw (default: connection error)
 * @returns {Object} Mock db connection that always fails
 */
function createFailingDBMock(error = new Error('Database connection failed')) {
  return {
    query: jest.fn(() => Promise.reject(error)),
  };
}

/**
 * Create DB mock that simulates deadlock/timeout errors
 * Useful for testing transaction retry logic
 * 
 * @param {number} failCount - Number of times to fail before succeeding (default: 1)
 * @param {Object} successResponse - Response to return after failures
 * @returns {Object} Mock db connection with retry behavior
 */
function createRetryableDBMock(failCount = 1, successResponse = { rows: [], rowCount: 0 }) {
  let attempts = 0;

  return {
    query: jest.fn(() => {
      attempts++;
      if (attempts <= failCount) {
        const error = new Error('deadlock detected');
        error.code = '40P01'; // PostgreSQL deadlock error code
        return Promise.reject(error);
      }
      return Promise.resolve(successResponse);
    }),
    __resetAttempts: () => {
      attempts = 0;
    },
  };
}

/**
 * Create DB mock that simulates constraint violations
 * Useful for testing duplicate key, foreign key, check constraint errors
 * 
 * @param {string} errorCode - PostgreSQL error code (23505, 23503, 23514, etc.)
 * @param {string} message - Error message
 * @param {Object} detail - Error detail object
 * @returns {Object} Mock db connection that throws constraint violation
 */
function createConstraintViolationMock(errorCode, message, detail = {}) {
  const error = new Error(message);
  error.code = errorCode;
  error.detail = detail;

  return {
    query: jest.fn(() => Promise.reject(error)),
  };
}

module.exports = {
  createDBMock,
  createFailingDBMock,
  createRetryableDBMock,
  createConstraintViolationMock,
};
