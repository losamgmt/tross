/**
 * Field Types - SINGLE SOURCE OF TRUTH for reusable field patterns
 *
 * This module defines standard field TYPE definitions and generators.
 * Enum VALUES are NOT defined here - they belong in entity metadata (SSOT).
 *
 * USAGE in metadata files:
 * ```javascript
 * const { FIELD, NAME_PATTERNS, createAddressFields } = require('../field-types');
 *
 * module.exports = {
 *   namePattern: NAME_PATTERNS.HUMAN,
 *   fields: {
 *     email: FIELD.EMAIL,
 *     phone: FIELD.PHONE,
 *     ...createAddressFields('billing'),
 *   },
 *   enums: {
 *     status: {
 *       active: { color: 'success' },
 *       inactive: { color: 'warning' },
 *     },
 *   },
 * };
 * ```
 *
 * @module config/field-types
 */

const {
  SUPPORTED_COUNTRIES,
  DEFAULT_COUNTRY,
  ALL_SUBDIVISIONS,
} = require('./geo-standards');

// Re-export NAME_PATTERNS for convenience (single import in metadata files)
const { NAME_PATTERNS } = require('./name-patterns');

// Re-export ENTITY_STRUCTURE and ENTITY_TRAITS for convenience (single import in metadata files)
const {
  ENTITY_STRUCTURE,
  ENTITY_TRAITS,
  hasStructure,
  hasTrait,
  isJunction,
  isSystemTable,
  hasWorkflow,
} = require('./entity-traits');

// ============================================================================
// TYPE TO SQL MAPPING
// ============================================================================

/**
 * Maps field types to default SQL types for schema generation.
 * Used when a field has `type` but no explicit `sqlType`.
 * Field-specific overrides (maxLength, precision) are applied by the schema generator.
 *
 * @type {Object.<string, string | ((fieldDef: Object) => string)>}
 */
const TYPE_TO_SQL = Object.freeze({
  // String-based types
  string: (fieldDef) => `VARCHAR(${fieldDef.maxLength || 255})`,
  text: () => 'TEXT',
  email: (fieldDef) => `VARCHAR(${fieldDef.maxLength || 255})`,
  phone: (fieldDef) => `VARCHAR(${fieldDef.maxLength || 50})`,
  url: () => 'TEXT',
  uuid: () => 'VARCHAR(255)',

  // Numeric types
  integer: () => 'INTEGER',
  decimal: (fieldDef) => `DECIMAL(${fieldDef.precision || 12},${fieldDef.scale || 2})`,
  currency: (fieldDef) => `DECIMAL(${fieldDef.precision || 12},${fieldDef.scale || 2})`,

  // Boolean
  boolean: () => 'BOOLEAN',

  // Date/Time
  date: () => 'DATE',
  timestamp: () => 'TIMESTAMPTZ',

  // JSON
  json: () => 'JSON',
  jsonb: () => 'JSONB',

  // Enum (string with CHECK constraint - length determined by enum generator)
  enum: (fieldDef) => `VARCHAR(${fieldDef.maxLength || 50})`,

  // Foreign Key (integer referencing another table)
  foreignKey: () => 'INTEGER',
});

/**
 * Derive SQL type from field definition.
 * Uses explicit sqlType if present, otherwise derives from type.
 *
 * @param {Object} fieldDef - Field definition with type and optional sqlType
 * @returns {string} SQL column type
 */
function deriveSqlType(fieldDef) {
  // Use explicit sqlType if provided
  if (fieldDef.sqlType) {
    return fieldDef.sqlType;
  }

  const typeMapper = TYPE_TO_SQL[fieldDef.type];
  if (!typeMapper) {
    throw new Error(`Unknown field type: ${fieldDef.type}`);
  }

  return typeof typeMapper === 'function' ? typeMapper(fieldDef) : typeMapper;
}

// ============================================================================
// FIELD TRAITS SYSTEM
// ============================================================================

/**
 * ATOMIC TRAITS - Individual CRUD-behavior properties.
 * These are the building blocks for all field configurations.
 *
 * Use these for fine-grained control when TRAIT_SETS don't fit.
 *
 * @example
 * withTraits(FIELD.NAME, TRAITS.REQUIRED, TRAITS.SEARCHABLE)
 */
