/**
 * Validation Deriver
 *
 * SINGLE SOURCE OF TRUTH: Derives all validation rules from entity metadata.
 * No separate validation-rules.json required - everything comes from:
 *   backend/config/models/*-metadata.js
 *
 * This eliminates drift between metadata and validation config.
 * Change metadata → validation changes automatically.
 *
 * EXPORTS:
 * - deriveValidationRules() - Get complete validation rules object
 * - getFieldValidation(fieldName) - Get rules for a specific field
 * - getCompositeValidation(operationName) - Get create/update schema
 *
 * @module config/validation-deriver
 */

const allMetadata = require("./models");
const { FIELD, ADDRESS_SUFFIXES } = require("./field-type-standards");
const { ALL_SUBDIVISIONS, SUPPORTED_COUNTRIES } = require("./geo-standards");

// ============================================================================
// SHARED FIELD DEFINITIONS (cross-entity fields)
// ============================================================================

/**
 * Shared field definitions used across multiple entities.
 * These provide consistent validation for common patterns.
 *
 * ARCHITECTURE: Base constraints come from FIELD (field-type-standards.js).
 * Validation-specific properties (trim, lowercase, errorMessages) are added here.
 * This ensures constraints stay in sync while validation adds its own concerns.
 */
const SHARED_FIELD_DEFS = {
  // ---- Identity Fields ----
  email: {
    ...FIELD.EMAIL,
    type: "string", // Override for Joi (email is validated via format, not type)
    format: "email",
    tldRestriction: false,
    trim: true,
    lowercase: true,
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z0-9]+$",
    errorMessages: {
      required: "Email is required",
      format: "Email must be a valid email address",
      maxLength: `Email cannot exceed ${FIELD.EMAIL.maxLength} characters`,
    },
  },

  // ---- Name Fields (HUMAN entities) ----
  // NOTE: No pattern restriction - allows international Unicode names
  first_name: {
    ...FIELD.FIRST_NAME,
    minLength: 1,
    trim: true,
    errorMessages: {
      required: "First name is required",
      minLength: "First name cannot be empty",
      maxLength: `First name cannot exceed ${FIELD.FIRST_NAME.maxLength} characters`,
    },
  },

  // NOTE: No pattern restriction - allows international Unicode names
  last_name: {
    ...FIELD.LAST_NAME,
    minLength: 1,
    trim: true,
    errorMessages: {
      required: "Last name is required",
      minLength: "Last name cannot be empty",
      maxLength: `Last name cannot exceed ${FIELD.LAST_NAME.maxLength} characters`,
    },
  },

  // ---- Phone ----
  phone: {
    ...FIELD.PHONE,
    pattern: "^\\+?[1-9]\\d{1,14}$",
    trim: true,
    errorMessages: {
      pattern: "Phone number must be in international format (E.164)",
    },
  },

  // ---- Generic Fields ----
  name: {
    ...FIELD.NAME,
    minLength: 1,
    trim: true,
    errorMessages: {
      required: "Name is required",
      minLength: "Name cannot be empty",
      maxLength: `Name cannot exceed ${FIELD.NAME.maxLength} characters`,
    },
  },

  summary: {
    ...FIELD.SUMMARY,
    trim: true,
    errorMessages: {
      maxLength: `Summary cannot exceed ${FIELD.SUMMARY.maxLength} characters`,
    },
  },

  description: {
    ...FIELD.DESCRIPTION,
    trim: true,
    errorMessages: {
      maxLength: `Description cannot exceed ${FIELD.DESCRIPTION.maxLength} characters`,
    },
  },

  // ---- Boolean ----
  is_active: {
    type: "boolean",
    errorMessages: {
      type: "is_active must be true or false",
    },
  },

  // ---- Universal FK pattern ----
  // Note: Specific FKs (customer_id, technician_id) are derived from metadata
};

// ============================================================================
// ADDRESS FIELD VALIDATION DEFINITIONS
// ============================================================================

/**
 * Generate validation definitions for address fields
 * Used when deriving validation for address field groups
 *
 * @param {string} prefix - Address field prefix (e.g., 'location', 'billing')
 * @returns {Object} Validation definitions for all 6 address fields
 */
