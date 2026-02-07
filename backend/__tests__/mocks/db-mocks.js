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
    if (sqlLower.includes("count(*)") || sqlLower.includes("count (*)")) {
      return Promise.resolve({
        rows: [{ count: String(count) }],
        rowCount: 1,
        command: "SELECT",
      });
    }

    // INSERT queries (RETURNING clause)
    if (sqlLower.startsWith("insert")) {
      const insertedRow = rows.length > 0 ? rows[0] : {};
      return Promise.resolve({
        rows: [insertedRow],
        rowCount: 1,
        command: "INSERT",
      });
    }

    // UPDATE queries (RETURNING clause)
    if (sqlLower.startsWith("update")) {
      const updatedRow = rows.length > 0 ? rows[0] : {};
      return Promise.resolve({
        rows: [updatedRow],
        rowCount: rows.length > 0 ? 1 : 0,
        command: "UPDATE",
      });
    }

    // DELETE queries (RETURNING clause)
    if (sqlLower.startsWith("delete")) {
      const deletedRow = rows.length > 0 ? rows[0] : {};
      return Promise.resolve({
        rows: [deletedRow],
        rowCount: rows.length > 0 ? 1 : 0,
        command: "DELETE",
      });
    }

    // SELECT queries (default)
    return Promise.resolve({
      rows: rows,
      rowCount: rows.length,
      command: "SELECT",
    });
  });

  // Create a mock client for transaction support
  const mockClient = createMockClient();

  // Smart default: BEGIN/COMMIT/ROLLBACK auto-resolve
  mockClient.query.mockImplementation((sql) => {
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    // Default: empty result (can be overridden per test)
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  return {
    query: queryMock,

    // Transaction support - returns mock client
    getClient: jest.fn().mockResolvedValue(mockClient),

    // Access to the mock client for assertions
    __getMockClient: () => mockClient,

    // Utility methods for test assertions and control
    __setRows: (newRows) => {
      rows.splice(0, rows.length, ...newRows);
    },
    __setCount: (newCount) => {
      options.count = newCount;
    },
    __reset: () => {
      queryMock.mockClear();
      mockClient.query.mockClear();
      mockClient.release.mockClear();
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
function createFailingDBMock(error = new Error("Database connection failed")) {
  return {
    query: jest.fn(() => Promise.reject(error)),
    getClient: jest.fn(() => Promise.reject(error)),
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
function createRetryableDBMock(
  failCount = 1,
  successResponse = { rows: [], rowCount: 0 },
) {
  let attempts = 0;

  const mockClient = createMockClient();

  return {
    query: jest.fn(() => {
      attempts++;
      if (attempts <= failCount) {
        const error = new Error("deadlock detected");
        error.code = "40P01"; // PostgreSQL deadlock error code
        return Promise.reject(error);
      }
      return Promise.resolve(successResponse);
    }),
    getClient: jest.fn().mockResolvedValue(mockClient),
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

  const mockClient = createMockClient();

  return {
    query: jest.fn(() => Promise.reject(error)),
    getClient: jest.fn().mockResolvedValue(mockClient),
  };
}

/**
 * Create mock database client for transaction testing
 * Simulates getClient() pattern used in transaction helpers
 *
 * @returns {Object} Mock client with query, release methods
 */
function createMockClient() {
  return {
    query: jest.fn(),
    release: jest.fn(),
  };
}

/**
 * Mock a successful transaction sequence
 * Configures client.query to respond to BEGIN → operations → COMMIT
 *
 * @param {Object} client - Mock client from createMockClient()
 * @param {Object} config - Transaction configuration
 * @param {Object} config.record - Record to return from SELECT/DELETE operations
 * @param {number} [config.auditLogsDeleted=0] - Number of audit logs deleted
 * @returns {Object} client (for chaining)
 *
 * @example
 * const client = createMockClient();
 * mockSuccessfulTransaction(client, {
 *   record: { id: 1, name: 'Test' },
 *   auditLogsDeleted: 3
 * });
 */
function mockSuccessfulTransaction(client, config) {
  const { record, auditLogsDeleted = 0 } = config;

  client.query
    .mockResolvedValueOnce({ rows: [] }) // BEGIN
    .mockResolvedValueOnce({ rows: [record] }) // SELECT record
    .mockResolvedValueOnce({ rows: [], rowCount: auditLogsDeleted }) // DELETE audit logs
    .mockResolvedValueOnce({ rows: [record] }) // DELETE/UPDATE record
    .mockResolvedValueOnce({ rows: [] }); // COMMIT

  return client;
}

/**
 * Mock a failed transaction with automatic rollback
 * Configures client.query to respond to BEGIN → error → ROLLBACK
 *
 * @param {Object} client - Mock client from createMockClient()
 * @param {Error} error - Error to throw during transaction
 * @param {string} [failAt='operation'] - When to fail: 'select', 'operation', 'audit'
 * @returns {Object} client (for chaining)
 *
 * @example
 * const client = createMockClient();
 * mockFailedTransaction(client, new Error('DB error'), 'select');
 */
function mockFailedTransaction(client, error, failAt = "operation") {
  client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN

  if (failAt === "select") {
    client.query.mockRejectedValueOnce(error); // SELECT fails
  } else if (failAt === "audit") {
    client.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT succeeds
      .mockRejectedValueOnce(error); // Audit operation fails
  } else {
    client.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT succeeds
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Audit succeeds
      .mockRejectedValueOnce(error); // Main operation fails
  }

  client.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

  return client;
}

/**
 * Mock record not found scenario (within transaction)
 *
 * @param {Object} client - Mock client from createMockClient()
 * @returns {Object} client (for chaining)
 */
function mockRecordNotFound(client) {
  client.query
    .mockResolvedValueOnce({ rows: [] }) // BEGIN
    .mockResolvedValueOnce({ rows: [] }) // SELECT (not found)
    .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

  return client;
}

/**
 * Custom Jest matchers for transaction testing
 * Extends Jest's expect with transaction-aware assertions
 */
const transactionMatchers = {
  /**
   * Assert that a transaction was committed
   * @example expect(mockClient).toHaveCommittedTransaction()
   */
  toHaveCommittedTransaction(client) {
    const calls = client.query.mock.calls;
    const hasBegin = calls.some((call) => call[0] === "BEGIN");
    const hasCommit = calls.some((call) => call[0] === "COMMIT");

    return {
      pass: hasBegin && hasCommit,
      message: () =>
        hasBegin && hasCommit
          ? "Expected transaction NOT to commit"
          : `Expected transaction to BEGIN and COMMIT. Calls: ${JSON.stringify(calls.map((c) => c[0]))}`,
    };
  },

  /**
   * Assert that a transaction was rolled back
   * @example expect(mockClient).toHaveRolledBackTransaction()
   */
  toHaveRolledBackTransaction(client) {
    const calls = client.query.mock.calls;
    const hasBegin = calls.some((call) => call[0] === "BEGIN");
    const hasRollback = calls.some((call) => call[0] === "ROLLBACK");

    return {
      pass: hasBegin && hasRollback,
      message: () =>
        hasBegin && hasRollback
          ? "Expected transaction NOT to rollback"
          : `Expected transaction to BEGIN and ROLLBACK. Calls: ${JSON.stringify(calls.map((c) => c[0]))}`,
    };
  },

  /**
   * Assert that client was released (connection returned to pool)
   * @example expect(mockClient).toHaveReleasedConnection()
   */
  toHaveReleasedConnection(client) {
    const released = client.release.mock.calls.length > 0;

    return {
      pass: released,
      message: () =>
        released
          ? "Expected client NOT to be released"
          : "Expected client.release() to be called",
    };
  },
};

module.exports = {
  createDBMock,
  createFailingDBMock,
  createRetryableDBMock,
  createConstraintViolationMock,
  createMockClient,
  mockSuccessfulTransaction,
  mockFailedTransaction,
  mockRecordNotFound,
  transactionMatchers,
};