const TRAITS = Object.freeze({
  /** Field must be provided on create */
  REQUIRED: Object.freeze({ required: true }),

  /** Field cannot be updated after creation */
  IMMUTABLE: Object.freeze({ immutable: true }),

  /** Field is included in full-text search */
  SEARCHABLE: Object.freeze({ searchable: true }),

  /** Field can be used in WHERE clauses */
  FILTERABLE: Object.freeze({ filterable: true }),

  /** Field can be used in ORDER BY */
  SORTABLE: Object.freeze({ sortable: true }),

  /** Field is system-managed (not user-editable) */
  READONLY: Object.freeze({ readonly: true }),
});

/**
 * COMPOSITE TRAITS - Common trait combinations with semantic names.
 * Use these for standard patterns instead of listing individual traits.
 *
 * @example
 * withTraits(FIELD.NAME, TRAIT_SETS.IDENTITY)
 */
const TRAIT_SETS = Object.freeze({
  /**
   * Identity field: The primary user-facing identifier.
   * Used for: name, email, title fields that identify the record.
   * Includes: required, searchable, filterable, sortable
   */
  IDENTITY: Object.freeze({
    required: true,
    searchable: true,
    filterable: true,
    sortable: true,
  }),

  /**
   * Junction FK: Foreign keys in M:M junction tables.
   * Required on create, cannot change, filterable for queries.
   * Includes: required, immutable, filterable
   */
  JUNCTION_FK: Object.freeze({
    required: true,
    immutable: true,
    filterable: true,
  }),

  /**
   * Timestamp: System-managed date/time fields.
   * Readonly, useful for filtering and sorting.
   * Includes: readonly, filterable, sortable
   */
  TIMESTAMP: Object.freeze({
    readonly: true,
    filterable: true,
    sortable: true,
  }),

  /**
   * Primary Key: Auto-generated ID field.
   * Includes: readonly, filterable, sortable
   */
  PK: Object.freeze({
    readonly: true,
    filterable: true,
    sortable: true,
  }),

  /**
   * Lookup: Fields for filtering and sorting but not searching.
   * Used for: status enums, dates, numeric fields.
   * Includes: filterable, sortable
   */
  LOOKUP: Object.freeze({
    filterable: true,
    sortable: true,
  }),

  /**
   * Filter-only: Fields for filtering but not sorting.
   * Used for: boolean flags, FK references.
   * Includes: filterable
   */
  FILTER_ONLY: Object.freeze({
    filterable: true,
  }),

  /**
   * Fulltext: Fields for text search only.
   * Used for: description, notes, comments.
   * Includes: searchable
   */
  FULLTEXT: Object.freeze({
    searchable: true,
  }),

  /**
   * Searchable Lookup: Search + filter + sort.
   * Used for: names that aren't the primary identity.
   * Includes: searchable, filterable, sortable
   */
  SEARCHABLE_LOOKUP: Object.freeze({
    searchable: true,
    filterable: true,
    sortable: true,
  }),
});

/**
 * Compose a field definition with traits.
 * Merges base field properties with one or more trait objects.
 *
 * @param {Object} baseField - Base field definition (type, maxLength, etc.)
 * @param {...Object} traits - Trait objects to merge (TRAITS.*, TRAIT_SETS.*, or custom)
 * @returns {Object} Frozen field definition with all properties merged
 *
 * @example
 * // Using atomic traits
 * name: withTraits(FIELD.NAME, TRAITS.REQUIRED, TRAITS.SEARCHABLE)
 *
 * // Using trait sets
 * name: withTraits(FIELD.NAME, TRAIT_SETS.IDENTITY)
 *
 * // Custom combination
 * priority: withTraits({ type: 'integer' }, TRAIT_SETS.LOOKUP, TRAITS.REQUIRED)
 */
function withTraits(baseField, ...traits) {
  return Object.freeze({
    ...baseField,
    ...traits.reduce((acc, trait) => ({ ...acc, ...trait }), {}),
  });
}

// ============================================================================
// TIER 1: ENTITY CONTRACT FIELDS
// ============================================================================

/**
 * Standard Tier 1 fields that appear in every entity (Entity Contract v2.0).
 * Pre-composed with appropriate traits.
 *
 * Use TIER1 for individual fields, TIER1_FIELDS for spread-ready groups.
 */