function generateAddressFieldValidations(prefix) {
  return {
    [`${prefix}_line1`]: {
      ...FIELD.ADDRESS_LINE1,
      trim: true,
      errorMessages: {
        required: "Street address is required",
        maxLength: `Street address cannot exceed ${FIELD.ADDRESS_LINE1.maxLength} characters`,
      },
    },
    [`${prefix}_line2`]: {
      ...FIELD.ADDRESS_LINE2,
      trim: true,
      errorMessages: {
        maxLength: `Address line 2 cannot exceed ${FIELD.ADDRESS_LINE2.maxLength} characters`,
      },
    },
    [`${prefix}_city`]: {
      ...FIELD.ADDRESS_CITY,
      trim: true,
      errorMessages: {
        required: "City is required",
        maxLength: `City cannot exceed ${FIELD.ADDRESS_CITY.maxLength} characters`,
      },
    },
    [`${prefix}_state`]: {
      type: "string",
      enum: ALL_SUBDIVISIONS,
      errorMessages: {
        enum: "State/Province must be a valid code (e.g., OR, WA, BC)",
      },
    },
    [`${prefix}_postal_code`]: {
      ...FIELD.ADDRESS_POSTAL_CODE,
      trim: true,
      errorMessages: {
        maxLength: `Postal code cannot exceed ${FIELD.ADDRESS_POSTAL_CODE.maxLength} characters`,
      },
    },
    [`${prefix}_country`]: {
      type: "string",
      enum: SUPPORTED_COUNTRIES,
      errorMessages: {
        enum: `Country must be one of: ${SUPPORTED_COUNTRIES.join(", ")}`,
      },
    },
  };
}

/**
 * Check if a field name is an address field and get its validation
 * @param {string} fieldName - Field name to check
 * @returns {Object|null} Validation definition or null if not an address field
 */
function getAddressFieldValidation(fieldName) {
  for (const suffix of ADDRESS_SUFFIXES) {
    if (fieldName.endsWith(`_${suffix}`)) {
      const prefix = fieldName.slice(0, -(suffix.length + 1));
      const validations = generateAddressFieldValidations(prefix);
      return validations[fieldName] || null;
    }
  }
  return null;
}

/**
 * Generate error messages for an enum field
 */
function generateEnumErrorMessages(fieldName, values) {
  const humanName = fieldName.replace(/_/g, " ");
  return {
    enum: `${capitalize(humanName)} must be one of: ${values.join(", ")}`,
  };
}

/**
 * Generate error messages for a foreign key field
 */
