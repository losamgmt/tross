// Robust User model with error handling and validation
// STRANGLER-FIG PATTERN: Delegates standard CRUD to GenericEntityService
// Keeps Auth0-specific logic (createFromAuth0, findOrCreate) in this model
const db = require('../connection');
const { logger } = require('../../config/logger');
const { MODEL_ERRORS } = require('../../config/constants');
const { toSafeInteger } = require('../../validators/type-coercion');
const { deleteWithAuditCascade } = require('../helpers/delete-helper');
const userMetadata = require('../../config/models/user-metadata');
const { mapAuth0ToUser, validateAuth0Data } = require('../../utils/auth0-mapper');
const GenericEntityService = require('../../services/generic-entity-service');

class User {
  // ============================================================================
  // PRIVATE HELPERS (minimal - most logic now in GenericEntityService)
  // ============================================================================

  /**
   * Validate user data contextually
   * Handles nullable auth0_id for legitimate cases:
   *  - Dev mode: synthetic IDs generated
   *  - Pending activation: awaiting first login
   *
   * @private
   * @param {Object} user - User data
   * @param {Object} context - Validation context
   * @param {boolean} context.isDev - Is development environment
   * @param {boolean} context.isApiResponse - Is being returned to API client
   * @returns {Object} Validated/enriched user data
   */
  static _validateUserData(user, context = {}) {
    const isDev = process.env.NODE_ENV === 'development' || context.isDev;
    const status = user.status || 'active';

    // If no auth0_id, handle contextually
    if (!user.auth0_id) {
      // Dev mode: provide synthetic ID for consistency
      if (isDev && context.isApiResponse) {
        return {
          ...user,
          auth0_id: `dev-user-${user.id}`,
          _synthetic: true, // Flag for client awareness
        };
      }

      // Pending activation: OK for now
      if (status === 'pending_activation') {
        return user; // Valid state - awaiting first login
      }

      // Active user without auth0_id is data integrity issue
      if (status === 'active') {
        logger.warn('Data integrity issue: Active user missing auth0_id', {
          userId: user.id,
          email: user.email,
        });
        // Don't throw - log and continue (defensive)
      }
    }

    return user;
  }

  // ============================================================================
  // PUBLIC METHODS - DELEGATED TO GenericEntityService
  // ============================================================================

  // NOTE: findByAuth0Id has been removed - use GenericEntityService.findByField('user', 'auth0_id', value)

  /**
   * Find user by ID with role
   * STRANGLER-FIG: Delegates to GenericEntityService
   *
   * @param {number|string} id - User ID (will be coerced to integer)
   * @param {Object} req - Express request with RLS context (optional)
   * @returns {Promise<Object|null>} User object with role or null if not found
   * @throws {Error} If id is not a valid positive integer
   */
  static async findById(id, req = null) {
    // Build RLS context from request (if provided)
    const rlsContext = req && req.rlsPolicy ? {
      policy: req.rlsPolicy,
      userId: req.rlsUserId,
    } : null;

    // Delegate to GenericEntityService
    const user = await GenericEntityService.findById('user', id, rlsContext);

    // Apply user-specific validation
    return user ? this._validateUserData(user, { isApiResponse: false }) : null;
  }

  /**
   * Find all users with pagination, search, filters, and sorting
   * STRANGLER-FIG: Delegates to GenericEntityService
   *
   * @param {Object} options - Query options (page, limit, search, filters, sortBy, sortOrder)
   * @returns {Promise<Object>} { data: User[], pagination: {...}, appliedFilters: {...} }
   */
  static async findAll(options = {}) {
    // Build RLS context from request (if provided)
    const rlsContext = options.req && options.req.rlsPolicy ? {
      policy: options.req.rlsPolicy,
      userId: options.req.rlsUserId,
    } : null;

    // Delegate to GenericEntityService
    const result = await GenericEntityService.findAll('user', options, rlsContext);

    // Apply user-specific validation to all results
    result.data = result.data.map(user =>
      this._validateUserData(user, { isApiResponse: true }),
    );

    return result;
  }

