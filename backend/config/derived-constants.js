/**
 * Derived Constants - Constants derived from metadata at runtime
 *
 * This module loads entity metadata and derives constants that were
 * previously hardcoded. This ensures:
 * - Single source of truth (metadata)
 * - No drift between metadata and constants
 * - Automatic updates when metadata changes
 *
 * ARCHITECTURE:
 * - entity-types.js: Base types (no dependencies)
 * - models/*-metadata.js: Import from entity-types.js
 * - derived-constants.js: Loads metadata, derives maps (THIS FILE)
 * - constants.js: Re-exports everything for convenience
 */

const { NAME_TYPES } = require("./entity-types");

// Lazy-load to avoid circular dependencies at module load time
let _nameTypeMap = null;
let _allMetadata = null;

/**
 * Load all metadata (lazy, cached)
 * @returns {Object} Map of entityName → metadata
 */
function getAllMetadata() {
  if (!_allMetadata) {
    // Require here to avoid circular dependency at module load time
    _allMetadata = require("./models");
  }
  return _allMetadata;
}

/**
 * Build NAME_TYPE_MAP from metadata.nameType
 * @returns {Object} Frozen map of entityName → nameType
 */
function buildNameTypeMap() {
  const metadata = getAllMetadata();
  const map = {};

  for (const [entityName, entityMetadata] of Object.entries(metadata)) {
    // Only include entities with a defined nameType
    if (entityMetadata.nameType) {
      map[entityName] = entityMetadata.nameType;
    }
  }

  return Object.freeze(map);
}

/**
 * Get NAME_TYPE_MAP (lazy, cached)
 * @returns {Object} Frozen map of entityName → nameType
 */
function getNameTypeMap() {
  if (!_nameTypeMap) {
    _nameTypeMap = buildNameTypeMap();
  }
  return _nameTypeMap;
}

/**
 * Get name type by entity name
 * @param {string} entityName - Entity name (e.g., 'user', 'work_order')
 * @returns {string|null} Name type or null if not found
 */
function getNameType(entityName) {
  return getNameTypeMap()[entityName] || null;
}

/**
 * Check if entity is of a specific name type
 * @param {string} entityName - Entity name
 * @param {string} nameType - Name type to check (from NAME_TYPES)
 * @returns {boolean} True if entity is of the specified name type
 */
function isNameType(entityName, nameType) {
  return getNameType(entityName) === nameType;
}

/**
 * Get all entities of a specific name type
 * @param {string} nameType - Name type to filter by
 * @returns {string[]} Array of entity names
 */
function getEntitiesByNameType(nameType) {
  const map = getNameTypeMap();
  return Object.entries(map)
    .filter(([, type]) => type === nameType)
    .map(([name]) => name);
}

// ============================================================================
// IDENTIFIER CONFIGURATION (for COMPUTED entities)
// ============================================================================

// Lazy caches for identifier-related maps
let _entityPrefixes = null;
let _identifierFields = null;
let _tableNames = null;

/**
 * Build ENTITY_PREFIXES from metadata.identifierPrefix
 * @returns {Object} Frozen map of entityName → prefix
 */
function buildEntityPrefixes() {
  const metadata = getAllMetadata();
  const map = {};

  for (const [entityName, entityMetadata] of Object.entries(metadata)) {
    if (entityMetadata.identifierPrefix) {
      map[entityName] = entityMetadata.identifierPrefix;
    }
  }

  return Object.freeze(map);
}

/**
 * Get ENTITY_PREFIXES (lazy, cached)
 * @returns {Object} Frozen map of entityName → prefix (e.g., work_order → 'WO')
 */
function getEntityPrefixes() {
  if (!_entityPrefixes) {
    _entityPrefixes = buildEntityPrefixes();
  }
  return _entityPrefixes;
}

/**
 * Build IDENTIFIER_FIELDS from metadata.identityField for COMPUTED entities
 * @returns {Object} Frozen map of entityName → identityField
 */
function buildIdentifierFields() {
  const metadata = getAllMetadata();
  const map = {};

  for (const [entityName, entityMetadata] of Object.entries(metadata)) {
    // Only include COMPUTED entities that have identifierPrefix
    if (entityMetadata.identifierPrefix && entityMetadata.identityField) {
      map[entityName] = entityMetadata.identityField;
    }
  }

  return Object.freeze(map);
}

