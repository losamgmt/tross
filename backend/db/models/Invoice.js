// Invoice model
const db = require('../connection');
const { logger } = require('../../config/logger');
const { MODEL_ERRORS } = require('../../config/constants');
const { toSafeInteger } = require('../../validators/type-coercion');
const { deleteWithAuditCascade } = require('../helpers/delete-helper');
const { buildUpdateClause } = require('../helpers/update-helper');
const PaginationService = require('../../services/pagination-service');
const QueryBuilderService = require('../../services/query-builder-service');
const invoiceMetadata = require('../../config/models/invoice-metadata');

class Invoice {
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

    // own_invoices_only = filter by customer_id (customers see their invoices)
    if (rlsPolicy === 'own_invoices_only') {
      if (!rlsUserId) {
        logger.error('RLS userId missing for own_invoices_only policy', { policy: rlsPolicy });
        return { clause: '1=0', values: [], applied: true };
      }
      return { clause: 'i.customer_id = $1', values: [rlsUserId], applied: true };
    }

    // deny_all policy = explicit denial (technicians have no invoice access)
    if (rlsPolicy === 'deny_all') {
      logger.warn('RLS deny_all policy for invoices', { userId: rlsUserId });
      return { clause: '1=0', values: [], applied: true };
    }

    // Unknown policy = security failsafe (deny all)
    logger.warn('Unknown RLS policy for invoices', { policy: rlsPolicy, userId: rlsUserId });
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
      const whereClause = existingWhere && !existingWhere.trim().toUpperCase().startsWith('WHERE')
        ? `WHERE ${existingWhere}`
        : existingWhere;
      return {
        whereClause,
        values: existingValues,
        rlsApplied: rlsFilter.applied,
      };
    }

    // Adjust RLS parameter placeholders to account for existing values
    const offset = existingValues.length;
    let adjustedRLSClause = rlsFilter.clause;

    // Replace $1, $2, etc. with $offset+1, $offset+2, etc.
    if (offset > 0 && rlsFilter.values.length > 0) {
      adjustedRLSClause = rlsFilter.clause.replace(/\$(\d+)/g, (match, num) => {
        return `$${parseInt(num) + offset}`;
      });
    }

    // Combine WHERE clauses
    let combinedWhere;
    if (!existingWhere || existingWhere.trim() === '') {
      combinedWhere = `WHERE ${adjustedRLSClause}`;
    } else {
      // existingWhere might be "WHERE ..." or just the condition
      const hasWhereKeyword = existingWhere.trim().toUpperCase().startsWith('WHERE');
      if (hasWhereKeyword) {
        combinedWhere = `${existingWhere} AND ${adjustedRLSClause}`;
      } else {
        combinedWhere = `WHERE ${existingWhere} AND ${adjustedRLSClause}`;
      }
    }

    return {
      whereClause: combinedWhere,
      values: [...existingValues, ...rlsFilter.values],
      rlsApplied: rlsFilter.applied,
    };
  }

  static _buildQuery(whereClause = '', orderBy = '') {
    return `SELECT i.* FROM invoices i ${whereClause} ${orderBy}`.trim();
  }

  static async findById(id, req = null) {
    const safeId = toSafeInteger(id, 'Invoice ID');
    try {
      // Apply RLS filter
      const { whereClause, values } = this._applyRLSFilter(
        req,
        'i.id = $1',
        [safeId],
      );

      const result = await db.query(this._buildQuery(whereClause), values);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error finding invoice', { error: error.message, invoiceId: safeId });
      throw new Error(MODEL_ERRORS.INVOICE.RETRIEVAL_FAILED);
    }
  }

  static async findAll(options = {}) {
    try {
      const { page, limit, offset } = PaginationService.validateParams(options);
      const { searchableFields, filterableFields, sortableFields, defaultSort } = invoiceMetadata;

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

      // Apply RLS filtering
      const { whereClause, values: rlsValues, rlsApplied } = this._applyRLSFilter(
        options.req,
        baseWhere,
        baseValues,
      );

      const countQuery = `SELECT COUNT(*) FROM invoices i ${whereClause}`;
      const dataQuery = this._buildQuery(whereClause, `ORDER BY ${sort} LIMIT $${rlsValues.length + 1} OFFSET $${rlsValues.length + 2}`);

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
      logger.error('Error finding invoices', { error: error.message });
      throw new Error(MODEL_ERRORS.INVOICE.RETRIEVAL_ALL_FAILED);
    }
  }

  static async create(data) {
    if (!data.invoice_number || !data.customer_id || !data.amount || !data.total) {
      throw new Error(MODEL_ERRORS.INVOICE.INVOICE_NUMBER_CUSTOMER_AMOUNT_TOTAL_REQUIRED);
    }
    try {
      const query = `
        INSERT INTO invoices (invoice_number, work_order_id, customer_id, amount, tax, total, due_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `;
      const values = [
        data.invoice_number, data.work_order_id || null, data.customer_id, data.amount,
        data.tax || 0, data.total, data.due_date || null, data.status || 'draft',
      ];
      const result = await db.query(query, values);
      logger.info('Invoice created', { invoiceId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating invoice', { error: error.message, code: error.code });

      // Preserve PostgreSQL error codes for proper HTTP status handling
      if (error.code === '23505' || error.code === '23514' || error.code === '23503') {
        const preservedError = new Error(error.message);
        preservedError.code = error.code;
        throw preservedError;
      }

      throw new Error(MODEL_ERRORS.INVOICE.CREATION_FAILED);
    }
  }

  static async update(id, data) {
    const safeId = toSafeInteger(id, 'Invoice ID');
    const allowedFields = ['invoice_number', 'work_order_id', 'amount', 'tax', 'total', 'due_date', 'paid_at', 'status'];

    const { updates, values, hasUpdates } = buildUpdateClause(data, allowedFields);

    if (!hasUpdates) {
      throw new Error(MODEL_ERRORS.INVOICE.NO_VALID_FIELDS);
    }

    try {
      values.push(safeId);
      const result = await db.query(`UPDATE invoices SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
      if (result.rows.length === 0) {
        throw new Error(MODEL_ERRORS.INVOICE.NOT_FOUND);
      }
      logger.info('Invoice updated', { invoiceId: safeId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating invoice', { error: error.message, code: error.code });

      // Preserve PostgreSQL error codes for proper HTTP status handling
      if (error.code === '23505' || error.code === '23514' || error.code === '23503') {
        const preservedError = new Error(error.message);
        preservedError.code = error.code;
        throw preservedError;
      }

      throw new Error(MODEL_ERRORS.INVOICE.UPDATE_FAILED);
    }
  }

  static async delete(id) {
    const safeId = toSafeInteger(id, 'Invoice ID');

    return deleteWithAuditCascade({
      tableName: 'invoices',
      id: safeId,
    });
  }
}

module.exports = Invoice;
