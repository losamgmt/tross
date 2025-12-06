// Customer model with Entity Contract v2.0 compliance
const db = require('../connection');
const { logger } = require('../../config/logger');
const { MODEL_ERRORS } = require('../../config/constants');
const { toSafeInteger } = require('../../validators/type-coercion');
const { deleteWithAuditCascade } = require('../helpers/delete-helper');
const { buildUpdateClause } = require('../helpers/update-helper');
const PaginationService = require('../../services/pagination-service');
const QueryBuilderService = require('../../services/query-builder-service');
const customerMetadata = require('../../config/models/customer-metadata');

class Customer {
  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Build base SELECT query for customer
   * @private
   */
  static _buildQuery(whereClause = '', orderBy = '') {
    return `
      SELECT c.*
      FROM customers c
      ${whereClause}
      ${orderBy}
    `.trim();
  }

  /**
   * Build Row-Level Security filter clause
   * Applies data-driven RLS rules from permissions.json
   *
   * @param {Object} req - Express request object with RLS context
   * @param {string} req.rlsPolicy - RLS policy ('own_record_only', 'all_records', null)
   * @param {number} req.rlsUserId - User ID for filtering
   * @returns {Object} { clause: string, values: Array, applied: boolean }
   * @private
   */
  static _buildRLSFilter(req) {
    // No RLS enforcement if not attached to request
    if (!req || !req.rlsPolicy) {
      return { clause: '', values: [], applied: false };
    }

    const { rlsPolicy, rlsUserId } = req;

    switch (rlsPolicy) {
      case 'own_record_only':
        // Customer can only see their own record
        // Match by customer.id = user.id (assumes customer IS the user)
        return {
          clause: 'c.id = $RLS_PARAM',
          values: [rlsUserId],
          applied: true,
        };

      case 'all_records':
        // Technician+ can see all customer records - no filtering needed
        // RLS is NOT applied because there are no restrictions
        return { clause: '', values: [], applied: false };

      default:
        // Unknown policy or null - no access (will return empty result)
        return {
          clause: '1=0',
          values: [],
          applied: true,
        };
    }
  }

  /**
   * Apply RLS filter to WHERE clause
   * Combines RLS filter with existing WHERE conditions
   *
   * @param {Object} req - Express request with RLS context
   * @param {string} existingWhere - Existing WHERE clause (without 'WHERE' keyword)
   * @param {Array} existingValues - Existing query parameter values
   * @returns {Object} { whereClause: string, values: Array, rlsApplied: boolean }
   * @private
   */
  static _applyRLSFilter(req, existingWhere = '', existingValues = []) {
    const rlsFilter = this._buildRLSFilter(req);

    if (!rlsFilter.applied) {
      // No RLS enforcement - return original WHERE clause
      return {
        whereClause: existingWhere ? `WHERE ${existingWhere}` : '',
        values: existingValues,
        rlsApplied: false,
      };
    }

    // RLS is applied - combine with existing WHERE
    const conditions = [];
    const values = [...existingValues];

    if (existingWhere) {
      conditions.push(existingWhere);
    }

    if (rlsFilter.clause) {
      // Replace $RLS_PARAM placeholder with actual parameter number
      const paramNum = values.length + 1;
      const rlsClause = rlsFilter.clause.replace('$RLS_PARAM', `$${paramNum}`);
      conditions.push(rlsClause);
      values.push(...rlsFilter.values);
    }

    return {
      whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
      values,
      rlsApplied: true,
    };
  }

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Find customer by ID
   * TYPE SAFE: Validates id is a positive integer
   * RLS: Applies row-level security if req object provided
   *
   * @param {number|string} id - Customer ID (will be coerced to integer)
   * @param {Object} [req] - Express request object with RLS context (optional)
   * @returns {Promise<Object|null>} Customer object or null if not found
   * @throws {Error} If id is not a valid positive integer
   */
  static async findById(id, req = null) {
    const safeId = toSafeInteger(id, 'Customer ID');

    try {
      // Apply RLS filter to base WHERE clause
      const { whereClause, values, rlsApplied } = this._applyRLSFilter(
        req,
        'c.id = $1',
        [safeId],
      );

      const query = this._buildQuery(whereClause);
      const result = await db.query(query, values);

      // Handle no results
      if (result.rows.length === 0) {
        return null;
      }

      // Return result with RLS metadata if requested
      const customer = result.rows[0];
      if (req && req.rlsPolicy) {
        return { ...customer, rlsApplied };
      }
      return customer;
    } catch (error) {
      logger.error('Error finding customer by ID', {
        error: error.message,
        customerId: safeId,
      });
      throw new Error(MODEL_ERRORS.CUSTOMER.RETRIEVAL_FAILED);
    }
  }

  // NOTE: findByEmail has been removed - use GenericEntityService.findByField('customer', 'email', value)