const TIER1 = Object.freeze({
  /**
   * Primary key - auto-generated, readonly, filterable, sortable.
   */
  ID: Object.freeze({
    type: 'integer',
    ...TRAIT_SETS.PK,
  }),

  /**
   * Soft-delete flag - defaults true, filterable for active-only queries.
   */
  IS_ACTIVE: Object.freeze({
    type: 'boolean',
    default: true,
    filterable: true,
  }),

  /**
   * Creation timestamp - readonly, filterable, sortable.
   */
  CREATED_AT: Object.freeze({
    type: 'timestamp',
    ...TRAIT_SETS.TIMESTAMP,
  }),

  /**
   * Update timestamp - readonly, filterable, sortable.
   */
  UPDATED_AT: Object.freeze({
    type: 'timestamp',
    ...TRAIT_SETS.TIMESTAMP,
  }),

  /**
   * Standard status enum - filterable, sortable.
   * Note: enumKey must be set in entity metadata if enum values differ.
   */
  STATUS: Object.freeze({
    type: 'enum',
    enumKey: 'status',
    default: 'active',
    ...TRAIT_SETS.LOOKUP,
  }),
});

/**
 * Spread-ready Tier 1 field groups for entity metadata.
 * Use these to include standard fields with a single spread.
 *
 * @example
 * fields: {
 *   ...TIER1_FIELDS.CORE,
 *   name: withTraits(FIELD.NAME, TRAIT_SETS.IDENTITY),
 *   // ... entity-specific fields
 * }
 */
const TIER1_FIELDS = Object.freeze({
  /**
   * Core fields for all entities (without status).
   * Includes: id, is_active, created_at, updated_at
   */
  CORE: Object.freeze({
    id: TIER1.ID,
    is_active: TIER1.IS_ACTIVE,
    created_at: TIER1.CREATED_AT,
    updated_at: TIER1.UPDATED_AT,
  }),

  /**
   * Core fields plus standard status enum.
   * Includes: id, is_active, created_at, updated_at, status
   */
  WITH_STATUS: Object.freeze({
    id: TIER1.ID,
    is_active: TIER1.IS_ACTIVE,
    created_at: TIER1.CREATED_AT,
    updated_at: TIER1.UPDATED_AT,
    status: TIER1.STATUS,
  }),
});

// ============================================================================
// STANDARD SINGLE-FIELD DEFINITIONS
// ============================================================================

