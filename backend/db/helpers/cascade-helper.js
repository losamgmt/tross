/**
 * Generic Cascade Delete Helper
 *
 * SRP: Delete dependent records based on metadata configuration.
 * Handles both simple FK relationships and polymorphic relationships.
 *
 * This helper is metadata-driven - it reads the `dependents` array from
 * entity metadata and generates appropriate DELETE queries.
 *
 * @module cascade-helper
 */

const { logger } = require("../../config/logger");
const { sanitizeIdentifier } = require("../../utils/sql-safety");

/**
 * Cascade delete dependent records for an entity
 *
 * Iterates through the entity's `dependents` metadata and deletes
 * all dependent records in a single transaction context.
 *
 * @param {Object} client - Database client (must be in transaction)
 * @param {Object} metadata - Entity metadata with dependents array
 * @param {number} id - ID of the parent record being deleted
 * @returns {Promise<Object>} Summary of cascade operations
 *
 * @example
 * // Metadata with polymorphic dependent
 * const metadata = {
 *   tableName: 'users',
 *   dependents: [
 *     {
 *       table: 'audit_logs',
 *       foreignKey: 'resource_id',
 *       polymorphicType: { column: 'resource_type', value: 'users' }
 *     }
 *   ]
 * };
 *
 * // Usage in transaction
 * await client.query('BEGIN');
 * const result = await cascadeDeleteDependents(client, metadata, 123);
 * // result: { totalDeleted: 5, details: [{ table: 'audit_logs', deleted: 5 }] }
 * await client.query('DELETE FROM users WHERE id = 123');
 * await client.query('COMMIT');
 *
 * @example
 * // Metadata with simple FK dependent (non-polymorphic)
 * const metadata = {
 *   tableName: 'customers',
 *   dependents: [
 *     { table: 'notes', foreignKey: 'customer_id' }
 *   ]
 * };
 */
async function cascadeDeleteDependents(client, metadata, id) {
  const { tableName, dependents = [] } = metadata;

  if (dependents.length === 0) {
    logger.debug(`No dependents to cascade for ${tableName}:${id}`);
    return { totalDeleted: 0, details: [] };
  }

  const details = [];
  let totalDeleted = 0;

  for (const dependent of dependents) {
    const { table, foreignKey, polymorphicType } = dependent;

    // SECURITY: Defense-in-depth - validate identifiers even from metadata
    const safeTable = sanitizeIdentifier(table, "dependent table");
    const safeForeignKey = sanitizeIdentifier(foreignKey, "foreign key");

    let query;
    let params;

    if (polymorphicType) {
      // SECURITY: Validate polymorphic column name too
      const safePolyColumn = sanitizeIdentifier(
        polymorphicType.column,
        "polymorphic column",
      );
      // Polymorphic relationship: WHERE foreignKey = $1 AND typeColumn = $2
      query = `DELETE FROM ${safeTable} WHERE ${safeForeignKey} = $1 AND ${safePolyColumn} = $2`;
      params = [id, polymorphicType.value];
    } else {
      // Simple FK relationship: WHERE foreignKey = $1
      query = `DELETE FROM ${safeTable} WHERE ${safeForeignKey} = $1`;
      params = [id];
    }

    const result = await client.query(query, params);
    const deletedCount = result.rowCount;

    details.push({
      table,
      foreignKey,
      polymorphic: !!polymorphicType,
      deleted: deletedCount,
    });

    totalDeleted += deletedCount;

    logger.debug(
      `Cascade deleted ${deletedCount} records from ${table} for ${tableName}:${id}`,
    );
  }

  logger.debug(`Cascade complete for ${tableName}:${id}`, {
    totalDeleted,
    dependentsProcessed: dependents.length,
  });

  return { totalDeleted, details };
}

module.exports = {
  cascadeDeleteDependents,
};