/**
 * Get IDENTIFIER_FIELDS (lazy, cached)
 * @returns {Object} Frozen map of entityName → identityField (e.g., work_order → 'work_order_number')
 */
function getIdentifierFields() {
  if (!_identifierFields) {
    _identifierFields = buildIdentifierFields();
  }
  return _identifierFields;
}

/**
 * Build TABLE_NAMES from metadata.tableName
 * @returns {Object} Frozen map of entityName → tableName
 */
function buildTableNames() {
  const metadata = getAllMetadata();
  const map = {};

  for (const [entityName, entityMetadata] of Object.entries(metadata)) {
    if (entityMetadata.tableName) {
      map[entityName] = entityMetadata.tableName;
    }
  }

  return Object.freeze(map);
}

/**
 * Get TABLE_NAMES (lazy, cached)
 * @returns {Object} Frozen map of entityName → tableName (e.g., work_order → 'work_orders')
 */
function getTableNames() {
  if (!_tableNames) {
    _tableNames = buildTableNames();
  }
  return _tableNames;
}

/**
 * Get entity prefix by name
 * @param {string} entityName - Entity name (e.g., 'work_order')
 * @returns {string|null} Prefix or null if not a COMPUTED entity
 */
function getEntityPrefix(entityName) {
  return getEntityPrefixes()[entityName] || null;
}

/**
 * Get identifier field by entity name
 * @param {string} entityName - Entity name
 * @returns {string|null} Identifier field or null
 */
function getIdentifierField(entityName) {
  return getIdentifierFields()[entityName] || null;
}

/**
 * Get table name by entity name
 * @param {string} entityName - Entity name
 * @returns {string|null} Table name or null
 */
function getTableName(entityName) {
  return getTableNames()[entityName] || null;
}

/**
 * Get display field(s) for an entity
 *
 * Returns the field(s) used to represent an entity in UI.
 * - HUMAN entities: returns ['first_name', 'last_name']
 * - SIMPLE/COMPUTED entities: returns [displayField] or [identityField] as fallback
 *
 * @param {string} entityName - Entity name
 * @returns {Array<string>} Array of field names for display
 */
function getDisplayFields(entityName) {
  const metadata = getAllMetadata();
  const entityMetadata = metadata[entityName];

  if (!entityMetadata) {
    return [];
  }

  // HUMAN entities use first_name + last_name (displayFields array)
  if (entityMetadata.displayFields) {
    return entityMetadata.displayFields;
  }

  // SIMPLE/COMPUTED entities use displayField (single field)
  if (entityMetadata.displayField) {
    return [entityMetadata.displayField];
  }

  // Fallback to identityField if no display config
  if (entityMetadata.identityField) {
    return [entityMetadata.identityField];
  }

  return [];
}

// ============================================================================
// AUDIT CONFIGURATION (derived from metadata)
// ============================================================================

// Lazy caches for audit-related maps
let _entityToResourceType = null;
let _entityActionMap = null;

/**
 * Build EntityToResourceType from metadata.
 * For audit purposes, resourceType = entityName (singular, snake_case).
 * This matches how audit_logs stores resource_type.
 *
 * @returns {Object} Frozen map of entityName → resourceType (= entityName)
 */
function buildEntityToResourceType() {
  const metadata = getAllMetadata();
  const map = {};

  for (const entityName of Object.keys(metadata)) {
    // For audit, resourceType is the entity name itself (singular snake_case)
    // e.g., 'customer' not 'customers'
    map[entityName] = entityName;
  }

  return Object.freeze(map);
}

/**
 * Get EntityToResourceType (lazy, cached)
 * @returns {Object} Frozen map of entityName → resourceType
 */
function getEntityToResourceType() {
  if (!_entityToResourceType) {
    _entityToResourceType = buildEntityToResourceType();
  }
  return _entityToResourceType;
}

/**
 * Build EntityActionMap - maps entity + operation to audit action name
 * @returns {Object} Frozen map of entityName → { create, update, delete }
 */
function buildEntityActionMap() {
  const metadata = getAllMetadata();
  const map = {};

  for (const entityName of Object.keys(metadata)) {
    // Generate action names: {entity}_{operation} (e.g., customer_create)
    map[entityName] = Object.freeze({
      create: `${entityName}_create`,
      update: `${entityName}_update`,
      delete: `${entityName}_delete`,
    });
  }

  return Object.freeze(map);
}