/**
 * Standard field definitions for common field types.
 * Use these in metadata files: `email: FIELD.EMAIL`
 *
 * Each field includes:
 * - type: Semantic type for validation
 * - sqlType: PostgreSQL type for schema generation
 * - maxLength/precision: Constraints
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
    sqlType: 'VARCHAR(255)',
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
    sqlType: 'VARCHAR(50)',
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
    sqlType: 'VARCHAR(100)',
  }),

  /**
   * Standard last name field
   * - Max length: 100
   * - No pattern restriction (allows international Unicode names)
   */
  LAST_NAME: Object.freeze({
    type: 'string',
    maxLength: 100,
    sqlType: 'VARCHAR(100)',
  }),

  // ---- Generic Text Fields ----

  /**
   * Standard name field (for SIMPLE name pattern entities)
   * - Max length: 255
   */
  NAME: Object.freeze({
    type: 'string',
    maxLength: 255,
    sqlType: 'VARCHAR(255)',
  }),

  /**
   * Standard summary/short description field
   * - Max length: 255
   */
  SUMMARY: Object.freeze({
    type: 'string',
    maxLength: 255,
    sqlType: 'VARCHAR(255)',
  }),

  /**
   * Standard long description field
   * - Max length: 5000
   * - Uses TEXT for PostgreSQL (no length limit in DB, validated in app)
   */
  DESCRIPTION: Object.freeze({
    type: 'text',
    maxLength: 5000,
    sqlType: 'TEXT',
  }),

  // ---- Additional Text Fields ----

  /**
   * Standard title field (for documents, items)
   * - Max length: 150
   */
  TITLE: Object.freeze({
    type: 'string',
    maxLength: 150,
    sqlType: 'VARCHAR(150)',
  }),

  /**
   * Internal notes field
   * - Max length: 10000
   * - Uses TEXT for PostgreSQL
   */
  NOTES: Object.freeze({
    type: 'text',
    maxLength: 10000,
    sqlType: 'TEXT',
  }),

  /**
   * Legal terms field (contracts, invoices)
   * - Max length: 50000
   * - Uses TEXT for PostgreSQL
   */
  TERMS: Object.freeze({
    type: 'text',
    maxLength: 50000,
    sqlType: 'TEXT',
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
    sqlType: 'VARCHAR(100)',
  }),

  /**
   * SKU field (products, inventory)
   * - Max length: 50
   * - Typically immutable and unique
   */
  SKU: Object.freeze({
    type: 'string',
    maxLength: 50,
    sqlType: 'VARCHAR(50)',
  }),

  // ---- Currency/Financial Fields ----

  /**
   * Standard currency field
   * - Decimal with 2 decimal places
   * - Minimum 0 (no negative amounts)
   * - DECIMAL(12,2) supports up to 9,999,999,999.99
   */
  CURRENCY: Object.freeze({
    type: 'currency',
    precision: 2,
    min: 0,
    sqlType: 'DECIMAL(12,2)',
  }),

  // ---- Numeric Fields ----

  /**
   * Standard integer field
   * - For counts, quantities, foreign keys, etc.
   */
  INTEGER: Object.freeze({
    type: 'integer',
    sqlType: 'INTEGER',
  }),

  /**
   * Standard boolean field
   * - For flags, toggles, binary states
   */
  BOOLEAN: Object.freeze({
    type: 'boolean',
    sqlType: 'BOOLEAN',
  }),

  // ---- URL Field ----

  /**
   * Standard URL field
   * - Max length: 2048 (browser URL limit)
   * - Uses TEXT for PostgreSQL (URLs can be long)
   */
  URL: Object.freeze({
    type: 'url',
    maxLength: 2048,
    sqlType: 'TEXT',
  }),

  // ---- Date & Time Fields ----

  /**
   * Timestamp field (date + time with timezone)
   * - Used for: created_at, updated_at, scheduled_start, completed_at
   * - PostgreSQL TIMESTAMPTZ (WITH TIME ZONE) - stores as UTC, converts on I/O
   */
  TIMESTAMP: Object.freeze({
    type: 'timestamp',
    sqlType: 'TIMESTAMPTZ',
  }),

  /**
   * Date-only field (no time component)
   * - Used for: birth dates, due dates, effective dates
   */
  DATE: Object.freeze({
    type: 'date',
    sqlType: 'DATE',
  }),

  // ---- UUID Field ----

  /**
   * UUID field (universally unique identifier)
   * - Used for: auth0_id, external references, distributed IDs
   */
  UUID: Object.freeze({
    type: 'uuid',
    sqlType: 'VARCHAR(255)',
  }),

  // ---- JSON Fields ----

  /**
   * JSON field (standard JSON)
   * - Used for: flexible/schemaless data, API payloads
   * - Use JSONB when you need indexing/querying
   */
  JSON: Object.freeze({
    type: 'json',
    sqlType: 'JSON',
  }),

  /**
   * JSONB field (binary JSON with indexing)
   * - Used for: audit log changes, preferences, complex data
   * - Supports GIN indexes for fast querying
   */
  JSONB: Object.freeze({
    type: 'jsonb',
    sqlType: 'JSONB',
  }),

  // ---- Address Component Fields ----
  // Used internally by createAddressFields()
  // Exposed here for custom address scenarios

  /**
   * Address line 1 (street address)
   */
  ADDRESS_LINE1: Object.freeze({
    type: 'string',
    maxLength: 255,
    sqlType: 'VARCHAR(255)',
  }),

  /**
   * Address line 2 (apt, suite, unit)
   */
  ADDRESS_LINE2: Object.freeze({
    type: 'string',
    maxLength: 255,
    sqlType: 'VARCHAR(255)',
  }),

  /**
   * City name
   */
  ADDRESS_CITY: Object.freeze({
    type: 'string',
    maxLength: 100,
    sqlType: 'VARCHAR(100)',
  }),

  /**
   * State/Province code (ISO 3166-2)
   * Enum-validated against ALL_SUBDIVISIONS from geo-standards
   * Max code length is ~5-6 chars (e.g., "CA-BC"), using VARCHAR(10) for safety
   */
  ADDRESS_STATE: Object.freeze({
    type: 'enum',
    values: ALL_SUBDIVISIONS,
    sqlType: 'VARCHAR(10)',
  }),

  /**
   * Postal/ZIP code
   * String type (not integer - preserves leading zeros)
   */
  ADDRESS_POSTAL_CODE: Object.freeze({
    type: 'string',
    maxLength: 20,
    sqlType: 'VARCHAR(20)',
  }),

  /**
   * Country code (ISO 3166-1 alpha-2)
   * Defaults to 'US'
   */
  ADDRESS_COUNTRY: Object.freeze({
    type: 'enum',
    values: SUPPORTED_COUNTRIES,
    default: DEFAULT_COUNTRY,
    sqlType: 'VARCHAR(2)',
  }),
});

