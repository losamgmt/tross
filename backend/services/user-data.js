// User Data Service - Handles both config-based and database-based user data
const { TEST_USERS } = require("../config/test-users");
const GenericEntityService = require("./generic-entity-service");
const AuthUserService = require("./auth-user-service");

/**
 * Check if we're in config mode (test auth + development)
 * Reads env vars fresh each call - no caching
 */
function isConfigMode() {
  return (
    process.env.USE_TEST_AUTH === "true" &&
    process.env.NODE_ENV === "development"
  );
}

/**
 * UserDataService - Static class for user data operations
 * Handles both config-based (dev/test) and database-based (production) user data
 */
class UserDataService {
  /**
   * Check if we're in config mode
   */
  static isConfigMode() {
    return isConfigMode();
  }

  /**
   * Get all users - config or database based
   */
  static async getAllUsers() {
    if (isConfigMode()) {
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
      const result = await GenericEntityService.findAll("user", {
        includeInactive: false,
      });
      return result.data; // Extract data array from paginated response
    }
  }

  /**
   * Get user by Auth0 ID - config or database based
   */
  static async getUserByAuth0Id(auth0Id) {
    if (isConfigMode()) {
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
      // Use GenericEntityService instead of User.findByAuth0Id
      return GenericEntityService.findByField("user", "auth0_id", auth0Id);
    }
  }

  /**
   * Create or find user - config or database based
   */
  static async findOrCreateUser(auth0Data) {
    if (isConfigMode()) {
      // Just return the user from config (don't store anywhere)
      return UserDataService.getUserByAuth0Id(auth0Data.sub);
    } else {
      // Use AuthUserService for Auth0-specific logic (SRP)
      return AuthUserService.findOrCreateFromAuth0(auth0Data);
    }
  }
}

module.exports = UserDataService;
