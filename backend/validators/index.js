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
} = require("./type-coercion");

// Export URL param validators
const { validateIdParam, validateIdParams } = require("./param-validators");

// Export query string validators
const {
  validatePagination,
  validateSearch,
  validateSort,
  validateQuery, // Metadata-driven query validation
} = require("./query-validators");

// Export logging utilities
const {
  logValidationFailure,
  logTypeCoercion,
  logValidationSuccess,
} = require("./validation-logger");

// Export body validators (request payload validation)
// Entity CRUD uses genericValidateBody() from middleware/generic-entity.js
// These are special-case validators for auth flows and profile updates
const {
  validateProfileUpdate,
  validateRoleAssignment,
  validateAuthCallback,
  validateAuth0Token,
  validateAuth0Refresh,
  validateRefreshToken,
} = require("./body-validators");

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

  // Query String Validators
  validatePagination,
  validateSearch,
  validateSort,
  validateQuery,

  // Body Validators (special-case only, not entity CRUD)
  validateProfileUpdate,
  validateRoleAssignment,
  validateAuthCallback,
  validateAuth0Token,
  validateAuth0Refresh,
  validateRefreshToken,

  // Logging
  logValidationFailure,
  logTypeCoercion,
  logValidationSuccess,
};
