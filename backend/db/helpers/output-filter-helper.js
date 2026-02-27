/**
 * Output Filter Helper
 *
 * SRP LITERALISM: ONLY filters sensitive fields from entity output
 *
 * PHILOSOPHY:
 * - METADATA-DRIVEN: Uses entity metadata to determine what to strip
 * - SECURE-BY-DEFAULT: If no config, returns safe defaults
 * - COMPOSABLE: Works with single records or arrays
 * - IMMUTABLE: Returns new objects, never mutates input
 *
 * SENSITIVE FIELDS (never returned to clients):
 * - auth0_id - External auth provider ID (not useful to clients)
 * - refresh_token - Session tokens (if we ever add them)
 * - api_key - API secrets (future-proofing)
 *
 * USAGE:
 *   const safeUser = filterOutput(user, userMetadata);
 *   const safeUsers = filterOutputArray(users, userMetadata);
 */

const { logger } = require('../../config/logger');

/**
 * Default sensitive fields that should NEVER be returned to clients
 * These are stripped regardless of metadata configuration
 *
 * NOTE: We use Auth0 for authentication - we do NOT store passwords.
 * auth0_id is the only auth-related field we have, and it's sensitive
 * because it's an external system identifier, not useful to clients.
 */
const ALWAYS_SENSITIVE = [
  'auth0_id', // External auth provider ID - not useful to clients
  'refresh_token', // Session tokens (if we ever add them)
  'api_key', // API secrets (future-proofing)
  'api_secret',
  'secret_key',
  'private_key',
];

/**
 * Filter sensitive fields from a single entity record
 *
 * Uses blacklist approach: removes sensitiveFields + ALWAYS_SENSITIVE from output.
 *
 * @param {Object} record - Entity record from database
 * @param {Object} metadata - Entity metadata from config/models
 * @param {string[]} [metadata.sensitiveFields] - Additional fields to exclude
 * @returns {Object} Filtered record with sensitive fields removed
 *
 * @example
 *   // Remove auth0_id from user response
 *   const safeUser = filterOutput(
 *     { id: 1, email: 'test@example.com', auth0_id: 'auth0|abc123' },
 *     { tableName: 'users' }
 *   );
 *   // Returns: { id: 1, email: 'test@example.com' }
 */
function filterOutput(record, metadata = {}) {
  // Handle null/undefined input gracefully
  if (!record || typeof record !== 'object') {
    return record;
  }

  // Don't modify arrays - use filterOutputArray for those
  if (Array.isArray(record)) {
    logger.warn('filterOutput received array - use filterOutputArray instead');
    return filterOutputArray(record, metadata);
  }

  const { sensitiveFields = [] } = metadata;

  // Combine default sensitive fields with metadata-defined ones
  const fieldsToExclude = new Set([...ALWAYS_SENSITIVE, ...sensitiveFields]);

  const filtered = {};
  for (const [key, value] of Object.entries(record)) {
    if (!fieldsToExclude.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Filter sensitive fields from an array of entity records
 *
 * @param {Object[]} records - Array of entity records from database
 * @param {Object} metadata - Entity metadata from config/models
 * @returns {Object[]} Array of filtered records
 *
 * @example
 *   const safeUsers = filterOutputArray(users, userMetadata);
 */
function filterOutputArray(records, metadata = {}) {
  if (!Array.isArray(records)) {
    logger.warn('filterOutputArray received non-array - using filterOutput');
    return filterOutput(records, metadata);
  }

  return records.map((record) => filterOutput(record, metadata));
}

/**
 * Check if a field is sensitive and should be excluded
 *
 * @param {string} fieldName - Field name to check
 * @param {Object} metadata - Entity metadata
 * @returns {boolean} True if field is sensitive
 */
function isSensitiveField(fieldName, metadata = {}) {
  const { sensitiveFields = [] } = metadata;
  const allSensitive = new Set([...ALWAYS_SENSITIVE, ...sensitiveFields]);
  return allSensitive.has(fieldName);
}

/**
 * Get list of always-sensitive fields
 *
 * @returns {string[]} Array of field names that are always filtered
 */
function getAlwaysSensitiveFields() {
  return [...ALWAYS_SENSITIVE];
}

module.exports = {
  filterOutput,
  filterOutputArray,
  isSensitiveField,
  getAlwaysSensitiveFields,
  // Exported for testing
  _ALWAYS_SENSITIVE: ALWAYS_SENSITIVE,
};
