/**
 * Validation Schema Builder
 *
 * SRP LITERALISM: ONLY builds Joi validation schemas from entity metadata
 *
 * PHILOSOPHY:
 * - METADATA-DRIVEN: Uses entity metadata + validation-rules.json
 * - ROLE-AWARE: Filters fields by user's role permissions (SECURITY)
 * - COMPOSABLE: Builds schemas for create/update operations
 * - CACHED: Schemas are built once per entity/operation/role triplet
 * - TYPE-SAFE: Full Joi validation (types, formats, ranges, patterns)
 *
 * SECURITY:
 * - Field-level access control: Only fields the user's role can write are accepted
 * - Uses ROLE_HIERARCHY from constants.js to determine permission levels
 * - Customers cannot set fields requiring dispatcher+ permissions
 *
 * INTEGRATION:
 * - Uses validation-loader.js for field definitions
 * - Uses entity metadata for field lists
 * - Uses response-transform.js for role permission checks
 * - Returns Joi schemas for middleware to validate against
 *
 * USAGE:
 *   // Role-aware (RECOMMENDED for security):
 *   const schema = buildEntitySchema('work_order', 'create', metadata, 'customer');
 *
 *   // Without role (backward compatible, allows all writable fields):
 *   const schema = buildEntitySchema('user', 'create', metadata);
 *   const { error, value } = schema.validate(req.body);
 */

const Joi = require('joi');
const { loadValidationRules, buildFieldSchema } = require('./validation-loader');
const { hasFieldPermission, normalizeRoleName } = require('./response-transform');

// Cache for built schemas (entityName:operation:role -> Joi schema)
// Role is included in cache key for role-aware schemas
const schemaCache = new Map();

/**
 * Fields that should NOT be validated (system-managed or free text)
 * These fields get a permissive Joi.any() schema
 * All other fields use their field name directly to look up rules in validation-rules.json
 */
const SYSTEM_MANAGED_FIELDS = new Set([
  // System-managed (no user input)
  'auth0_id',
  'paid_at',
  'created_at',
  'updated_at',

  // Free text (no specific validation)
  'billing_address',
  'service_address',
  'terms',
  'notes',
  'description', // Generic description - entity-specific ones use entityFields

  // Handled specially (status/priority use entityFields)
  'status',
]);

/**
 * Get status field definition key based on entity type
 * Each entity has its own status enum in validation-rules.json
 */
function getStatusRuleKey(entityName) {
  const statusMap = {
    user: 'user_status',
    role: 'role_status',
    customer: 'customer_status',
    technician: 'technician_status',
    work_order: 'work_order_status',
    invoice: 'invoice_status',
    contract: 'contract_status',
    inventory: 'inventory_status',
  };
  return statusMap[entityName] || 'status';
}

/**
 * Build a Joi schema for a single field
 *
 * @param {string} fieldName - Database column name
 * @param {string} entityName - Entity name for context
 * @param {boolean} isRequired - Whether field is required
 * @param {Object} rules - Loaded validation rules
 * @returns {Joi.Schema|null} Joi schema or null if no validation needed
 */
function buildSingleFieldSchema(fieldName, entityName, isRequired, rules) {
  // Entity-specific enum fields (status, priority) - check entityFields
  if (fieldName === 'status' || fieldName === 'priority') {
    const fieldDef = rules.entityFields?.[entityName]?.[fieldName];
    if (fieldDef) {
      return buildFieldSchema({ ...fieldDef, required: isRequired }, fieldName);
    }
    return null;
  }

  // System-managed or free-text fields - use permissive schema
  if (SYSTEM_MANAGED_FIELDS.has(fieldName)) {
    if (isRequired) {
      return Joi.any().required();
    }
    return Joi.any().optional();
  }

  // Look up field definition directly by field name (snake_case matches JSON)
  const fieldDef = rules.fields[fieldName];

  if (!fieldDef) {
    // No rule found - use permissive schema
    if (isRequired) {
      return Joi.any().required();
    }
    return Joi.any().optional();
  }

  // Build schema with correct required flag
  return buildFieldSchema({ ...fieldDef, required: isRequired }, fieldName);
}

/**
 * Derive creatable fields from fieldAccess metadata
 * A field is creatable if its create access is NOT 'none'
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} [userRole] - User's role for role-aware filtering (optional)
 * @returns {string[]} List of creatable field names
 */
function deriveCreatableFields(metadata, userRole) {
  const fieldAccess = metadata.fieldAccess || {};
  return Object.keys(fieldAccess).filter((field) => {
    const access = fieldAccess[field];
    if (!access || !access.create || access.create === 'none') {
      return false;
    }
    // If userRole provided, check if user's role meets the minimum requirement
    if (userRole) {
      return hasFieldPermission(userRole, access.create);
    }
    // Backward compatible: if no role, allow all creatable fields
    return true;
  });
}