/**
 * Get EntityActionMap (lazy, cached)
 * @returns {Object} Frozen map of entityName → { create, update, delete }
 */
function getEntityActionMap() {
  if (!_entityActionMap) {
    _entityActionMap = buildEntityActionMap();
  }
  return _entityActionMap;
}

/**
 * Get resource type for entity
 * @param {string} entityName - Entity name
 * @returns {string} Resource type (defaults to entity name)
 */
function getResourceType(entityName) {
  return getEntityToResourceType()[entityName] || entityName;
}

/**
 * Get audit action for entity + operation
 * @param {string} entityName - Entity name
 * @param {string} operation - Operation ('create', 'update', 'delete')
 * @returns {string|null} Audit action or null
 */
function getAuditAction(entityName, operation) {
  const entityActions = getEntityActionMap()[entityName];
  return entityActions ? entityActions[operation] : null;
}

// ============================================================================
// SWAGGER PATH CONFIGURATION (derived from metadata)
// ============================================================================

/**
 * Core entities that have API routes (excludes utility entities)
 * These are entities with full CRUD API exposure
 */
const SWAGGER_ENTITY_NAMES = [
  "user",
  "role",
  "customer",
  "technician",
  "work_order",
  "invoice",
  "contract",
  "inventory",
];

// Lazy cache for swagger entity configs
let _swaggerEntityConfigs = null;

/**
 * Convert entity_name to Title Case display name
 * e.g., 'work_order' → 'Work Orders', 'user' → 'Users'
 * @param {string} entityName - Entity name in snake_case
 * @returns {string} Title case plural display name
 */
function toSwaggerDisplayName(entityName) {
  // Split on underscores, capitalize each word
  const words = entityName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  // Join with space and add 's' for plural (handle 'inventory' specially)
  const joined = words.join(" ");
  // Inventory is already plural-ish, use "Inventory Items" for clarity
  if (entityName === "inventory") {
    return "Inventory Items";
  }
  // Most entities just add 's'
  return joined + "s";
}

/**
 * Convert entity_name to schema reference (PascalCase with underscores)
 * e.g., 'work_order' → 'Work_Order', 'user' → 'User'
 * @param {string} entityName - Entity name in snake_case
 * @returns {string} Schema reference name
 */
function toSwaggerSchemaRef(entityName) {
  return entityName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("_");
}

/**
 * Convert entity_name to tag (Title Case, spaces for multi-word)
 * e.g., 'work_order' → 'Work Orders', 'user' → 'Users'
 * @param {string} entityName - Entity name in snake_case
 * @returns {string} Swagger tag name
 */
function toSwaggerTag(entityName) {
  return toSwaggerDisplayName(entityName);
}

/**
 * Build swagger entity configurations from metadata
 * @returns {Array} Array of { basePath, tag, schemaRef, displayName }
 */
function buildSwaggerEntityConfigs() {
  const metadata = getAllMetadata();
  const configs = [];

  for (const entityName of SWAGGER_ENTITY_NAMES) {
    const entityMetadata = metadata[entityName];
    if (!entityMetadata || !entityMetadata.tableName) {
      continue;
    }

    configs.push({
      entityName,
      basePath: entityMetadata.tableName, // e.g., 'users', 'work_orders'
      tag: toSwaggerTag(entityName), // e.g., 'Users', 'Work Orders'
      schemaRef: toSwaggerSchemaRef(entityName), // e.g., 'User', 'Work_Order'
      displayName: toSwaggerDisplayName(entityName), // e.g., 'Users', 'Work Orders'
    });
  }

  return configs;
}

/**
 * Get swagger entity configurations (lazy, cached)
 * @returns {Array} Array of { entityName, basePath, tag, schemaRef, displayName }
 */
function getSwaggerEntityConfigs() {
  if (!_swaggerEntityConfigs) {
    _swaggerEntityConfigs = buildSwaggerEntityConfigs();
  }
  return _swaggerEntityConfigs;
}

// ============================================================================
// SWAGGER SCHEMA DERIVATION (from metadata.fields)
// ============================================================================

// Lazy cache for swagger schemas
let _swaggerEntitySchemas = null;

/**
 * Map metadata field type to OpenAPI type
 * @param {Object} field - Field definition from metadata
 * @returns {Object} OpenAPI property definition
 */
