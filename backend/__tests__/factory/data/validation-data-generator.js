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
  
  // String with pattern: generate valid unique value
  if (fieldDef.type === 'string' && fieldDef.pattern) {
    return generateFromPattern(fieldDef.pattern, uniqueId, uniqueSuffix);
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
 * Generate value from pattern regex
 */
function generateFromPattern(pattern, uniqueId, uniqueSuffix) {
  const counterPart = parseInt(uniqueId.split('_')[1]) || 1;
  const year = new Date().getFullYear();
  
  // COMPUTED entity identifier patterns (WO-YYYY-NNNN, INV-YYYY-NNNN, CTR-YYYY-NNNN)
  if (pattern.includes('WO-') || pattern.includes('WO')) {
    return `WO-${year}-${String(counterPart).padStart(4, '0')}`;
  }
  if (pattern.includes('INV-') || pattern.includes('INV')) {
    return `INV-${year}-${String(counterPart).padStart(4, '0')}`;
  }
  if (pattern.includes('CTR-') || pattern.includes('CTR')) {
    return `CTR-${year}-${String(counterPart).padStart(4, '0')}`;
  }
  
  // Human names: ^[a-zA-Z\s'-]+$
  if (pattern === "^[a-zA-Z\\s'-]+$") {
    return `Test${uniqueSuffix}`;
  }
  
  // Role names: ^[a-zA-Z0-9\s_-]+$
  if (pattern === "^[a-zA-Z0-9\\s_-]+$") {
    return `TestRole_${uniqueId}`;
  }
  
  // E.164 phone: ^\+?[1-9]\d{1,14}$
  if (pattern.includes('\\+') && pattern.includes('\\d')) {
    return `+1555${String(counterPart).padStart(7, '0')}`;
  }
  
  // Email pattern
  if (pattern.includes('@')) {
    return `test_${uniqueId}@example.com`;
  }
  
  // SKU-like: alphanumeric
  if (pattern === "^[A-Z0-9-]+$" || pattern.includes('[A-Z0-9')) {
    return `SKU-${uniqueId}`;
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
      // Pattern-based
      if (fieldDef.pattern) {
        return generateFromPattern(fieldDef.pattern, uniqueId, uniqueSuffix);
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
 */
function generateInferredValue(fieldName, uniqueId, uniqueSuffix) {
  const counterPart = parseInt(uniqueId.split('_')[1]) || 1;
  const year = new Date().getFullYear();
  
  // COMPUTED entity identifiers (auto-generated format: PREFIX-YYYY-NNNN)
  if (fieldName === 'work_order_number') {
    return `WO-${year}-${String(counterPart).padStart(4, '0')}`;
  }
  if (fieldName === 'invoice_number') {
    return `INV-${year}-${String(counterPart).padStart(4, '0')}`;
  }
  if (fieldName === 'contract_number') {
    return `CTR-${year}-${String(counterPart).padStart(4, '0')}`;
  }
  
  // FK references
  if (fieldName.endsWith('_id')) {
    return counterPart;
  }
  
  // Email fields
  if (fieldName.includes('email')) {
    return `test_${uniqueId}@example.com`;
  }
  
  // Phone fields
  if (fieldName.includes('phone')) {
    return `+1555${String(counterPart).padStart(7, '0')}`;
  }
  
  // Human name fields
  if (fieldName === 'first_name') {
    return `Test${uniqueSuffix}`;
  }
  if (fieldName === 'last_name') {
    return `User${uniqueSuffix}`;
  }
  
  // Generic name fields
  if (fieldName.includes('name')) {
    return `Test ${fieldName} ${uniqueId}`;
  }
  
  // Date/timestamp fields
  if (fieldName.includes('date') || fieldName.includes('_at')) {
    return new Date().toISOString();
  }
  
  // Number-like fields
  if (fieldName.includes('amount') || fieldName.includes('total') || 
      fieldName.includes('rate') || fieldName.includes('value') ||
      fieldName.includes('quantity') || fieldName.includes('tax')) {
    return counterPart * 10;
  }
  
  // Default string
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
