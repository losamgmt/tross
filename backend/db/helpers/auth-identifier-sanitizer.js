/**
 * Auth Identifier Sanitizer
 *
 * SRP LITERALISM: ONLY strips external authentication identifiers from output
 *
 * RENAMES:
 * - Was: output-filter-helper.js → auth-identifier-sanitizer.js
 * - filterOutput → stripAuthIdentifiers (more descriptive)
 * - filterOutputArray → stripAuthIdentifiersArray
 *
 * PURPOSE:
 * Removes external auth provider identifiers (auth0_id, etc.) from API responses.
 * These fields are internal security data, not useful to API consumers.
 *
 * NOTE: This is DIFFERENT from role-based field filtering (field-access-controller.js).
 * This sanitizer removes fields unconditionally; field-access-controller filters by role.
 *
 * SECURITY FIELDS (never returned to clients):
 * - auth0_id - External auth provider ID (security-sensitive, not useful to clients)
 * - refresh_token - Session tokens (future-proofing)
 * - api_key - API secrets (future-proofing)
 * - api_secret, secret_key, private_key - Various secrets
 *
 * USAGE:
 *   const { stripAuthIdentifiers } = require('../db/helpers/auth-identifier-sanitizer');
 *   const safeUser = stripAuthIdentifiers(user, userMetadata);
 *   const safeUsers = stripAuthIdentifiersArray(users, userMetadata);
 *
 * @module db/helpers/auth-identifier-sanitizer
 */

const { logger } = require('../../config/logger');

/**
 * Fields that contain external auth identifiers - ALWAYS stripped from output
 *
 * These are security-sensitive fields that clients should never receive:
 * - They're internal implementation details (which auth provider we use)
 * - They could be used for impersonation attacks if leaked
 * - They provide no value to legitimate API consumers
 */
const AUTH_IDENTIFIERS = Object.freeze([
  'auth0_id',        // Auth0 user identifier (sub claim)
  'refresh_token',   // OAuth refresh tokens (if we ever store them)
  'api_key',         // API keys for integrations
  'api_secret',      // API secrets
  'secret_key',      // Generic secret keys
  'private_key',     // Cryptographic private keys
]);

/**
 * Strip external auth identifiers from a single entity record
 *
 * Uses blacklist approach: removes AUTH_IDENTIFIERS + metadata.sensitiveFields from output.
 * This creates a new object - the original is NOT mutated.
 *
 * @param {Object} record - Entity record from database
 * @param {Object} metadata - Entity metadata from config/models
 * @param {string[]} [metadata.sensitiveFields] - Additional entity-specific fields to exclude
 * @returns {Object} Sanitized record with auth identifiers removed
 *
 * @example
 *   // Remove auth0_id from user response
 *   const safeUser = stripAuthIdentifiers(
 *     { id: 1, email: 'test@example.com', auth0_id: 'auth0|abc123' },
 *     { tableName: 'users' }
 *   );
 *   // Returns: { id: 1, email: 'test@example.com' }
 */
function stripAuthIdentifiers(record, metadata = {}) {
  // Handle null/undefined input gracefully
  if (!record || typeof record !== 'object') {
    return record;
  }

  // Don't modify arrays - use stripAuthIdentifiersArray for those
  if (Array.isArray(record)) {
    logger.warn('stripAuthIdentifiers received array - use stripAuthIdentifiersArray instead');
    return stripAuthIdentifiersArray(record, metadata);
  }

  const { sensitiveFields = [] } = metadata;

  // Combine default auth identifiers with entity-specific sensitive fields
  const fieldsToExclude = new Set([...AUTH_IDENTIFIERS, ...sensitiveFields]);

  const sanitized = {};
  for (const [key, value] of Object.entries(record)) {
    if (!fieldsToExclude.has(key)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Strip external auth identifiers from an array of entity records
 *
 * @param {Object[]} records - Array of entity records from database
 * @param {Object} metadata - Entity metadata from config/models
 * @returns {Object[]} Array of sanitized records
 *
 * @example
 *   const safeUsers = stripAuthIdentifiersArray(users, userMetadata);
 */
function stripAuthIdentifiersArray(records, metadata = {}) {
  if (!Array.isArray(records)) {
    logger.warn('stripAuthIdentifiersArray received non-array - using stripAuthIdentifiers');
    return stripAuthIdentifiers(records, metadata);
  }

  return records.map((record) => stripAuthIdentifiers(record, metadata));
}

/**
 * Check if a field is an auth identifier that should be stripped
 *
 * @param {string} fieldName - Field name to check
 * @param {Object} metadata - Entity metadata
 * @returns {boolean} True if field is sensitive
 */
function isAuthIdentifier(fieldName, metadata = {}) {
  const { sensitiveFields = [] } = metadata;
  const allSensitive = new Set([...AUTH_IDENTIFIERS, ...sensitiveFields]);
  return allSensitive.has(fieldName);
}

/**
 * Get list of auth identifier fields
 *
 * @returns {string[]} Array of field names that are always stripped
 */
function getAuthIdentifierFields() {
  return [...AUTH_IDENTIFIERS];
}

// =============================================================================
// BACKWARD COMPATIBILITY ALIASES
// These maintain compatibility with existing code using old function names
// =============================================================================

/** @deprecated Use stripAuthIdentifiers instead */
const filterOutput = stripAuthIdentifiers;

/** @deprecated Use stripAuthIdentifiersArray instead */
const filterOutputArray = stripAuthIdentifiersArray;

/** @deprecated Use isAuthIdentifier instead */
const isSensitiveField = isAuthIdentifier;

/** @deprecated Use getAuthIdentifierFields instead */
const getAlwaysSensitiveFields = getAuthIdentifierFields;

module.exports = {
  // New, descriptive names
  stripAuthIdentifiers,
  stripAuthIdentifiersArray,
  isAuthIdentifier,
  getAuthIdentifierFields,

  // Backward compatibility (deprecated)
  filterOutput,
  filterOutputArray,
  isSensitiveField,
  getAlwaysSensitiveFields,

  // Exported for testing
  _AUTH_IDENTIFIERS: AUTH_IDENTIFIERS,
  // Legacy alias
  _ALWAYS_SENSITIVE: AUTH_IDENTIFIERS,
};
