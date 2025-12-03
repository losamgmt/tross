/**
 * Database Query Results Fixtures
 * 
 * SRP: ONLY provides mock query response DATA
 * Simulates PostgreSQL query result structure
 */

/**
 * Standard pagination query results
 */
const PAGINATION_RESULTS = {
  count: {
    rows: [{ count: "10", total: 10 }],
    rowCount: 1,
  },

  emptyCount: {
    rows: [{ count: "0", total: 0 }],
    rowCount: 1,
  },
};

/**
 * Standard empty query result
 */
const EMPTY_RESULT = {
  rows: [],
  rowCount: 0,
};

/**
 * Create a standard query result
 * @param {Array} rows - Data rows
 * @returns {Object} PostgreSQL-style result
 */
function createQueryResult(rows) {
  return {
    rows: Array.isArray(rows) ? rows : [rows],
    rowCount: Array.isArray(rows) ? rows.length : 1,
  };
}

module.exports = {
  PAGINATION_RESULTS,
  EMPTY_RESULT,
  createQueryResult,
};