function generateFkErrorMessages(fieldName) {
  const humanName = fieldName.replace(/_id$/, "").replace(/_/g, " ");
  return {
    required: `${capitalize(humanName)} is required`,
    type: `${capitalize(humanName)} ID must be an integer`,
    min: `${capitalize(humanName)} ID must be positive`,
  };
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert snake_case to PascalCase
 */
function toPascalCase(str) {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

// ============================================================================
// FIELD DERIVATION
// ============================================================================

/**
 * Derive validation definition for a single field from metadata
 *
 * @param {string} fieldName - Field name
 * @param {Object} fieldDef - Field definition from metadata
 * @param {string} entityName - Entity name for context
 * @returns {Object} Validation rule definition
 */
function deriveFieldValidation(fieldName, fieldDef, _entityName) {
  // Check for shared field definition first
  if (SHARED_FIELD_DEFS[fieldName]) {
    const shared = { ...SHARED_FIELD_DEFS[fieldName] };
    // Override required from metadata
    if (fieldDef.required !== undefined) {
      shared.required = fieldDef.required;
    }
    return shared;
  }

  // Check for address field (e.g., location_city, billing_line1)
  const addressValidation = getAddressFieldValidation(fieldName);
  if (addressValidation) {
    // Override required from metadata
    if (fieldDef.required !== undefined) {
      addressValidation.required = fieldDef.required;
    }
    return addressValidation;
  }

  // Build from metadata field definition
  const validation = {
    type: mapFieldType(fieldDef.type),
  };

  // Required flag
  if (fieldDef.required) {
    validation.required = true;
  }

  // String constraints
  if (fieldDef.maxLength) {
    validation.maxLength = fieldDef.maxLength;
  }
  if (fieldDef.minLength) {
    validation.minLength = fieldDef.minLength;
  }
  if (fieldDef.pattern) {
    validation.pattern = fieldDef.pattern;
  }
  if (fieldDef.trim !== undefined) {
    validation.trim = fieldDef.trim;
  }

  // Numeric constraints
  if (fieldDef.min !== undefined) {
    validation.min = fieldDef.min;
  }
  if (fieldDef.max !== undefined) {
    validation.max = fieldDef.max;
  }

  // Enum handling
  if (fieldDef.type === "enum" && fieldDef.values) {
    validation.type = "string";
    validation.enum = fieldDef.values;
    validation.errorMessages = generateEnumErrorMessages(
      fieldName,
      fieldDef.values,
    );
  }

  // Foreign key handling
  if (fieldDef.type === "foreignKey") {
    validation.type = "integer";
    validation.min = 1;
    validation.max = 2147483647;
    validation.errorMessages = generateFkErrorMessages(fieldName);
  }

  // Default value
  if (fieldDef.default !== undefined) {
    validation.default = fieldDef.default;
  }

  // Generate error messages if not already set
  if (!validation.errorMessages) {
    validation.errorMessages = generateDefaultErrorMessages(
      fieldName,
      validation,
    );
  }

  return validation;
}

/**
 * Map metadata field type to validation type
 *
 * MUST match TYPE_BUILDERS in validation-loader.js exactly.
 * Supported types: string, text, email, phone, url, time,
 *                  integer, decimal, boolean, object,
 *                  date, timestamp, enum
 */
function mapFieldType(metaType) {
  const typeMap = {
    // String-based types
    string: "string",
    text: "text",
    email: "email",
    phone: "phone",
    url: "url",
    time: "time",

    // Numeric types
    integer: "integer",
    decimal: "decimal",
    currency: "currency", // First-class currency type
    foreignKey: "integer",

    // Other types
    boolean: "boolean",
    jsonb: "object",
    json: "object",

    // Date/time types
    timestamp: "timestamp",
    date: "date",

    // Enum handled specially by caller
    enum: "enum",
  };
  return typeMap[metaType] || "string";
}

/**
 * Generate default error messages for a field
 */
function generateDefaultErrorMessages(fieldName, validation) {
  const humanName = fieldName.replace(/_/g, " ");
  const messages = {};

  if (validation.required) {
    messages.required = `${capitalize(humanName)} is required`;
  }
  if (
    validation.type === "integer" ||
    validation.type === "decimal" ||
    validation.type === "currency"
  ) {
    messages.type = `${capitalize(humanName)} must be a number`;
  }
  if (validation.min !== undefined) {
    messages.min = `${capitalize(humanName)} must be at least ${validation.min}`;
  }
  if (validation.max !== undefined) {
    messages.max = `${capitalize(humanName)} cannot exceed ${validation.max}`;
  }
  if (validation.maxLength) {
    messages.maxLength = `${capitalize(humanName)} cannot exceed ${validation.maxLength} characters`;
  }
  if (validation.minLength) {
    messages.minLength = `${capitalize(humanName)} must be at least ${validation.minLength} characters`;
  }
  if (validation.pattern) {
    messages.pattern = `${capitalize(humanName)} has an invalid format`;
  }

  return messages;
}

// ============================================================================
// COMPOSITE VALIDATION DERIVATION
// ============================================================================

/**
 * Derive composite validation (create/update schemas) for an entity
 *
 * PRIORITY ORDER for required fields:
 * 1. metadata.requiredFields - explicit list from entity metadata (source of truth)
 * 2. Fallback: derive from fields[x].required if no explicit list
 *
 * @param {string} entityName - Entity name (snake_case)
 * @param {Object} metadata - Entity metadata
 * @returns {Object} { create: {...}, update: {...} }
 */
function deriveCompositeValidation(entityName, metadata) {
  const fields = metadata.fields || {};
  let requiredFields;
  let optionalFields;

  // Use explicit requiredFields from metadata if defined (source of truth)
  if (metadata.requiredFields && Array.isArray(metadata.requiredFields)) {
    requiredFields = [...metadata.requiredFields];
    optionalFields = [];

    // All non-readonly fields not in requiredFields are optional
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      if (fieldDef.readonly) {
        continue;
      }
      if (!requiredFields.includes(fieldName)) {
        optionalFields.push(fieldName);
      }
    }
  } else {
    // Fallback: derive from field definitions
    requiredFields = [];
    optionalFields = [];

    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      if (fieldDef.readonly) {
        continue;
      }

      if (fieldDef.required) {
        requiredFields.push(fieldName);
      } else {
        optionalFields.push(fieldName);
      }
    }
  }

  const pascalEntity = toPascalCase(entityName);

  return {
    [`create${pascalEntity}`]: {
      entityName,
      requiredFields,
      optionalFields,
      description: `Validation rules for creating a new ${entityName.replace(/_/g, " ")}`,
    },
    [`update${pascalEntity}`]: {
      entityName,
      requiredFields: [], // All optional for updates
      optionalFields: [...requiredFields, ...optionalFields, "is_active"],
      description: `Validation rules for updating an existing ${entityName.replace(/_/g, " ")}`,
    },
  };
}

