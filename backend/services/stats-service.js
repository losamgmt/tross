/**
 * Stats Service
 *
 * SRP LITERALISM: ONLY performs aggregation queries on entities
 *
 * PHILOSOPHY:
 * - GENERIC: Works with ANY entity that has metadata defined
 * - METADATA-DRIVEN: Validates fields against entity metadata
 * - SECURE: Respects RLS, parameterized queries
 * - COMPOSABLE: Uses existing QueryBuilder and RLS helpers
 *
 * USAGE:
 *   const count = await StatsService.count('work_order', req, { status: 'pending' });
 *   const grouped = await StatsService.countGrouped('work_order', req, 'status');
 *   const sum = await StatsService.sum('invoice', req, 'amount', { status: 'paid' });
 */

const allMetadata = require('../config/models');
const { logger } = require('../config/logger');
const db = require('../db/connection');
const QueryBuilderService = require('./query-builder-service');
const { buildRLSFilter } = require('../db/helpers/rls-filter-helper');

class StatsService {
  /**
   * Get metadata for an entity, throwing if not found
   * @private
   */
  static _getMetadata(entityName) {
    const metadata = allMetadata[entityName];
    if (!metadata) {
      throw new Error(`Unknown entity: ${entityName}`);
    }
    return metadata;
  }

  /**
   * Count records for an entity with optional filters
   *
   * @param {string} entityName - Entity name (e.g., 'work_order')
   * @param {Object} req - Express request (for RLS context)
   * @param {Object} [filters={}] - Optional filter object
   * @returns {Promise<number>} Record count
   *
   * @example
   *   const total = await StatsService.count('work_order', req);
   *   const pending = await StatsService.count('work_order', req, { status: 'pending' });
   */
  static async count(entityName, req, filters = {}) {
    const metadata = this._getMetadata(entityName);
    const { tableName, filterableFields = [] } = metadata;

    // Build RLS filter
    const rlsResult = buildRLSFilter(req, metadata, 0);
    let paramOffset = rlsResult.params.length;

    // Build filter clause
    const filterResult = QueryBuilderService.buildFilterClause(
      filters,
      filterableFields,
      paramOffset,
      tableName
    );

    // Combine clauses
    const whereClauses = [];
    const params = [...rlsResult.params, ...filterResult.params];

    if (rlsResult.clause) {
      whereClauses.push(rlsResult.clause);
    }
    if (filterResult.clause) {
      whereClauses.push(filterResult.clause);
    }

    const whereSQL = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const query = `SELECT COUNT(*) as count FROM ${tableName} ${whereSQL}`;

    logger.debug('[StatsService.count]', { entityName, filters, query, params });

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Count records grouped by a field
   *
   * @param {string} entityName - Entity name
   * @param {Object} req - Express request (for RLS context)
   * @param {string} groupByField - Field to group by
   * @param {Object} [filters={}] - Optional filter object
   * @returns {Promise<Array<{value: string, count: number}>>} Grouped counts
   *
   * @example
   *   const byStatus = await StatsService.countGrouped('work_order', req, 'status');
   *   // Returns: [{ value: 'pending', count: 5 }, { value: 'completed', count: 10 }]
   */
  static async countGrouped(entityName, req, groupByField, filters = {}) {
    const metadata = this._getMetadata(entityName);
    const { tableName, filterableFields = [] } = metadata;

    // Validate groupByField is filterable
    if (!filterableFields.includes(groupByField)) {
      throw new Error(`Cannot group by '${groupByField}' - not a filterable field`);
    }

    // Build RLS filter
    const rlsResult = buildRLSFilter(req, metadata, 0);
    let paramOffset = rlsResult.params.length;

    // Build filter clause
    const filterResult = QueryBuilderService.buildFilterClause(
      filters,
      filterableFields,
      paramOffset,
      tableName
    );

    // Combine clauses
    const whereClauses = [];
    const params = [...rlsResult.params, ...filterResult.params];

    if (rlsResult.clause) {
      whereClauses.push(rlsResult.clause);
    }
    if (filterResult.clause) {
      whereClauses.push(filterResult.clause);
    }

    const whereSQL = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const query = `
      SELECT ${tableName}.${groupByField} as value, COUNT(*) as count 
      FROM ${tableName} 
      ${whereSQL}
      GROUP BY ${tableName}.${groupByField}
      ORDER BY count DESC
    `;

    logger.debug('[StatsService.countGrouped]', { entityName, groupByField, query, params });

    const result = await db.query(query, params);
    return result.rows.map(row => ({
      value: row.value,
      count: parseInt(row.count, 10),
    }));
  }

  /**
   * Sum a numeric field
   *
   * @param {string} entityName - Entity name
   * @param {Object} req - Express request (for RLS context)
   * @param {string} field - Numeric field to sum
   * @param {Object} [filters={}] - Optional filter object
   * @returns {Promise<number>} Sum value
   *
   * @example
   *   const revenue = await StatsService.sum('invoice', req, 'total', { status: 'paid' });
   */
  static async sum(entityName, req, field, filters = {}) {
    const metadata = this._getMetadata(entityName);
    const { tableName, filterableFields = [] } = metadata;

    // Build RLS filter
    const rlsResult = buildRLSFilter(req, metadata, 0);
    let paramOffset = rlsResult.params.length;

    // Build filter clause
    const filterResult = QueryBuilderService.buildFilterClause(
      filters,
      filterableFields,
      paramOffset,
      tableName
    );

    // Combine clauses
    const whereClauses = [];
    const params = [...rlsResult.params, ...filterResult.params];

    if (rlsResult.clause) {
      whereClauses.push(rlsResult.clause);
    }
    if (filterResult.clause) {
      whereClauses.push(filterResult.clause);
    }

    const whereSQL = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const query = `SELECT COALESCE(SUM(${tableName}.${field}), 0) as total FROM ${tableName} ${whereSQL}`;

    logger.debug('[StatsService.sum]', { entityName, field, query, params });

    const result = await db.query(query, params);
    return parseFloat(result.rows[0].total);
  }
}

module.exports = StatsService;
