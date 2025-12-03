/**
 * Type Coercion Utilities
 *
 * Safe type conversion with validation and logging.
 * Handles edge cases gracefully and provides clear error messages.
 *
 * ⚠️ IMPORTANT: Type coercion for URL params is NOT a code smell!
 *
 * HTTP Reality:
 * - URL path segments are ALWAYS strings (RFC 3986 spec)
 * - Express receives req.params.id = "7" (string)
 * - PostgreSQL expects INTEGER type (number)
 *
 * This module provides the type safety bridge between HTTP and Database layers.
 * It's defensive programming, not a hack.
 *
 * Philosophy: Be liberal in what you accept, strict in what you validate,
 * and ALWAYS log when you coerce to provide observability.
 */
const {
  logTypeCoercion,
  logValidationFailure,
} = require('./validation-logger');

/**
 * Safely coerce a value to an integer ID
 *
 * @param {*} value - Value to coerce
 * @param {string} fieldName - Name of field (for logging)
 * @param {Object} options - Coercion options
 * @param {boolean} options.allowNull - Allow null/undefined as valid (returns null)
 * @param {number} options.min - Minimum value (default: 1)
 * @param {number} options.max - Maximum value (optional)
 * @param {boolean} options.silent - Suppress coercion logging for expected conversions (e.g., query params)
 * @returns {number|null} Coerced integer or null
 * @throws {Error} If coercion fails and allowNull is false
 */
function toSafeInteger(value, fieldName = 'id', options = {}) {
  const {
    allowNull = false,
    min = 1,
    max = Number.MAX_SAFE_INTEGER,
    silent = false,
  } = options;

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    if (allowNull) {
      logTypeCoercion({
        field: fieldName,
        originalValue: value,
        originalType: typeof value,
        coercedValue: null,
        coercedType: 'null',
        reason: 'Null value allowed by configuration',
      });
      return null;
    }

    logValidationFailure({
      validator: 'toSafeInteger',
      field: fieldName,
      value,
      reason: `Field is required but received ${value}`,
    });
    throw new Error(`${fieldName} is required`);
  }

  // Attempt coercion
  const originalType = typeof value;
  const parsed = parseInt(value, 10);

  // Check if parsing succeeded
  if (isNaN(parsed)) {
    logValidationFailure({
      validator: 'toSafeInteger',
      field: fieldName,
      value,
      reason: 'Cannot convert to integer (parsed as NaN)',
    });
    throw new Error(`${fieldName} must be a valid integer`);
  }

  // Check range
  if (parsed < min) {
    logValidationFailure({
      validator: 'toSafeInteger',
      field: fieldName,
      value,
      reason: `Value ${parsed} is below minimum ${min}`,
    });
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  if (parsed > max) {
    logValidationFailure({
      validator: 'toSafeInteger',
      field: fieldName,
      value,
      reason: `Value ${parsed} exceeds maximum ${max}`,
    });
    throw new Error(`${fieldName} must be at most ${max}`);
  }

  // Log coercion if type changed (unless silent mode for expected conversions)
  if (originalType !== 'number' && !silent) {
    logTypeCoercion({
      field: fieldName,
      originalValue: value,
      originalType,
      coercedValue: parsed,
      coercedType: 'number',
      reason: 'Type conversion for database safety',
    });
  }

  return parsed;
}

/**
 * Safely coerce a userId value (handles dev tokens)
 *
 * Dev tokens may provide string auth0_id instead of integer database ID.
 * This function detects strings and returns null (dev users have no DB ID).
 *
 * @param {*} value - Value to coerce (number, string, or null)
 * @param {string} fieldName - Name of field (for logging)
 * @returns {number|null} Integer userId or null for dev tokens
 */
