/**
 * SQL Safety Utilities
 *
 * Defense-in-depth utilities for SQL query construction.
 * Even when values come from trusted metadata, these utilities
 * provide an additional layer of protection against SQL injection.
 *
 * @module utils/sql-safety
 */

const AppError = require('./app-error');

/**
 * Valid SQL identifier pattern
 * Allows: lowercase letters, numbers, underscores
 * Must start with letter or underscore
 */
const VALID_IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/i;

/**
 * Maximum identifier length (PostgreSQL limit)
 */
const MAX_IDENTIFIER_LENGTH = 63;

/**
 * Sanitize a SQL identifier (table name, column name, etc.)
 *
 * This is a defense-in-depth measure. Even when identifiers come from
 * trusted metadata, this validation ensures no injection is possible.
 *
 * @param {string} identifier - The identifier to sanitize
 * @param {string} [context='identifier'] - Context for error messages
 * @returns {string} The validated identifier (unchanged if valid)
 * @throws {Error} If identifier is invalid
 *
 * @example
 * sanitizeIdentifier('users');           // 'users'
 * sanitizeIdentifier('work_orders');     // 'work_orders'
 * sanitizeIdentifier('users; DROP--');   // throws Error
 */
function sanitizeIdentifier(identifier, context = 'identifier') {
  if (typeof identifier !== 'string') {
    throw new AppError(`Invalid ${context}: must be a string, got ${typeof identifier}`, 400, 'BAD_REQUEST');
  }

  if (identifier.length === 0) {
    throw new AppError(`Invalid ${context}: cannot be empty`, 400, 'BAD_REQUEST');
  }

  if (identifier.length > MAX_IDENTIFIER_LENGTH) {
    throw new AppError(`Invalid ${context}: exceeds maximum length of ${MAX_IDENTIFIER_LENGTH}`, 400, 'BAD_REQUEST');
  }

  if (!VALID_IDENTIFIER_PATTERN.test(identifier)) {
    throw new AppError(
      `Invalid ${context}: "${identifier}" contains invalid characters. ` +
      'Only letters, numbers, and underscores are allowed.',
      400,
      'BAD_REQUEST',
    );
  }

  return identifier;
}

/**
 * Check if a field name is in an allowed list (whitelist validation)
 *
 * @param {string} fieldName - The field to check
 * @param {string[]} allowedFields - Array of allowed field names
 * @param {string} [context='field'] - Context for error messages
 * @returns {string} The field name if valid
 * @throws {Error} If field is not in allowed list
 */
function validateFieldAgainstWhitelist(fieldName, allowedFields, context = 'field') {
  if (!Array.isArray(allowedFields)) {
    throw new AppError(`${context} whitelist must be an array`, 400, 'BAD_REQUEST');
  }

  if (!allowedFields.includes(fieldName)) {
    throw new AppError(
      `Invalid ${context}: "${fieldName}" is not allowed. ` +
      `Allowed values: ${allowedFields.join(', ')}`,
      400,
      'BAD_REQUEST',
    );
  }

  return fieldName;
}

module.exports = {
  sanitizeIdentifier,
  validateFieldAgainstWhitelist,
};