// ============================================================================
// ADDRESS FIELD GENERATORS
// ============================================================================

/**
 * Address field suffixes in standard order.
 * This order is used for form rendering.
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
 * Generate address fields with a given prefix.
 *
 * @param {string} prefix - Field name prefix (e.g., 'location', 'billing')
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.required=false] - Make line1 and city required
 * @param {string} [options.defaultCountry='US'] - Default country code
 * @returns {Object} Object with 6 address field definitions
 *
 * @example
 * fields: {
 *   ...createAddressFields('location'),
 * }
 * // Produces: location_line1, location_line2, location_city,
 * //           location_state, location_postal_code, location_country
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
 * Generate field access rules for address fields.
 *
 * @param {string} prefix - Field name prefix (e.g., 'location', 'billing')
 * @param {string} minRole - Minimum role for create (e.g., 'customer', 'dispatcher')
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.readRole='customer'] - Minimum role for read access
 * @param {string} [options.updateRole] - Minimum role for update (defaults to minRole)
 * @returns {Object} Object with 6 field access definitions
 *
 * @example
 * fieldAccess: {
 *   ...createAddressFieldAccess('location', 'customer'),
 * }
 * // All 6 fields get: { create: 'customer', read: 'customer', update: 'customer', delete: 'none' }
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
 * Get all field names for an address prefix.
 *
 * @param {string} prefix - Field name prefix
 * @returns {string[]} Array of 6 field names
 *
 * @example
 * getAddressFieldNames('location');
 * // ['location_line1', 'location_line2', 'location_city',
 * //  'location_state', 'location_postal_code', 'location_country']
 */
function getAddressFieldNames(prefix) {
  return ADDRESS_SUFFIXES.map((suffix) => `${prefix}_${suffix}`);
}

/**
 * Check if a field name is part of an address group.
 *
 * @param {string} fieldName - Field name to check
 * @returns {string|null} The prefix if it's an address field, null otherwise
 *
 * @example
 * getAddressPrefix('location_city')  // 'location'
 * getAddressPrefix('customer_id')    // null
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
 * Check if a set of fields contains a complete address group.
 *
 * @param {string[]} fieldNames - Array of field names
 * @param {string} prefix - Address prefix to check for
 * @returns {boolean} True if all 6 address fields exist
 */
function hasCompleteAddress(fieldNames, prefix) {
  const required = getAddressFieldNames(prefix);
  return required.every((name) => fieldNames.includes(name));
}

/**
 * Extract enum values from the new enum structure.
 * Enums are defined as: { value1: { color: '...' }, value2: { ... } }
 * Values are the object keys.
 *
 * @param {Object} enumDef - Enum definition object
 * @returns {string[]} Array of enum values
 *
 * @example
 * const statusEnum = { active: { color: 'success' }, inactive: { color: 'warning' } };
 * getEnumValues(statusEnum); // ['active', 'inactive']
 */
function getEnumValues(enumDef) {
  return Object.keys(enumDef);
}

// ============================================================================
// NAMING CONVENTIONS
// ============================================================================

/**
 * Generate FK field name from entity key.
 * SINGLE SOURCE OF TRUTH for FK naming convention: entityKey → entityKey_id
 *
 * @param {string} entityKey - Entity key (e.g., 'customer', 'work_order')
 * @returns {string} FK field name (e.g., 'customer_id', 'work_order_id')
 *
 * @example
 * foreignKeyFieldName('customer')     // 'customer_id'
 * foreignKeyFieldName('work_order')   // 'work_order_id'
 */
function foreignKeyFieldName(entityKey) {
  return `${entityKey}_id`;
}

// ============================================================================
// JUNCTION ENTITY FIELD HELPERS
// ============================================================================

