/**
 * ERROR_CODES - Machine-readable error codes (SINGLE SOURCE OF TRUTH)
 *
 * Every AppError and API error envelope carries one of these codes so the
 * frontend can drive localization, retry logic, and analytics off the code
 * rather than parsing human-readable message text.
 *
 * Format: CATEGORY_SPECIFIC_ERROR. Callers import ERROR_CODES and reference
 * ERROR_CODES.X - never hand-type the string - so codes cannot drift or typo.
 *
 * NOTE: db-error-handler.js maintains a separate PG_ERROR_CODES map for raw
 * PostgreSQL SQLSTATE codes; that is unrelated to these application codes.
 */
const ERROR_CODES = Object.freeze({
  // Authentication / authorization (AUTH_*)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Validation (VALIDATION_*)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',

  // Resource (RESOURCE_*)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Rate limiting (RATE_*)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server (SERVER_*)
  SERVER_ERROR: 'SERVER_ERROR',
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',
  SERVER_TIMEOUT: 'SERVER_TIMEOUT',

  // Database (DB_*)
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',

  // Domain-specific (workflow / business semantics; values preserved from
  // existing API usage so the client contract is unchanged)
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  IMMUTABLE_FIELD_VIOLATION: 'IMMUTABLE_FIELD_VIOLATION',
  IDEMPOTENCY_MISMATCH: 'IDEMPOTENCY_MISMATCH',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED',
  INTEGRATION_CONFIG_ERROR: 'INTEGRATION_CONFIG_ERROR',
});

module.exports = { ERROR_CODES };
