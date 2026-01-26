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

// =============================================================================
// TYPE BUILDERS REGISTRY
// =============================================================================

/**
 * Registry of Joi schema builders for each semantic type.
 *
 * Each builder receives the fieldDef and returns a base Joi schema.
 * Common modifiers (required, maxLength, etc.) are applied after.
 *
 * To add a new type: Add an entry here. No switch statement updates needed.
 */
const TYPE_BUILDERS = {
  // ---- String-based types ----
  string: () => Joi.string(),

  text: () => Joi.string(), // Semantic: long-form content

  email: (fieldDef) => Joi.string().email({
    tlds: fieldDef.tldRestriction === false ? false : { allow: true },
  }),

  phone: () => Joi.string().pattern(/^\+?[1-9]\d{1,14}$/), // E.164 format

  url: () => Joi.string().uri({ scheme: ['http', 'https'] }),

  time: () => Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/), // HH:MM or HH:MM:SS

  // ---- Numeric types ----
  integer: () => Joi.number().integer(),

  decimal: (fieldDef) => {
    let schema = Joi.number();
    if (fieldDef.precision !== undefined) {
      schema = schema.precision(fieldDef.precision);
    }
    return schema;
  },

  currency: (fieldDef) => {
    // Currency: decimal with 2 precision, min 0 by default
    const schema = Joi.number().precision(fieldDef.precision || 2);
    return schema;
  },

  // ---- Other types ----
  boolean: () => Joi.boolean(),

  object: () => Joi.object(), // JSONB - ONLY for saved_views.settings per design

  // ---- Date/Time types ----
  date: () => Joi.date(), // Date only (YYYY-MM-DD) - DB: DATE
  // time is defined above in String-based types (HH:MM:SS pattern validation)
  timestamp: () => Joi.date().iso(), // Full datetime with timezone - DB: TIMESTAMPTZ

  enum: (fieldDef) => {
    const values = fieldDef.values || fieldDef.enum || [];
    return Joi.string().valid(...values);
  },
};

/**
 * Types that support string modifiers (minLength, maxLength, pattern, trim, etc.)
 */
const STRING_TYPES = new Set(['string', 'email', 'phone', 'text', 'url', 'time']);

/**
 * Types that support numeric modifiers (min, max)
 */
const NUMERIC_TYPES = new Set(['integer', 'decimal', 'currency']);

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
 *
 * Uses TYPE_BUILDERS registry for base schema, then applies common modifiers.
 *
 * @param {Object} fieldDef - Field definition from metadata
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {Joi.Schema} Joi validation schema
 */
function buildFieldSchema(fieldDef, fieldName) {
  const type = fieldDef.type || (fieldDef.format === 'date' ? 'date' : 'string');

  // Get builder from registry
  const builder = TYPE_BUILDERS[type];
  if (!builder) {
    throw new AppError(
      `Unsupported field type: ${type} for ${fieldName}. ` +
      `Supported types: ${Object.keys(TYPE_BUILDERS).join(', ')}`,
      500,
      'INTERNAL_ERROR',
    );
  }

  // Build base schema
  let schema = builder(fieldDef);

  // Apply string-specific modifiers
  if (STRING_TYPES.has(type)) {
    schema = applyStringModifiers(schema, fieldDef);
  }

  // Apply numeric modifiers
  if (NUMERIC_TYPES.has(type)) {
    schema = applyNumericModifiers(schema, fieldDef);
  }

  // Apply common modifiers (required, error messages)
  schema = applyCommonModifiers(schema, fieldDef);

  return schema;
}

/**
 * Apply string-specific modifiers to a schema
 */
function applyStringModifiers(schema, fieldDef) {
  // Legacy format support for backward compatibility
  if (fieldDef.type === 'string' && fieldDef.format === 'email') {
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

  return schema;
}

/**
 * Apply numeric modifiers to a schema
 */
function applyNumericModifiers(schema, fieldDef) {
  if (fieldDef.min !== undefined) {
    schema = schema.min(fieldDef.min);
  }

  if (fieldDef.max !== undefined) {
    schema = schema.max(fieldDef.max);
  }

  if (fieldDef.min !== undefined && fieldDef.min > 0) {
    schema = schema.positive();
  }

  return schema;
}

/**
 * Apply common modifiers (required, error messages) to a schema
 */
function applyCommonModifiers(schema, fieldDef) {
  // Apply required/optional
  if (fieldDef.required) {
    schema = schema.required();
  } else {
    schema = schema.optional();
  }

  // Apply custom error messages
  if (fieldDef.errorMessages) {
    schema = schema.messages(buildErrorMessages(fieldDef.errorMessages));
  }

  return schema;
}

/**
 * Build Joi error message object from field error messages
 */
function buildErrorMessages(errorMessages) {
  const messages = {};

  if (errorMessages.required) {
    messages['any.required'] = errorMessages.required;
    messages['string.empty'] = errorMessages.required;
  }

  if (errorMessages.format) {
    messages['string.email'] = errorMessages.format;
    messages['date.format'] = errorMessages.format;
    messages['date.base'] = errorMessages.format;
  }

  if (errorMessages.minLength) {
    messages['string.min'] = errorMessages.minLength;
  }

  if (errorMessages.maxLength) {
    messages['string.max'] = errorMessages.maxLength;
  }

  if (errorMessages.pattern) {
    messages['string.pattern.base'] = errorMessages.pattern;
  }

  if (errorMessages.enum) {
    messages['any.only'] = errorMessages.enum;
  }

  if (errorMessages.type) {
    messages['number.base'] = errorMessages.type;
    messages['boolean.base'] = errorMessages.type;
  }

  if (errorMessages.min) {
    messages['number.min'] = errorMessages.min;
    messages['number.positive'] = errorMessages.min;
  }

  if (errorMessages.max) {
    messages['number.max'] = errorMessages.max;
  }

  return messages;
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
  // Public API
  loadValidationRules,
  buildFieldSchema,
  buildCompositeSchema,
  getValidationMetadata,
  clearValidationCache,

  // Exported for testing - derive tests from these registries
  TYPE_BUILDERS,
  STRING_TYPES,
  NUMERIC_TYPES,
};
