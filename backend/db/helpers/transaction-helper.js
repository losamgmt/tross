/**
 * Transaction Helper
 *
 * SRP: Provides a consistent interface for database transactions.
 * Handles BEGIN, COMMIT, ROLLBACK, and client release automatically.
 *
 * DESIGN:
 * - Wraps transaction lifecycle in a callback pattern
 * - Transaction propagation: join a caller's client, or open and own a new one
 * - Automatic rollback on error
 * - Always releases client (even on error)
 * - Returns callback result on success
 * - Throws original error on failure
 *
 * USAGE:
 *   const { withTransaction } = require('../db/helpers/transaction-helper');
 *
 *   // Simple case - returns result of callback
 *   const result = await withTransaction(async (client) => {
 *     await client.query('INSERT INTO ...');
 *     const result = await client.query('SELECT ...');
 *     return result.rows[0];
 *   });
 *
 *   // Multiple operations with rollback protection
 *   const [user, profile] = await withTransaction(async (client) => {
 *     const user = await client.query('INSERT INTO users...');
 *     const profile = await client.query('INSERT INTO profiles...');
 *     return [user.rows[0], profile.rows[0]];
 *   });
 */

const db = require('../connection');
const { logger } = require('../../config/logger');

/**
 * Execute callback within a database transaction, with transaction propagation.
 *
 * PROPAGATION (Spring "REQUIRED" semantics): if a caller threads its own client
 * via `options.client`, this JOINS that transaction (no nested BEGIN/COMMIT or
 * release — the caller owns them); otherwise it opens and owns a new one. The
 * client passed to the callback IS the Unit of Work. See ADR 013.
 *
 * @param {Function} callback - Async function that receives the client
 *   The callback should:
 *   - Use client.query() for all database operations
 *   - Return the desired result (will be returned by withTransaction)
 *   - Throw on error (will trigger rollback)
 * @param {Object} [options]
 * @param {Object} [options.client] - An open pg client to JOIN (propagation);
 *   when present, this call does not BEGIN/COMMIT/ROLLBACK or release it.
 *
 * @returns {Promise<*>} Result of the callback function
 * @throws {Error} Original error from callback (after rollback when owned)
 *
 * @example
 *   // Own transaction (cascade delete with atomicity)
 *   const deletedRecord = await withTransaction(async (client) => {
 *     await client.query('DELETE FROM dependents WHERE parent_id = $1', [parentId]);
 *     const result = await client.query('DELETE FROM parents WHERE id = $1 RETURNING *', [parentId]);
 *     return result.rows[0];
 *   });
 *
 *   // Join a caller's transaction (propagation)
 *   await withTransaction(async (client) => { ... }, { client: parentClient });
 */
async function withTransaction(callback, { client: externalClient = null } = {}) {
  // Propagation: own a new transaction, or join the caller's (they own lifecycle)
  const ownTransaction = !externalClient;
  const client = externalClient || (await db.getClient());

  try {
    if (ownTransaction) {
      await client.query('BEGIN');
    }

    // Execute the callback with the client
    const result = await callback(client);

    if (ownTransaction) {
      await client.query('COMMIT');
    }

    return result;
  } catch (error) {
    // Roll back only when we own the transaction; a joined call lets the owning
    // ancestor's catch perform the single ROLLBACK.
    if (ownTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Transaction rollback failed', {
          originalError: error.message,
          rollbackError: rollbackError.message,
        });
      }
    }

    // Re-throw the original error
    throw error;
  } finally {
    // Release only a client we acquired
    if (ownTransaction) {
      client.release();
    }
  }
}

/**
 * Execute multiple operations within a transaction, with individual operation tracking
 *
 * Useful when you need to track which operation failed.
 *
 * @param {Array<{name: string, operation: Function}>} operations - Array of named operations
 * @returns {Promise<Object>} Map of operation name → result
 * @throws {Error} Error with additional context about which operation failed
 *
 * @example
 *   const results = await withTransactionSteps([
 *     { name: 'deleteInvoices', operation: async (client) => client.query('DELETE FROM invoices...') },
 *     { name: 'deleteCustomer', operation: async (client) => client.query('DELETE FROM customers...') },
 *   ]);
 *   // results = { deleteInvoices: {...}, deleteCustomer: {...} }
 */
async function withTransactionSteps(operations) {
  return withTransaction(async (client) => {
    const results = {};

    for (const { name, operation } of operations) {
      try {
        results[name] = await operation(client);
      } catch (error) {
        // Add context about which step failed
        error.failedStep = name;
        error.completedSteps = Object.keys(results);
        throw error;
      }
    }

    return results;
  });
}

/**
 * Check if a transaction is safe to proceed (exists check + lock)
 *
 * Useful for update/delete operations that need to verify record exists
 * and obtain a row lock before proceeding.
 *
 * @param {Object} client - Database client from transaction
 * @param {string} tableName - Table to check
 * @param {string} primaryKey - Primary key column name
 * @param {*} id - ID value to check
 * @param {boolean} forUpdate - Whether to lock the row (default: true)
 * @returns {Promise<Object|null>} The record if found, null otherwise
 *
 * @example
 *   await withTransaction(async (client) => {
 *     const record = await checkAndLock(client, 'customers', 'id', 123);
 *     if (!record) {
 *       throw new Error('Customer not found');
 *     }
 *     // Record is now locked for this transaction
 *     await client.query('UPDATE customers SET ...');
 *   });
 */
async function checkAndLock(
  client,
  tableName,
  primaryKey,
  id,
  forUpdate = true,
) {
  const lockClause = forUpdate ? ' FOR UPDATE' : '';
  const query = `SELECT * FROM ${tableName} WHERE ${primaryKey} = $1${lockClause}`;
  const result = await client.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

module.exports = {
  withTransaction,
  withTransactionSteps,
  checkAndLock,
};
