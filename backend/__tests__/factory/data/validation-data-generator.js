/**
 * Validation-Aware Data Generator
 *
 * SRP: Generate valid test data based on validation-rules.json
 * SINGLE SOURCE OF TRUTH: Uses the same validation rules as the API.
 *
 * PRINCIPLE: If validation-rules.json says a field must match a pattern,
 * we generate data that matches that pattern. No hardcoding. No exceptions.
 *
 * UNIQUENESS: Uses the central getUniqueValues() from test-helpers to ensure
 * all tests share the same counter, preventing cross-test unique constraint conflicts.
 */

const { loadValidationRules } = require("../../../utils/validation-loader");
const { getUniqueValues } = require("../../helpers/test-helpers");

/**
 * Increment counter and return both the full unique ID and just the counter
 * This ensures a single increment per call, keeping values in sync
 *
 * Delegates to the central getUniqueValues() for consistent uniqueness.
 */
function getNextUnique() {
  const vals = getUniqueValues();
  return {
    id: vals.id, // Full unique ID with timestamp
    num: vals.num, // Just the counter for numeric uses
  };
}

/**
 * Convert number to alphabetic string for human name uniqueness
 * 1 -> 'A', 26 -> 'Z', 27 -> 'AA', etc.
 */
function numberToLetters(num) {
  let result = "";
  let n = num;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result || "A";
}

/**
 * Get field definition from entity metadata or validation rules
 *
 * METADATA-DRIVEN PRIORITY:
 * 1. FIRST: Check entity metadata (authoritative per-entity definitions)
 * 2. FALLBACK: validation-rules.json (shared field definitions)
 *
 * This handles fields like 'priority' that have different types per entity:
 * - role.priority = integer
 * - work_order.priority = enum
 *
 * @param {string} fieldName - Field name (snake_case)
 * @param {string} entityName - Entity name for metadata lookup
 * @returns {Object|null} Field definition
 */
function getFieldDef(fieldName, entityName) {
  const rules = loadValidationRules();

  // FIRST: Try entity metadata (most specific, per-entity definitions)
  if (entityName) {
    try {
      const allMetadata = require("../../../config/models");
      const entityMeta = allMetadata[entityName];
      if (entityMeta?.fields?.[fieldName]) {
        const metaField = entityMeta.fields[fieldName];
        // Pass full entity metadata for enum lookup
        return convertMetadataToFieldDef(metaField, fieldName, entityMeta);
      }
    } catch {
      // Fall through to validation-rules.json
    }
  }

  // FALLBACK: Direct lookup in validation-rules.json
  return rules.fields[fieldName];
}

/**
 * Convert entity metadata field format to validation-rules.json format
 *
 * @param {Object} metaField - Field from entity metadata
 * @param {string} fieldName - Field name for context
 * @param {Object} entityMeta - Full entity metadata (for enum lookup)
 * @returns {Object} Field definition in validation-rules.json format
 */
function convertMetadataToFieldDef(metaField, fieldName, entityMeta = {}) {
  const fieldDef = {};

  // Handle type mapping
  switch (metaField.type) {
    case "enum":
      // Keep type as 'enum' so generateFromConstraints handles it correctly
      fieldDef.type = "enum";
      // Look up enum values: field.values > entityMeta.enums[fieldName].values
      fieldDef.enum =
        metaField.values || entityMeta.enums?.[fieldName]?.values || [];
      break;
    case "email":
      fieldDef.type = "string";
      fieldDef.format = "email";
      break;
    case "decimal":
    case "currency":
      fieldDef.type = "number";
      if (metaField.min !== undefined) fieldDef.min = metaField.min;
      if (metaField.max !== undefined) fieldDef.max = metaField.max;
      break;
    case "integer":
      fieldDef.type = "integer";
      if (metaField.min !== undefined) fieldDef.min = metaField.min;
      if (metaField.max !== undefined) fieldDef.max = metaField.max;
      break;
    case "foreignKey":
      fieldDef.type = "integer";
      fieldDef.min = 1;
      break;
    case "boolean":
      fieldDef.type = "boolean";
      break;
    case "date":
      fieldDef.type = "string";
      fieldDef.format = "date";
      break;
    case "timestamp":
      fieldDef.type = "string";
      fieldDef.format = "timestamp";
      break;
    case "uuid":
      fieldDef.type = "string";
      fieldDef.format = "uuid";
      break;
    case "text":
      // Text is just a long string
      fieldDef.type = "string";
      break;
    default:
      fieldDef.type = metaField.type || "string";
      if (metaField.pattern) fieldDef.pattern = metaField.pattern;
      if (metaField.minLength !== undefined)
        fieldDef.minLength = metaField.minLength;
      if (metaField.maxLength !== undefined)
        fieldDef.maxLength = metaField.maxLength;
  }

  // Pass through examples if present
  if (metaField.examples) {
    fieldDef.examples = metaField.examples;
  }

  return fieldDef;
}

