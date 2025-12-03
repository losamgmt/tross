/**
 * Authentication Service - Unified Interface
 *
 * Clean, professional authentication service using Strategy Pattern.
 * Automatically selects between Development and Auth0 strategies based on AUTH_MODE.
 *
 * Usage:
 *   const authService = require('./services/auth');
 *   const { token, user } = await authService.authenticate(credentials);
 *
 * Configuration:
 *   Set AUTH_MODE environment variable:
 *   - 'development' or 'dev' → DevAuthStrategy (local JWT with test users)
 *   - 'production' or 'auth0' → Auth0Strategy (OAuth2/OIDC)
 */

const { AuthStrategyFactory, AUTH_MODES } = require('./AuthStrategyFactory');

/**
 * Unified Authentication Service
 * Delegates to the appropriate strategy based on AUTH_MODE
 */
class AuthService {
  /**
   * Authenticate user with provided credentials
   * @param {Object} credentials - Authentication credentials
   * @returns {Promise<{token: string, user: Object}>}
   */
  static async authenticate(credentials) {
    const strategy = AuthStrategyFactory.getStrategy();
    return strategy.authenticate(credentials);
  }

  /**
   * Verify and decode authentication token
   * @param {string} token - JWT or Auth0 token
   * @returns {Promise<Object>} Decoded user data
   */
  static async verifyToken(token) {
    const strategy = AuthStrategyFactory.getStrategy();
    return strategy.verifyToken(token);
  }

  /**
   * Get user profile
   * @param {string} tokenOrUserId - Authentication token or user identifier
   * @returns {Promise<Object>} User profile data
   */
  static async getUserProfile(tokenOrUserId) {
    const strategy = AuthStrategyFactory.getStrategy();
    return strategy.getUserProfile(tokenOrUserId);
  }

  /**
   * Refresh access token (if supported by strategy)
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<{token: string}>}
   */
  static async refreshToken(refreshToken) {
    const strategy = AuthStrategyFactory.getStrategy();
    return strategy.refreshToken(refreshToken);
  }

  /**
   * Logout user (if supported by strategy)
   * @param {string} token - Token to invalidate
   * @returns {Promise<void>}
   */
  static async logout(token) {
    const strategy = AuthStrategyFactory.getStrategy();
    return strategy.logout(token);
  }

  /**
   * Get current authentication provider name
   * @returns {string} 'development' or 'auth0'
   */
  static getProviderName() {
    const strategy = AuthStrategyFactory.getStrategy();
    return strategy.getProviderName();
  }

  /**
   * Get current auth mode
   * @returns {string}
   */
  static getCurrentMode() {
    return AuthStrategyFactory.getCurrentMode();
  }

  /**
   * Check if using development auth
   * @returns {boolean}
   */
  static isDevelopment() {
    return AuthStrategyFactory.isDevelopment();
  }

  /**
   * Check if using Auth0
   * @returns {boolean}
   */
  static isAuth0() {
    return AuthStrategyFactory.isAuth0();
  }

  /**
   * Get raw strategy instance (for advanced use cases)
   * @returns {AuthStrategy}
   */
  static getStrategy() {
    return AuthStrategyFactory.getStrategy();
  }
}

// Export unified service and constants
// Note: Export the class itself so static methods work
module.exports = AuthService;

// Attach additional exports
AuthService.AUTH_MODES = AUTH_MODES;
AuthService.AuthStrategyFactory = AuthStrategyFactory;

// For backward compatibility
AuthService.AuthProvider = {
  getInstance: () => AuthStrategyFactory.getStrategy(),
};
