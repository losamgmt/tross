/**
 * Validation Logging Service
 *
 * CRITICAL: All validation failures MUST be logged as WARNING (not debug)
 * This provides a paper trail for troubleshooting and security auditing.
 *
 * Philosophy: Invalid inputs are potential security issues or integration bugs.
 * They deserve permanent logging, not debug-only visibility.
 */
const { logger } = require('../config/logger');

/**
 * Log a validation failure with full context
 *
 * @param {Object} params - Logging parameters
 * @param {string} params.validator - Name of validator that failed
 * @param {string} params.field - Field/parameter that failed validation
 * @param {*} params.value - The invalid value
 * @param {string} params.reason - Why validation failed
 * @param {Object} params.context - Additional context (route, user, etc.)
 */
function logValidationFailure({
  validator,
  field,
  value,
  reason,
  context = {},
}) {
  // ALWAYS log at WARNING level - validation failures need visibility
  logger.warn('⚠️  Validation failure', {
    validator,
    field,
    value: typeof value === 'object' ? JSON.stringify(value) : value,
    valueType: typeof value,
    reason,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log a type coercion event
 * Used when we safely convert types (e.g., string -> number, string -> null)
 * This is EXPECTED behavior for URL params (always strings from HTTP)
 * Only logs in development to avoid noise in production
 *
 * @param {Object} params - Logging parameters
 * @param {string} params.field - Field being coerced
 * @param {*} params.originalValue - Original value
 * @param {string} params.originalType - Original type
 * @param {*} params.coercedValue - Coerced value
 * @param {string} params.coercedType - Coerced type
 * @param {string} params.reason - Why coercion was needed
 */
function logTypeCoercion({
  field,
  originalValue,
  originalType,
  coercedValue,
  coercedType,
  reason,
}) {
  // Only log in development - this is normal HTTP behavior
  if (process.env.NODE_ENV === 'development') {
    logger.info('🔄 Type coercion', {
      field,
      originalValue:
        typeof originalValue === 'object'
          ? JSON.stringify(originalValue)
          : originalValue,
      originalType,
      coercedValue:
        typeof coercedValue === 'object'
          ? JSON.stringify(coercedValue)
          : coercedValue,
      coercedType,
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Log successful validation (debug only - don't spam production logs)
 *
 * @param {Object} params - Logging parameters
 * @param {string} params.validator - Name of validator
 * @param {string} params.field - Field validated
 */
function logValidationSuccess({ validator, field }) {
  logger.debug('✅ Validation success', {
    validator,
    field,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  logValidationFailure,
  logTypeCoercion,
  logValidationSuccess,
};