/**
 * Generate a valid value for a field based on its validation rules
 *
 * @param {string} fieldName - API field name (snake_case)
 * @param {string} entityName - Entity name for context
 * @returns {*} A valid value for the field
 */
function generateValidValue(fieldName, entityName = null) {
  const fieldDef = getFieldDef(fieldName, entityName);
  const { id: uniqueId, num: uniqueNum } = getNextUnique(); // Single increment
  const uniqueSuffix = numberToLetters(uniqueNum);

  // If no field definition, fall back to inference
  if (!fieldDef) {
    return generateInferredValue(fieldName, uniqueId, uniqueSuffix);
  }

  // If examples.valid exists, use the first one (with uniqueness added if needed)
  if (fieldDef.examples?.valid?.length > 0) {
    return makeUnique(
      fieldDef,
      fieldDef.examples.valid[0],
      uniqueId,
      uniqueSuffix,
    );
  }

  // Generate based on type and constraints
  return generateFromConstraints(fieldDef, fieldName, uniqueId, uniqueSuffix);
}

/**
 * Make a value unique while preserving pattern validity
 */
function makeUnique(fieldDef, baseValue, uniqueId, uniqueSuffix) {
  // Email: insert unique suffix before @
  if (fieldDef.format === "email" || fieldDef.type === "email") {
    if (typeof baseValue === "string" && baseValue.includes("@")) {
      const [local, domain] = baseValue.split("@");
      return `${local}_${uniqueId}@${domain}`;
    }
  }

  // String with pattern: generate valid unique value (pass fieldDef for metadata)
  if (fieldDef.type === "string" && fieldDef.pattern) {
    return generateFromPattern(
      fieldDef.pattern,
      uniqueId,
      uniqueSuffix,
      fieldDef,
    );
  }

  // Numbers: use baseValue (first example) as the starting point
  // This allows validation rules to set a higher base (e.g., priority 10)
  // to avoid conflicts with seed data
  if (fieldDef.type === "integer" || fieldDef.type === "number") {
    const counterPart = parseInt(uniqueId.split("_")[1]) || 1;
    const base =
      typeof baseValue === "number" ? baseValue : (fieldDef.min ?? 1);
    const max = fieldDef.max ?? 1000000;
    return Math.min(base + counterPart, max);
  }

  // For strings without pattern, append suffix
  if (typeof baseValue === "string") {
    return `${baseValue}_${uniqueId}`;
  }

  return baseValue;
}

/**
 * Generate value from pattern regex - METADATA-DRIVEN
 *
 * PRINCIPLE: No hardcoded entity-specific strings. Parse patterns generically.
 *
 * Supported pattern types:
 * - PREFIX-YYYY-NNNN format (detected by structure, not prefix value)
 * - Human names (letters, spaces, apostrophes, hyphens)
 * - Alphanumeric identifiers
 * - E.164 phone numbers
 * - Email patterns
 *
 * @param {string} pattern - Regex pattern from validation rules
 * @param {string} uniqueId - Unique identifier for this value
 * @param {string} uniqueSuffix - Letter suffix (A, B, AA, etc.)
 * @param {Object} fieldDef - Field definition (may contain examples)
 * @returns {string} A value matching the pattern
 */
