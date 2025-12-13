/**
 * Default Value Helper
 *
 * SRP LITERALISM: ONLY generates default values for fields that need them
 *
 * PHILOSOPHY:
 * - SIMPLE: One strategy (max + 1) - YAGNI for others
 * - DRY: Centralized logic for all entities needing ordinal defaults
 * - TESTABLE: Pure function with injectable db dependency
 * - COMPOSABLE: Used by routes before calling GenericEntityService.create()
 *
 * USAGE:
 *   const { getNextOrdinalValue } = require('../db/helpers/default-value-helper');
 *
 *   // In route handler, before create:
 *   if (priority === undefined) {
 *     priority = await getNextOrdinalValue('roles', 'priority', 50);
 *   }
 *
 * STRATEGY: MAX + 1
 *   - Query: SELECT COALESCE(MAX(field), default - 1) + 1 FROM table
 *   - If table empty, returns defaultValue
 *   - If table has records, returns max + 1
 */

const db = require('../connection');
const { logger } = require('../../config/logger');

/**
 * Get the next ordinal value for a field (max + 1 strategy)
 *
 * @param {string} tableName - Database table name
 * @param {string} fieldName - Field to get next value for
 * @param {number} [defaultValue=1] - Value to use if table is empty
 * @returns {Promise<number>} Next ordinal value
 *
 * @example
 *   // Empty roles table, default 50
 *   await getNextOrdinalValue('roles', 'priority', 50);
 *   // Returns: 50
 *
 * @example
 *   // Roles table has max priority = 100
 *   await getNextOrdinalValue('roles', 'priority', 50);
 *   // Returns: 101
 *
 * @example
 *   // Work orders table, default 1
 *   await getNextOrdinalValue('work_orders', 'sequence_number', 1);
 *   // Returns: max + 1 or 1 if empty
 */
async function getNextOrdinalValue(tableName, fieldName, defaultValue = 1) {
  // Validate inputs (security: prevent SQL injection via whitelist)
  if (!tableName || typeof tableName !== 'string') {
    throw new Error('tableName is required and must be a string');
  }
  if (!fieldName || typeof fieldName !== 'string') {
    throw new Error('fieldName is required and must be a string');
  }

  // Whitelist of allowed table names (add as needed)
  const ALLOWED_TABLES = [
    'roles',
    'users',
    'customers',
    'technicians',
    'work_orders',
    'invoices',
    'contracts',
    'inventory',
  ];

  // Whitelist of allowed field names (add as needed)
  const ALLOWED_FIELDS = [
    'priority',
    'sequence_number',
    'sort_order',
    'display_order',
    'order_number',
  ];

  if (!ALLOWED_TABLES.includes(tableName)) {
    throw new Error(`Table '${tableName}' is not in the allowed list for ordinal generation`);
  }

  if (!ALLOWED_FIELDS.includes(fieldName)) {
    throw new Error(`Field '${fieldName}' is not in the allowed list for ordinal generation`);
  }

  try {
    // Query: COALESCE handles NULL (empty table), defaultValue - 1 so result is defaultValue
    const query = `SELECT COALESCE(MAX(${fieldName}), $1 - 1) + 1 as next_value FROM ${tableName}`;
    const result = await db.query(query, [defaultValue]);

    const nextValue = parseInt(result.rows[0].next_value, 10);

    logger.debug('getNextOrdinalValue', {
      table: tableName,
      field: fieldName,
      defaultValue,
      nextValue,
    });

    return nextValue;
  } catch (error) {
    logger.error('getNextOrdinalValue failed', {
      table: tableName,
      field: fieldName,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  getNextOrdinalValue,
};