  /**
   * Find all customers with pagination, search, filters, and sorting
   * Contract v2.0: Metadata-driven query building
   * RLS: Applies row-level security if req object provided
   *
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=50] - Items per page
   * @param {boolean} [options.includeInactive=false] - Include inactive records
   * @param {string} [options.search] - Search term
   * @param {Object} [options.filters] - Filters (e.g., { status: 'active' })
   * @param {string} [options.sortBy] - Field to sort by
   * @param {string} [options.sortOrder] - 'ASC' or 'DESC'
   * @param {Object} [options.req] - Express request object with RLS context
   * @returns {Promise<Object>} { data: Customer[], pagination: {...}, appliedFilters: {...}, rlsApplied: boolean }
   */
  static async findAll(options = {}) {
    try {
      const { page, limit, offset } = PaginationService.validateParams(options);
      const includeInactive = options.includeInactive || false;
      const req = options.req || null;

      const { searchableFields, filterableFields, sortableFields, defaultSort } =
        customerMetadata;

      // Build search clause
      const search = QueryBuilderService.buildSearchClause(
        options.search,
        searchableFields,
      );

      // Build filter clause
      const filterOptions = { ...options.filters };
      if (!includeInactive) {
        filterOptions.is_active = true;
      }

      const filters = QueryBuilderService.buildFilterClause(
        filterOptions,
        filterableFields,
        search.paramOffset || 0, // Offset params if search clause exists
      );

      // Build sort clause
      const sort = QueryBuilderService.buildSortClause(
        options.sortBy,
        options.sortOrder,
        sortableFields,
        defaultSort,
      );

      // Combine WHERE clauses (before RLS)
      const whereClauses = [search.clause, filters.clause].filter(Boolean);
      const baseWhere = whereClauses.join(' AND ');
      const baseValues = [
        ...(search.params || []),
        ...(filters.params || []),
      ];

      // Apply RLS filter
      const { whereClause, values: finalValues, rlsApplied } = this._applyRLSFilter(
        req,
        baseWhere,
        baseValues,
      );

      // Build queries
      const countQuery = `SELECT COUNT(*) FROM customers c ${whereClause}`;
      const dataQuery = this._buildQuery(
        whereClause,
        `ORDER BY ${sort} LIMIT $${finalValues.length + 1} OFFSET $${finalValues.length + 2}`,
      );

      // Execute queries
      const params = [...finalValues, limit, offset];
      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, finalValues),
        db.query(dataQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      const pagination = PaginationService.generateMetadata(page, limit, total);

      return {
        data: dataResult.rows,
        pagination,
        appliedFilters: {
          search: options.search || null,
          filters: filterOptions,
          sortBy: options.sortBy || defaultSort.field,
          sortOrder: options.sortOrder || defaultSort.order,
        },
        rlsApplied,
      };
    } catch (error) {
      logger.error('Error finding all customers', {
        error: error.message,
        page: options.page,
        limit: options.limit,
        search: options.search,
      });
      throw new Error(MODEL_ERRORS.CUSTOMER.RETRIEVAL_ALL_FAILED);
    }
  }

  /**
   * Create new customer
   * Entity Contract v2.0: Validates required TIER 1 fields
   *
   * @param {Object} data - Customer data
   * @param {string} data.email - Customer email (REQUIRED)
   * @param {string} [data.phone] - Phone number
   * @param {string} [data.company_name] - Company name
   * @param {Object} [data.billing_address] - Billing address JSONB
   * @param {Object} [data.service_address] - Service address JSONB
   * @param {string} [data.status='pending'] - Customer status
   * @returns {Promise<Object>} Created customer
   */
  static async create(data) {
    if (!data.email) {
      throw new Error(MODEL_ERRORS.CUSTOMER.EMAIL_REQUIRED);
    }

    try {
      const query = `
        INSERT INTO customers (
          email, phone, company_name, billing_address, service_address, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        data.email?.trim(),
        data.phone || null,
        data.company_name?.trim() || null,
        data.billing_address ? JSON.stringify(data.billing_address) : null,
        data.service_address ? JSON.stringify(data.service_address) : null,
        data.status || 'pending',
      ];

      const result = await db.query(query, values);
      logger.info('Customer created', { customerId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        // Unique violation - preserve the error code for route handler
        const duplicateError = new Error('Customer with this email already exists');
        duplicateError.code = '23505';
        throw duplicateError;
      }
      logger.error('Error creating customer', {
        error: error.message,
        data,
      });
      throw new Error(MODEL_ERRORS.CUSTOMER.CREATION_FAILED);
    }
  }

  /**
   * Update customer
   * Entity Contract v2.0: updated_at managed by trigger
   *
   * @param {number|string} id - Customer ID
   * @param {Object} data - Fields to update
   * @returns {Promise<Object>} Updated customer
   */
  static async update(id, data) {
    const safeId = toSafeInteger(id, 'Customer ID');

    if (Object.keys(data).length === 0) {
      throw new Error(MODEL_ERRORS.CUSTOMER.NO_FIELDS_TO_UPDATE);
    }

    try {
      // Build SET clause using helper
      const allowedFields = [
        'email',
        'phone',
        'company_name',
        'billing_address',
        'service_address',
        'status',
      ];

      const { updates, values, hasUpdates } = buildUpdateClause(data, allowedFields, {
        jsonbFields: ['billing_address', 'service_address'],
        trimFields: ['email', 'company_name'],
      });

      if (!hasUpdates) {
        throw new Error(MODEL_ERRORS.CUSTOMER.NO_VALID_FIELDS);
      }

      values.push(safeId);
      const query = `
        UPDATE customers
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(MODEL_ERRORS.CUSTOMER.NOT_FOUND);
      }

      logger.info('Customer updated', { customerId: safeId });
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error(MODEL_ERRORS.CUSTOMER.EMAIL_EXISTS);
      }
      logger.error('Error updating customer', {
        error: error.message,
        customerId: safeId,
      });
      throw new Error(MODEL_ERRORS.CUSTOMER.UPDATE_FAILED);
    }
  }

  /**
   * Hard delete customer (permanent removal)
   *
   * @param {number|string} id - Customer ID
   * @returns {Promise<Object>} Deleted customer
   */
  static async delete(id) {
    const safeId = toSafeInteger(id, 'Customer ID');

    return deleteWithAuditCascade({
      tableName: 'customers',
      id: safeId,
    });
  }
}

module.exports = Customer;
