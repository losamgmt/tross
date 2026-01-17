/**
 * Entity Registry - Single Source of Truth for Test Entity Discovery
 *
 * SRP: Auto-discover entities from config/models and provide validation.
 *
 * PRINCIPLE: No manual entity list maintenance in tests. If an entity
 * exists in config/models, it's automatically discovered and tested.
 *
 * DRIFT PREVENTION: This registry reads directly from config/models/index.js.
 * Adding a new entity there automatically includes it in test discovery.
 *
 * Usage:
 *   const { getAllEntityNames, validateEntityMetadata } = require('./entity-registry');
 *
 *   // Get all entity names for iteration
 *   const entities = getAllEntityNames();
 *   // => ['user', 'role', 'customer', 'technician', ...]
 *
 *   // Validate all entities have required metadata
 *   const errors = validateEntityMetadata();
 *   // => [] if valid, or ['entity: missing field'] if not
 */

const allMetadata = require('../../config/models');

// ============================================================================
// REQUIRED METADATA FIELDS
// ============================================================================

/**
 * Fields required for ALL entities to be testable by the factory system.
 * If an entity lacks any of these, tests cannot run reliably.
 */
const REQUIRED_FIELDS = [
  'tableName',      // Database table name (for API routes)
  'primaryKey',     // Primary key field (usually 'id')
  'requiredFields', // Fields required for entity creation
  'identityField',  // Human-readable identifier field
];

/**
 * Fields required for entities that participate in RLS (most business entities).
 * System tables (preferences, saved_view, file_attachment) may not have these.
 */
const RLS_REQUIRED_FIELDS = [
  'rlsResource',    // Permission resource name in permissions.json
  'fieldAccess',    // Role-based field-level access control
];

/**
 * Name types that are business entities (vs system tables).
 * Business entities require full RLS testing.
 */
const BUSINESS_NAME_TYPES = ['human', 'simple', 'computed'];

// ============================================================================
// ENTITY DISCOVERY
// ============================================================================

/**
 * Get all entity names from the metadata registry.
 * Reads directly from config/models - no manual list to maintain.
 *
 * @returns {string[]} Array of entity names
 */
function getAllEntityNames() {
  return Object.keys(allMetadata);
}

/**
 * Get entity metadata by name.
 *
 * @param {string} entityName - Entity name (e.g., 'customer', 'user')
 * @returns {Object} Entity metadata with entityName added
 * @throws {Error} If entity not found
 */
function getEntityMetadata(entityName) {
  const meta = allMetadata[entityName];
  if (!meta) {
    const available = getAllEntityNames().join(', ');
    throw new Error(`Unknown entity: ${entityName}. Available: ${available}`);
  }
  return { ...meta, entityName };
}

/**
 * Check if an entity is a business entity (vs system table).
 * Business entities require full RLS testing.
 *
 * @param {string} entityName - Entity name
 * @returns {boolean} True if business entity
 */
function isBusinessEntity(entityName) {
  const meta = allMetadata[entityName];
  if (!meta) return false;

  // Has a business name type
  if (meta.nameType && BUSINESS_NAME_TYPES.includes(meta.nameType.toLowerCase())) {
    return true;
  }

  // Has RLS resource (participates in permission system)
  if (meta.rlsResource) {
    return true;
  }

  return false;
}

/**
 * Get all business entity names (entities that require full RLS testing).
 *
 * @returns {string[]} Array of business entity names
 */
function getBusinessEntityNames() {
  return getAllEntityNames().filter(isBusinessEntity);
}

/**
 * Get all system entity names (entities that are system tables).
 *
 * @returns {string[]} Array of system entity names
 */
function getSystemEntityNames() {
  return getAllEntityNames().filter(name => !isBusinessEntity(name));
}

// ============================================================================
// METADATA VALIDATION
// ============================================================================

/**
 * Validate all entities have required metadata for testing.
 * Returns array of error messages (empty if all valid).
 *
 * @returns {string[]} Array of validation error messages
 */
function validateEntityMetadata() {
  const errors = [];

  for (const entityName of getAllEntityNames()) {
    const meta = allMetadata[entityName];

    // Check required fields for ALL entities
    for (const field of REQUIRED_FIELDS) {
      if (meta[field] === undefined || meta[field] === null) {
        errors.push(`${entityName}: missing required field '${field}'`);
      }
    }

    // Check RLS fields for business entities
    if (isBusinessEntity(entityName)) {
      for (const field of RLS_REQUIRED_FIELDS) {
        if (meta[field] === undefined || meta[field] === null) {
          errors.push(`${entityName}: missing RLS field '${field}' (required for business entities)`);
        }
      }
    }

    // Validate requiredFields is an array
    if (meta.requiredFields && !Array.isArray(meta.requiredFields)) {
      errors.push(`${entityName}: requiredFields must be an array`);
    }

    // Validate fieldAccess is an object (if present)
    if (meta.fieldAccess && typeof meta.fieldAccess !== 'object') {
      errors.push(`${entityName}: fieldAccess must be an object`);
    }
  }

  return errors;
}

