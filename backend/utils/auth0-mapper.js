/**
 * Auth0 Mapper Utility
 *
 * SRP: Maps Auth0 token data to local user schema
 * Extracts field mapping concerns from User model
 *
 * Why this exists:
 * - Auth0 uses different field names (sub, given_name, family_name)
 * - We need consistent mapping in one place
 * - Default role resolution is configurable, not hardcoded
 */

const userMetadata = require('../config/models/user-metadata');
const AppError = require('./app-error');

/**
 * Default role name for new users (configurable via metadata)
 * Falls back to 'customer' if not specified in metadata
 */
const DEFAULT_ROLE_NAME = userMetadata.defaultRoleName || 'customer';

/**
 * Map Auth0 token fields to local user fields
 *
 * Auth0 Standard Claims:
 * - sub: Auth0 user ID (e.g., "auth0|abc123")
 * - email: User email
 * - given_name: First name
 * - family_name: Last name
 *
 * Auth0 Custom Claims (from Auth0 Actions):
 * - role: User role (set by post-login Action)
 *
 * @param {Object} auth0Data - Auth0 token payload
 * @param {string} auth0Data.sub - Auth0 user ID
 * @param {string} auth0Data.email - User email
 * @param {string} [auth0Data.given_name] - First name
 * @param {string} [auth0Data.family_name] - Last name
 * @param {string} [auth0Data.role] - Custom claim: user role
 * @returns {Object} Mapped user data for local schema
 */
function mapAuth0ToUser(auth0Data) {
  if (!auth0Data) {
    throw new AppError('Auth0 data is required', 400, 'BAD_REQUEST');
  }

  const { sub, email, given_name, family_name, role } = auth0Data;

  if (!sub) {
    throw new AppError('Auth0 sub (user ID) is required', 400, 'BAD_REQUEST');
  }

  if (!email) {
    throw new AppError('Auth0 email is required', 400, 'BAD_REQUEST');
  }

  return {
    auth0_id: sub,
    email: email,
    first_name: given_name || '',
    last_name: family_name || '',
    // Role from JWT custom claim, or configurable default
    roleName: role || DEFAULT_ROLE_NAME,
  };
}

/**
 * Validate Auth0 data has minimum required fields
 *
 * @param {Object} auth0Data - Auth0 token payload
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateAuth0Data(auth0Data) {
  if (!auth0Data) {
    throw new AppError('Auth0 data is required', 400, 'BAD_REQUEST');
  }

  if (!auth0Data.sub) {
    throw new AppError('Auth0 sub (user ID) is required', 400, 'BAD_REQUEST');
  }

  if (!auth0Data.email) {
    throw new AppError('Auth0 email is required', 400, 'BAD_REQUEST');
  }

  return true;
}

/**
 * Get the default role name for new users
 *
 * @returns {string} Default role name
 */
function getDefaultRoleName() {
  return DEFAULT_ROLE_NAME;
}

module.exports = {
  mapAuth0ToUser,
  validateAuth0Data,
  getDefaultRoleName,
  DEFAULT_ROLE_NAME,
};
