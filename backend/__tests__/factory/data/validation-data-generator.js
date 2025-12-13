/**
 * Validation-Aware Data Generator
 *
 * SRP: Generate valid test data based on validation-rules.json
 * SINGLE SOURCE OF TRUTH: Uses the same validation rules as the API.
 *
 * PRINCIPLE: If validation-rules.json says a field must match a pattern,
 * we generate data that matches that pattern. No hardcoding. No exceptions.
 */

const { loadValidationRules } = require('../../../utils/validation-loader');

// Counter for uniqueness - combined with timestamp for cross-run uniqueness
let counter = 0;
const runId = Date.now();

/**
 * Increment counter and return both the full unique ID and just the counter
 * This ensures a single increment per call, keeping values in sync
 */
function getNextUnique() {
  const num = ++counter;
  return {
    id: `${runId}_${num}`,    // Full unique ID with timestamp
    num: num,                  // Just the counter for numeric uses
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
 * Field name mapping: API snake_case -> validation-rules.json camelCase
 * This mirrors the mapping in validation-loader.js
 */
const FIELD_NAME_MAP = {
  // User fields
  first_name: 'firstName',
  last_name: 'lastName',
  role_id: 'roleId',
  is_active: 'isActive',
  customer_profile_id: 'customerProfileId',
  technician_profile_id: 'technicianProfileId',
  
  // Customer fields
  company_name: 'companyName',
  
  // Technician fields
  license_number: 'licenseNumber',
  hourly_rate: 'hourlyRate',
  
  // Work Order fields
  customer_id: 'customerId',
  assigned_technician_id: 'assignedTechnicianId',
  work_order_id: 'workOrderId',
  
  // Invoice fields
  invoice_number: 'invoiceNumber',
  
  // Contract fields
  contract_number: 'contractNumber',
  start_date: 'startDate',
  end_date: 'endDate',
  
  // Direct mappings (no transformation needed)
  email: 'email',
  phone: 'phone',
  name: 'roleName',
  priority: 'rolePriority',
  description: 'roleDescription',
  title: 'title',
  amount: 'amount',
  total: 'total',
  tax: 'tax',
  sku: 'sku',
  quantity: 'quantity',
  value: 'value',
  status: 'status', // Will be context-aware
};

/**
 * Context-aware field mapping based on entity
 */
function getFieldDefKey(fieldName, entityName) {
  // Status fields are entity-specific
  if (fieldName === 'status') {
    const statusMap = {
      role: 'roleStatus',
      user: 'userStatus',
      customer: 'customerStatus',
      technician: 'technicianStatus',
      workOrder: 'workOrderStatus',
      invoice: 'invoiceStatus',
      contract: 'contractStatus',
      inventory: 'inventoryStatus',
    };
    return statusMap[entityName] || 'status';
  }
  
  // Role-specific mappings
  if (entityName === 'role') {
    if (fieldName === 'name') return 'roleName';
    if (fieldName === 'priority') return 'rolePriority';
    if (fieldName === 'description') return 'roleDescription';
  }
  
  return FIELD_NAME_MAP[fieldName] || fieldName;
}

/**
 * Get field definition from validation rules
 */
function getFieldDef(fieldName, entityName) {
  const rules = loadValidationRules();
  const defKey = getFieldDefKey(fieldName, entityName);
  return rules.fields[defKey];
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
  
  // Numbers: extract counter from uniqueId for numeric values
  if (fieldDef.type === 'integer' || fieldDef.type === 'number') {
    const counterPart = parseInt(uniqueId.split('_')[1]) || 1;
    const min = fieldDef.min ?? 1;
    const max = fieldDef.max ?? 1000000;
    return Math.min(min + counterPart, max);
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
    const counterPart = parseInt(uniqueId.split('_')[1]) || 1;
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
  
  // Invoice/Contract number patterns
  if (pattern.includes('INV') || pattern.includes('invoice')) {
    return `INV-${uniqueId}`;
  }
  if (pattern.includes('CON') || pattern.includes('contract')) {
    return `CON-${uniqueId}`;
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
