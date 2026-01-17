/**
 * Auth User Service
 *
 * SRP: ONLY handles authentication-related user operations
 *
 * PHILOSOPHY:
 * - Specialized for Auth0/authentication flows
 * - Delegates CRUD to GenericEntityService
 * - Handles account linking and user creation from auth providers
 *
 * USAGE:
 *   const user = await AuthUserService.findOrCreateFromAuth0(auth0Data);
 */

const GenericEntityService = require('./generic-entity-service');
const db = require('../db/connection');
const { logger } = require('../config/logger');
const AppError = require('../utils/app-error');

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
    const { mapAuth0ToUser, validateAuth0Data } = require('../utils/auth0-mapper');

    // Validate Auth0 data
    validateAuth0Data(auth0Data);

    try {
      // Step 1: Try to find by Auth0 ID
      let user = await GenericEntityService.findByField('user', 'auth0_id', auth0Data.sub);

      if (user) {
        logger.debug('User found by auth0_id', { auth0Id: auth0Data.sub, userId: user.id });
        return user;
      }

      // Step 2: Try account linking by email
      if (auth0Data.email) {
        const existingUser = await GenericEntityService.findByField('user', 'email', auth0Data.email);

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
          user = await GenericEntityService.findByField('user', 'auth0_id', auth0Data.sub);
          return user;
        }
      }

      // Step 3: Create new user
      const mappedData = mapAuth0ToUser(auth0Data);

      // Look up the role ID from role name
      const role = await GenericEntityService.findByField('role', 'name', mappedData.roleName);
      if (!role) {
        throw new AppError(`Default role '${mappedData.roleName}' not found`, 500, 'INTERNAL_ERROR');
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
      user = await GenericEntityService.findByField('user', 'auth0_id', auth0Data.sub);

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
}

module.exports = AuthUserService;
