// Contract model
const db = require('../connection');
const { logger } = require('../../config/logger');
const { toSafeInteger } = require('../../validators/type-coercion');
const PaginationService = require('../../services/pagination-service');
const QueryBuilderService = require('../../services/query-builder-service');
const contractMetadata = require('../../config/models/contract-metadata');

class Contract {
  /**
   * Build RLS filter clause based on user's policy
   * @private
   * @param {Object} req - Express request with RLS context (rlsPolicy, rlsUserId)
   * @returns {Object} { clause: string, values: array, applied: boolean }
   */
  static _buildRLSFilter(req) {
    // No RLS context = no filtering
    if (!req || !req.hasOwnProperty('rlsPolicy')) {
      return { clause: '', values: [], applied: false };
    }

    const { rlsPolicy, rlsUserId } = req;

    // all_records policy = no filtering (dispatcher+ see everything)
    if (rlsPolicy === 'all_records') {
      return { clause: '', values: [], applied: true };
    }

    // own_contracts_only = filter by customer_id (customers see their contracts)
    if (rlsPolicy === 'own_contracts_only') {
      if (!rlsUserId) {
        logger.error('RLS userId missing for own_contracts_only policy', { policy: rlsPolicy });
        return { clause: '1=0', values: [], applied: true };
      }
      return { clause: 'c.customer_id = $1', values: [rlsUserId], applied: true };
    }

    // deny_all policy = explicit denial (technicians have no contract access)
    if (rlsPolicy === 'deny_all') {
      logger.warn('RLS deny_all policy for contracts', { userId: rlsUserId });
      return { clause: '1=0', values: [], applied: true };
    }

    // Unknown policy = security failsafe (deny all)
    logger.warn('Unknown RLS policy for contracts', { policy: rlsPolicy, userId: rlsUserId });
    return { clause: '1=0', values: [], applied: true };
  }