  /**
   * Update user profile with validation
   * STRANGLER-FIG: Delegates to GenericEntityService
   *
   * @param {number|string} id - User ID (will be coerced to integer)
   * @param {Object} updates - Fields to update (email is excluded - immutable via Auth0)
   * @param {Object} context - Optional context for audit logging
   * @returns {Promise<Object>} Updated user object
   * @throws {Error} If id is invalid or no valid fields to update
   */
  static async update(id, updates, context = null) {
    // Build audit context from options (if provided)
    const options = context ? { auditContext: context } : {};

    // Delegate to GenericEntityService
    const updatedUser = await GenericEntityService.update('user', id, updates, options);

    if (!updatedUser) {
      throw new Error(MODEL_ERRORS.USER.NOT_FOUND);
    }

    return updatedUser;
  }

  // ============================================================================
  // AUTH0-SPECIFIC METHODS (kept in User model)
  // ============================================================================

  /**
   * Create user from Auth0 data
   * SRP: Uses auth0-mapper for field mapping, GenericEntityService for role lookup
   *
   * @param {Object} auth0Data - Auth0 user data
   * @param {string} auth0Data.sub - Auth0 user ID
   * @param {string} auth0Data.email - User email
   * @param {string} [auth0Data.given_name] - User first name
   * @param {string} [auth0Data.family_name] - User last name
   * @param {string} [auth0Data.role] - User role from JWT custom claim (Auth0 Action sets this)
   * @returns {Promise<Object>} Created user object
   */
  static async createFromAuth0(auth0Data) {
    // SRP: Delegate field mapping to auth0-mapper
    validateAuth0Data(auth0Data);
    const mappedData = mapAuth0ToUser(auth0Data);

    try {
      // Single INSERT with role_id - no transaction needed (KISS)
      // SRP: Role name from mapper (configurable default, not hardcoded)
      const userQuery = `
        INSERT INTO users (auth0_id, email, first_name, last_name, role_id) 
        VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = $5))
        RETURNING *
      `;
      const userResult = await db.query(userQuery, [
        mappedData.auth0_id,
        mappedData.email,
        mappedData.first_name,
        mappedData.last_name,
        mappedData.roleName,
      ]);

      return userResult.rows[0];
    } catch (error) {
      logger.error('Error creating user from Auth0', {
        error: error.message,
        email: mappedData.email,
      });

      if (error.constraint === 'users_auth0_id_key') {
        throw new Error(MODEL_ERRORS.USER.USER_EXISTS);
      }
      if (error.constraint === 'users_email_key') {
        throw new Error(MODEL_ERRORS.USER.EMAIL_EXISTS);
      }

      throw new Error(MODEL_ERRORS.USER.CREATION_FAILED);
    }
  }

  /**
   * Find or create user from Auth0 token
   * Handles account linking: if user exists by email but different auth0_id, links them
   * SRP: Uses GenericEntityService for lookups, auth0-mapper for validation
   *
   * @param {Object} auth0Data - Auth0 token payload
   * @returns {Promise<Object>} User object with role
   */
  static async findOrCreate(auth0Data) {
    // SRP: Validate using mapper
    validateAuth0Data(auth0Data);

    try {
      // First, try to find by Auth0 ID using GenericEntityService
      let user = await GenericEntityService.findByField('user', 'auth0_id', auth0Data.sub);

      if (!user && auth0Data.email) {
        // Check if user exists by email (might have been created manually or with different Auth0 connection)
        const existingUser = await GenericEntityService.findByField('user', 'email', auth0Data.email);

        if (existingUser && existingUser.is_active) {
          // User exists with this email - update their auth0_id to link accounts
          await db.query(
            'UPDATE users SET auth0_id = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
            [auth0Data.sub, auth0Data.email],
          );

          // Now find the user by their newly linked auth0_id
          user = await GenericEntityService.findByField('user', 'auth0_id', auth0Data.sub);
        }
      }

      // If still no user, create new one
      if (!user) {
        user = await this.createFromAuth0(auth0Data);
        // Fetch with role after creation
        user = await GenericEntityService.findByField('user', 'auth0_id', auth0Data.sub);
      }

      return user;
    } catch (error) {
      logger.error('Error in findOrCreate', {
        error: error.message,
        auth0Id: auth0Data?.sub,
      });
      throw error;
    }
  }