function generateFromPattern(pattern, uniqueId, uniqueSuffix, fieldDef = {}) {
  const counterPart = parseInt(uniqueId.split("_")[1]) || 1;
  const year = new Date().getFullYear();

  // METADATA-DRIVEN: If examples.valid exists, use as template
  if (fieldDef?.examples?.valid?.length > 0) {
    const example = fieldDef.examples.valid[0];
    // PREFIX-YYYY-NNNN pattern: extract prefix, replace numbers
    const prefixMatch = example.match(/^([A-Z]+)-(\d{4})-(\d+)$/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      return `${prefix}-${year}-${String(counterPart).padStart(4, "0")}`;
    }
  }

  // GENERIC PREFIX-YYYY-NNNN detection (matches ^PREFIX-[0-9]{4}-[0-9]+$ patterns)
  const prefixPatternMatch = pattern.match(
    /^\^([A-Z]+)-\[0-9\]\{4\}-\[0-9\]\+\$$/,
  );
  if (prefixPatternMatch) {
    const prefix = prefixPatternMatch[1];
    return `${prefix}-${year}-${String(counterPart).padStart(4, "0")}`;
  }

  // Alphanumeric with spaces/underscores/hyphens: ^[a-zA-Z0-9\s_-]+$
  if (pattern === "^[a-zA-Z0-9\\s_-]+$") {
    return `TestValue${uniqueSuffix}`;
  }

  // E.164 phone: ^\+?[1-9]\d{1,14}$
  if (pattern.includes("\\+") && pattern.includes("\\d")) {
    return `+1555${String(counterPart).padStart(7, "0")}`;
  }

  // Email pattern (contains @)
  if (pattern.includes("@")) {
    return `test_${uniqueId}@example.com`;
  }

  // Uppercase alphanumeric: ^[A-Z0-9-]+$ or similar
  if (pattern.includes("[A-Z0-9")) {
    return `ID-${uniqueId.toUpperCase()}`;
  }

  // Default: alphanumeric string
  return `Value_${uniqueId}`;
}

/**
 * Generate value from field constraints (type, min, max, etc.)
 *
 * SYSTEMIC: Every supported type must have an explicit case.
 * Unknown types throw an error to catch metadata issues early.
 */
function generateFromConstraints(fieldDef, fieldName, uniqueId, uniqueSuffix) {
  const counterPart = parseInt(uniqueId.split("_")[1]) || 1;

  switch (fieldDef.type) {
    case "string":
      // Check for enum values first (string type with enum constraint)
      if (fieldDef.enum && fieldDef.enum.length > 0) {
        return fieldDef.enum[counterPart % fieldDef.enum.length];
      }
      // Email format
      if (fieldDef.format === "email") {
        return `test_${uniqueId}@example.com`;
      }
      // Date format (type: string, format: date)
      if (fieldDef.format === "date") {
        return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      }
      // Timestamp format (type: string, format: timestamp)
      if (fieldDef.format === "timestamp" || fieldDef.format === "date-time") {
        return new Date().toISOString();
      }
      // UUID format
      if (fieldDef.format === "uuid") {
        return `00000000-0000-4000-8000-${String(counterPart).padStart(12, "0")}`;
      }
      // Pattern-based (pass fieldDef for metadata-driven generation)
      if (fieldDef.pattern) {
        return generateFromPattern(
          fieldDef.pattern,
          uniqueId,
          uniqueSuffix,
          fieldDef,
        );
      }
      // Plain string with length constraints
      const minLen = fieldDef.minLength || 1;
      const maxLen = fieldDef.maxLength || 255;
      let base = `Test_${fieldName}_${uniqueId}`;
      if (base.length < minLen) {
        base = base.padEnd(minLen, "x");
      }
      if (base.length > maxLen) {
        base = base.substring(0, maxLen);
      }
      return base;

    case "integer":
      const intMin = fieldDef.min ?? 1;
      const intMax = fieldDef.max ?? 1000000;
      return Math.min(intMin + counterPart, intMax);

    case "number":
      const numMin = fieldDef.min ?? 0;
      return numMin + counterPart * 10.5;

    case "boolean":
      return true;

    case "date":
      return new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    case "enum":
      // Pick a valid enum value (cycle through based on counter)
      const enumValues = fieldDef.enum || fieldDef.values || [];
      if (enumValues.length > 0) {
        return enumValues[counterPart % enumValues.length];
      }
      // No enum values defined - this is a metadata error
      throw new Error(
        `Enum field '${fieldName}' has no values defined. ` +
          `Add values to field definition or entityMeta.enums.${fieldName}.values`,
      );

    case "json":
      return {};

    case "jsonb":
      // PostgreSQL JSONB - return empty object
      return {};

    case "array":
      return [];

    case "phone":
      // Phone number format
      return `555-${String(counterPart).padStart(3, "0")}-${String(counterPart + 1000).slice(-4)}`;

    default:
      // FAIL FAST: Unknown types should be caught at metadata validation time,
      // but throw here as a safety net
      throw new Error(
        `Unknown field type '${fieldDef.type}' for field '${fieldName}'. ` +
          `Supported types: string, integer, number, boolean, date, enum, json, jsonb, array, phone. ` +
          `Add support in validation-data-generator.js or fix the field metadata.`,
      );
  }
}

