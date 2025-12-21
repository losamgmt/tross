/**
 * Identifier Generator Utility
 *
 * Generates unique, patterned identifiers for COMPUTED entities:
 * - work_order: WO-YYYY-NNNN
 * - invoice: INV-YYYY-NNNN
 * - contract: CTR-YYYY-NNNN
 *
 * Uses raw pg pool (NOT Knex) - consistent with TrossApp patterns.
 *
 * @module utils/identifier-generator
 */

'use strict';

const db = require('../db/connection');

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Entity prefix configuration
 * Maps entity type to its identifier prefix
 */
const ENTITY_PREFIXES = Object.freeze({
  work_order: 'WO',
  invoice: 'INV',
  contract: 'CTR',
});

/**
 * Entity identifier field names
 * Maps entity type to its identifier column name
 */
const IDENTIFIER_FIELDS = Object.freeze({
  work_order: 'work_order_number',
  invoice: 'invoice_number',
  contract: 'contract_number',
});

/**
 * Entity table names
 * Maps entity type to its database table
 */
const TABLE_NAMES = Object.freeze({
  work_order: 'work_orders',
  invoice: 'invoices',
  contract: 'contracts',
});

/**
 * Identifier format regex pattern
 * Matches: PREFIX-YYYY-NNNN (e.g., WO-2025-0001)
 */
const IDENTIFIER_PATTERN = /^([A-Z]+)-(\d{4})-(\d+)$/;

// ============================================================================
// IDENTIFIER GENERATION
// ============================================================================

/**
 * Format identifier components into the standard format
 *
 * @param {string} prefix - Entity prefix (WO, INV, CTR)
 * @param {number} year - 4-digit year
 * @param {number} sequence - Sequence number
 * @returns {string} Formatted identifier (PREFIX-YYYY-NNNN)
 */
function formatIdentifier(prefix, year, sequence) {
  const paddedSequence = String(sequence).padStart(4, '0');
  return `${prefix}-${year}-${paddedSequence}`;
}

/**
 * Generate a unique identifier for a COMPUTED entity
 * Format: {PREFIX}-{YEAR}-{SEQUENCE:4 digits}
 *
 * Uses raw pg pool for database queries.
 *
 * @param {string} entityType - Entity type ('work_order', 'invoice', 'contract')
 * @returns {Promise<string>} Generated identifier
 * @throws {Error} If entity type is unknown
 *
 * @example
 * await generateIdentifier('work_order') // 'WO-2025-0001'
 * await generateIdentifier('invoice') // 'INV-2025-0001'
 */
async function generateIdentifier(entityType) {
  const prefix = ENTITY_PREFIXES[entityType];
  const identifierField = IDENTIFIER_FIELDS[entityType];
  const tableName = TABLE_NAMES[entityType];

  if (!prefix || !tableName || !identifierField) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  const year = new Date().getFullYear();
  const yearPrefix = `${prefix}-${year}-`;

  // Find the highest sequence number for this year using raw pg
  const result = await db.query(
    `SELECT ${identifierField} FROM ${tableName} 
     WHERE ${identifierField} LIKE $1 
     ORDER BY ${identifierField} DESC 
     LIMIT 1`,
    [`${yearPrefix}%`],
  );

  let nextSequence = 1;

  if (result.rows.length > 0 && result.rows[0][identifierField]) {
    const existingId = result.rows[0][identifierField];
    const sequencePart = existingId.replace(yearPrefix, '');
    const existingSequence = parseInt(sequencePart, 10);

    if (!isNaN(existingSequence)) {
      nextSequence = existingSequence + 1;
    }
  }

  return formatIdentifier(prefix, year, nextSequence);
}

/**
 * Generate identifier synchronously for testing/mocking
 * Uses provided sequence number instead of database lookup
 *
 * @param {string} entityType - Entity type ('work_order', 'invoice', 'contract')
 * @param {number} sequence - Sequence number (default: 1)
 * @param {number} year - Year (default: current year)
 * @returns {string} Generated identifier
 * @throws {Error} If entity type is unknown
 *
 * @example
 * generateIdentifierSync('work_order', 1) // 'WO-2025-0001'
 * generateIdentifierSync('invoice', 42, 2024) // 'INV-2024-0042'
 */
function generateIdentifierSync(entityType, sequence = 1, year = new Date().getFullYear()) {
  const prefix = ENTITY_PREFIXES[entityType];

  if (!prefix) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  return formatIdentifier(prefix, year, sequence);
}

// ============================================================================
// IDENTIFIER PARSING & VALIDATION
// ============================================================================

/**
 * Parse an identifier into its components
 *
 * @param {string} identifier - Identifier to parse (e.g., 'WO-2025-0001')
 * @returns {Object|null} Parsed components or null if invalid
 *
 * @example
 * parseIdentifier('WO-2025-0042')
 * // Returns: { prefix: 'WO', year: 2025, sequence: 42, entityType: 'work_order' }
 */
function parseIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return null;
  }

  const match = identifier.match(IDENTIFIER_PATTERN);
  if (!match) {
    return null;
  }

  const [, prefix, yearStr, sequenceStr] = match;
  const year = parseInt(yearStr, 10);
  const sequence = parseInt(sequenceStr, 10);

  // Find entity type from prefix
  const entityType = Object.entries(ENTITY_PREFIXES)
    .find(([, p]) => p === prefix)?.[0] || null;

  return { prefix, year, sequence, entityType };
}

/**
 * Validate an identifier format and entity type
 *
 * @param {string} identifier - Identifier to validate
 * @param {string} entityType - Expected entity type
 * @returns {boolean} True if valid
 *
 * @example
 * isValidIdentifier('WO-2025-0001', 'work_order') // true
 * isValidIdentifier('WO-2025-0001', 'invoice') // false (wrong prefix)
 * isValidIdentifier('invalid', 'work_order') // false
 */
function isValidIdentifier(identifier, entityType) {
  const parsed = parseIdentifier(identifier);
  if (!parsed) {
    return false;
  }

  const expectedPrefix = ENTITY_PREFIXES[entityType];
  return parsed.prefix === expectedPrefix;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get table name for entity type
 *
 * @param {string} entityType - Entity type
 * @returns {string|undefined} Table name or undefined if not found
 */
function getTableName(entityType) {
  return TABLE_NAMES[entityType];
}

/**
 * Get identifier field name for entity type
 *
 * @param {string} entityType - Entity type
 * @returns {string|undefined} Identifier field name or undefined if not found
 */
function getIdentifierField(entityType) {
  return IDENTIFIER_FIELDS[entityType];
}

/**
 * Get prefix for entity type
 *
 * @param {string} entityType - Entity type
 * @returns {string|undefined} Prefix or undefined if not found
 */
function getPrefix(entityType) {
  return ENTITY_PREFIXES[entityType];
}

/**
 * Check if entity type is a COMPUTED entity with auto-generated identifier
 *
 * @param {string} entityType - Entity type
 * @returns {boolean} True if COMPUTED entity
 */
function isComputedEntity(entityType) {
  return entityType in ENTITY_PREFIXES;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Configuration (frozen objects)
  ENTITY_PREFIXES,
  IDENTIFIER_FIELDS,
  TABLE_NAMES,

  // Generation functions
  generateIdentifier,
  generateIdentifierSync,

  // Parsing & validation
  parseIdentifier,
  isValidIdentifier,

  // Helper functions
  getTableName,
  getIdentifierField,
  getPrefix,
  isComputedEntity,
};