  // Create user manually (admin function, no Auth0 ID required)
  // Create new user (manual creation)
  // KISS: Direct role_id foreign key (many-to-one relationship)
  static async create(userData) {
    const { email, first_name, last_name, role_id, auth0_id } = userData;

    // Sanitize empty strings to trigger proper validation
    const sanitizedEmail = email?.trim() || null;

    if (!sanitizedEmail) {
      throw new Error(MODEL_ERRORS.USER.EMAIL_REQUIRED);
    }

    try {
      // Assign role if provided, otherwise use configurable default role
      let assignedRoleId = role_id;
      if (!assignedRoleId) {
        // SRP: Use GenericEntityService + configurable default from metadata
        const defaultRoleName = userMetadata.defaultRoleName || 'customer';
        const defaultRole = await GenericEntityService.findByField('role', 'name', defaultRoleName);
        if (!defaultRole) {
          throw new Error(`Default role '${defaultRoleName}' not found`);
        }
        assignedRoleId = defaultRole.id;
      }

      // Determine initial status:
      // - If auth0_id provided (from Auth0 SSO): active immediately
      // - If no auth0_id (manual creation by admin): pending_activation
      const status = auth0_id ? 'active' : 'pending_activation';

      // Single INSERT with role_id and status - no transaction needed (KISS)
      const userQuery = `
        INSERT INTO users (email, first_name, last_name, role_id, auth0_id, status) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `;
      const userResult = await db.query(userQuery, [
        sanitizedEmail,
        first_name || '',
        last_name || '',
        assignedRoleId,
        auth0_id || null,
        status,
      ]);

      // Return user with role
      return await this.findById(userResult.rows[0].id);
    } catch (error) {
      logger.error('Error creating user', { error: error.message, email });

      if (error.constraint === 'users_email_key') {
        throw new Error(MODEL_ERRORS.USER.EMAIL_EXISTS);
      }

      throw new Error(MODEL_ERRORS.USER.CREATION_FAILED);
    }
  }

  /**
   * Delete user permanently from database
   * DELETE = permanent removal. Period.
   * For deactivation, use update({ is_active: false })
   *
   * @param {number|string} id - User ID
   * @returns {Promise<Object>} Deleted user data
   * @throws {Error} If user not found
   */
  static async delete(id) {
    // TYPE SAFETY: Ensure id is a valid positive integer
    const safeId = toSafeInteger(id, 'userId', { min: 1, allowNull: false });

    return deleteWithAuditCascade({
      tableName: 'users',
      id: safeId,
      // Custom audit cascade: Delete BOTH audit logs ABOUT user AND BY user
      customAuditCascade: async (client, userId) => {
        // Delete audit logs ABOUT this user (resource_type='user', resource_id=<id>)
        await client.query(
          'DELETE FROM audit_logs WHERE resource_type = $1 AND resource_id = $2',
          ['user', userId],
        );

        // Delete audit logs BY this user (actions performed by the user)
        await client.query('DELETE FROM audit_logs WHERE user_id = $1', [userId]);

        logger.debug(`Deleted all audit logs for and by user ${userId}`);
      },
    });
  }

  // NOTE: findByIdIncludingInactive has been removed - use findById or GenericEntityService.findById with includeInactive option
  // NOTE: getAllIncludingInactive has been removed - use findAll({ includeInactive: true }) or GenericEntityService.findAll('user', { includeInactive: true })
}

module.exports = User;