function toSafeUserId(value, fieldName = 'userId') {
  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Handle strings (likely dev token auth0_id)
  if (typeof value === 'string') {
    logTypeCoercion({
      field: fieldName,
      originalValue: value,
      originalType: 'string',
      coercedValue: null,
      coercedType: 'null',
      reason:
        'String userId detected (likely dev token) - dev users have no database ID',
    });
    return null;
  }

  // Handle fake dev user IDs (9991-9995) - convert to NULL for audit logs
  // These IDs exist in test-users.js but NOT in database
  if (typeof value === 'number' && value >= 9991 && value <= 9995) {
    logTypeCoercion({
      field: fieldName,
      originalValue: value,
      originalType: 'number',
      coercedValue: null,
      coercedType: 'null',
      reason: 'Dev user ID (9991-9995) - file-based user, no DB record',
    });
    return null;
  }

  // Handle numbers - validate as safe integer
  return toSafeInteger(value, fieldName, { allowNull: true, min: 1 });
}

/**
 * Safely coerce a boolean value
 *
 * @param {*} value - Value to coerce
 * @param {string} fieldName - Name of field (for logging)
 * @param {boolean} defaultValue - Default if value is null/undefined
 * @returns {boolean} Coerced boolean
 */
function toSafeBoolean(value, fieldName = 'boolean', defaultValue = false) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  const originalType = typeof value;

  // Handle string representations
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      logTypeCoercion({
        field: fieldName,
        originalValue: value,
        originalType: 'string',
        coercedValue: true,
        coercedType: 'boolean',
        reason: 'String to boolean conversion',
      });
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      logTypeCoercion({
        field: fieldName,
        originalValue: value,
        originalType: 'string',
        coercedValue: false,
        coercedType: 'boolean',
        reason: 'String to boolean conversion',
      });
      return false;
    }

    logValidationFailure({
      validator: 'toSafeBoolean',
      field: fieldName,
      value,
      reason: `Cannot convert string "${value}" to boolean`,
    });
    throw new Error(`${fieldName} must be a valid boolean`);
  }

  // Handle numbers
  if (typeof value === 'number') {
    const result = value !== 0;
    if (originalType !== 'boolean') {
      logTypeCoercion({
        field: fieldName,
        originalValue: value,
        originalType: 'number',
        coercedValue: result,
        coercedType: 'boolean',
        reason: 'Number to boolean conversion',
      });
    }
    return result;
  }

  // Already boolean
  return Boolean(value);
}

/**
 * Safely coerce pagination parameters
 *
 * @param {Object} query - Query string object
 * @param {Object} limits - Pagination limits from constants
 * @returns {Object} Validated { page, limit, offset }
 */
function toSafePagination(query, limits = { defaultLimit: 50, maxLimit: 200 }) {
  const page = toSafeInteger(query.page || 1, 'page', {
    min: 1,
    allowNull: false,
    silent: true,
  });
  const limit = toSafeInteger(query.limit || limits.defaultLimit, 'limit', {
    min: 1,
    max: limits.maxLimit,
    allowNull: false,
    silent: true,
  });
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Validate UUID v4 format
 *
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of field (for logging)
 * @param {Object} options - Validation options
 * @param {boolean} options.allowNull - Allow null/undefined as valid
 * @returns {string|null} Validated UUID or null
 * @throws {Error} If value is not a valid UUID
 */
function toSafeUuid(value, fieldName = 'uuid', options = {}) {
  const { allowNull = false } = options;

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    if (allowNull) {
      return null;
    }

    logValidationFailure({
      validator: 'toSafeUuid',
      field: fieldName,
      value,
      reason: `Field is required but received ${value}`,
    });
    throw new Error(`${fieldName} is required`);
  }

  // Must be string
  if (typeof value !== 'string') {
    logValidationFailure({
      validator: 'toSafeUuid',
      field: fieldName,
      value,
      reason: `UUID must be a string (received ${typeof value})`,
    });
    throw new Error(`${fieldName} must be a valid UUID string`);
  }

  // Validate UUID v4 format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    logValidationFailure({
      validator: 'toSafeUuid',
      field: fieldName,
      value,
      reason: 'Invalid UUID v4 format',
    });
    throw new Error(`${fieldName} must be a valid UUID v4`);
  }

  return value;
}