/**
 * Assert all entity metadata is valid. Throws if any errors.
 * Useful in test setup to fail fast.
 *
 * @throws {Error} If any metadata validation errors
 */
function assertValidMetadata() {
  const errors = validateEntityMetadata();
  if (errors.length > 0) {
    throw new Error(`Entity metadata validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

// ============================================================================
// GENERIC CRUD SUPPORT
// ============================================================================

/**
 * Entities that use specialized routes (not GenericEntityService).
 * These entities cannot be tested with standard CRUD factory scenarios.
 *
 * - preferences: Uses /api/preferences with GET/PUT pattern (no POST/DELETE)
 * - file_attachment: Uses /api/:entityType/:entityId/files (polymorphic)
 */
/**
 * Entities that use specialized routes (not the generic CRUD factory).
 * 
 * These entities require custom route handling:
 * - preferences: Uses shared PK pattern (id = user.id), specialized service
 * - file_attachment: Polymorphic S3-based storage, specialized upload flow
 * - saved_view: User-owned entity (user_id auto-injected from auth context)
 * - audit_log: Read-only system table at /api/audit/*, writes internal only
 * 
 * They should have their own dedicated tests, not run through all-entities.test.js
 */
const SPECIALIZED_ROUTE_ENTITIES = ['preferences', 'file_attachment', 'saved_view', 'audit_log'];

/**
 * Check if an entity uses generic CRUD routes (testable by factory).
 *
 * @param {string} entityName - Entity name
 * @returns {boolean} True if uses generic CRUD
 */
function usesGenericCrud(entityName) {
  return !SPECIALIZED_ROUTE_ENTITIES.includes(entityName);
}

/**
 * Get all entities that use generic CRUD routes.
 * These are the entities that can be tested by the factory.
 *
 * @returns {string[]} Entity names with generic CRUD
 */
function getGenericCrudEntityNames() {
  return getAllEntityNames().filter(usesGenericCrud);
}

/**
 * Get entities with specialized routes (not testable by standard factory).
 *
 * @returns {string[]} Entity names with specialized routes
 */
function getSpecializedRouteEntityNames() {
  return SPECIALIZED_ROUTE_ENTITIES.filter(name => getAllEntityNames().includes(name));
}

// ============================================================================
// ENTITY CATEGORIZATION (for selective test running)
// ============================================================================

/**
 * Get entities grouped by category for selective testing.
 *
 * @returns {Object} Entities grouped by category
 */
function getEntitiesByCategory() {
  const categories = {
    human: [],      // first_name + last_name entities
    simple: [],     // single 'name' field entities (role, inventory)
    computed: [],   // auto-generated identity (work orders, invoices)
    system: [],     // system tables (preferences, saved_views)
  };

  for (const entityName of getAllEntityNames()) {
    const meta = allMetadata[entityName];
    const category = meta.nameType?.toLowerCase() || 'system';

    if (categories[category]) {
      categories[category].push(entityName);
    } else {
      categories.system.push(entityName);
    }
  }

  return categories;
}

/**
 * Get entities that have a specific metadata feature.
 * Useful for scenario selection.
 *
 * @param {string} featurePath - Dot-notation path to check (e.g., 'foreignKeys', 'searchableFields')
 * @returns {string[]} Entity names that have the feature
 */
function getEntitiesWithFeature(featurePath) {
  return getAllEntityNames().filter(entityName => {
    const meta = allMetadata[entityName];
    const parts = featurePath.split('.');
    let value = meta;

    for (const part of parts) {
      if (value === undefined || value === null) return false;
      value = value[part];
    }

    // Feature exists if value is truthy or is an array/object with content
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
    return Boolean(value);
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Discovery
  getAllEntityNames,
  getEntityMetadata,

  // Categorization
  isBusinessEntity,
  getBusinessEntityNames,
  getSystemEntityNames,
  getEntitiesByCategory,
  getEntitiesWithFeature,

  // Generic CRUD support
  usesGenericCrud,
  getGenericCrudEntityNames,
  getSpecializedRouteEntityNames,

  // Validation
  validateEntityMetadata,
  assertValidMetadata,

  // Constants (for reference)
  REQUIRED_FIELDS,
  RLS_REQUIRED_FIELDS,
  BUSINESS_NAME_TYPES,
  SPECIALIZED_ROUTE_ENTITIES,
};
