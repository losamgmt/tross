/**
 * Validation Rule Loader
 *
 * Loads centralized validation rules from config/validation-rules.json
 * and generates Joi schemas dynamically.
 *
 * This ensures frontend and backend use IDENTICAL validation rules.
 */

const fs = require('fs');
const path = require('path');
const Joi = require('joi');

// Validate schema structure on first load (if ajv is available)
let schemaValidated = false;

// Load validation rules from central config
const VALIDATION_RULES_PATH = path.join(__dirname, '../../config/validation-rules.json');
let validationRules = null;

/**
 * Load validation rules from JSON file
 * @returns {Object} Parsed validation rules
 */
function loadValidationRules() {
  if (validationRules) {
    return validationRules; // Cache loaded rules
  }

  try {
    const rulesJson = fs.readFileSync(VALIDATION_RULES_PATH, 'utf8');
    validationRules = JSON.parse(rulesJson);

    // Validate schema structure on first load (skip in test mode for performance)
    if (!schemaValidated && process.env.NODE_ENV !== 'test') {
      try {
        const { validateRulesSchema } = require('./validation-schema-validator');
        validateRulesSchema();
        schemaValidated = true;
      } catch (error) {
        // If ajv not installed, skip schema validation
        if (error.code !== 'MODULE_NOT_FOUND') {
          throw error;
        }
      }
    }

    return validationRules;
  } catch (error) {
    const { logger } = require('../config/logger');
    logger.error('[ValidationLoader] Failed to load validation rules:', { error: error.message });
    throw new Error('Cannot load validation rules. Check config/validation-rules.json');
  }
}

/**
 * Build a Joi schema from field definition
 * @param {Object} fieldDef - Field definition from validation-rules.json
 * @param {string} fieldName - Name of the field (for debugging)
 * @returns {Joi.Schema} Joi validation schema
 */
