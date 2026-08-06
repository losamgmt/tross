/**
 * Identifier Generator Utility
 *
 * Generates unique, patterned identifiers for COMPUTED entities:
 * - work_order: WO-YYYY-NNNN
 * - invoice: INV-YYYY-NNNN
 * - contract: CTR-YYYY-NNNN
 *
 * Uses raw pg pool (NOT Knex) - consistent with Tross patterns.
 * Configuration is derived from entity metadata (single source of truth).
 *
 * @module utils/identifier-generator
 */

'use strict';

const db = require('../db/connection');
const { sanitizeIdentifier } = require('./sql-safety');
const AppError = require('./app-error');
const { ERROR_CODES } = require('../config/error-codes');
const {
  getIdentifierFields,
  getEntityPrefix,
  getIdentifierField,
  getTableName,
} = require('../config/derived-constants');

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
 * @param {Object} [client] - Optional pg client to read the current max on a caller's open transaction (batch), so sequential in-transaction creates see each other; defaults to the pool
 * @returns {Promise<string>} Generated identifier
 * @throws {Error} If entity type is unknown
 *
 * @example
 * await generateIdentifier('work_order') // 'WO-2026-0001'
 * await generateIdentifier('invoice') // 'INV-2026-0001'
 */
async function generateIdentifier(entityType, client = null) {
  const prefix = getEntityPrefix(entityType);
  const identifierField = getIdentifierField(entityType);
  const tableName = getTableName(entityType);

  if (!prefix || !tableName || !identifierField) {
    throw new AppError(
      `Unknown entity type: ${entityType}`,
      400,
      ERROR_CODES.VALIDATION_FAILED,
    );
  }

  const year = new Date().getFullYear();
  const yearPrefix = `${prefix}-${year}-`;

  // SECURITY: Defense-in-depth validation even for config-sourced values
  const safeTable = sanitizeIdentifier(tableName, 'table name');
  const safeField = sanitizeIdentifier(identifierField, 'identifier field');

  // Find the highest sequence number for this year using raw pg
  // Use the caller's transaction client when threaded (batch), else the pool
  const exec = client || db;
  const result = await exec.query(
    `SELECT ${safeField} FROM ${safeTable} 
     WHERE ${safeField} LIKE $1 
     ORDER BY ${safeField} DESC 
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

module.exports = {
  generateIdentifier,

  // Expose IDENTIFIER_FIELDS for GenericEntityService to check which entities need identifiers
  get IDENTIFIER_FIELDS() {
    return getIdentifierFields();
  },
};
