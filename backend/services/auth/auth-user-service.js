/**
 * Auth User Service
 *
 * SRP: Handles authentication-related user operations
 *
 * PHILOSOPHY:
 * - Specialized for Auth0/authentication flows
 * - Delegates CRUD to GenericEntityService
 * - Handles account linking and user creation from auth providers
 * - Supports both database and in-memory (dev/mock) user modes
 *
 * MERGED FROM: user-data.js (consolidated for SRP compliance)
 *
 * USAGE:
 *   const user = await AuthUserService.findOrCreateFromAuth0(auth0Data);
 *   const users = await AuthUserService.getAllUsers();
 *   const user = await AuthUserService.getUserByAuth0Id(auth0Id);
 */

const GenericEntityService = require('../entity/generic-entity-service');
const db = require('../../db/connection');
const { logger } = require('../../config/logger');
const AppError = require('../../utils/app-error');
const { TEST_USERS } = require('../../config/test-users');
const { useInMemoryUsers } = require('../../config/app-mode');

class AuthUserService {
  /**
   * Find or create a user from Auth0 token data
   *
   * SRP: Handles Auth0 authentication flow - find existing user or create new one
   *
   * This method:
   * 1. Looks up user by auth0_id
   * 2. If not found, tries to link by email (account linking)
   * 3. If still not found, creates new user
   *
   * @param {Object} auth0Data - Auth0 token payload
   * @param {string} auth0Data.sub - Auth0 user ID
   * @param {string} auth0Data.email - User email
   * @param {string} [auth0Data.given_name] - First name
   * @param {string} [auth0Data.family_name] - Last name
   * @param {string} [auth0Data.role] - Custom claim: user role
   * @returns {Promise<Object>} User object with role
   * @throws {Error} If auth0Data is invalid
   *
   * @example
   *   const user = await AuthUserService.findOrCreateFromAuth0({
   *     sub: 'auth0|abc123',
   *     email: 'user@example.com',
   *     given_name: 'John',
   *     family_name: 'Doe',
   *   });
   */
  static async findOrCreateFromAuth0(auth0Data) {
    // Import mapper utilities (lazy load to avoid circular deps)
    const {
      mapAuth0ToUser,
      validateAuth0Data,
    } = require('../../utils/auth0-mapper');

    // Validate Auth0 data
    validateAuth0Data(auth0Data);

    try {
      // Step 1: Try to find by Auth0 ID
      let user = await GenericEntityService.findByField(
        'user',
        'auth0_id',
        auth0Data.sub,
      );

      if (user) {
        logger.debug('User found by auth0_id', {
          auth0Id: auth0Data.sub,
          userId: user.id,
        });
        return user;
      }

      // Step 2: Try account linking by email
      if (auth0Data.email) {
        const existingUser = await GenericEntityService.findByField(
          'user',
          'email',
          auth0Data.email,
        );

        if (existingUser && existingUser.is_active) {
          // Link accounts: update auth0_id on existing user
          logger.info('Linking Auth0 account to existing user', {
            auth0Id: auth0Data.sub,
            email: auth0Data.email,
            userId: existingUser.id,
          });

          await db.query(
            'UPDATE users SET auth0_id = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
            [auth0Data.sub, auth0Data.email],
          );

          // Re-fetch to get updated user with JOINs
          user = await GenericEntityService.findByField(
            'user',
            'auth0_id',
            auth0Data.sub,
          );
          return user;
        }
      }

      // Step 3: Create new user
      const mappedData = mapAuth0ToUser(auth0Data);

      // Look up the role ID from role name
      const role = await GenericEntityService.findByField(
        'role',
        'name',
        mappedData.roleName,
      );
      if (!role) {
        throw new AppError(
          `Default role '${mappedData.roleName}' not found`,
          500,
          'INTERNAL_ERROR',
        );
      }

      logger.info('Creating new user from Auth0', {
        auth0Id: auth0Data.sub,
        email: auth0Data.email,
        roleName: mappedData.roleName,
      });

      // Create user with role_id via GenericEntityService
      await GenericEntityService.create('user', {
        auth0_id: mappedData.auth0_id,
        email: mappedData.email,
        first_name: mappedData.first_name,
        last_name: mappedData.last_name,
        role_id: role.id,
      });

      // Re-fetch to get full user with JOINed role name
      user = await GenericEntityService.findByField(
        'user',
        'auth0_id',
        auth0Data.sub,
      );

      return user;
    } catch (error) {
      logger.error('Error in findOrCreateFromAuth0', {
        error: error.message,
        auth0Id: auth0Data?.sub,
        email: auth0Data?.email,
      });
      throw error;
    }
  }

