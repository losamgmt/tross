/**
 * Field Type Standards - SINGLE SOURCE OF TRUTH for reusable field patterns
 *
 * This module defines standard field definitions and generators for consistent
 * field handling across all entities.
 *
 * USAGE in metadata files:
 * ```javascript
 * const {
 *   FIELD,
 *   createAddressFields,
 *   createAddressFieldAccess,
 * } = require('../field-type-standards');
 *
 * module.exports = {
 *   fields: {
 *     email: FIELD.EMAIL,
 *     phone: FIELD.PHONE,
 *     first_name: FIELD.FIRST_NAME,
 *     ...createAddressFields('location'),
 *     ...createAddressFields('billing', { required: true }),
 *   },
 *   fieldAccess: {
 *     email: FIELD_ACCESS_LEVELS.CUSTOMER_EDITABLE,
 *     ...createAddressFieldAccess('location', 'customer'),
 *   },
 * };
 * ```
 *
 * @module config/field-type-standards
 */

const {
  SUPPORTED_COUNTRIES,
  DEFAULT_COUNTRY,
  ALL_SUBDIVISIONS,
} = require('./geo-standards');

// ============================================================================
// STANDARD SINGLE-FIELD DEFINITIONS
// ============================================================================

/**
 * Standard field definitions for common field types
 * Use these in metadata files: `email: FIELD.EMAIL`
 */
const FIELD = Object.freeze({
  // ---- Identity Fields ----

  /**
   * Standard email field
   * - Type: email (semantic type, not "string with format")
   * - Max length: 255
   * - Trimmed and lowercased by data-hygiene
   */
  EMAIL: Object.freeze({
    type: 'email',
    maxLength: 255,
  }),

  /**
   * Standard phone field
   * - Type: phone (semantic type for E.164 validation)
   * - Max length: 50
   * - Trimmed by data-hygiene
   */
  PHONE: Object.freeze({
    type: 'phone',
    maxLength: 50,
  }),

  // ---- Name Fields (HUMAN entities) ----

  /**
   * Standard first name field
   * - Max length: 100
   * - No pattern restriction (allows international Unicode names)
   */
  FIRST_NAME: Object.freeze({
    type: 'string',
    maxLength: 100,
  }),

  /**
   * Standard last name field
   * - Max length: 100
   * - No pattern restriction (allows international Unicode names)
   */
  LAST_NAME: Object.freeze({
    type: 'string',
    maxLength: 100,
  }),

  // ---- Generic Text Fields ----

  /**
   * Standard name field (for non-HUMAN entities)
   * - Max length: 255
   */
  NAME: Object.freeze({
    type: 'string',
    maxLength: 255,
  }),

  /**
   * Standard summary/short description field
   * - Max length: 255
   */
  SUMMARY: Object.freeze({
    type: 'string',
    maxLength: 255,
  }),

  /**
   * Standard long description field
   * - Max length: 5000
   */
  DESCRIPTION: Object.freeze({
    type: 'text',
    maxLength: 5000,
  }),

  // ---- Additional Text Fields ----

  /**
   * Standard title field (for documents, items)
   * - Max length: 150
   */
  TITLE: Object.freeze({
    type: 'string',
    maxLength: 150,
  }),

  /**
   * Internal notes field
   * - Max length: 10000
   */
  NOTES: Object.freeze({
    type: 'text',
    maxLength: 10000,
  }),

  /**
   * Legal terms field (contracts, invoices)
   * - Max length: 50000
   */
  TERMS: Object.freeze({
    type: 'text',
    maxLength: 50000,
  }),

  // ---- Identifier Fields ----

  /**
   * General identifier field (order numbers, etc.)
   * - Max length: 100
   * - Typically immutable and unique
   */
  IDENTIFIER: Object.freeze({
    type: 'string',
    maxLength: 100,
  }),

  /**
   * SKU field (products, inventory)
   * - Max length: 50
   * - Typically immutable and unique
   */
  SKU: Object.freeze({
    type: 'string',
    maxLength: 50,
  }),

  // ---- Currency/Financial Fields ----

  /**
   * Standard currency field
   * - Decimal with 2 decimal places
   * - Minimum 0 (no negative amounts)
   */
  CURRENCY: Object.freeze({
    type: 'currency',
    precision: 2,
    min: 0,
  }),

  // ---- URL Field ----

  /**
   * Standard URL field
   * - Max length: 2048 (browser URL limit)
   */
  URL: Object.freeze({
    type: 'url',
    maxLength: 2048,
  }),

  // ---- Address Component Fields ----
  // These are used internally by createAddressFields()
  // Exposed here for custom address scenarios

  /**
   * Address line 1 (street address)
   */
  ADDRESS_LINE1: Object.freeze({
    type: 'string',
    maxLength: 255,
  }),

  /**
   * Address line 2 (apt, suite, unit)
   */
  ADDRESS_LINE2: Object.freeze({
    type: 'string',
    maxLength: 255,
  }),

  /**
   * City name
   */
  ADDRESS_CITY: Object.freeze({
    type: 'string',
    maxLength: 100,
  }),

  /**
   * State/Province code (ISO 3166-2)
   * Enum-validated against ALL_SUBDIVISIONS
   */
  ADDRESS_STATE: Object.freeze({
    type: 'enum',
    values: ALL_SUBDIVISIONS,
  }),

  /**
   * Postal/ZIP code
   * String type (not integer - preserves leading zeros)
   */
  ADDRESS_POSTAL_CODE: Object.freeze({
    type: 'string',
    maxLength: 20,
  }),

  /**
   * Country code (ISO 3166-1 alpha-2)
   * Defaults to 'US'
   */
  ADDRESS_COUNTRY: Object.freeze({
    type: 'enum',
    values: SUPPORTED_COUNTRIES,
    default: DEFAULT_COUNTRY,
  }),
});

