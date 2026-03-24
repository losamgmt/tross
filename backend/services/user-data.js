// User Data Service - Handles both config-based and database-based user data
const { TEST_USERS } = require('../config/test-users');
const GenericEntityService = require('./generic-entity-service');
const AuthUserService = require('./auth-user-service');
const { useInMemoryUsers } = require('../config/app-mode');

/**
 * UserDataService - Static class for user data operations
 * Handles both in-memory (dev/mock) and database-based (test/production) user data
 *
 * DATA SOURCE SELECTION:
 * - useInMemoryUsers() = true  → Use TEST_USERS from config (LOCAL_DEV + MOCK_USERS=true)
 * - useInMemoryUsers() = false → Use database (TEST mode, PRODUCTION, or LOCAL_DEV without MOCK_USERS)
 */
class UserDataService {
  /**
   * Check if using in-memory test users
   * @deprecated Use useInMemoryUsers() from app-mode.js directly
   */
  static isConfigMode() {
    return useInMemoryUsers();
  }

  /**
   * Get all users - in-memory or database based
   */
  static async getAllUsers() {
    if (useInMemoryUsers()) {
      // Return test users from config
      return Object.values(TEST_USERS).map((user) => ({
        id: null, // No DB ID in config mode
        auth0_id: user.auth0_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: true,
        created_at: new Date().toISOString(),
        name: `${user.first_name} ${user.last_name}`, // Add formatted name
      }));
    } else {
      // Use database via GenericEntityService
      const result = await GenericEntityService.findAll('user', {
        includeInactive: false,
      });
      return result.data; // Extract data array from paginated response
    }
  }

  /**
   * Get user by Auth0 ID - in-memory or database based
   */
  static async getUserByAuth0Id(auth0Id) {
    if (useInMemoryUsers()) {
      // Find in test users config
      const testUser = Object.values(TEST_USERS).find(
        (user) => user.auth0_id === auth0Id,
      );
      if (testUser) {
        return {
          id: null,
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
      return null;
    } else {
      // Use GenericEntityService
      return GenericEntityService.findByField('user', 'auth0_id', auth0Id);
    }
  }

  /**
   * Create or find user - in-memory or database based
   */
  static async findOrCreateUser(auth0Data) {
    if (useInMemoryUsers()) {
      // Just return the user from config (don't store anywhere)
      return UserDataService.getUserByAuth0Id(auth0Data.sub);
    } else {
      // Use AuthUserService for Auth0-specific logic (SRP)
      return AuthUserService.findOrCreateFromAuth0(auth0Data);
    }
  }
}

module.exports = UserDataService;
