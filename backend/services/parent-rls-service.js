/**
 * Parent RLS Service
 *
 * Verifies user can access a SPECIFIC parent entity record via RLS filtering.
 * Closes the security gap where sub-entity routes check resource permission
 * but not row-level access to the parent record.
 *
 * Uses null return (not 403) to hide entity existence from unauthorized users.
 *
 * @deprecated SUPERSEDED BY DECLARATIVE RLS
 *
 * This imperative service has been replaced by:
 * - middleware/sub-entity.js → requireParentAccess(entityKey)
 *
 * The new approach uses declarative rlsRules from metadata (SSOT),
 * eliminating the need for this separate service.
 *
 * Migration: Replace findParentWithRLS usage with requireParentAccess middleware.
 *
 * Kept for backward compatibility during transition. Will be removed in future.
 */

const { buildRLSFilter } = require('../db/helpers/rls');
const allMetadata = require('../config/models');
const { pool } = require('../db/connection');
const { logger } = require('../config/logger');
const { extractProfileIds } = require('../middleware/row-level-security');

/** Get metadata for entity by table name */
function getMetadataByTableName(tableName) {
  const metadataKey = Object.keys(allMetadata).find(
    (k) => allMetadata[k].tableName === tableName,
  );
  return metadataKey ? allMetadata[metadataKey] : null;
}

/**
 * Build RLS context from request user for parent lookup (ADR-011 format)
 * @param {Object} dbUser - Database user record
 * @param {string} rlsResource - Resource name for logging
 * @returns {Object} RLS context with role and profile IDs (snake_case)
 */
function buildParentRLSContext(dbUser, rlsResource) {
  return {
    role: dbUser.role,
    userId: dbUser.id,
    resource: rlsResource,
    ...extractProfileIds(dbUser),
  };
}

/**
 * Create a parent RLS checker with injected query function
 *
 * Factory pattern enables unit testing with mock query functions.
 *
 * @param {Function} queryFn - Async function(sql, params) => { rows }
 * @returns {Function} findParentWithRLS checker function
 */
function createParentRLSChecker(queryFn) {
  /**
   * Find parent entity by ID with RLS filtering
   *
   * Returns the parent record if found AND accessible, null otherwise.
   * Uses null return (not 403) to hide entity existence from unauthorized users.
   *
   * @param {string} tableName - Parent table name (e.g., 'work_orders')
   * @param {number} entityId - Parent record ID
   * @param {Object} rlsContext - RLS context (filterConfig, userId, customerProfileId, etc.)
   * @returns {Promise<Object|null>} Parent record or null
   *
   * @example
   *   const parent = await findParentWithRLS('work_orders', 1000, rlsContext);
   *   // Returns { id: 1000 } if accessible, null if not found/not accessible
   */
  return async function findParentWithRLS(tableName, entityId, rlsContext) {
    // Validate inputs
    if (!tableName || typeof tableName !== 'string') {
      logger.warn('findParentWithRLS: Invalid tableName', { tableName });
      return null;
    }

    if (!entityId || typeof entityId !== 'number' || entityId <= 0) {
      logger.warn('findParentWithRLS: Invalid entityId', { entityId });
      return null;
    }

    // Get metadata for parent entity
    const metadata = getMetadataByTableName(tableName);
    if (!metadata) {
      logger.warn('findParentWithRLS: No metadata found', { tableName });
      // Use tableName-only metadata for basic RLS
    }

    // Build RLS filter clause (ADR-011: include operation)
    // paramOffset=2 because $1 is already used for the entity ID
    // Pass allMetadata for parent access support
    const { clause, params, applied } = buildRLSFilter(
      rlsContext,
      metadata || { tableName },
      'read',
      2,
      allMetadata,
    );

    // If RLS returned deny clause (1=0), short-circuit
    if (clause === '1=0') {
      logger.debug('findParentWithRLS: RLS denied access', {
        tableName,
        entityId,
        role: rlsContext?.role,
      });
      return null;
    }

    // Build query with RLS filter
    let query = `SELECT id FROM ${tableName} WHERE id = $1`;
    let queryParams = [entityId];

    if (clause && clause !== '') {
      query += ` AND ${clause}`;
      queryParams = queryParams.concat(params);
    }

    logger.debug('findParentWithRLS: Executing query', {
      tableName,
      entityId,
      rlsApplied: applied,
      clauseType: clause ? 'filtered' : 'unfiltered',
    });

    try {
      const result = await queryFn(query, queryParams);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('findParentWithRLS: Query failed', {
        tableName,
        entityId,
        error: error.message,
      });
      throw error;
    }
  };
}

/**
 * Default findParentWithRLS using pool.query
 *
 * Convenience export for production use.
 * For testing, use createParentRLSChecker() with mock.
 */
const findParentWithRLS = createParentRLSChecker(pool.query.bind(pool));

module.exports = {
  // Primary export for production
  findParentWithRLS,

  // Factory for testing
  createParentRLSChecker,

  // Internal helpers (exported for testing)
  getMetadataByTableName,
  buildParentRLSContext,
};
