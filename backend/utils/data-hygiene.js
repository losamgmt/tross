/**
 * Universal Data Hygiene Utility
 *
 * SINGLE RESPONSIBILITY: Clean and normalize data based on field TYPES
 *
 * PHILOSOPHY:
 * - Type-based, not field-based - applies universally across ALL entities
 * - No per-entity configuration - lean metadata, centralized logic
 * - Automatic and invisible - GenericEntityService uses this on all create/update
 *
 * TYPE-BASED RULES:
 * - string: trim whitespace from both ends
 * - enum: lowercase + trim
 * - email: lowercase + trim (email is a special string subtype)
 * - All other types: pass through unchanged
 *
 * USAGE:
 *   const { sanitizeData } = require('../utils/data-hygiene');
 *   const cleanData = sanitizeData(rawData, metadata);
 */

/**
 * Sanitize a single value based on its field type
 *
 * @param {any} value - The value to sanitize
 * @param {Object} fieldDef - Field definition from metadata.fields
 * @returns {any} Sanitized value
 */
function sanitizeValue(value, fieldDef) {
  // Null/undefined pass through unchanged
  if (value === null || value === undefined) {
    return value;
  }

  // No field definition = pass through (unknown field)
  if (!fieldDef || !fieldDef.type) {
    return value;
  }

  const { type } = fieldDef;

  switch (type) {
    case 'string':
      // Trim all strings
      if (typeof value === 'string') {
        return value.trim();
      }
      return value;

    case 'enum':
      // Enums: lowercase + trim (for consistency in DB)
      if (typeof value === 'string') {
        return value.toLowerCase().trim();
      }
      return value;

    case 'email':
      // Email: lowercase + trim (email addresses are case-insensitive)
      if (typeof value === 'string') {
        return value.toLowerCase().trim();
      }
      return value;

    case 'phone':
      // Phone: trim only (preserve formatting for now)
      if (typeof value === 'string') {
        return value.trim();
      }
      return value;

    case 'integer':
    case 'decimal':
    case 'boolean':
    case 'timestamp':
    case 'json':
    case 'jsonb':
      // These types pass through unchanged
      return value;

    default:
      // Unknown type = pass through
      return value;
  }
}

/**
 * Sanitize all fields in a data object based on metadata field types
 *
 * This is the main entry point - call this on all create/update data.
 *
 * @param {Object} data - Raw data object (e.g., from req.body)
 * @param {Object} metadata - Entity metadata with fields definitions
 * @returns {Object} Sanitized data object
 *
 * @example
 *   const metadata = {
 *     fields: {
 *       email: { type: 'email' },
 *       status: { type: 'enum', values: ['active', 'pending'] },
 *       company_name: { type: 'string' },
 *     }
 *   };
 *
 *   const raw = {
 *     email: '  TEST@EXAMPLE.COM  ',
 *     status: '  ACTIVE  ',
 *     company_name: '  ACME Corp  ',
 *   };
 *
 *   const clean = sanitizeData(raw, metadata);
 *   // Result: {
 *   //   email: 'test@example.com',  // type: 'email' → lowercased + trimmed
 *   //   status: 'active',           // type: 'enum' → lowercased + trimmed
 *   //   company_name: 'ACME Corp',  // type: 'string' → trimmed (case preserved)
 *   // }
 */
function sanitizeData(data, metadata) {
  // No data = return as-is
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  // No field definitions = pass through (unknown entity)
  if (!metadata || !metadata.fields) {
    // Still trim all strings even without metadata (defensive)
    return trimAllStrings(data);
  }

  const sanitized = {};

  for (const [field, value] of Object.entries(data)) {
    const fieldDef = metadata.fields[field];
    // Type comes ONLY from explicit metadata.fields[field].type
    // NO field-name inference - every field must declare its type
    sanitized[field] = sanitizeValue(value, fieldDef);
  }

  return sanitized;
}

/**
 * Defensive fallback: trim all string values even without metadata
 *
 * @param {Object} data - Data object
 * @returns {Object} Data with all strings trimmed
 */
function trimAllStrings(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = value.trim();
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Check if a value is "empty" after sanitization
 *
 * Useful for required field validation after hygiene:
 * - null/undefined = empty
 * - '' (empty string after trim) = empty
 * - '   ' (whitespace-only string) = empty after trim
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if value is empty
 */
function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  return false;
}

module.exports = {
  sanitizeValue,
  sanitizeData,
  trimAllStrings,
  isEmpty,
};
