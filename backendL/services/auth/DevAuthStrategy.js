/**
 * Development Authentication Strategy
 *
 * JWT-based authentication using local test users for development and testing.
 * Implements AuthStrategy interface for the Strategy Pattern.
 */
const jwt = require('jsonwebtoken');
const AuthStrategy = require('./AuthStrategy');
const { TEST_USERS } = require('../../config/test-users');
const { AUTH, USER_ROLES: _USER_ROLES } = require('../../config/constants');
const { logger } = require('../../config/logger');

class DevAuthStrategy extends AuthStrategy {
  constructor() {
    super();
    this.jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';
    this.tokenExpiry = AUTH.JWT.DEFAULT_EXPIRY;
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getProviderName() {
    return 'development';
  }

  /**
   * Authenticate user with development credentials
   * @param {Object} credentials - {email: string} or {auth0_id: string} or {role: string}
   * @returns {Promise<{token: string, user: Object}>}
   */
  async authenticate(credentials) {
    try {
      let user = null;

      // Find user by email, auth0_id, or role
      if (credentials.email) {
        user = Object.values(TEST_USERS).find(
          (u) => u.email === credentials.email,
        );
      } else if (credentials.auth0_id) {
        user = TEST_USERS[credentials.auth0_id];
      } else if (credentials.role) {
        // Find first user with matching role
        user = Object.values(TEST_USERS).find(
          (u) => u.role === credentials.role,
        );
      }

      if (!user) {
        throw new Error('User not found in development test users');
      }

      // Generate JWT token with RFC 7519 standard claims
      const token = jwt.sign(
        {
          // REGISTERED CLAIMS (RFC 7519 Standard)
          iss: process.env.API_URL || 'https://api.trossapp.dev', // Issuer
          sub: user.auth0_id, // Subject (user ID)
          aud: process.env.API_URL || 'https://api.trossapp.dev', // Audience

          // PRIVATE CLAIMS (Application-specific)
          email: user.email,
          role: user.role,
          provider: 'development',
          userId: null, // No database ID in dev mode
        },
        this.jwtSecret,
        { expiresIn: this.tokenExpiry },
      );

      logger.info(
        `🔧 Dev auth: Generated token for ${user.email} (${user.role})`,
      );

      // Return complete user object (matches DB schema exactly)
      return {
        token,
        user: {
          ...user,
          name: `${user.first_name} ${user.last_name}`.trim() || 'User',
        },
      };
    } catch (error) {
      logger.error('Development authentication error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Verify JWT token and return decoded data
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} Decoded user data
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);

      // Ensure this is a development token
      if (decoded.provider !== 'development') {
        throw new Error('Invalid token provider');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Get user profile from test users
   * @param {string} auth0IdOrEmail - User identifier
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(auth0IdOrEmail) {
    try {
      let user = TEST_USERS[auth0IdOrEmail];

      if (!user) {
        // Try finding by email
        user = Object.values(TEST_USERS).find(
          (u) => u.email === auth0IdOrEmail,
        );
      }

      if (!user) {
        throw new Error('User not found');
      }

      // Return complete user object (matches DB schema exactly)
      return {
        ...user,
        name: `${user.first_name} ${user.last_name}`.trim() || 'User',
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Generate token for quick testing (convenience method)
   * @param {string} role - User role ('technician', 'admin', etc.)
   * @returns {string} JWT token
   */
  generateTestToken(role = 'technician') {
    const user =
      Object.values(TEST_USERS).find((u) => u.role === role) ||
      Object.values(TEST_USERS)[0];

    return jwt.sign(
      {
        auth0_id: user.auth0_id,
        email: user.email,
        role: user.role,
        provider: 'development',
      },
      this.jwtSecret,
      { expiresIn: this.tokenExpiry },
    );
  }

  /**
   * Get test user data (convenience method)
   * @param {string} role - User role
   * @returns {Object} User data
   */
  getTestUser(role = 'technician') {
    return (
      Object.values(TEST_USERS).find((u) => u.role === role) ||
      Object.values(TEST_USERS)[0]
    );
  }
}

module.exports = DevAuthStrategy;