function buildFieldSchema(fieldDef, fieldName) {
  let schema;

  // Handle date type with semantic validation
  if (fieldDef.type === 'date' || fieldDef.format === 'date') {
    schema = Joi.date().iso();

    // Apply required/optional for dates
    if (fieldDef.required) {
      schema = schema.required();
    } else {
      schema = schema.optional();
    }

    // Apply date-specific error messages
    if (fieldDef.errorMessages) {
      const messages = {};
      if (fieldDef.errorMessages.required) {
        messages['any.required'] = fieldDef.errorMessages.required;
      }
      if (fieldDef.errorMessages.format) {
        messages['date.format'] = fieldDef.errorMessages.format;
        messages['date.base'] = fieldDef.errorMessages.format;
      }
      schema = schema.messages(messages);
    }

    return schema;
  }

  // Start with base type
  switch (fieldDef.type) {
    case 'string':
      schema = Joi.string();
      break;
    case 'integer':
      schema = Joi.number().integer();
      break;
    case 'number':
      schema = Joi.number();
      break;
    case 'boolean':
      schema = Joi.boolean();
      break;
    default:
      throw new Error(`Unsupported field type: ${fieldDef.type} for ${fieldName}`);
  }

  // Apply string-specific rules
  if (fieldDef.type === 'string') {
    if (fieldDef.format === 'email') {
      // Email format with TLD policy
      schema = schema.email({
        tlds: fieldDef.tldRestriction === false ? false : { allow: true },
      });
    }

    if (fieldDef.minLength !== undefined) {
      schema = schema.min(fieldDef.minLength);
    }

    if (fieldDef.maxLength !== undefined) {
      schema = schema.max(fieldDef.maxLength);
    }

    if (fieldDef.pattern) {
      schema = schema.pattern(new RegExp(fieldDef.pattern));
    }

    if (fieldDef.trim) {
      schema = schema.trim();
    }

    if (fieldDef.lowercase) {
      schema = schema.lowercase();
    }

    if (fieldDef.allowNull) {
      schema = schema.allow(null, '');
    }

    // Apply enum validation (for string types)
    if (fieldDef.enum && Array.isArray(fieldDef.enum)) {
      schema = schema.valid(...fieldDef.enum);
    }
  }

  // Apply number-specific rules
  if (fieldDef.type === 'integer' || fieldDef.type === 'number') {
    if (fieldDef.min !== undefined) {
      schema = schema.min(fieldDef.min);
    }

    if (fieldDef.max !== undefined) {
      schema = schema.max(fieldDef.max);
    }

    if (fieldDef.type === 'integer') {
      schema = schema.integer();
    }

    if (fieldDef.min !== undefined && fieldDef.min > 0) {
      schema = schema.positive();
    }
  }

  // Apply required/optional
  if (fieldDef.required) {
    schema = schema.required();
  } else {
    schema = schema.optional();
  }

  // Apply custom error messages
  if (fieldDef.errorMessages) {
    const messages = {};

    // Map error types to Joi message keys
    if (fieldDef.errorMessages.required) {
      messages['any.required'] = fieldDef.errorMessages.required;
      messages['string.empty'] = fieldDef.errorMessages.required;
    }

    if (fieldDef.errorMessages.format) {
      messages['string.email'] = fieldDef.errorMessages.format;
    }

    if (fieldDef.errorMessages.minLength) {
      messages['string.min'] = fieldDef.errorMessages.minLength;
    }

    if (fieldDef.errorMessages.maxLength) {
      messages['string.max'] = fieldDef.errorMessages.maxLength;
    }

    if (fieldDef.errorMessages.pattern) {
      messages['string.pattern.base'] = fieldDef.errorMessages.pattern;
    }

    if (fieldDef.errorMessages.enum) {
      messages['any.only'] = fieldDef.errorMessages.enum;
    }

    if (fieldDef.errorMessages.type) {
      messages['number.base'] = fieldDef.errorMessages.type;
      messages['boolean.base'] = fieldDef.errorMessages.type;
    }

    if (fieldDef.errorMessages.min) {
      messages['number.min'] = fieldDef.errorMessages.min;
      messages['number.positive'] = fieldDef.errorMessages.min;
    }

    if (fieldDef.errorMessages.max) {
      messages['number.max'] = fieldDef.errorMessages.max;
    }

    schema = schema.messages(messages);
  }

  return schema;
}

/**
 * Build a composite Joi schema for operations like "createUser" or "updateRole"
 *
 * METADATA-DRIVEN: Uses entityName from composite definition to load entity metadata.
 * No string parsing or hardcoded mappings - everything derived from configuration.
 *
 * @param {string} operationName - Name of the composite validation (e.g., "createUser")
 * @returns {Joi.ObjectSchema} Complete Joi object schema
 */