/**
 * Safely validate and coerce a string value
 *
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of field (for logging)
 * @param {Object} options - Validation options
 * @param {boolean} options.allowNull - Allow null/undefined as valid (returns null)
 * @param {number} options.minLength - Minimum string length
 * @param {number} options.maxLength - Maximum string length
 * @param {boolean} options.trim - Auto-trim whitespace (default: true)
 * @returns {string|null} Validated string or null
 * @throws {Error} If validation fails
 */
function toSafeString(value, fieldName = 'field', options = {}) {
  const {
    allowNull = false,
    minLength = 0,
    maxLength = Number.MAX_SAFE_INTEGER,
    trim = true,
  } = options;

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    if (allowNull) {
      logTypeCoercion({
        field: fieldName,
        originalValue: value,
        originalType: typeof value,
        coercedValue: null,
        coercedType: 'null',
        reason: 'Null value allowed by configuration',
      });
      return null;
    }

    logValidationFailure({
      validator: 'toSafeString',
      field: fieldName,
      value,
      reason: `Field is required but received ${value}`,
    });
    throw new Error(`${fieldName} is required`);
  }

  // Coerce to string
  const originalType = typeof value;
  let str = String(value);

  // Trim if requested
  if (trim) {
    const originalStr = str;
    str = str.trim();
    if (str !== originalStr) {
      logTypeCoercion({
        field: fieldName,
        originalValue: originalStr,
        originalType: 'string',
        coercedValue: str,
        coercedType: 'string',
        reason: 'Whitespace trimmed',
      });
    }
  }

  // Check empty after trim
  if (str === '' && !allowNull) {
    logValidationFailure({
      validator: 'toSafeString',
      field: fieldName,
      value,
      reason: 'String is empty after trimming',
    });
    throw new Error(`${fieldName} cannot be empty`);
  }

  // Check length
  if (str.length < minLength) {
    logValidationFailure({
      validator: 'toSafeString',
      field: fieldName,
      value: str,
      reason: `Length ${str.length} is below minimum ${minLength}`,
    });
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }

  if (str.length > maxLength) {
    logValidationFailure({
      validator: 'toSafeString',
      field: fieldName,
      value: str,
      reason: `Length ${str.length} exceeds maximum ${maxLength}`,
    });
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }

  // Log coercion if type changed
  if (originalType !== 'string') {
    logTypeCoercion({
      field: fieldName,
      originalValue: value,
      originalType,
      coercedValue: str,
      coercedType: 'string',
      reason: 'Type conversion to string',
    });
  }

  return str;
}

/**
 * Safely validate email format
 *
 * @param {*} value - Email to validate
 * @param {string} fieldName - Name of field (for logging)
 * @param {Object} options - Validation options
 * @param {boolean} options.allowNull - Allow null/undefined as valid
 * @returns {string|null} Validated email or null
 * @throws {Error} If email is invalid
 */
function toSafeEmail(value, fieldName = 'email', options = {}) {
  const { allowNull = false } = options;

  // First validate as string
  const email = toSafeString(value, fieldName, {
    allowNull,
    minLength: allowNull ? 0 : 3,
    maxLength: 255,
    trim: true,
  });

  if (email === null) {
    return null;
  }

  // Validate email format (RFC 5322 simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logValidationFailure({
      validator: 'toSafeEmail',
      field: fieldName,
      value: email,
      reason: 'Invalid email format',
    });
    throw new Error(`${fieldName} must be a valid email address`);
  }

  return email.toLowerCase(); // Normalize to lowercase
}

module.exports = {
  toSafeInteger,
  toSafeUserId,
  toSafeBoolean,
  toSafePagination,
  toSafeUuid,
  toSafeString,
  toSafeEmail,
};
