// Role model - handles all role database operations
const db = require('../connection');
const { toSafeInteger } = require('../../validators/type-coercion');
const { MODEL_ERRORS } = require('../../config/constants');
const { deleteWithAuditCascade } = require('../helpers/delete-helper');
const { buildUpdateClause } = require('../helpers/update-helper');
const PaginationService = require('../../services/pagination-service');
const QueryBuilderService = require('../../services/query-builder-service');
const roleMetadata = require('../../config/models/role-metadata');

class Role {
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

    const { rlsPolicy } = req;

    // null policy = no filtering (roles are public reference data)
    // Everyone can see all roles (needed for dropdowns, UI, etc)
    if (rlsPolicy === null) {
      return { clause: '', values: [], applied: false };
    }

    // All other policies also mean no filtering for roles
    return { clause: '', values: [], applied: false };
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

    // For roles, RLS never adds filtering (public reference data)
    return {
      whereClause: existingWhere,
      values: existingValues,
      rlsApplied: rlsFilter.applied,
    };
  }

  /**
   * Find all roles with pagination, search, filters, and sorting
   * Contract v2.0: Metadata-driven query building (ZERO hardcoding!)
   *
   * SRP: Uses PaginationService for pagination + QueryBuilderService for queries
   *
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number (1-indexed)
   * @param {number} [options.limit=50] - Items per page (max: 200)
   * @param {boolean} [options.includeInactive=false] - Include inactive roles
   * @param {string} [options.search] - Search term (searches across searchable fields)
   * @param {Object} [options.filters] - Filters (e.g., { priority[gte]: 50, is_active: true })
   * @param {string} [options.sortBy] - Field to sort by (validated against metadata)
   * @param {string} [options.sortOrder] - 'ASC' or 'DESC'
   * @param {Object} [options.req] - Express request object for RLS
   * @returns {Promise<Object>} { data: Role[], pagination: {...}, appliedFilters: {...}, rlsApplied: boolean }
   */
  static async findAll(options = {}) {
    try {
      // SRP: Delegate pagination validation to centralized service
      const { page, limit, offset } = PaginationService.validateParams(options);
      const includeInactive = options.includeInactive || false;

      // Build query using metadata-driven approach
      const { searchableFields, filterableFields, sortableFields, defaultSort } = roleMetadata;

      // Build search clause (case-insensitive ILIKE across all searchable fields)
      const search = QueryBuilderService.buildSearchClause(
        options.search,
        searchableFields,
      );

      // Build filter clause (generic key-value filters with operator support)
      const filterOptions = { ...options.filters };

      // Add is_active filter unless explicitly including inactive
      if (!includeInactive) {
        filterOptions.is_active = true;
      }

      const filters = QueryBuilderService.buildFilterClause(
        filterOptions,
        filterableFields,
        search ? search.paramOffset : 0, // Offset params if search clause exists
      );

      // Combine WHERE clauses
      const whereClauses = [search?.clause, filters?.clause].filter(Boolean);
      const whereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      // Combine parameters
      let params = [
        ...(search?.params || []),
        ...(filters?.params || []),
      ];

      // Apply RLS filter
      const rlsResult = this._applyRLSFilter(options.req, whereClause, params);
      const finalWhereClause = rlsResult.whereClause;
      params = rlsResult.values;

      // Build sort clause (validated against sortableFields)
      const sortClause = QueryBuilderService.buildSortClause(
        options.sortBy,
        options.sortOrder,
        sortableFields,
        defaultSort,
      );

      // Get total count for pagination metadata
      const countQuery = `
        SELECT COUNT(*) as total
        FROM roles
        ${finalWhereClause}
      `;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated roles - ALWAYS return ALL fields
      const query = `
        SELECT * 
        FROM roles 
        ${finalWhereClause} 
        ORDER BY ${sortClause}
        LIMIT ${limit} OFFSET ${offset}
      `;
      const result = await db.query(query, params);

      // SRP: Delegate metadata generation to centralized service
      const metadata = PaginationService.generateMetadata(page, limit, total);

      return {
        data: result.rows,
        pagination: metadata,
        appliedFilters: {
          search: options.search || null,
          filters: filterOptions,
          sortBy: options.sortBy || defaultSort.field,
          sortOrder: options.sortOrder || defaultSort.order,
        },
        rlsApplied: rlsResult.rlsApplied,
      };
    } catch (_error) {
      throw new Error(MODEL_ERRORS.ROLE.RETRIEVAL_ALL_FAILED);
    }
  }

  /**
   * Get role by ID
   *
   * TYPE SAFE: Validates id is a positive integer
   *
   * @param {number|string} id - Role ID (will be coerced to integer)
   * @param {Object} [req=null] - Express request object for RLS
   * @returns {Promise<Object|undefined>} Role object or undefined if not found
   * @throws {Error} If id is not a valid positive integer
   */
  static async findById(id, req = null) {
    // TYPE SAFETY: Ensure id is a valid positive integer
    const safeId = toSafeInteger(id, 'roleId', { min: 1, allowNull: false });

    // Build base query
    const whereClause = 'WHERE id = $1';
    const params = [safeId];

    // Apply RLS filter
    const rlsResult = this._applyRLSFilter(req, whereClause, params);

    const query = `SELECT * FROM roles ${rlsResult.whereClause}`;
    const result = await db.query(query, rlsResult.values);

    const role = result.rows[0];
    if (role) {
      role.rlsApplied = rlsResult.rlsApplied;
    }

    return role;
  }

  // NOTE: getByName has been removed - use GenericEntityService.findByField('role', 'name', value)

  // Check if role is protected (cannot be modified/deleted)
  static isProtected(roleName) {
    const protectedRoles = ['admin', 'customer'];
    return protectedRoles.includes(roleName.toLowerCase());
  }

  // Create new role (for future expansion)
  static async create(name, priority = 50) {
    if (!name || typeof name !== 'string') {
      throw new Error(MODEL_ERRORS.ROLE.NAME_REQUIRED);
    }

    // Normalize name to lowercase
    const normalizedName = name.toLowerCase().trim();

    if (!normalizedName) {
      throw new Error(MODEL_ERRORS.ROLE.NAME_EMPTY);
    }

    // Validate priority
    const safePriority = toSafeInteger(priority, 'priority', { min: 1, allowNull: false });

    try {
      const query = `
        INSERT INTO roles (name, priority)
        VALUES ($1, $2)
        RETURNING *
      `;
      const result = await db.query(query, [normalizedName, safePriority]);
      return result.rows[0];
    } catch (error) {
      if (error.constraint === 'roles_name_key') {
        throw new Error(MODEL_ERRORS.ROLE.NAME_EXISTS);
      }
      throw new Error(MODEL_ERRORS.ROLE.CREATION_FAILED);
    }
  }

  /**
   * Update role with validation (GENERIC, DATA-DRIVEN)
   *
   * Contract v2.0: All activation management uses this generic method
   * with is_active field. Audit logging is automatic when is_active changes.
   *
   * TYPE SAFE: Validates id is a positive integer
   *
   * @param {number|string} id - Role ID (will be coerced to integer)
   * @param {Object} updates - Fields to update
   * @param {string} [updates.name] - Role name
   * @param {string} [updates.description] - Role description
   * @param {Array} [updates.permissions] - Role permissions
   * @param {boolean} [updates.is_active] - Role active status
   * @param {Object} [context=null] - Request context for audit logging
   * @param {number} [context.userId] - User performing the action
   * @param {string} [context.ipAddress] - Request IP address
   * @param {string} [context.userAgent] - Request user agent
   * @returns {Promise<Object>} Updated role object
   * @throws {Error} If id is invalid, role not found, or role is protected
   */
  static async update(id, updates, _context = null) {
    // BUSINESS LOGIC VALIDATION: Check both parameters first
    if (!id || !updates || typeof updates !== 'object') {
      throw new Error(MODEL_ERRORS.ROLE.ID_AND_NAME_REQUIRED);
    }

    // TYPE SAFETY: Ensure id is a valid positive integer
    const safeId = toSafeInteger(id, 'roleId', { min: 1, allowNull: false });

    // BUSINESS LOGIC: Normalize name if provided (beforeUpdate logic)
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.name) {
      if (typeof normalizedUpdates.name !== 'string') {
        throw new Error(MODEL_ERRORS.ROLE.NAME_REQUIRED);
      }
      normalizedUpdates.name = normalizedUpdates.name.toLowerCase().trim();
      if (!normalizedUpdates.name) {
        throw new Error(MODEL_ERRORS.ROLE.NAME_EMPTY);
      }
    }

    // EXCLUSION PATTERN: Define fields that CANNOT be updated
    // Universal immutables (id, created_at) handled by buildUpdateClause automatically
    // Role-specific: none beyond universals (name CAN be changed for non-protected roles)
    const immutableFields = [];

    // Build SET clause using helper with exclusion pattern
    const { updates: fields, values, hasUpdates } = buildUpdateClause(normalizedUpdates, immutableFields);

    if (!hasUpdates) {
      throw new Error(MODEL_ERRORS.ROLE.NO_VALID_FIELDS);
    }

    try {
      // BUSINESS LOGIC: Check if role exists and is protected (beforeUpdate logic)
      const currentRole = await this.findById(safeId);
      if (!currentRole) {
        throw new Error(MODEL_ERRORS.ROLE.NOT_FOUND);
      }

      if (this.isProtected(currentRole.name)) {
        throw new Error(MODEL_ERRORS.ROLE.PROTECTED_ROLE);
      }

      // Contract v2.0: No audit fields on entity
      // Audit logging happens via AuditService (handled by caller)

      values.push(safeId);

      const query = `
        UPDATE roles 
        SET ${fields.join(', ')}
        WHERE id = $${values.length}
        RETURNING *
      `;
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(MODEL_ERRORS.ROLE.NOT_FOUND);
      }

      const updatedRole = result.rows[0];

      // Contract v2.0: Auto-log updates to audit_logs
      // Deactivation is just an update with is_active=false - no special handling needed
      // The audit log will capture oldValues/newValues including is_active changes

      return updatedRole;
    } catch (error) {
      if (error.constraint === 'roles_name_key') {
        throw new Error(MODEL_ERRORS.ROLE.NAME_EXISTS);
      }
      throw error;
    }
  }

  /**
   * Delete role (only if no users have this role, OR with cascade option)
   *
   * TYPE SAFE: Validates id is a positive integer
   *
   * @param {number|string} id - Role ID (will be coerced to integer)
   * @param {Object} options - Delete options
   * @param {boolean} [options.force=false] - Force delete even if users exist (sets their role_id to NULL)
   * @returns {Promise<Object>} Result object with deleted role and affected users count
   * @throws {Error} If id is invalid, role not found, role is protected, or users are assigned (without force)
   */
  static async delete(id, options = {}) {
    // BUSINESS LOGIC VALIDATION: Check ID first
    if (!id) {
      throw new Error(MODEL_ERRORS.ROLE.ID_REQUIRED);
    }

    // TYPE SAFETY: Ensure id is a valid positive integer
    const safeId = toSafeInteger(id, 'roleId', { min: 1, allowNull: false });

    // Use deleteWithAuditCascade with beforeDelete hook for business logic
    const deletedRole = await deleteWithAuditCascade({
      tableName: 'roles',
      id: safeId,
      options,
      beforeDelete: async (record, context) => {
        // Check if role is protected
        if (this.isProtected(record.name)) {
          throw new Error(MODEL_ERRORS.ROLE.PROTECTED_DELETE);
        }

        // Check if any users have this role
        const checkQuery = 'SELECT COUNT(*) as count FROM users WHERE role_id = $1';
        const checkResult = await context.client.query(checkQuery, [safeId]);
        const userCount = parseInt(checkResult.rows[0].count);

        if (userCount > 0 && !context.options.force) {
          throw new Error(MODEL_ERRORS.ROLE.USERS_ASSIGNED(userCount));
        }

        // Store userCount for return value
        context.userCount = userCount;
      },
    });

    return {
      role: deletedRole,
      affectedUsers: 0, // Will be updated by beforeDelete hook if users exist
    };
  }

  // NOTE: getUserCount has been removed - use GenericEntityService.count('user', { role_id: roleId })
  // NOTE: getUsersByRole has been removed - use GenericEntityService.findAll('user', { filters: { role_id: roleId } })
}

module.exports = Role;
