// User Data Service - Handles both config-based and database-based user data
const { TEST_USERS } = require('../config/test-users');

class UserDataService {
  constructor() {
    this.useTestAuth = process.env.USE_TEST_AUTH === 'true';
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  // Get all users - config or database based
  async getAllUsers() {
    if (this.useTestAuth && this.isDevelopment) {
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
      // Use database
      const User = require('../db/models/User');
      const result = await User.findAll({ includeInactive: false });
      return result.data; // Extract data array from paginated response
    }
  }

  // Get user by Auth0 ID - config or database based
  async getUserByAuth0Id(auth0Id) {
    if (this.useTestAuth && this.isDevelopment) {
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
      // Use database
      const User = require('../db/models/User');
      return User.findByAuth0Id(auth0Id);
    }
  }

  // Create or find user - config or database based
  async findOrCreateUser(auth0Data) {
    if (this.useTestAuth && this.isDevelopment) {
      // Just return the user from config (don't store anywhere)
      return this.getUserByAuth0Id(auth0Data.sub);
    } else {
      // Use database
      const User = require('../db/models/User');
      return User.findOrCreate(auth0Data);
    }
  }

  // Check if we're in config mode
  isConfigMode() {
    return this.useTestAuth && this.isDevelopment;
  }
}

module.exports = { UserDataService: new UserDataService() };
