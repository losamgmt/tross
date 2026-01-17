/**
 * Generic Delete Helper
 *
 * Provides consistent delete behavior across all models:
 * - Transaction-based (atomic operation)
 * - Audit log cascade (always delete audit logs about this resource)
 * - beforeDelete hook support (for business logic validation)
 * - Standardized error handling
 *
 * SINGLE RESPONSIBILITY: Coordinate delete operations with cascade
 */

const db = require('../connection');
const { logger } = require('../../config/logger');
const { MODEL_ERRORS } = require('../../config/constants');
const AppError = require('../../utils/app-error');

/**
 * Delete a record with transaction + audit cascade + hooks
 *
 * @param {Object} config
 * @param {string} config.tableName - Database table name (e.g., 'users', 'roles')
 * @param {number} config.id - Record ID to delete
 * @param {Function} [config.beforeDelete] - Optional validation hook
 * @param {Function} [config.customAuditCascade] - Optional custom audit cascade logic
 * @param {Object} [config.options] - Delete options
 * @param {Object} [config.options.req] - Express request object
 * @param {boolean} [config.options.force] - Force delete (bypass checks)
 * @param {any} [config.options.*] - Any custom options for beforeDelete hook
 *
 * @returns {Promise<Object>} Deleted record
 *
 * @example
 * // Simple delete (no business logic)
 * const deleted = await deleteWithAuditCascade({
 *   tableName: 'customers',
 *   id: 123
 * });
 *
 * @example
 * // Delete with business logic validation
 * const deleted = await deleteWithAuditCascade({
 *   tableName: 'users',
 *   id: 456,
 *   beforeDelete: async (record, context) => {
 *     if (context.options.req?.dbUser?.id === record.id) {
 *       throw new Error('Cannot delete your own account');
 *     }
 *   },
 *   options: { req }
 * });
 *
 * @example
 * // Delete with custom audit cascade (e.g., User model)
 * const deleted = await deleteWithAuditCascade({
 *   tableName: 'users',
 *   id: 789,
 *   customAuditCascade: async (client, id) => {
 *     // Delete audit logs ABOUT this user
 *     await client.query(
 *       'DELETE FROM audit_logs WHERE resource_type = $1 AND resource_id = $2',
 *       ['user', id]
 *     );
 *     // Delete audit logs BY this user (actions performed)
 *     await client.query('DELETE FROM audit_logs WHERE user_id = $1', [id]);
 *   }
 * });
 */
async function deleteWithAuditCascade(config) {
  const { tableName, id, beforeDelete, customAuditCascade, options = {} } = config;

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // =========================================================================
    // STEP 1: Fetch record (needed for hooks + audit logging)
    // =========================================================================
    const fetchQuery = `SELECT * FROM ${tableName} WHERE id = $1`;
    const fetchResult = await client.query(fetchQuery, [id]);

    if (fetchResult.rows.length === 0) {
      // Determine which model error to use based on table name
      const modelKey = tableName.toUpperCase().slice(0, -1); // 'users' -> 'USER'
      const errorMessage = MODEL_ERRORS[modelKey]?.NOT_FOUND || `${tableName} not found`;
      throw new AppError(errorMessage, 404, 'NOT_FOUND');
    }

    const record = fetchResult.rows[0];

    // =========================================================================
    // STEP 2: Run beforeDelete hook (business logic validation)
    // =========================================================================
    if (beforeDelete) {
      const hookContext = {
        client, // Database client (for queries in same transaction)
        options, // All options passed to delete (req, force, etc.)
        record, // The record being deleted
        tableName, // Table name
        id, // Record ID
      };

      await beforeDelete(record, hookContext);
    }

    // =========================================================================
    // STEP 3: CASCADE DELETE - Audit logs
    // =========================================================================
    let auditResult;
    if (customAuditCascade) {
      // Custom audit cascade logic (e.g., User model deletes both ABOUT and BY)
      await customAuditCascade(client, id);
      auditResult = { rowCount: 0 }; // Unknown count for custom cascade
    } else {
      // Default: Delete audit logs ABOUT this resource
      // Convention: resource_type='<table>' AND resource_id=<id>
      // Audit logs BY this record (as the actor) are preserved for historical reference
      const auditDeleteQuery = `
        DELETE FROM audit_logs 
        WHERE resource_type = $1 AND resource_id = $2
      `;
      auditResult = await client.query(auditDeleteQuery, [tableName, id]);

      logger.debug(`Cascade deleted ${auditResult.rowCount} audit logs for ${tableName}:${id}`);
    }

    // =========================================================================
    // STEP 4: Delete the record itself
    // =========================================================================
    const deleteQuery = `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`;
    const deleteResult = await client.query(deleteQuery, [id]);

    if (deleteResult.rows.length === 0) {
      // This shouldn't happen (we already checked), but safety check
      const modelKey = tableName.toUpperCase().slice(0, -1); // 'users' -> 'USER'
      const errorMessage = MODEL_ERRORS[modelKey]?.NOT_FOUND || `${tableName} not found`;
      throw new AppError(errorMessage, 404, 'NOT_FOUND');
    }

    await client.query('COMMIT');

    logger.info(`${tableName} deleted successfully`, {
      id,
      auditLogsCascaded: auditResult.rowCount,
    });

    return deleteResult.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');

    logger.error(`Error deleting ${tableName}`, {
      error: error.message,
      id,
      tableName,
    });

    // Re-throw the error (caller will handle HTTP response)
    throw error;

  } finally {
    client.release();
  }
}

module.exports = {
  deleteWithAuditCascade,
};