// ============================================================================
// MAIN DERIVATION FUNCTIONS
// ============================================================================

// Cache for derived rules
let cachedRules = null;

/**
 * Derive complete validation rules from all entity metadata
 *
 * @returns {Object} Complete validation rules matching validation-rules.json structure
 */
function deriveValidationRules() {
  if (cachedRules) {
    return cachedRules;
  }

  const rules = {
    $schema: "http://json-schema.org/draft-07/schema#",
    version: "3.0.0",
    description:
      "Validation rules derived from entity metadata - SINGLE SOURCE OF TRUTH",
    derivedAt: new Date().toISOString(),
    policy: {
      email: {
        tldValidation: "permissive",
        description: "Accept any TLD format - no fascist restrictions! 🚀",
      },
    },
    // Global shared field definitions (email, phone, names, etc.)
    fields: { ...SHARED_FIELD_DEFS },
    // Entity-specific field definitions (for fields like 'status' that vary by entity)
    entityFields: {},
    compositeValidations: {},
  };

  for (const [entityName, metadata] of Object.entries(allMetadata)) {
    const fields = metadata.fields || {};

    // Store entity-specific field definitions
    rules.entityFields[entityName] = {};
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      rules.entityFields[entityName][fieldName] = deriveFieldValidation(
        fieldName,
        fieldDef,
        entityName,
      );
    }

    // Derive composite validations
    const composites = deriveCompositeValidation(entityName, metadata);
    Object.assign(rules.compositeValidations, composites);
  }

  cachedRules = rules;
  return rules;
}

/**
 * Get validation rules for a specific field
 *
 * @param {string} fieldName - Field name
 * @param {string} [entityName] - Optional entity name for entity-specific fields
 * @returns {Object|null} Field validation rules or null
 */
function getFieldValidation(fieldName, entityName = null) {
  const rules = deriveValidationRules();

  // If entity specified, try entity-specific field first
  if (entityName && rules.entityFields[entityName]?.[fieldName]) {
    return rules.entityFields[entityName][fieldName];
  }

  // Fallback to shared/global fields
  return rules.fields[fieldName] || null;
}

/**
 * Get composite validation for an operation
 *
 * @param {string} operationName - Operation name (e.g., 'createCustomer')
 * @returns {Object|null} Composite validation or null
 */
function getCompositeValidation(operationName) {
  const rules = deriveValidationRules();
  return rules.compositeValidations[operationName] || null;
}

/**
 * Get all field definitions for a specific entity
 *
 * @param {string} entityName - Entity name (snake_case)
 * @returns {Object} All field definitions for this entity
 */
function getEntityFieldValidations(entityName) {
  const rules = deriveValidationRules();
  return rules.entityFields[entityName] || {};
}

/**
 * Clear the cache (for testing or hot reload)
 */
function clearCache() {
  cachedRules = null;
}

/**
 * Export validation rules as JSON (for frontend or API)
 *
 * @returns {string} JSON string of validation rules
 */
function toJSON() {
  return JSON.stringify(deriveValidationRules(), null, 2);
}

module.exports = {
  deriveValidationRules,
  getFieldValidation,
  getCompositeValidation,
  getEntityFieldValidations,
  clearCache,
  toJSON,
  // Expose for testing
  SHARED_FIELD_DEFS,
  deriveFieldValidation,
  deriveCompositeValidation,
  // Address validation helpers
  generateAddressFieldValidations,
  getAddressFieldValidation,
};