// ============================================================================
// ADDRESS FIELD GENERATORS
// ============================================================================

/**
 * Address field suffixes in standard order
 * This order is used for form rendering
 */
const ADDRESS_SUFFIXES = Object.freeze([
  'line1',
  'line2',
  'city',
  'state',
  'postal_code',
  'country',
]);

/**
 * Generate address fields with a given prefix
 *
 * @param {string} prefix - Field name prefix (e.g., 'location', 'billing')
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.required=false] - Make line1 and city required
 * @param {string} [options.defaultCountry='US'] - Default country code
 * @returns {Object} Object with 6 address field definitions
 *
 * @example
 * // Basic usage
 * fields: {
 *   ...createAddressFields('location'),
 * }
 * // Produces: location_line1, location_line2, location_city,
 * //           location_state, location_postal_code, location_country
 *
 * @example
 * // With required fields
 * fields: {
 *   ...createAddressFields('billing', { required: true }),
 * }
 * // Same fields, but line1 and city have required: true
 */
function createAddressFields(prefix, options = {}) {
  const { required = false, defaultCountry = DEFAULT_COUNTRY } = options;

  return {
    [`${prefix}_line1`]: {
      ...FIELD.ADDRESS_LINE1,
      ...(required && { required: true }),
    },
    [`${prefix}_line2`]: {
      ...FIELD.ADDRESS_LINE2,
    },
    [`${prefix}_city`]: {
      ...FIELD.ADDRESS_CITY,
      ...(required && { required: true }),
    },
    [`${prefix}_state`]: {
      ...FIELD.ADDRESS_STATE,
    },
    [`${prefix}_postal_code`]: {
      ...FIELD.ADDRESS_POSTAL_CODE,
    },
    [`${prefix}_country`]: {
      ...FIELD.ADDRESS_COUNTRY,
      default: defaultCountry,
    },
  };
}

/**
 * Generate field access rules for address fields
 *
 * @param {string} prefix - Field name prefix (e.g., 'location', 'billing')
 * @param {string} minRole - Minimum role for create (e.g., 'customer', 'dispatcher')
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.readRole='customer'] - Minimum role for read access
 * @param {string} [options.updateRole] - Minimum role for update access (defaults to minRole)
 * @returns {Object} Object with 6 field access definitions
 *
 * @example
 * fieldAccess: {
 *   ...createAddressFieldAccess('location', 'customer'),
 * }
 * // All 6 fields get: { create: 'customer', read: 'customer', update: 'customer', delete: 'none' }
 *
 * @example
 * // Dispatcher-editable, customer-readable
 * fieldAccess: {
 *   ...createAddressFieldAccess('billing', 'dispatcher', { readRole: 'customer' }),
 * }
 *
 * @example
 * // Customer creates, dispatcher updates
 * fieldAccess: {
 *   ...createAddressFieldAccess('location', 'customer', { updateRole: 'dispatcher' }),
 * }
 */
function createAddressFieldAccess(prefix, minRole, options = {}) {
  const { readRole = 'customer', updateRole = minRole } = options;

  const accessDef = Object.freeze({
    create: minRole,
    read: readRole,
    update: updateRole,
    delete: 'none',
  });

  return ADDRESS_SUFFIXES.reduce((acc, suffix) => {
    acc[`${prefix}_${suffix}`] = accessDef;
    return acc;
  }, {});
}

/**
 * Get all field names for an address prefix
 * Useful for includeFields/excludeFields arrays
 *
 * @param {string} prefix - Field name prefix
 * @returns {string[]} Array of 6 field names
 *
 * @example
 * const locationFields = getAddressFieldNames('location');
 * // ['location_line1', 'location_line2', 'location_city',
 * //  'location_state', 'location_postal_code', 'location_country']
 */
function getAddressFieldNames(prefix) {
  return ADDRESS_SUFFIXES.map(suffix => `${prefix}_${suffix}`);
}

/**
 * Check if a field name is part of an address group
 *
 * @param {string} fieldName - Field name to check
 * @returns {string|null} The prefix if it's an address field, null otherwise
 *
 * @example
 * getAddressPrefix('location_city')    // 'location'
 * getAddressPrefix('customer_id')      // null
 */
function getAddressPrefix(fieldName) {
  for (const suffix of ADDRESS_SUFFIXES) {
    if (fieldName.endsWith(`_${suffix}`)) {
      return fieldName.slice(0, -(suffix.length + 1));
    }
  }
  return null;
}

/**
 * Check if a set of fields contains a complete address group
 *
 * @param {string[]} fieldNames - Array of field names
 * @param {string} prefix - Address prefix to check for
 * @returns {boolean} True if all 6 address fields exist
 */
function hasCompleteAddress(fieldNames, prefix) {
  const required = getAddressFieldNames(prefix);
  return required.every(name => fieldNames.includes(name));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Standard field definitions
  FIELD,

  // Address constants
  ADDRESS_SUFFIXES,

  // Address generators
  createAddressFields,
  createAddressFieldAccess,

  // Address utilities
  getAddressFieldNames,
  getAddressPrefix,
  hasCompleteAddress,
};
