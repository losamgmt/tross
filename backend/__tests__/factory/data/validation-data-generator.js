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

const { loadValidationRules } = require('../../../utils/validation-loader');
const { getUniqueValues } = require('../../helpers/test-helpers');

/**
 * Increment counter and return both the full unique ID and just the counter
 * This ensures a single increment per call, keeping values in sync
 * 
 * Delegates to the central getUniqueValues() for consistent uniqueness.
 */
function getNextUnique() {
  const vals = getUniqueValues();
  return {
    id: vals.id,     // Full unique ID with timestamp
    num: vals.num,   // Just the counter for numeric uses
  };
}

/**
 * Convert number to alphabetic string for human name uniqueness
 * 1 -> 'A', 26 -> 'Z', 27 -> 'AA', etc.
 */
function numberToLetters(num) {
  let result = '';
  let n = num;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result || 'A';
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
      const allMetadata = require('../../../config/models');
      const entityMeta = allMetadata[entityName];
      if (entityMeta?.fields?.[fieldName]) {
        const metaField = entityMeta.fields[fieldName];
        return convertMetadataToFieldDef(metaField, fieldName);
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
 * @returns {Object} Field definition in validation-rules.json format
 */
function convertMetadataToFieldDef(metaField, fieldName) {
  const fieldDef = {};
  
  // Handle type mapping
  switch (metaField.type) {
    case 'enum':
      fieldDef.type = 'string';
      fieldDef.enum = metaField.values;
      break;
    case 'email':
      fieldDef.type = 'string';
      fieldDef.format = 'email';
      break;
    case 'decimal':
    case 'currency':
      fieldDef.type = 'number';
      if (metaField.min !== undefined) fieldDef.min = metaField.min;
      if (metaField.max !== undefined) fieldDef.max = metaField.max;
      break;
    case 'integer':
      fieldDef.type = 'integer';
      if (metaField.min !== undefined) fieldDef.min = metaField.min;
      if (metaField.max !== undefined) fieldDef.max = metaField.max;
      break;
    case 'foreignKey':
      fieldDef.type = 'integer';
      fieldDef.min = 1;
      break;
    case 'boolean':
      fieldDef.type = 'boolean';
      break;
    case 'date':
      fieldDef.type = 'string';
      fieldDef.format = 'date';
      break;
    case 'timestamp':
      fieldDef.type = 'string';
      fieldDef.format = 'timestamp';
      break;
    case 'uuid':
      fieldDef.type = 'string';
      fieldDef.format = 'uuid';
      break;
    default:
      fieldDef.type = metaField.type || 'string';
      if (metaField.pattern) fieldDef.pattern = metaField.pattern;
      if (metaField.minLength !== undefined) fieldDef.minLength = metaField.minLength;
      if (metaField.maxLength !== undefined) fieldDef.maxLength = metaField.maxLength;
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
    return makeUnique(fieldDef, fieldDef.examples.valid[0], uniqueId, uniqueSuffix);
  }
  
  // Generate based on type and constraints
  return generateFromConstraints(fieldDef, fieldName, uniqueId, uniqueSuffix);
}

/**
 * Make a value unique while preserving pattern validity
 */
function makeUnique(fieldDef, baseValue, uniqueId, uniqueSuffix) {
  // Email: insert unique suffix before @
  if (fieldDef.format === 'email' || fieldDef.type === 'email') {
    if (typeof baseValue === 'string' && baseValue.includes('@')) {
      const [local, domain] = baseValue.split('@');
      return `${local}_${uniqueId}@${domain}`;
    }
  }
  
  // String with pattern: generate valid unique value (pass fieldDef for metadata)
  if (fieldDef.type === 'string' && fieldDef.pattern) {
    return generateFromPattern(fieldDef.pattern, uniqueId, uniqueSuffix, fieldDef);
  }
  
  // Numbers: use baseValue (first example) as the starting point
  // This allows validation rules to set a higher base (e.g., priority 10)
  // to avoid conflicts with seed data
  if (fieldDef.type === 'integer' || fieldDef.type === 'number') {
    const counterPart = parseInt(uniqueId.split('_')[1]) || 1;
    const base = typeof baseValue === 'number' ? baseValue : (fieldDef.min ?? 1);
    const max = fieldDef.max ?? 1000000;
    return Math.min(base + counterPart, max);
  }
  
  // For strings without pattern, append suffix
  if (typeof baseValue === 'string') {
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
  const counterPart = parseInt(uniqueId.split('_')[1]) || 1;
  const year = new Date().getFullYear();
  
  // METADATA-DRIVEN: If examples.valid exists, use as template
  if (fieldDef?.examples?.valid?.length > 0) {
    const example = fieldDef.examples.valid[0];
    // PREFIX-YYYY-NNNN pattern: extract prefix, replace numbers
    const prefixMatch = example.match(/^([A-Z]+)-(\d{4})-(\d+)$/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      return `${prefix}-${year}-${String(counterPart).padStart(4, '0')}`;
    }
  }
  
  // GENERIC PREFIX-YYYY-NNNN detection (matches ^PREFIX-[0-9]{4}-[0-9]+$ patterns)
  const prefixPatternMatch = pattern.match(/^\^([A-Z]+)-\[0-9\]\{4\}-\[0-9\]\+\$$/);
  if (prefixPatternMatch) {
    const prefix = prefixPatternMatch[1];
    return `${prefix}-${year}-${String(counterPart).padStart(4, '0')}`;
  }
  
  // Human names: ^[a-zA-Z\s'-]+$
  if (pattern === "^[a-zA-Z\\s'-]+$") {
    return `Test${uniqueSuffix}`;
  }
  
  // Alphanumeric with spaces/underscores/hyphens: ^[a-zA-Z0-9\s_-]+$
  if (pattern === "^[a-zA-Z0-9\\s_-]+$") {
    return `TestValue${uniqueSuffix}`;
  }
  
  // E.164 phone: ^\+?[1-9]\d{1,14}$
  if (pattern.includes('\\+') && pattern.includes('\\d')) {
    return `+1555${String(counterPart).padStart(7, '0')}`;
  }
  
  // Email pattern (contains @)
  if (pattern.includes('@')) {
    return `test_${uniqueId}@example.com`;
  }
  
  // Uppercase alphanumeric: ^[A-Z0-9-]+$ or similar
  if (pattern.includes('[A-Z0-9')) {
    return `ID-${uniqueId.toUpperCase()}`;
  }
  
  // Default: alphanumeric string
  return `Value_${uniqueId}`;
}

/**
 * Generate value from field constraints (type, min, max, etc.)
 */
function generateFromConstraints(fieldDef, fieldName, uniqueId, uniqueSuffix) {
  const counterPart = parseInt(uniqueId.split('_')[1]) || 1;
  
  switch (fieldDef.type) {
    case 'string':
      // Email format
      if (fieldDef.format === 'email') {
        return `test_${uniqueId}@example.com`;
      }
      // Date format (type: string, format: date)
      if (fieldDef.format === 'date') {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      }
      // Timestamp format (type: string, format: timestamp)
      if (fieldDef.format === 'timestamp' || fieldDef.format === 'date-time') {
        return new Date().toISOString();
      }
      // Pattern-based (pass fieldDef for metadata-driven generation)
      if (fieldDef.pattern) {
        return generateFromPattern(fieldDef.pattern, uniqueId, uniqueSuffix, fieldDef);
      }
      // Plain string with length constraints
      const minLen = fieldDef.minLength || 1;
      const base = `Test_${fieldName}_${uniqueId}`;
      return base.length >= minLen ? base : base.padEnd(minLen, 'x');
      
    case 'integer':
      const intMin = fieldDef.min ?? 1;
      const intMax = fieldDef.max ?? 1000000;
      return Math.min(intMin + counterPart, intMax);
      
    case 'number':
      const numMin = fieldDef.min ?? 0;
      return numMin + (counterPart * 10.5);
      
    case 'boolean':
      return true;
      
    case 'date':
      return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
    default:
      return `value_${uniqueId}`;
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
  const counterPart = parseInt(uniqueId.split('_')[1]) || 1;
  
  // Log warning for unmapped fields (helps catch missing metadata)
  // This is a development aid - fields should ideally be in validation-rules.json
  const { logger } = require('../../../config/logger');
  logger.debug(`Inferring value for unmapped field: ${fieldName}`);
  
  // FK references - return numeric ID
  if (fieldName.endsWith('_id')) {
    return counterPart;
  }
  
  // Email fields - standard test email format
  if (fieldName.includes('email')) {
    return `test_${uniqueId}@example.com`;
  }
  
  // Phone fields - E.164 format
  if (fieldName.includes('phone')) {
    return `+1555${String(counterPart).padStart(7, '0')}`;
  }
  
  // Human name fields - letters only (validation-safe)
  if (fieldName === 'first_name' || fieldName === 'given_name') {
    return `Test${uniqueSuffix}`;
  }
  if (fieldName === 'last_name' || fieldName === 'family_name' || fieldName === 'surname') {
    return `User${uniqueSuffix}`;
  }
  
  // Generic name fields
  if (fieldName.includes('name')) {
    return `Test${uniqueSuffix}`;
  }
  
  // Date/timestamp fields - ISO format
  if (fieldName.includes('date') || fieldName.includes('_at')) {
    return new Date().toISOString();
  }
  
  // Numeric fields - common patterns
  if (fieldName.includes('amount') || fieldName.includes('total') || 
      fieldName.includes('rate') || fieldName.includes('value') ||
      fieldName.includes('quantity') || fieldName.includes('tax') ||
      fieldName.includes('price') || fieldName.includes('cost')) {
    return counterPart * 10;
  }
  
  // Priority/order/sequence fields
  if (fieldName.includes('priority') || fieldName.includes('order') || 
      fieldName.includes('sequence') || fieldName.includes('rank')) {
    return 10 + counterPart; // Start at 10 to avoid seed data conflicts
  }
  
  // Boolean fields
  if (fieldName.startsWith('is_') || fieldName.startsWith('has_') || 
      fieldName.startsWith('can_') || fieldName.includes('_enabled') ||
      fieldName.includes('_active')) {
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

module.exports = {
  generateValidValue,
  getValidExamples,
  getInvalidExamples,
  hasValidationRules,
  getFieldDef,
  resetCounter,
  // Exposed for testing
  numberToLetters,
  getNextUnique,
};