  // ===========================================================================
  // USER DATA METHODS (Merged from user-data.js)
  // ===========================================================================
  // These methods handle both in-memory (dev/mock) and database user sources

  /**
   * Check if using in-memory test users
   * @deprecated Use useInMemoryUsers() from app-mode.js directly
   */
  static isConfigMode() {
    return useInMemoryUsers();
  }

  /**
   * Helper to format test user for API response
   * @private
   */
  static _formatTestUser(testUser) {
    return {
      id: null, // No DB ID in config mode
      auth0_id: testUser.auth0_id,
      email: testUser.email,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      role: testUser.role,
      is_active: true,
      created_at: new Date().toISOString(),
      name: `${testUser.first_name} ${testUser.last_name}`,
    };
  }

  /**
   * Get all users - in-memory or database based
   *
   * DATA SOURCE SELECTION:
   * - useInMemoryUsers() = true  → Use TEST_USERS from config
   * - useInMemoryUsers() = false → Use database via GenericEntityService
   *
   * @returns {Promise<Array>} Array of user objects
   */
  static async getAllUsers() {
    if (useInMemoryUsers()) {
      return Object.values(TEST_USERS).map((user) =>
        this._formatTestUser(user),
      );
    } else {
      const result = await GenericEntityService.findAll('user', {
        includeInactive: false,
      });
      return result.data;
    }
  }

  /**
   * Get user by Auth0 ID - in-memory or database based
   *
   * @param {string} auth0Id - Auth0 user ID (sub claim)
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async getUserByAuth0Id(auth0Id) {
    if (useInMemoryUsers()) {
      const testUser = Object.values(TEST_USERS).find(
        (user) => user.auth0_id === auth0Id,
      );
      return testUser ? this._formatTestUser(testUser) : null;
    } else {
      return GenericEntityService.findByField('user', 'auth0_id', auth0Id);
    }
  }

  /**
   * Create or find user from auth data
   *
   * Alias for findOrCreateFromAuth0 with in-memory user support.
   * This is the primary method used by auth middleware.
   *
   * @param {Object} auth0Data - Auth0 token payload
   * @returns {Promise<Object>} User object
   */
  static async findOrCreateUser(auth0Data) {
    if (useInMemoryUsers()) {
      return this.getUserByAuth0Id(auth0Data.sub);
    } else {
      return this.findOrCreateFromAuth0(auth0Data);
    }
  }

  // ===========================================================================
  // HEALTH CHECK METHODS (Standard Service Pattern)
  // ===========================================================================

  /**
   * Check if auth user service is configured
   * @returns {boolean}
   */
  static isConfigured() {
    return true; // Service uses GenericEntityService which manages DB conn
  }

  /**
   * Get configuration info (no network call)
   * @returns {{configured: boolean, mode: string}}
   */
  static getConfigurationInfo() {
    return {
      configured: true,
      mode: useInMemoryUsers() ? 'in-memory' : 'database',
    };
  }

  /**
   * Deep health check - verifies user operations are working
   * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
   * @returns {Promise<{configured: boolean, reachable: boolean, responseTime: number, status: string, message?: string}>}
   */
  static async healthCheck(timeoutMs = 5000) {
    const start = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timed out')), timeoutMs);
      });

      // Test by getting all users (works for both modes)
      const queryPromise = this.getAllUsers();

      await Promise.race([queryPromise, timeoutPromise]);
      const responseTime = Date.now() - start;

      logger.debug('Auth user service health check passed', { responseTime });

      return {
        configured: true,
        reachable: true,
        responseTime,
        mode: useInMemoryUsers() ? 'in-memory' : 'database',
        status: 'healthy',
      };
    } catch (error) {
      const responseTime = Date.now() - start;

      let message = 'Auth user service connectivity failed';
      let status = 'critical';

      if (error.message?.includes('timed out')) {
        message = `Auth user service check timed out after ${timeoutMs}ms`;
        status = 'timeout';
      }

      logger.warn('Auth user service health check failed', {
        error: error.message,
        responseTime,
      });

      return {
        configured: true,
        reachable: false,
        responseTime,
        status,
        message,
      };
    }
  }
}

module.exports = AuthUserService;
