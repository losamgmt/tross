/**
 * Preferences Validation Middleware
 *
 * SRP: ONLY validates preference-related request bodies
 * Uses Joi for consistent validation with other endpoints
 *
 * DESIGN:
 * - Validates preference updates have valid keys and values
 * - Rejects unknown preference keys
 * - Type-checks values against preference schema
 */
const Joi = require('joi');
const ResponseFormatter = require('../utils/response-formatter');
const { PREFERENCE_SCHEMA } = require('../services/preferences-service');

/**
 * Build Joi schema from preference schema definition
 * Converts our internal schema format to Joi validators
 */
function buildPreferenceJoiSchema() {
  const schemaFields = {};

  for (const [key, def] of Object.entries(PREFERENCE_SCHEMA)) {
    switch (def.type) {
      case 'enum':
        schemaFields[key] = Joi.string()
          .valid(...def.values)
          .messages({
            'any.only': `${key} must be one of: ${def.values.join(', ')}`,
          });
        break;

      case 'boolean':
        schemaFields[key] = Joi.boolean().messages({
          'boolean.base': `${key} must be a boolean`,
        });
        break;

      case 'string':
        let stringSchema = Joi.string();
        if (def.maxLength) {
          stringSchema = stringSchema.max(def.maxLength);
        }
        schemaFields[key] = stringSchema.messages({
          'string.base': `${key} must be a string`,
          'string.max': `${key} must be at most ${def.maxLength} characters`,
        });
        break;

      case 'number':
        let numberSchema = Joi.number();
        if (def.min !== undefined) {
          numberSchema = numberSchema.min(def.min);
        }
        if (def.max !== undefined) {
          numberSchema = numberSchema.max(def.max);
        }
        schemaFields[key] = numberSchema.messages({
          'number.base': `${key} must be a number`,
          'number.min': `${key} must be at least ${def.min}`,
          'number.max': `${key} must be at most ${def.max}`,
        });
        break;

      /* istanbul ignore next -- Defensive fallback for unknown type */
      default:
        // Unknown type - allow any value
        schemaFields[key] = Joi.any();
    }
  }

  return Joi.object(schemaFields)
    .min(1)
    .messages({
      'object.min': 'At least one preference must be provided',
    });
}

// Build the schema once at module load
const preferencesUpdateSchema = buildPreferenceJoiSchema();

/**
 * Validate preference update request body
 * Ensures all preference keys are known and values are valid types
 */
const validatePreferencesUpdate = (req, res, next) => {
  const { error, value } = preferencesUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false, // Don't strip - we want to reject unknown keys
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));

    // Check for unknown keys specifically
    const unknownKeys = Object.keys(req.body).filter(
      (key) => !Object.keys(PREFERENCE_SCHEMA).includes(key),
    );

    if (unknownKeys.length > 0) {
      details.push({
        field: unknownKeys.join(', '),
        message: `Unknown preference key(s): ${unknownKeys.join(', ')}`,
      });
    }

    return ResponseFormatter.badRequest(
      res,
      error.details[0]?.message || 'Invalid preferences',
      details,
    );
  }

  // Replace req.body with validated value
  req.body = value;
  next();
};

/**
 * Validate single preference update (key in URL, value in body)
 * Used for PUT /preferences/:key endpoint
 */
const validateSinglePreferenceUpdate = (req, res, next) => {
  const { key } = req.params;
  const { value } = req.body;

  // Check if key is valid
  if (!PREFERENCE_SCHEMA[key]) {
    return ResponseFormatter.badRequest(
      res,
      `Unknown preference key: ${key}`,
      [{ field: 'key', message: `Valid keys are: ${Object.keys(PREFERENCE_SCHEMA).join(', ')}` }],
    );
  }

  // Check if value is provided
  if (value === undefined) {
    return ResponseFormatter.badRequest(
      res,
      'Value is required',
      [{ field: 'value', message: 'Value must be provided in request body' }],
    );
  }

  // Validate the value against the schema
  const schema = Joi.object({ [key]: buildSinglePreferenceSchema(key) });
  const { error } = schema.validate({ [key]: value });

  if (error) {
    return ResponseFormatter.badRequest(
      res,
      error.details[0].message,
      [{ field: key, message: error.details[0].message }],
    );
  }

  next();
};

/**
 * Build Joi schema for a single preference key
 */
function buildSinglePreferenceSchema(key) {
  const def = PREFERENCE_SCHEMA[key];
  if (!def) {return Joi.any();}

  switch (def.type) {
    case 'enum':
      return Joi.string().valid(...def.values);
    case 'boolean':
      return Joi.boolean();
    case 'string':
      return def.maxLength ? Joi.string().max(def.maxLength) : Joi.string();
    case 'number':
      let schema = Joi.number();
      if (def.min !== undefined) {schema = schema.min(def.min);}
      if (def.max !== undefined) {schema = schema.max(def.max);}
      return schema;
    /* istanbul ignore next -- Defensive fallback for unknown type */
    default:
      return Joi.any();
  }
}

module.exports = {
  validatePreferencesUpdate,
  validateSinglePreferenceUpdate,
  preferencesUpdateSchema,
};