/**
 * Generate value by inferring from field name (fallback)
 *
 * PRINCIPLE: This is the LAST RESORT fallback when:
 * 1. Entity metadata doesn't define the field
 * 2. validation-rules.json doesn't define the field
 *
 * Uses only GENERIC patterns based on common field naming conventions.
 * Entity-specific fields (work_order_number, invoice_number, etc.) should
 * be defined in validation-rules.json with examples.
 *
 * @param {string} fieldName - Field name (snake_case)
 * @param {string} uniqueId - Unique identifier
 * @param {string} uniqueSuffix - Letter suffix (A, B, AA, etc.)
 * @returns {*} Inferred value
 */
function generateInferredValue(fieldName, uniqueId, uniqueSuffix) {
  const counterPart = parseInt(uniqueId.split("_")[1]) || 1;

  // Log warning for unmapped fields (helps catch missing metadata)
  // This is a development aid - fields should ideally be in validation-rules.json
  const { logger } = require("../../../config/logger");
  logger.debug(`Inferring value for unmapped field: ${fieldName}`);

  // FK references - return numeric ID
  if (fieldName.endsWith("_id")) {
    return counterPart;
  }

  // Email fields - standard test email format
  if (fieldName.includes("email")) {
    return `test_${uniqueId}@example.com`;
  }

  // Phone fields - E.164 format
  if (fieldName.includes("phone")) {
    return `+1555${String(counterPart).padStart(7, "0")}`;
  }

  // Human name fields - letters only (validation-safe)
  if (fieldName === "first_name" || fieldName === "given_name") {
    return `Test${uniqueSuffix}`;
  }
  if (
    fieldName === "last_name" ||
    fieldName === "family_name" ||
    fieldName === "surname"
  ) {
    return `User${uniqueSuffix}`;
  }

  // Generic name fields
  if (fieldName.includes("name")) {
    return `Test${uniqueSuffix}`;
  }

  // Date/timestamp fields - ISO format
  if (fieldName.includes("date") || fieldName.includes("_at")) {
    return new Date().toISOString();
  }

  // Numeric fields - common patterns
  if (
    fieldName.includes("amount") ||
    fieldName.includes("total") ||
    fieldName.includes("rate") ||
    fieldName.includes("value") ||
    fieldName.includes("quantity") ||
    fieldName.includes("tax") ||
    fieldName.includes("price") ||
    fieldName.includes("cost")
  ) {
    return counterPart * 10;
  }

  // Priority/order/sequence fields
  if (
    fieldName.includes("priority") ||
    fieldName.includes("order") ||
    fieldName.includes("sequence") ||
    fieldName.includes("rank")
  ) {
    return 10 + counterPart; // Start at 10 to avoid seed data conflicts
  }

  // Boolean fields
  if (
    fieldName.startsWith("is_") ||
    fieldName.startsWith("has_") ||
    fieldName.startsWith("can_") ||
    fieldName.includes("_enabled") ||
    fieldName.includes("_active")
  ) {
    return true;
  }

  // Default: generic unique string
  return `value_${uniqueId}`;
}

/**
 * Get all valid examples for a field (for property-based testing)
 */
function getValidExamples(fieldName, entityName = null) {
  const fieldDef = getFieldDef(fieldName, entityName);
  if (!fieldDef?.examples?.valid) {
    return [generateValidValue(fieldName, entityName)];
  }
  return fieldDef.examples.valid;
}

/**
 * Get all invalid examples for a field (for negative testing)
 */
function getInvalidExamples(fieldName, entityName = null) {
  const fieldDef = getFieldDef(fieldName, entityName);
  if (!fieldDef?.examples?.invalid) {
    return [];
  }
  return fieldDef.examples.invalid;
}

/**
 * Check if a field has validation rules defined
 */
function hasValidationRules(fieldName, entityName = null) {
  return !!getFieldDef(fieldName, entityName);
}

/**
 * Reset counter (for test isolation)
 */
function resetCounter() {
  counter = 0;
}

// ============================================================================
// FIELD INTROSPECTION HELPERS
// ============================================================================
// These functions enable metadata-driven test discovery.
// Instead of hardcoding field names like 'theme' or 'notificationsEnabled',
// tests can discover fields by TYPE and test behavior generically.

