// Role model - handles all role database operations
const db = require('../connection');
const { toSafeInteger } = require('../../validators/type-coercion');
const { MODEL_ERRORS } = require('../../config/constants');
const PaginationService = require('../../services/pagination-service');
const QueryBuilderService = require('../../services/query-builder-service');
const roleMetadata = require('../../config/models/role-metadata');

class Role {
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
   * @returns {Promise<Object>} { data: Role[], pagination: {...}, appliedFilters: {...} }
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
      const params = [
        ...(search?.params || []),
        ...(filters?.params || []),
      ];

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
        ${whereClause}
      `;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated roles - ALWAYS return ALL fields
      const query = `
        SELECT * 
        FROM roles 
        ${whereClause} 
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
      };
    } catch (_error) {
      throw new Error('Failed to retrieve roles');
    }
  }

  /**
   * Get role by ID
   *
   * TYPE SAFE: Validates id is a positive integer
   *
   * @param {number|string} id - Role ID (will be coerced to integer)
   * @returns {Promise<Object|undefined>} Role object or undefined if not found
   * @throws {Error} If id is not a valid positive integer
   */
  static async findById(id) {
    // TYPE SAFETY: Ensure id is a valid positive integer
    const safeId = toSafeInteger(id, 'roleId', { min: 1, allowNull: false });

    const query = 'SELECT * FROM roles WHERE id = $1';
    const result = await db.query(query, [safeId]);
    return result.rows[0];
  }

  // Get role by name
  static async getByName(name) {
    const query = 'SELECT * FROM roles WHERE name = $1';
    const result = await db.query(query, [name]);
    return result.rows[0];
  }

  // Check if role is protected (cannot be modified/deleted)
  static isProtected(roleName) {
    const protectedRoles = ['admin', 'client'];
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
  static async update(id, updates, context = null) {
    // BUSINESS LOGIC VALIDATION: Check both parameters first
    if (!id || !updates || typeof updates !== 'object') {
      throw new Error(MODEL_ERRORS.ROLE.ID_AND_NAME_REQUIRED);
    }

    // TYPE SAFETY: Ensure id is a valid positive integer
    const safeId = toSafeInteger(id, 'roleId', { min: 1, allowNull: false });

    const allowedFields = ['name', 'description', 'permissions', 'is_active', 'priority'];
    const validUpdates = {};

    // Filter only allowed fields
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        validUpdates[key] = updates[key];
      }
    });

    if (Object.keys(validUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Normalize name if provided
    if (validUpdates.name) {
      if (typeof validUpdates.name !== 'string') {
        throw new Error(MODEL_ERRORS.ROLE.NAME_REQUIRED);
      }
      validUpdates.name = validUpdates.name.toLowerCase().trim();
      if (!validUpdates.name) {
        throw new Error(MODEL_ERRORS.ROLE.NAME_EMPTY);
      }
    }

    try {
      // Check if role exists and get its current name
      const currentRole = await this.findById(safeId);
      if (!currentRole) {
        throw new Error(MODEL_ERRORS.ROLE.NOT_FOUND);
      }

      // Check if current role is protected
      if (this.isProtected(currentRole.name)) {
        throw new Error(MODEL_ERRORS.ROLE.PROTECTED_ROLE);
      }

      // Contract v2.0: No audit fields on entity
      // Audit logging happens via AuditService (handled by caller)

      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(validUpdates).forEach((key) => {
        fields.push(`${key} = $${paramCount}`);
        values.push(validUpdates[key]);
        paramCount++;
      });

      values.push(safeId);

      const query = `
        UPDATE roles 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(MODEL_ERRORS.ROLE.NOT_FOUND);
      }

      const updatedRole = result.rows[0];

      // Contract v2.0: Auto-log activation changes to audit_logs
      if ('is_active' in validUpdates && context) {
        const auditService = require('../../services/audit-service');
        const action = validUpdates.is_active === false ? 'logDeactivation' : 'logReactivation';
        await auditService[action](
          'roles',
          safeId,
          context.userId,
          context.ipAddress,
          context.userAgent,
        );
      }

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
    const force = options.force || false;

    try {
      // Check if role exists and get its name
      const role = await this.findById(safeId);
      if (!role) {
        throw new Error(MODEL_ERRORS.ROLE.NOT_FOUND);
      }

      // Check if role is protected
      if (this.isProtected(role.name)) {
        throw new Error(MODEL_ERRORS.ROLE.PROTECTED_DELETE);
      }

      // Check if any users have this role
      const checkQuery =
        'SELECT COUNT(*) as count FROM users WHERE role_id = $1';
      const checkResult = await db.query(checkQuery, [safeId]);
      const userCount = parseInt(checkResult.rows[0].count);

      if (userCount > 0 && !force) {
        throw new Error(MODEL_ERRORS.ROLE.USERS_ASSIGNED(userCount));
      }

      // If force=true and users exist, their role_id will be set to NULL automatically (ON DELETE SET NULL)
      const query = 'DELETE FROM roles WHERE id = $1 RETURNING *';
      const result = await db.query(query, [safeId]);

      if (result.rows.length === 0) {
        throw new Error(MODEL_ERRORS.ROLE.NOT_FOUND);
      }

      return {
        role: result.rows[0],
        affectedUsers: userCount,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get count of users assigned to a role (for deletion warning)
   *
   * TYPE SAFE: Validates roleId is a positive integer
   *
   * @param {number|string} roleId - Role ID (will be coerced to integer)
   * @returns {Promise<number>} Count of users with this role
   * @throws {Error} If roleId is not a valid positive integer
   */
  static async getUserCount(roleId) {
    // TYPE SAFETY: Ensure roleId is a valid positive integer
    const safeRoleId = toSafeInteger(roleId, 'roleId', {
      min: 1,
      allowNull: false,
    });

    const query = 'SELECT COUNT(*) as count FROM users WHERE role_id = $1';
    const result = await db.query(query, [safeRoleId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get users by role (uses users.role_id FK)
   *
   * TYPE SAFE: Validates roleId is a positive integer
   *
   * @param {number|string} roleId - Role ID (will be coerced to integer)
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 10)
   * @returns {Promise<Object>} Object with users array and pagination metadata
   * @throws {Error} If roleId is not a valid positive integer
   */
  static async getUsersByRole(roleId, options = {}) {
    // TYPE SAFETY: Ensure roleId is a valid positive integer
    const safeRoleId = toSafeInteger(roleId, 'roleId', {
      min: 1,
      allowNull: false,
    });

    const page = toSafeInteger(options.page || 1, 'page', {
      min: 1,
      allowNull: false,
    });
    const limit = toSafeInteger(options.limit || 10, 'limit', {
      min: 1,
      max: 200,
      allowNull: false,
    });

    const offset = (page - 1) * limit;

    // Get total count for pagination metadata
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE u.role_id = $1 AND u.is_active = true
    `;
    const countResult = await db.query(countQuery, [safeRoleId]);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated users
    const query = `
      SELECT 
        u.id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        u.is_active,
        u.created_at
      FROM users u
      WHERE u.role_id = $1 AND u.is_active = true
      ORDER BY u.first_name, u.last_name
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [safeRoleId, limit, offset]);

    return {
      users: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = Role;
