/**
 * Generic Cascade Delete Helper
 *
 * SRP LITERALISM: ONLY processes dependent record operations during parent delete.
 *
 * PHILOSOPHY:
 * - METADATA-DRIVEN: Reads `dependents` array from entity metadata
 * - STRATEGY-BASED: Supports CASCADE, RESTRICT, NULLIFY, SOFT delete
 * - DEFENSE-IN-DEPTH: Sanitizes identifiers even from trusted metadata
 * - TRANSACTIONAL: Requires client to be in a transaction
 *
 * USAGE:
 *   const result = await cascadeDeleteDependents(client, metadata, parentId);
 *   // result: { totalDeleted: 5, totalUpdated: 3, details: [...] }
 *
 * STRATEGIES:
 * - CASCADE: Delete dependent records (default)
 * - RESTRICT: Block delete if dependents exist
 * - NULLIFY: Set foreign key to NULL
 * - SOFT: Set is_active = false on dependents
 *
 * @module cascade-helper
 */

const { logger } = require('../../config/logger');
const { CASCADE_STRATEGIES } = require('../../config/constants');
const { sanitizeIdentifier } = require('../../utils/sql-safety');
const AppError = require('../../utils/app-error');

// Re-export as DELETE_STRATEGIES for semantic clarity in this module
const DELETE_STRATEGIES = CASCADE_STRATEGIES;

/**
 * Cascade delete dependent records for an entity
 *
 * Iterates through the entity's `dependents` metadata and processes
 * each dependent according to its strategy.
 *
 * @param {Object} client - Database client (must be in transaction)
 * @param {Object} metadata - Entity metadata with dependents array
 * @param {number} id - ID of the parent record being deleted
 * @returns {Promise<Object>} Summary of cascade operations
 * @throws {AppError} If RESTRICT strategy has dependents
 * @throws {AppError} If unknown delete strategy provided
 *
 * @example
 * // Metadata with different strategies
 * const metadata = {
 *   tableName: 'users',
 *   dependents: [
 *     // CASCADE (default or explicit) - delete audit logs
 *     {
 *       table: 'audit_logs',
 *       foreignKey: 'resource_id',
 *       polymorphicType: { column: 'resource_type', value: 'users' },
 *       strategy: 'cascade'
 *     },
 *     // RESTRICT - block if open tickets exist
 *     {
 *       table: 'support_tickets',
 *       foreignKey: 'user_id',
 *       strategy: 'restrict'
 *     },
 *     // NULLIFY - remove author reference but keep comments
 *     {
 *       table: 'comments',
 *       foreignKey: 'author_id',
 *       strategy: 'nullify'
 *     },
 *     // SOFT - deactivate sessions instead of deleting
 *     {
 *       table: 'sessions',
 *       foreignKey: 'user_id',
 *       strategy: 'soft'
 *     }
 *   ]
 * };
 */
async function cascadeDeleteDependents(client, metadata, id) {
  const { tableName, dependents = [] } = metadata;

  if (dependents.length === 0) {
    logger.debug(`No dependents to cascade for ${tableName}:${id}`);
    return { totalDeleted: 0, totalUpdated: 0, details: [] };
  }

  const details = [];
  let totalDeleted = 0;
  let totalUpdated = 0;

  for (const dependent of dependents) {
    const { table, foreignKey, polymorphicType, strategy = DELETE_STRATEGIES.CASCADE } = dependent;

    // SECURITY: Defense-in-depth - validate identifiers even from metadata
    const safeTable = sanitizeIdentifier(table, 'dependent table');
    const safeForeignKey = sanitizeIdentifier(foreignKey, 'foreign key');

    // Build WHERE clause (handles both simple and polymorphic FKs)
    let whereClause;
    let params;

    if (polymorphicType) {
      const safePolyColumn = sanitizeIdentifier(polymorphicType.column, 'polymorphic column');
      whereClause = `${safeForeignKey} = $1 AND ${safePolyColumn} = $2`;
      params = [id, polymorphicType.value];
    } else {
      whereClause = `${safeForeignKey} = $1`;
      params = [id];
    }

    let result;
    let action;

    switch (strategy) {
      case DELETE_STRATEGIES.RESTRICT: {
        // Check if dependents exist - if so, block the delete
        const countQuery = `SELECT COUNT(*) as count FROM ${safeTable} WHERE ${whereClause}`;
        const countResult = await client.query(countQuery, params);
        const count = parseInt(countResult.rows[0].count, 10);

        if (count > 0) {
          throw new AppError(
            `Cannot delete ${tableName}: ${count} dependent ${table} record(s) exist`,
            409,
            'CONFLICT',
          );
        }
        action = 'checked';
        result = { rowCount: 0 };
        break;
      }

      case DELETE_STRATEGIES.NULLIFY: {
        // Set FK to NULL instead of deleting
        const nullifyQuery = `UPDATE ${safeTable} SET ${safeForeignKey} = NULL WHERE ${whereClause}`;
        result = await client.query(nullifyQuery, params);
        action = 'nullified';
        totalUpdated += result.rowCount;
        break;
      }

      case DELETE_STRATEGIES.SOFT: {
        // Set soft-delete column to false (configurable, defaults to is_active)
        const softDeleteColumn = sanitizeIdentifier(
          dependent.softDeleteColumn || 'is_active',
          'soft delete column',
        );
        const softQuery = `UPDATE ${safeTable} SET ${softDeleteColumn} = false WHERE ${whereClause}`;
        result = await client.query(softQuery, params);
        action = 'soft_deleted';
        totalUpdated += result.rowCount;
        break;
      }

      case DELETE_STRATEGIES.CASCADE: {
        // Delete dependent records (original behavior)
        const deleteQuery = `DELETE FROM ${safeTable} WHERE ${whereClause}`;
        result = await client.query(deleteQuery, params);
        action = 'deleted';
        totalDeleted += result.rowCount;
        break;
      }

      default:
        throw new AppError(
          `Unknown delete strategy: ${strategy}`,
          500,
          'INTERNAL_ERROR',
        );
    }

    details.push({
      table,
      foreignKey,
      polymorphic: !!polymorphicType,
      strategy,
      action,
      affected: result.rowCount,
    });

    logger.debug(
      `Cascade ${action} ${result.rowCount} records from ${table} for ${tableName}:${id}`,
      { strategy },
    );
  }

  logger.debug(`Cascade complete for ${tableName}:${id}`, {
    totalDeleted,
    totalUpdated,
    dependentsProcessed: dependents.length,
  });

  return { totalDeleted, totalUpdated, details };
}

module.exports = {
  cascadeDeleteDependents,
  DELETE_STRATEGIES,
};