/**
 * Get all fields from an entity's schema/metadata
 *
 * PRIORITY ORDER:
 * 1. Entity metadata fields (config/models/<entity>.fields)
 * 2. Entity fieldAccess keys (for entities without explicit fields)
 *
 * @param {string} entityName - Entity name (e.g., 'preferences', 'customer')
 * @param {Object} schemaOverride - Optional schema to use instead of metadata lookup
 * @returns {Object} { [fieldName]: fieldDef } or empty object
 */
function getEntityFields(entityName, schemaOverride = null) {
  // If schema is provided directly (e.g., PREFERENCE_SCHEMA), use it
  if (schemaOverride) {
    return schemaOverride;
  }

  try {
    const allMetadata = require("../../../config/models");
    const entityMeta = allMetadata[entityName];

    if (!entityMeta) return {};

    // Prefer explicit fields definition
    if (entityMeta.fields && Object.keys(entityMeta.fields).length > 0) {
      return entityMeta.fields;
    }

    // Fallback to fieldAccess keys with inferred types
    if (entityMeta.fieldAccess) {
      const fields = {};
      for (const fieldName of Object.keys(entityMeta.fieldAccess)) {
        const fieldDef = getFieldDef(fieldName, entityName);
        if (fieldDef) {
          fields[fieldName] = fieldDef;
        }
      }
      return fields;
    }

    return {};
  } catch {
    return {};
  }
}

/**
 * Find a field of a specific type in an entity's schema
 *
 * USAGE:
 *   const [enumField, enumDef] = findFieldByType('preferences', 'enum') || [];
 *   if (enumField) {
 *     // Test enum behavior without hardcoding 'theme'
 *   }
 *
 * @param {string} entityName - Entity name
 * @param {string} type - Field type (enum, boolean, string, integer, email, etc.)
 * @param {Object} schemaOverride - Optional schema to use instead of metadata lookup
 * @returns {[string, Object]|null} [fieldName, fieldDef] tuple or null if not found
 */
function findFieldByType(entityName, type, schemaOverride = null) {
  const fields = getEntityFields(entityName, schemaOverride);

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (matchesType(fieldDef, type)) {
      return [fieldName, fieldDef];
    }
  }

  return null;
}

/**
 * Find all fields of a specific type in an entity's schema
 *
 * @param {string} entityName - Entity name
 * @param {string} type - Field type
 * @param {Object} schemaOverride - Optional schema to use instead of metadata lookup
 * @returns {Array<[string, Object]>} Array of [fieldName, fieldDef] pairs
 */
function findAllFieldsByType(entityName, type, schemaOverride = null) {
  const fields = getEntityFields(entityName, schemaOverride);
  const matches = [];

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (matchesType(fieldDef, type)) {
      matches.push([fieldName, fieldDef]);
    }
  }

  return matches;
}

/**
 * Check if a field definition matches a type
 * Handles both direct type matching and format-based matching
 *
 * @param {Object} fieldDef - Field definition
 * @param {string} type - Type to match
 * @returns {boolean}
 */
function matchesType(fieldDef, type) {
  if (!fieldDef) return false;

  // Direct type match
  if (fieldDef.type === type) return true;

  // Format-based matching (email is type: string, format: email)
  if (fieldDef.format === type) return true;

  // Enum detection: has 'values' or 'enum' array
  if (type === "enum" && (fieldDef.values || fieldDef.enum)) return true;

  return false;
}

/**
 * Generate an INVALID value for a field (for negative testing)
 *
 * PRINCIPLE: Generate a value that SHOULD fail validation.
 * The type of invalid value depends on the field's constraints.
 *
 * @param {string} fieldName - Field name
 * @param {string} entityName - Entity name
 * @param {Object} schemaOverride - Optional schema with field definition
 * @returns {*} An invalid value that should fail validation
 */
