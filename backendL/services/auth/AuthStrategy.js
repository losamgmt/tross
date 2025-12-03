/**
 * Authentication Strategy Interface
 *
 * Base class defining the contract for all authentication strategies.
 * Implements the Strategy Pattern for clean, swappable authentication providers.
 *
 * @abstract
 */
class AuthStrategy {
  /**
   * Authenticate user with provided credentials
   * @abstract
   * @param {Object} _credentials - Authentication credentials (varies by strategy)
   * @returns {Promise<{token: string, user: Object}>}
   */
  async authenticate(_credentials) {
    throw new Error('authenticate() must be implemented by subclass');
  }

  /**
   * Verify and decode authentication token
   * @abstract
   * @param {string} _token - JWT or Auth0 token
   * @returns {Promise<Object>} Decoded user data
   */
  async verifyToken(_token) {
    throw new Error('verifyToken() must be implemented by subclass');
  }

  /**
   * Get user profile/info from token or user ID
   * @abstract
   * @param {string} _tokenOrUserId - Authentication token or user identifier
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(_tokenOrUserId) {
    throw new Error('getUserProfile() must be implemented by subclass');
  }

  /**
   * Get provider name for identification
   * @abstract
   * @returns {string} Provider name (e.g., 'development', 'auth0')
   */
  getProviderName() {
    throw new Error('getProviderName() must be implemented by subclass');
  }

  /**
   * Optional: Refresh access token
   * @param {string} _refreshToken - Refresh token
   * @returns {Promise<{token: string}>}
   */
  async refreshToken(_refreshToken) {
    // Default: not supported
    throw new Error('Token refresh not supported by this provider');
  }

  /**
   * Optional: Logout user and invalidate token
   * @param {string} _token - Token to invalidate
   * @returns {Promise<void>}
   */
  async logout(_token) {
    // Default: stateless JWT - no server-side logout needed
    return Promise.resolve();
  }
}

module.exports = AuthStrategy;
