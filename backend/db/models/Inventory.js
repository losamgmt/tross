// Inventory model
const db = require('../connection');
const { logger } = require('../../config/logger');
const { MODEL_ERRORS } = require('../../config/constants');
const { toSafeInteger } = require('../../validators/type-coercion');
const { deleteWithAuditCascade } = require('../helpers/delete-helper');
const { buildUpdateClause } = require('../helpers/update-helper');
const PaginationService = require('../../services/pagination-service');
const QueryBuilderService = require('../../services/query-builder-service');
const inventoryMetadata = require('../../config/models/inventory-metadata');

class Inventory {
  /**
   * Build RLS filter for inventory
   * PUBLIC_RESOURCE POLICY: No filtering - inventory is accessible to all authorized users
   * All authorized users (technician+) can see all inventory items
   *
   * @param {Object} req - Express request with RLS context
   * @returns {Object} { clause: '', values: [], applied: false }
   */
  static _buildRLSFilter(req) {
    // No req or no RLS context = no filtering
    if (!req || !req.hasOwnProperty('rlsPolicy')) {
      logger.debug('Inventory RLS: No req or RLS context');
      return {
        clause: '',
        values: [],
        applied: false,
      };
    }

    // public_resource policy: Inventory is accessible to all authorized users - no filtering
    // All authorized users (technician, dispatcher, manager, admin) can view inventory
    // This enables inventory lookups for work orders, quotes, etc.
    if (req.rlsPolicy === 'public_resource') {
      logger.debug('Inventory RLS: public_resource policy - no filtering');
      return {
        clause: '',
        values: [],
        applied: false,
      };
    }

    // Unknown policy - default to no filtering for inventory (it's a public management resource)
    logger.warn('Inventory RLS: Unexpected policy, defaulting to no filter', {
      policy: req.rlsPolicy,
      resource: req.rlsResource,
    });
    return {
      clause: '',
      values: [],
      applied: false,
    };
  }