function generateInvalidValue(
  fieldName,
  entityName = null,
  schemaOverride = null,
) {
  let fieldDef;

  if (schemaOverride && schemaOverride[fieldName]) {
    fieldDef = schemaOverride[fieldName];
  } else {
    fieldDef = getFieldDef(fieldName, entityName);
  }

  if (!fieldDef) {
    // No definition - return obviously wrong type
    return { invalid: "object-where-string-expected" };
  }

  // Use invalid examples if available
  if (fieldDef.examples?.invalid?.length > 0) {
    return fieldDef.examples.invalid[0];
  }

  // Generate invalid based on type
  switch (fieldDef.type) {
    case "string":
      if (fieldDef.format === "email") {
        return "not-an-email"; // Invalid email format
      }
      if (fieldDef.pattern) {
        return "!!!INVALID_PATTERN!!!"; // Unlikely to match any pattern
      }
      if (fieldDef.minLength) {
        return "x".repeat(Math.max(0, fieldDef.minLength - 1)); // Too short
      }
      if (fieldDef.maxLength) {
        return "x".repeat(fieldDef.maxLength + 10); // Too long
      }
      return 12345; // Wrong type (number instead of string)

    case "integer":
    case "number":
      if (fieldDef.min !== undefined) {
        return fieldDef.min - 1; // Below minimum
      }
      if (fieldDef.max !== undefined) {
        return fieldDef.max + 1; // Above maximum
      }
      return "not-a-number"; // Wrong type

    case "boolean":
      return "not-a-boolean"; // String instead of boolean

    case "enum":
      return "INVALID_ENUM_VALUE_XYZ"; // Not in allowed values

    default:
      // If has enum/values, return invalid enum
      if (fieldDef.values || fieldDef.enum) {
        return "INVALID_ENUM_VALUE_XYZ";
      }
      return { invalid: "wrong-type" };
  }
}

/**
 * Get the expected JavaScript type for a field
 * Useful for validating response structure
 *
 * @param {string} fieldName - Field name
 * @param {string} entityName - Entity name
 * @param {Object} schemaOverride - Optional schema with field definition
 * @returns {string} JavaScript type name (string, number, boolean, object)
 */
function getExpectedJsType(
  fieldName,
  entityName = null,
  schemaOverride = null,
) {
  let fieldDef;

  if (schemaOverride && schemaOverride[fieldName]) {
    fieldDef = schemaOverride[fieldName];
  } else {
    fieldDef = getFieldDef(fieldName, entityName);
  }

  if (!fieldDef) return "string"; // Default assumption

  switch (fieldDef.type) {
    case "integer":
    case "number":
    case "decimal":
    case "currency":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    case "array":
      return "object"; // typeof [] === 'object'
    default:
      return "string";
  }
}

/**
 * Get all expected types for an entity's fields
 * Useful for validating response structure
 *
 * @param {string} entityName - Entity name
 * @param {Object} schemaOverride - Optional schema to use
 * @returns {Object} { [fieldName]: 'string'|'number'|'boolean'|'object' }
 */
function getExpectedTypes(entityName, schemaOverride = null) {
  const fields = getEntityFields(entityName, schemaOverride);
  const types = {};

  for (const fieldName of Object.keys(fields)) {
    types[fieldName] = getExpectedJsType(fieldName, entityName, schemaOverride);
  }

  return types;
}

/**
 * Find fields by constraint (required, optional, has default, etc.)
 *
 * @param {string} entityName - Entity name
 * @param {string} constraint - Constraint type: 'required', 'optional', 'hasDefault', 'enum', 'foreignKey'
 * @param {Object} schemaOverride - Optional schema to use
 * @returns {string[]} Array of field names matching the constraint
 */
function findFieldsByConstraint(entityName, constraint, schemaOverride = null) {
  const fields = getEntityFields(entityName, schemaOverride);
  const matches = [];

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    switch (constraint) {
      case "required":
        if (fieldDef.required === true) matches.push(fieldName);
        break;
      case "optional":
        if (fieldDef.required !== true) matches.push(fieldName);
        break;
      case "hasDefault":
        if (fieldDef.default !== undefined) matches.push(fieldName);
        break;
      case "enum":
        if (fieldDef.values || fieldDef.enum || fieldDef.type === "enum")
          matches.push(fieldName);
        break;
      case "foreignKey":
        if (fieldDef.type === "foreignKey" || fieldName.endsWith("_id"))
          matches.push(fieldName);
        break;
    }
  }

  return matches;
}

module.exports = {
  // Value generation
  generateValidValue,
  generateInvalidValue,
  getValidExamples,
  getInvalidExamples,

  // Field introspection
  getEntityFields,
  findFieldByType,
  findAllFieldsByType,
  findFieldsByConstraint,
  getExpectedJsType,
  getExpectedTypes,

  // Utilities
  hasValidationRules,
  getFieldDef,
  resetCounter,
  matchesType,

  // Exposed for testing
  numberToLetters,
  getNextUnique,
};