/**
 * Standard field definitions for junction entities (M:M relationship tables).
 * Junction entities connect two entities and may have relationship metadata.
 *
 * @example
 * fields: {
 *   ...JUNCTION.CORE_FIELDS,
 *   // Optional relationship attributes
 *   relationship_type: { type: 'enum', enumKey: 'relationshipType' },
 *   is_primary: JUNCTION.IS_PRIMARY,
 *   start_date: JUNCTION.START_DATE,
 *   end_date: JUNCTION.END_DATE,
 * }
 */
const JUNCTION = Object.freeze({
  /**
   * Core fields that every junction entity should have.
   * Spread into fields: { ...JUNCTION.CORE_FIELDS, customer_id: ..., property_id: ... }
   */
  CORE_FIELDS: Object.freeze({
    id: { type: 'integer', readonly: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },
  }),

  /**
   * Primary flag for hierarchical relationships.
   * Example: A customer may have multiple properties, one is their "primary" residence.
   */
  IS_PRIMARY: Object.freeze({
    type: 'boolean',
    default: false,
    description: 'Whether this is the primary relationship of this type',
    sqlType: 'BOOLEAN',
  }),

  /**
   * Start date for temporal relationships.
   * Example: Customer occupies property starting from this date.
   */
  START_DATE: Object.freeze({
    type: 'date',
    description: 'When this relationship became active',
    sqlType: 'DATE',
  }),

  /**
   * End date for temporal relationships.
   * Null means relationship is ongoing/current.
   */
  END_DATE: Object.freeze({
    type: 'date',
    description: 'When this relationship ended (null = ongoing)',
    sqlType: 'DATE',
  }),

  /**
   * Notes field for relationship context.
   */
  NOTES: Object.freeze({
    type: 'text',
    maxLength: 2000,
    description: 'Additional notes about this relationship',
    sqlType: 'TEXT',
  }),

  /**
   * Common fieldAccess pattern for junction entities.
   * Junction FK fields are typically:
   * - Creatable by managers (who establish relationships)
   * - Readable by all who can read the entity
   * - Immutable after creation (cannot change which entities are linked)
   *
   * NOTE: This provides a TEMPLATE - individual junction metadata should
   * add their specific FK field access using this pattern.
   */
  FIELD_ACCESS: Object.freeze({
    // Note: FK fields (customer_id, property_id) should be added explicitly
    // in each junction entity's fieldAccess since the minimum role may vary
  }),
});

/**
 * Generate foreign key fields for a junction entity.
 * Creates properly configured FK fields for both sides of the relationship.
 *
 * DEPRECATED: Use createJunctionFields() for complete junction entity fields.
 * This function is retained for backwards compatibility.
 *
 * @param {string} entity1 - First entity key (e.g., 'customer')
 * @param {string} entity2 - Second entity key (e.g., 'property')
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.required=true] - Whether both FKs are required
 * @returns {Object} Object with two FK field definitions
 *
 * @example
 * fields: {
 *   ...JUNCTION.CORE_FIELDS,
 *   ...createJunctionForeignKeys('customer', 'property'),
 * }
 * // Produces: customer_id, property_id (both type: 'foreignKey')
 */
function createJunctionForeignKeys(entity1, entity2, options = {}) {
  const { required = true } = options;
  const fk1 = foreignKeyFieldName(entity1);
  const fk2 = foreignKeyFieldName(entity2);

  return {
    [fk1]: {
      type: 'foreignKey',
      references: entity1,
      required,
      description: `Reference to the ${entity1} in this relationship`,
    },
    [fk2]: {
      type: 'foreignKey',
      references: entity2,
      required,
      description: `Reference to the ${entity2} in this relationship`,
    },
  };
}

/**
 * Generate complete fields for a junction entity.
 * Includes Tier 1 fields + FK fields with full JUNCTION_FK traits.
 *
 * This is the PREFERRED way to define junction entity fields.
 * Replaces the pattern of spreading JUNCTION.CORE_FIELDS + createJunctionForeignKeys().
 *
 * @param {string} entity1 - First entity key (e.g., 'visit')
 * @param {string} entity2 - Second entity key (e.g., 'technician')
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.withIsActive=true] - Include is_active field
 * @param {Object} [options.extraFields={}] - Additional fields to include
 * @returns {Object} Complete fields object for junction entity
 *
 * @example
 * // Basic junction
 * fields: createJunctionFields('visit', 'technician')
 * // Produces: id, visit_id, technician_id, is_active, created_at, updated_at
 *
 * // With extra fields
 * fields: createJunctionFields('customer', 'property', {
 *   extraFields: {
 *     is_primary: { type: 'boolean', default: false, filterable: true },
 *   }
 * })
 */