function metadataFieldToOpenAPI(field) {
  const base = {};

  switch (field.type) {
    case "integer":
    case "foreignKey":
      base.type = "integer";
      break;

    case "string":
    case "text":
      base.type = "string";
      if (field.maxLength) {
        base.maxLength = field.maxLength;
      }
      if (field.pattern) {
        base.pattern = field.pattern;
      }
      break;

    case "email":
      base.type = "string";
      base.format = "email";
      break;

    case "boolean":
      base.type = "boolean";
      break;

    case "enum":
      base.type = "string";
      if (field.values && field.values.length > 0) {
        base.enum = [...field.values]; // Clone to avoid mutation
      }
      break;

    case "timestamp":
    case "datetime":
      base.type = "string";
      base.format = "date-time";
      break;

    case "date":
      base.type = "string";
      base.format = "date";
      break;

    case "decimal":
    case "number":
    case "money":
      base.type = "number";
      base.format = "decimal";
      break;

    case "json":
    case "array":
      base.type = "object";
      break;

    default:
      base.type = "string"; // Safe default
  }

  // Add description if available
  if (field.description) {
    base.description = field.description;
  }

  // Add default if available
  if (field.default !== undefined) {
    base.example = field.default;
  }

  // Mark readonly fields
  if (field.readonly) {
    base.readOnly = true;
  }

  return base;
}

/**
 * Build OpenAPI schema for a single entity from its metadata
 * @param {string} entityName - Entity name
 * @param {Object} entityMetadata - Entity metadata object
 * @returns {Object} OpenAPI schema object
 */
function buildEntitySchema(entityName, entityMetadata) {
  if (!entityMetadata.fields) {
    return null;
  }

  const properties = {};
  const required = [];

  for (const [fieldName, fieldDef] of Object.entries(entityMetadata.fields)) {
    properties[fieldName] = metadataFieldToOpenAPI(fieldDef);

    // Check if required
    if (fieldDef.required) {
      required.push(fieldName);
    }
  }

  const schema = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * Build all swagger entity schemas from metadata
 * @returns {Object} Map of schemaRef → OpenAPI schema
 */
function buildSwaggerEntitySchemas() {
  const metadata = getAllMetadata();
  const schemas = {};

  for (const entityName of SWAGGER_ENTITY_NAMES) {
    const entityMetadata = metadata[entityName];
    if (!entityMetadata) {
      continue;
    }

    const schemaRef = toSwaggerSchemaRef(entityName);
    const schema = buildEntitySchema(entityName, entityMetadata);

    if (schema) {
      schemas[schemaRef] = schema;
    }
  }

  return schemas;
}

/**
 * Get swagger entity schemas (lazy, cached)
 * @returns {Object} Map of schemaRef → OpenAPI schema
 */
function getSwaggerEntitySchemas() {
  if (!_swaggerEntitySchemas) {
    _swaggerEntitySchemas = buildSwaggerEntitySchemas();
  }
  return _swaggerEntitySchemas;
}

/**
 * Clear cache (for testing or hot reload)
 */
function clearCache() {
  _nameTypeMap = null;
  _allMetadata = null;
  _entityPrefixes = null;
  _identifierFields = null;
  _tableNames = null;
  _entityToResourceType = null;
  _entityActionMap = null;
  _swaggerEntityConfigs = null;
  _swaggerEntitySchemas = null;
}

module.exports = {
  // Re-export base types
  NAME_TYPES,

  // Name type functions
  getNameTypeMap,
  getNameType,
  isNameType,
  getEntitiesByNameType,

  // Identifier configuration functions
  getEntityPrefixes,
  getEntityPrefix,
  getIdentifierFields,
  getIdentifierField,
  getTableNames,
  getTableName,
  getDisplayFields,

  // Audit configuration functions
  getEntityToResourceType,
  getResourceType,
  getEntityActionMap,
  getAuditAction,

  // Swagger configuration functions
  SWAGGER_ENTITY_NAMES,
  getSwaggerEntityConfigs,
  getSwaggerEntitySchemas,
  toSwaggerDisplayName,
  toSwaggerSchemaRef,
  toSwaggerTag,
  metadataFieldToOpenAPI,
  buildEntitySchema,

  // For testing
  clearCache,

  // Lazy-loaded NAME_TYPE_MAP
  get NAME_TYPE_MAP() {
    return getNameTypeMap();
  },
};
