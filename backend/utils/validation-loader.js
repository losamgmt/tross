/**
 * Validation Rule Loader
 *
 * SINGLE SOURCE OF TRUTH: Derives validation rules from entity metadata.
 * No separate JSON file required - everything from config/models/*-metadata.js
 *
 * MIGRATION PATH:
 * - v2.x: Loaded from config/validation-rules.json
 * - v3.0: Derived from entity metadata (this version)
 *
 * This ensures frontend and backend use IDENTICAL validation rules.
 * Frontend can fetch via /api/schema/validation-rules endpoint.
 */

const Joi = require('joi');
const AppError = require('./app-error');

// Import the deriver (SINGLE SOURCE OF TRUTH)
const { deriveValidationRules } = require('../config/validation-deriver');

// Cache for validation rules
let validationRules = null;

/**
 * Load validation rules - now derived from metadata
 * @returns {Object} Derived validation rules
 */
function loadValidationRules() {
  if (validationRules) {
    return validationRules; // Cache derived rules
  }

  try {
    // DERIVE from metadata instead of reading JSON
    validationRules = deriveValidationRules();
    return validationRules;
  } catch (error) {
    const { logger } = require('../config/logger');
    logger.error('[ValidationLoader] Failed to derive validation rules:', { error: error.message });
    throw new AppError('Cannot derive validation rules from metadata', 500, 'INTERNAL_ERROR');
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
    case 'object':
      // JSONB fields - accept any object structure
      schema = Joi.object();
      break;
    default:
      throw new AppError(`Unsupported field type: ${fieldDef.type} for ${fieldName}`, 500, 'INTERNAL_ERROR');
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
 * @deprecated Use buildEntitySchema() from validation-schema-builder.js instead.
 * This function is NOT role-aware and is kept only for backward compatibility.
 * Production code should use genericValidateBody middleware which uses buildEntitySchema.
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
    throw new AppError(`Unknown composite validation: ${operationName}`, 400, 'BAD_REQUEST');
  }

  const entityName = composite.entityName;
  const schemaFields = {};

  /**
   * Get field definition for a field name
   *
   * PRIORITY ORDER:
   * 1. Entity-specific fields from rules.entityFields (derived from metadata)

   * 2. Fallback to shared fields from rules.fields
   *
   * This ensures fields like 'status' are correctly resolved per-entity:
   * - user.status = enum ("pending_activation", "active", "suspended")
   * - work_order.status = enum ("pending", "assigned", "in_progress", ...)
   */
  const getFieldDef = (fieldName) => {
    // First: Try entity-specific field (source of truth)
    if (entityName && rules.entityFields?.[entityName]?.[fieldName]) {
      return rules.entityFields[entityName][fieldName];
    }

    // Fallback: Shared/global fields
    return rules.fields[fieldName];
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

/**
 * Clear the validation rules cache
 * Useful for testing or hot-reloading validation rules
 * @returns {void}
 */
function clearValidationCache() {
  validationRules = null;
}

module.exports = {
  loadValidationRules,
  buildFieldSchema,
  buildCompositeSchema,
  getValidationMetadata,
  clearValidationCache,
};