/**
 * Derive updateable fields from fieldAccess metadata
 * A field is updateable if its update access is NOT 'none'
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} [userRole] - User's role for role-aware filtering (optional)
 * @returns {string[]} List of updateable field names
 */
function deriveUpdateableFields(metadata, userRole) {
  const fieldAccess = metadata.fieldAccess || {};
  const immutableFields = new Set(metadata.immutableFields || []);

  return Object.keys(fieldAccess).filter((field) => {
    // Skip immutable fields
    if (immutableFields.has(field)) {
      return false;
    }
    const access = fieldAccess[field];
    if (!access || !access.update || access.update === 'none') {
      return false;
    }
    // If userRole provided, check if user's role meets the minimum requirement
    if (userRole) {
      return hasFieldPermission(userRole, access.update);
    }
    // Backward compatible: if no role, allow all updateable fields
    return true;
  });
}

/**
 * Build a complete Joi object schema for an entity operation
 *
 * SECURITY: When userRole is provided, only fields the user's role can write
 * are included in the schema. Fields requiring higher permissions are stripped.
 *
 * @param {string} entityName - Entity name (e.g., 'user', 'work_order')
 * @param {string} operation - 'create' or 'update'
 * @param {Object} metadata - Entity metadata from config/models
 * @param {string} [userRole] - User's role for role-aware field filtering (RECOMMENDED)
 * @returns {Joi.ObjectSchema} Complete Joi validation schema
 *
 * @example
 *   // Role-aware (SECURE - filters fields by permission):
 *   const schema = buildEntitySchema('work_order', 'create', metadata, 'customer');
 *   // Customer can only set fields where create permission <= 'customer'
 *
 *   // Backward compatible (allows all writable fields):
 *   const schema = buildEntitySchema('user', 'create', metadata);
 */
function buildEntitySchema(entityName, operation, metadata, userRole) {
  // Normalize role for consistent cache keys
  const normalizedRole = userRole ? normalizeRoleName(userRole) : null;

  // Check cache first - include role in cache key for role-aware schemas
  const cacheKey = normalizedRole
    ? `${entityName}:${operation}:${normalizedRole}`
    : `${entityName}:${operation}`;
  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey);
  }

  const rules = loadValidationRules();
  const schemaFields = {};

  if (operation === 'create') {
    // Derive creatable fields - role-aware if userRole provided
    const createableFields = metadata.createableFields || deriveCreatableFields(metadata, normalizedRole);
    const createableSet = new Set(createableFields);

    // Required fields must be present and valid
    // BUT only if the user's role can create them
    const requiredFields = (metadata.requiredFields || []).filter((field) => {
      // If role-aware, only require fields user can create
      return !normalizedRole || createableSet.has(field);
    });

    for (const field of requiredFields) {
      const fieldSchema = buildSingleFieldSchema(field, entityName, true, rules);
      if (fieldSchema) {
        schemaFields[field] = fieldSchema;
      }
    }

    // Add remaining creatable fields as optional
    for (const field of createableFields) {
      // Skip if already added as required
      if (schemaFields[field]) {
        continue;
      }

      const fieldSchema = buildSingleFieldSchema(field, entityName, false, rules);
      if (fieldSchema) {
        schemaFields[field] = fieldSchema;
      }
    }
  } else if (operation === 'update') {
    // Derive updateable fields - role-aware if userRole provided
    const updateableFields = metadata.updateableFields || deriveUpdateableFields(metadata, normalizedRole);
    for (const field of updateableFields) {
      const fieldSchema = buildSingleFieldSchema(field, entityName, false, rules);
      if (fieldSchema) {
        schemaFields[field] = fieldSchema;
      }
    }
  }

  // Build the schema - strip unknown fields silently for security
  // .unknown(false) would reject them; .options({ stripUnknown: true }) strips them
  const schema = Joi.object(schemaFields).options({ stripUnknown: true });

  // Cache it
  schemaCache.set(cacheKey, schema);

  return schema;
}

/**
 * Clear the schema cache (useful for testing)
 */
function clearSchemaCache() {
  schemaCache.clear();
}

/**
 * Get cache stats (for debugging)
 */
function getSchemaCacheStats() {
  return {
    size: schemaCache.size,
    keys: Array.from(schemaCache.keys()),
  };
}

module.exports = {
  buildEntitySchema,
  buildSingleFieldSchema,
  clearSchemaCache,
  getSchemaCacheStats,
  deriveCreatableFields,
  deriveUpdateableFields,
  // Exported for testing
  _SYSTEM_MANAGED_FIELDS: SYSTEM_MANAGED_FIELDS, _getStatusRuleKey: getStatusRuleKey,
};