  /**
   * Apply RLS filter to existing WHERE clause
   *
   * @param {Object} req - Express request with RLS context
   * @param {string} existingWhere - Existing WHERE clause (may be empty)
   * @param {Array} existingValues - Existing query parameters
   * @returns {Object} { whereClause, params, applied }
   */
  static _applyRLSFilter(req, existingWhere, existingValues) {
    const rlsFilter = this._buildRLSFilter(req);

    // No RLS filtering needed (public_resource policy)
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
        applied: false,
      };
    }

    // This code path should never execute for inventory (public_resource policy)
    // But keeping consistent structure with other models
    const hasExistingWhere = existingWhere && existingWhere.trim().toUpperCase().startsWith('WHERE');
    const combinedWhere = hasExistingWhere
      ? `${existingWhere} AND ${rlsFilter.clause}`
      : `WHERE ${rlsFilter.clause}`;

    return {
      whereClause: combinedWhere,
      values: [...existingValues, ...rlsFilter.values],
      applied: rlsFilter.applied,
    };
  }

  static _buildQuery(whereClause = '', orderBy = '') {
    return `SELECT i.* FROM inventory i ${whereClause} ${orderBy}`.trim();
  }

  static async findById(id, req = null) {
    const safeId = toSafeInteger(id, 'Inventory ID');
    try {
      // Build base query
      const whereClause = 'WHERE i.id = $1';
      const params = [safeId];

      // Apply RLS filter
      const rlsResult = this._applyRLSFilter(req, whereClause, params);

      const query = this._buildQuery(rlsResult.whereClause);
      const result = await db.query(query, rlsResult.values);

      const item = result.rows[0] || null;
      if (item && req) {
        item.rlsApplied = rlsResult.applied;
      }

      return item;
    } catch (error) {
      logger.error('Error finding inventory item', { error: error.message, inventoryId: safeId });
      throw new Error(MODEL_ERRORS.INVENTORY.RETRIEVAL_FAILED);
    }
  }

  static async findAll(options = {}) {
    try {
      const { page, limit, offset } = PaginationService.validateParams(options);
      const includeInactive = options.includeInactive || false;
      const { searchableFields, filterableFields, sortableFields, defaultSort } = inventoryMetadata;

      const search = QueryBuilderService.buildSearchClause(options.search, searchableFields);
      const filterOptions = { ...options.filters };
      if (!includeInactive) {
        filterOptions.is_active = true;
      }
      const filters = QueryBuilderService.buildFilterClause(
        filterOptions,
        filterableFields,
        search.paramOffset || 0,
      );
      const sort = QueryBuilderService.buildSortClause(options.sortBy, options.sortOrder, sortableFields, defaultSort);

      const whereClauses = [search.clause, filters.clause].filter(Boolean);
      let whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
      let params = [
        ...(search.params || []),
        ...(filters.params || []),
      ];

      // Apply RLS filter
      const rlsResult = this._applyRLSFilter(options.req, whereClause, params);
      whereClause = rlsResult.whereClause;
      params = rlsResult.values;

      const countQuery = `SELECT COUNT(*) FROM inventory i ${whereClause}`;
      const dataQuery = this._buildQuery(whereClause, `ORDER BY ${sort} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`);

      const queryParams = [...params, limit, offset];
      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, params),
        db.query(dataQuery, queryParams),
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
        rlsApplied: rlsResult.applied,
      };
    } catch (error) {
      logger.error('Error finding inventory items', { error: error.message });
      throw new Error(MODEL_ERRORS.INVENTORY.RETRIEVAL_ALL_FAILED);
    }
  }

  static async create(data) {
    if (!data.name || !data.sku) {
      throw new Error(MODEL_ERRORS.INVENTORY.NAME_AND_SKU_REQUIRED);
    }
    try {
      const query = `
        INSERT INTO inventory (name, sku, description, quantity, reorder_level, unit_cost, location, supplier, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
      `;
      const values = [
        data.name, data.sku, data.description || null, data.quantity || 0,
        data.reorder_level || 10, data.unit_cost || null, data.location || null,
        data.supplier || null, data.status || 'in_stock',
      ];
      const result = await db.query(query, values);
      logger.info('Inventory item created', { inventoryId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating inventory item', { error: error.message, code: error.code });

      // Preserve PostgreSQL error codes for proper HTTP status handling
      if (error.code === '23505' || error.code === '23514' || error.code === '23503') {
        const preservedError = new Error(error.message);
        preservedError.code = error.code;
        throw preservedError;
      }

      throw new Error(MODEL_ERRORS.INVENTORY.CREATION_FAILED);
    }
  }

  static async update(id, data) {
    const safeId = toSafeInteger(id, 'Inventory ID');
    const allowedFields = ['name', 'sku', 'description', 'quantity', 'reorder_level', 'unit_cost', 'location', 'supplier', 'status'];

    const { updates, values, hasUpdates } = buildUpdateClause(data, allowedFields);

    if (!hasUpdates) {
      throw new Error(MODEL_ERRORS.INVENTORY.NO_VALID_FIELDS);
    }

    try {
      values.push(safeId);
      const result = await db.query(`UPDATE inventory SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
      if (result.rows.length === 0) {
        throw new Error(MODEL_ERRORS.INVENTORY.NOT_FOUND);
      }
      logger.info('Inventory item updated', { inventoryId: safeId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating inventory item', { error: error.message, code: error.code });

      // Preserve PostgreSQL error codes for proper HTTP status handling
      if (error.code === '23505' || error.code === '23514' || error.code === '23503') {
        const preservedError = new Error(error.message);
        preservedError.code = error.code;
        throw preservedError;
      }

      throw new Error(MODEL_ERRORS.INVENTORY.UPDATE_FAILED);
    }
  }

  static async delete(id) {
    const safeId = toSafeInteger(id, 'Inventory ID');

    return deleteWithAuditCascade({
      tableName: 'inventory',
      id: safeId,
    });
  }
}

module.exports = Inventory;
