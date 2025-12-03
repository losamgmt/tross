/**
 * Centralized Validator Exports
 *
 * Single import point for all validation utilities.
 *
 * Usage:
 *   const { validateIdParam, toSafeUserId, logValidationFailure } = require('../validators');
 */

// Export type coercion utilities
const {
  toSafeInteger,
  toSafeUserId,
  toSafeBoolean,
  toSafePagination,
  toSafeUuid,
  toSafeString,
  toSafeEmail,
} = require('./type-coercion');

// Export URL param validators
const {
  validateIdParam,
  validateIdParams,
  validateSlugParam,
} = require('./param-validators');

// Export query string validators
const {
  validatePagination,
  validateSearch,
  validateSort,
  validateFilters,
  validateQuery, // NEW: Metadata-driven query validation
} = require('./query-validators');

// Export logging utilities
const {
  logValidationFailure,
  logTypeCoercion,
  logValidationSuccess,
} = require('./validation-logger');

// Export body validators (request payload validation)
const {
  validateUserCreate,
  validateProfileUpdate,
  validateRoleAssignment,
  validateRoleCreate,
  validateRoleUpdate,
  validateAuthCallback,
  validateAuth0Token,
  validateAuth0Refresh,
  validateRefreshToken,
} = require('./body-validators');

module.exports = {
  // Type Coercion
  toSafeInteger,
  toSafeUserId,
  toSafeBoolean,
  toSafePagination,
  toSafeUuid,
  toSafeString,
  toSafeEmail,

  // URL Param Validators
  validateIdParam,
  validateIdParams,
  validateSlugParam,

  // Query String Validators
  validatePagination,
  validateSearch,
  validateSort,
  validateFilters,
  validateQuery, // NEW: Metadata-driven query validation

  // Body Validators (from existing middleware)
  validateUserCreate,
  validateProfileUpdate,
  validateRoleAssignment,
  validateRoleCreate,
  validateRoleUpdate,
  validateAuthCallback,
  validateAuth0Token,
  validateAuth0Refresh,
  validateRefreshToken,

  // Logging
  logValidationFailure,
  logTypeCoercion,
  logValidationSuccess,
};