function createJunctionFields(entity1, entity2, options = {}) {
  const { withIsActive = true, extraFields = {} } = options;
  const fk1 = foreignKeyFieldName(entity1);
  const fk2 = foreignKeyFieldName(entity2);

  return Object.freeze({
    // Tier 1: Primary Key
    id: TIER1.ID,

    // Junction FKs with full traits
    [fk1]: Object.freeze({
      type: 'foreignKey',
      references: entity1,
      ...TRAIT_SETS.JUNCTION_FK,
    }),
    [fk2]: Object.freeze({
      type: 'foreignKey',
      references: entity2,
      ...TRAIT_SETS.JUNCTION_FK,
    }),

    // Optional is_active
    ...(withIsActive && { is_active: TIER1.IS_ACTIVE }),

    // Tier 1: Timestamps
    created_at: TIER1.CREATED_AT,
    updated_at: TIER1.UPDATED_AT,

    // Extra fields
    ...extraFields,
  });
}

/**
 * Generate a single foreign key field with configurable traits.
 *
 * @param {string} entity - Target entity key (e.g., 'customer')
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.required=false] - Whether FK is required
 * @param {Object} [options.traits=TRAIT_SETS.FILTER_ONLY] - Traits to apply
 * @param {string} [options.displayField] - Field to display from related entity
 * @returns {Object} FK field definition with traits
 *
 * @example
 * // Optional FK, filterable only (default)
 * manager_id: createForeignKey('user')
 *
 * // Required FK, filterable and sortable
 * customer_id: createForeignKey('customer', {
 *   required: true,
 *   traits: TRAIT_SETS.LOOKUP
 * })
 *
 * // Junction-style FK (required, immutable, filterable)
 * work_order_id: createForeignKey('work_order', {
 *   required: true,
 *   traits: TRAIT_SETS.JUNCTION_FK
 * })
 */
function createForeignKey(entity, options = {}) {
  const {
    required = false,
    traits = TRAIT_SETS.FILTER_ONLY,
    displayField,
  } = options;

  return Object.freeze({
    type: 'foreignKey',
    references: entity,
    ...(required && { required: true }),
    ...(displayField && { displayField }),
    ...traits,
  });
}

/**
 * Generate a standard unique constraint for a junction entity.
 * Prevents duplicate relationships between the same pair of entities.
 *
 * @param {string} entity1 - First entity key
 * @param {string} entity2 - Second entity key
 * @param {string} [constraintName] - Optional constraint name (auto-generated if not provided)
 * @returns {Object} UniqueConstraint configuration
 *
 * @example
 * uniqueConstraints: [
 *   createJunctionUniqueConstraint('customer', 'property'),
 * ]
 */
function createJunctionUniqueConstraint(entity1, entity2, constraintName) {
  const name = constraintName || `uq_${entity1}_${entity2}`;
  return {
    name,
    fields: [foreignKeyFieldName(entity1), foreignKeyFieldName(entity2)],
    description: `Each ${entity1}-${entity2} pair must be unique`,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Name patterns (re-exported for convenience)
  NAME_PATTERNS,

  // Entity traits (re-exported for convenience)
  ENTITY_STRUCTURE,
  ENTITY_TRAITS,
  hasStructure,
  hasTrait,
  isJunction,
  isSystemTable,
  hasWorkflow,

  // Field Traits System (NEW)
  TRAITS,
  TRAIT_SETS,
  withTraits,

  // Tier 1 Entity Contract Fields (NEW)
  TIER1,
  TIER1_FIELDS,

  // Standard field definitions
  FIELD,

  // SQL type derivation (for schema generation)
  TYPE_TO_SQL,
  deriveSqlType,

  // Naming conventions
  foreignKeyFieldName,

  // Foreign key helper (NEW)
  createForeignKey,

  // Address constants
  ADDRESS_SUFFIXES,

  // Address generators
  createAddressFields,
  createAddressFieldAccess,

  // Address utilities
  getAddressFieldNames,
  getAddressPrefix,
  hasCompleteAddress,

  // Enum utilities
  getEnumValues,

  // Junction entity helpers
  JUNCTION,
  createJunctionForeignKeys, // DEPRECATED: use createJunctionFields
  createJunctionFields, // NEW: preferred
  createJunctionUniqueConstraint,
};
