/**
 * Validation Schema Builder
 *
 * SRP LITERALISM: ONLY builds Joi validation schemas from entity metadata
 *
 * PHILOSOPHY:
 * - METADATA-DRIVEN: Uses entity metadata + validation-rules.json
 * - COMPOSABLE: Builds schemas for create/update operations
 * - CACHED: Schemas are built once per entity/operation pair
 * - TYPE-SAFE: Full Joi validation (types, formats, ranges, patterns)
 *
 * INTEGRATION:
 * - Uses validation-loader.js for field definitions
 * - Uses entity metadata for field lists
 * - Returns Joi schemas for middleware to validate against
 *
 * USAGE:
 *   const schema = buildEntitySchema('user', 'create');
 *   const { error, value } = schema.validate(req.body);
 */

const Joi = require('joi');
const { loadValidationRules, buildFieldSchema } = require('./validation-loader');

// Cache for built schemas (entityName:operation -> Joi schema)
const schemaCache = new Map();

/**
 * Map entity field names to validation-rules.json field definition keys
 *
 * Some field names differ between database columns and validation rules
 * (e.g., first_name vs firstName). This map handles the translation.
 */
const FIELD_TO_RULE_MAP = {
  // User fields
  email: 'email',
  first_name: 'firstName',
  last_name: 'lastName',
  role_id: 'roleId',
  is_active: 'isActive',
  auth0_id: null, // No validation - system-managed
  status: null, // Handled specially per entity

  // Role fields
  name: 'roleName',
  priority: 'rolePriority',
  description: 'roleDescription',

  // Customer fields
  phone: 'phone',
  company_name: 'companyName',
  billing_address: null, // Free text
  service_address: null, // Free text

  // Technician fields
  license_number: 'licenseNumber',
  hourly_rate: 'hourlyRate',
  user_id: 'userId',

  // Work Order fields
  title: 'title',
  customer_id: 'customerId',
  assigned_technician_id: 'technicianId',
  scheduled_start: 'startDate',
  scheduled_end: 'endDate',

  // Invoice fields
  invoice_number: 'invoiceNumber',
  work_order_id: 'workOrderId',
  amount: 'amount',
  tax: 'tax',
  total: 'total',
  due_date: 'dueDate',
  paid_at: null, // System-managed

  // Contract fields
  contract_number: 'contractNumber',
  start_date: 'startDate',
  end_date: 'endDate',
  terms: null, // Free text
  value: 'value',
  billing_cycle: null, // Enum handled separately

  // Inventory fields
  sku: 'sku',
  quantity: 'quantity',
  unit_cost: 'amount',
  reorder_level: 'quantity',
};

/**
 * Get status field definition key based on entity type
 * Each entity has its own status enum in validation-rules.json
 */
function getStatusRuleKey(entityName) {
  const statusMap = {
    user: 'userStatus',
    role: 'roleStatus',
    customer: 'customerStatus',
    technician: 'technicianStatus',
    workOrder: 'workOrderStatus',
    invoice: 'invoiceStatus',
    contract: 'contractStatus',
    inventory: 'inventoryStatus',
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
  // Handle status field specially (per-entity enum)
  if (fieldName === 'status') {
    const ruleKey = getStatusRuleKey(entityName);
    const fieldDef = rules.fields[ruleKey];
    if (fieldDef) {
      return buildFieldSchema({ ...fieldDef, required: isRequired }, fieldName);
    }
    return null;
  }

  // Look up the rule key
  const ruleKey = FIELD_TO_RULE_MAP[fieldName];

  // If explicitly null, no validation (free text or system-managed)
  if (ruleKey === null) {
    // Return a permissive schema for free text fields
    if (isRequired) {
      return Joi.any().required();
    }
    return Joi.any().optional();
  }

  // If no mapping, try direct field name
  const actualRuleKey = ruleKey || fieldName;
  const fieldDef = rules.fields[actualRuleKey];

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
 * @returns {string[]} List of creatable field names
 */
function deriveCreatableFields(metadata) {
  const fieldAccess = metadata.fieldAccess || {};
  return Object.keys(fieldAccess).filter((field) => {
    const access = fieldAccess[field];
    return access && access.create && access.create !== 'none';
  });
}

/**
 * Derive updateable fields from fieldAccess metadata
 * A field is updateable if its update access is NOT 'none'
 *
 * @param {Object} metadata - Entity metadata
 * @returns {string[]} List of updateable field names
 */
function deriveUpdateableFields(metadata) {
  const fieldAccess = metadata.fieldAccess || {};
  const immutableFields = new Set(metadata.immutableFields || []);
  
  return Object.keys(fieldAccess).filter((field) => {
    // Skip immutable fields
    if (immutableFields.has(field)) return false;
    
    const access = fieldAccess[field];
    return access && access.update && access.update !== 'none';
  });
}

/**
 * Build a complete Joi object schema for an entity operation
 *
 * @param {string} entityName - Entity name (e.g., 'user', 'workOrder')
 * @param {string} operation - 'create' or 'update'
 * @param {Object} metadata - Entity metadata from config/models
 * @returns {Joi.ObjectSchema} Complete Joi validation schema
 *
 * @example
 *   const schema = buildEntitySchema('user', 'create', userMetadata);
 *   const { error, value } = schema.validate({ email: 'test@example.com', ... });
 */
function buildEntitySchema(entityName, operation, metadata) {
  // Check cache first
  const cacheKey = `${entityName}:${operation}`;
  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey);
  }

  const rules = loadValidationRules();
  const schemaFields = {};

  if (operation === 'create') {
    // Required fields must be present and valid
    const requiredFields = metadata.requiredFields || [];
    for (const field of requiredFields) {
      const fieldSchema = buildSingleFieldSchema(field, entityName, true, rules);
      if (fieldSchema) {
        schemaFields[field] = fieldSchema;
      }
    }

    // Derive creatable fields from fieldAccess (or use explicit list if provided)
    const createableFields = metadata.createableFields || deriveCreatableFields(metadata);
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
    // Derive updateable fields from fieldAccess (or use explicit list if provided)
    const updateableFields = metadata.updateableFields || deriveUpdateableFields(metadata);
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
  _FIELD_TO_RULE_MAP: FIELD_TO_RULE_MAP,
  _getStatusRuleKey: getStatusRuleKey,
};