  /**
   * Apply RLS filter to existing WHERE clause
   * @private
   * @param {Object} req - Express request with RLS context
   * @param {string} existingWhere - Existing WHERE clause (may be empty)
   * @param {array} existingValues - Existing query parameter values
   * @returns {Object} { whereClause: string, values: array, rlsApplied: boolean }
   */
  static _applyRLSFilter(req, existingWhere = '', existingValues = []) {
    const rlsFilter = this._buildRLSFilter(req);

    // No RLS filtering needed
    if (!rlsFilter.clause) {
      // Return existing WHERE with proper keyword handling
      let whereClause = '';
      if (existingWhere && existingWhere.trim()) {
        whereClause = existingWhere.trim().toUpperCase().startsWith('WHERE')
          ? existingWhere
          : `WHERE ${existingWhere}`;
      }
      return {
        whereClause,
        values: existingValues,
        rlsApplied: rlsFilter.applied,
      };
    }

    // Apply RLS filter
    const hasExistingWhere = existingWhere && existingWhere.trim().length > 0;

    let combinedClause;
    let combinedValues;

    if (hasExistingWhere) {
      // Adjust RLS parameter placeholders to account for existing params
      const paramOffset = existingValues.length;
      const adjustedRlsClause = rlsFilter.clause.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) + paramOffset}`);

      // Check if existingWhere already has WHERE keyword
      const whereBase = existingWhere.trim().toUpperCase().startsWith('WHERE')
        ? existingWhere
        : existingWhere;
      const needsWhereKeyword = !existingWhere.trim().toUpperCase().startsWith('WHERE');

      combinedClause = needsWhereKeyword
        ? `WHERE ${whereBase} AND ${adjustedRlsClause}`
        : `${whereBase} AND ${adjustedRlsClause}`;
      combinedValues = [...existingValues, ...rlsFilter.values];
    } else {
      combinedClause = `WHERE ${rlsFilter.clause}`;
      combinedValues = rlsFilter.values;
    }

    return {
      whereClause: combinedClause,
      values: combinedValues,
      rlsApplied: rlsFilter.applied,
    };
  }

  static _buildQuery(whereClause = '', orderBy = '') {
    return `SELECT c.* FROM contracts c ${whereClause} ${orderBy}`.trim();
  }

  static async findById(id, req = null) {
    const safeId = toSafeInteger(id, 'Contract ID');
    try {
      const { whereClause, values } = this._applyRLSFilter(req, 'c.id = $1', [safeId]);
      const result = await db.query(this._buildQuery(whereClause), values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding contract', { error: error.message, contractId: safeId });
      throw new Error('Failed to find contract');
    }
  }

  static async findAll(options = {}) {
    try {
      const { page, limit, offset } = PaginationService.validateParams(options);
      const { searchableFields, filterableFields, sortableFields, defaultSort } = contractMetadata;

      const search = QueryBuilderService.buildSearchClause(options.search, searchableFields);
      const filterOptions = { ...options.filters };
      if (!options.includeInactive) {
        filterOptions.is_active = true;
      }
      const filters = QueryBuilderService.buildFilterClause(
        filterOptions,
        filterableFields,
        search.paramOffset || 0,
      );
      const sort = QueryBuilderService.buildSortClause(options.sortBy, options.sortOrder, sortableFields, defaultSort);

      // Build base WHERE clause from search and filters
      const whereClauses = [search.clause, filters.clause].filter(Boolean);
      const baseWhere = whereClauses.length ? whereClauses.join(' AND ') : '';
      const baseValues = [
        ...(search.params || []),
        ...(filters.params || []),
      ];

      // Apply RLS filter
      const { whereClause: finalWhereClause, values: rlsValues, rlsApplied } = this._applyRLSFilter(options.req, baseWhere, baseValues);

      const countQuery = `SELECT COUNT(*) FROM contracts c ${finalWhereClause}`;
      const dataQuery = this._buildQuery(finalWhereClause, `ORDER BY ${sort} LIMIT $${rlsValues.length + 1} OFFSET $${rlsValues.length + 2}`);

      const params = [...rlsValues, limit, offset];
      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, rlsValues),
        db.query(dataQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      return {
        data: dataResult.rows,
        pagination: PaginationService.generateMetadata(page, limit, total),
        appliedFilters: {
          search: options.search || null,
          filters: filterOptions,
          sortBy: options.sortBy || defaultSort.field,
          sortOrder: options.sortOrder || defaultSort.order,
        },
        rlsApplied,
      };
    } catch (error) {
      logger.error('Error finding contracts', { error: error.message });
      throw new Error('Failed to retrieve contracts');
    }
  }

  static async create(data) {
    if (!data.contract_number || !data.customer_id || !data.start_date) {
      throw new Error('Contract number, customer_id, and start_date are required');
    }
    try {
      const query = `
        INSERT INTO contracts (contract_number, customer_id, start_date, end_date, terms, value, billing_cycle, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `;
      const values = [
        data.contract_number, data.customer_id, data.start_date, data.end_date || null,
        data.terms || null, data.value || null, data.billing_cycle || null, data.status || 'draft',
      ];
      const result = await db.query(query, values);
      logger.info('Contract created', { contractId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating contract', { error: error.message, code: error.code });

      // Preserve PostgreSQL error codes for proper HTTP status handling
      if (error.code === '23505' || error.code === '23514' || error.code === '23503') {
        const preservedError = new Error(error.message);
        preservedError.code = error.code;
        throw preservedError;
      }

      throw new Error('Failed to create contract');
    }
  }

  static async update(id, data) {
    const safeId = toSafeInteger(id, 'Contract ID');
    const allowedFields = ['contract_number', 'start_date', 'end_date', 'terms', 'value', 'billing_cycle', 'status'];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    try {
      values.push(safeId);
      const result = await db.query(`UPDATE contracts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
      if (result.rows.length === 0) {
        throw new Error('Contract not found');
      }
      logger.info('Contract updated', { contractId: safeId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating contract', { error: error.message, code: error.code });

      // Preserve PostgreSQL error codes for proper HTTP status handling
      if (error.code === '23505' || error.code === '23514' || error.code === '23503') {
        const preservedError = new Error(error.message);
        preservedError.code = error.code;
        throw preservedError;
      }

      throw new Error('Failed to update contract');
    }
  }

  static async deactivate(id) {
    const safeId = toSafeInteger(id, 'Contract ID');
    try {
      const result = await db.query('UPDATE contracts SET is_active = false WHERE id = $1 RETURNING *', [safeId]);
      if (result.rows.length === 0) {
        throw new Error('Contract not found');
      }
      logger.info('Contract deactivated', { contractId: safeId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deactivating contract', { error: error.message });
      throw new Error('Failed to deactivate contract');
    }
  }

  static async delete(id) {
    const safeId = toSafeInteger(id, 'Contract ID');
    try {
      const result = await db.query('DELETE FROM contracts WHERE id = $1 RETURNING *', [safeId]);
      if (result.rows.length === 0) {
        throw new Error('Contract not found');
      }
      logger.warn('Contract permanently deleted', { contractId: safeId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting contract', { error: error.message });
      throw new Error('Failed to delete contract');
    }
  }
}

module.exports = Contract;