function buildCompositeSchema(operationName) {
  const rules = loadValidationRules();

  const composite = rules.compositeValidations[operationName];
  if (!composite) {
    throw new Error(`Unknown composite validation: ${operationName}`);
  }

  // Get entity metadata for status field validation (if entity context available)
  let entityMetadata = null;
  if (composite.entityName) {
    try {
      const allMetadata = require('../config/models');
      entityMetadata = allMetadata[composite.entityName];
    } catch {
      // Entity metadata not available - will use generic status validation
    }
  }

  const schemaFields = {};

  /**
   * Get field definition for a field name
   *
   * PRIORITY ORDER (entity metadata is source of truth):
   * 1. Entity metadata fields (if entity context available)
   * 2. Fallback to validation-rules.json for universal fields (email, phone, etc.)
   *
   * This ensures fields like 'priority' are correctly resolved per-entity:
   * - role.priority = integer (1-100)
   * - work_order.priority = enum ("low", "normal", "high", "urgent")
   */
  const getFieldDef = (fieldName) => {
    // First: Try entity metadata (source of truth for entity-specific fields)
    if (entityMetadata?.fields?.[fieldName]) {
      const metaField = entityMetadata.fields[fieldName];
      return convertMetadataToFieldDef(metaField, fieldName);
    }

    // Fallback: Universal fields from validation-rules.json
    return rules.fields[fieldName];
  };

  /**
   * Convert entity metadata field format to validation-rules.json field format
   * Entity metadata uses: { type, values, required, min, max, maxLength, default }
   * Validation rules use: { type, enum, required, min, max, maxLength, errorMessages }
   */
  const convertMetadataToFieldDef = (metaField, fieldName) => {
    const fieldDef = {
      required: metaField.required || false,
    };

    // Handle type mapping
    switch (metaField.type) {
      case 'enum':
        fieldDef.type = 'string';
        fieldDef.enum = metaField.values;
        fieldDef.errorMessages = {
          enum: `${fieldName} must be one of: ${metaField.values.join(', ')}`,
        };
        break;
      case 'email':
        fieldDef.type = 'string';
        fieldDef.format = 'email';
        fieldDef.maxLength = metaField.maxLength || 255;
        break;
      case 'decimal':
      case 'currency':
        fieldDef.type = 'number';
        if (metaField.min !== undefined) {fieldDef.min = metaField.min;}
        if (metaField.max !== undefined) {fieldDef.max = metaField.max;}
        break;
      case 'integer':
      case 'foreignKey': // Foreign keys are integer IDs
        fieldDef.type = 'integer';
        fieldDef.min = 1; // FK IDs must be positive
        if (metaField.min !== undefined) {fieldDef.min = metaField.min;}
        if (metaField.max !== undefined) {fieldDef.max = metaField.max;}
        break;
      case 'boolean':
        fieldDef.type = 'boolean';
        break;
      case 'date':
      case 'timestamp':
        fieldDef.type = 'date';
        fieldDef.format = 'date';
        break;
      case 'uuid':
        fieldDef.type = 'string';
        fieldDef.pattern = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        break;
      case 'string':
      default:
        fieldDef.type = 'string';
        if (metaField.minLength !== undefined) {fieldDef.minLength = metaField.minLength;}
        if (metaField.maxLength !== undefined) {fieldDef.maxLength = metaField.maxLength;}
        if (metaField.pattern) {fieldDef.pattern = metaField.pattern;}
        break;
    }

    return fieldDef;
  };

  // Add required fields - force required: true regardless of metadata
  composite.requiredFields?.forEach(fieldName => {
    const fieldDef = getFieldDef(fieldName);
    if (!fieldDef) {
      // Log warning but don't fail - field might be entity-specific
      const { logger } = require('../config/logger');
      logger.warn(`[ValidationLoader] Field definition not found: ${fieldName}`);
      return;
    }
    // Force required even if definition says optional
    const requiredDef = { ...fieldDef, required: true };
    schemaFields[fieldName] = buildFieldSchema(requiredDef, fieldName);
  });

  // Add optional fields
  composite.optionalFields?.forEach(fieldName => {
    const fieldDef = getFieldDef(fieldName);
    if (!fieldDef) {
      const { logger } = require('../config/logger');
      logger.warn(`[ValidationLoader] Field definition not found: ${fieldName}`);
      return;
    }
    // Force optional even if definition says required
    const optionalDef = { ...fieldDef, required: false };
    schemaFields[fieldName] = buildFieldSchema(optionalDef, fieldName);
  });

  return Joi.object(schemaFields);
}

/**
 * Get validation rules metadata
 * @returns {Object} Version, policy, and metadata
 */
function getValidationMetadata() {
  const rules = loadValidationRules();
  return {
    version: rules.version,
    policy: rules.policy,
    lastUpdated: rules.lastUpdated,
    fields: Object.keys(rules.fields),
    operations: Object.keys(rules.compositeValidations),
  };
}

module.exports = {
  loadValidationRules,
  buildFieldSchema,
  buildCompositeSchema,
  getValidationMetadata,
};
