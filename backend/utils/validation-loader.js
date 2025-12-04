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
    console.error('[ValidationLoader] ❌ Failed to load validation rules:', error.message);
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
 * @param {string} operationName - Name of the composite validation (e.g., "createUser")
 * @returns {Joi.ObjectSchema} Complete Joi object schema
 */
function buildCompositeSchema(operationName) {
  const rules = loadValidationRules();

  const composite = rules.compositeValidations[operationName];
  if (!composite) {
    throw new Error(`Unknown composite validation: ${operationName}`);
  }

  const schemaFields = {};

  // Context-aware field mapping for different operation types
  const isRoleOperation = operationName === 'createRole' || operationName === 'updateRole';
  const isUserOperation = operationName.toLowerCase().includes('user');
  const isCustomerOperation = operationName.toLowerCase().includes('customer');
  const isTechnicianOperation = operationName.toLowerCase().includes('technician');
  const isWorkOrderOperation = operationName.toLowerCase().includes('workorder') || operationName.toLowerCase().includes('work_order');
  const isInvoiceOperation = operationName.toLowerCase().includes('invoice');
  const isContractOperation = operationName.toLowerCase().includes('contract');
  const isInventoryOperation = operationName.toLowerCase().includes('inventory');

  // Determine context-aware status field
  let statusField = 'status'; // Default
  if (isRoleOperation) {
    statusField = 'roleStatus';
  } else if (isUserOperation) {
    statusField = 'userStatus';
  } else if (isCustomerOperation) {
    statusField = 'customerStatus';
  } else if (isTechnicianOperation) {
    statusField = 'technicianStatus';
  } else if (isWorkOrderOperation) {
    statusField = 'workOrderStatus';
  } else if (isInvoiceOperation) {
    statusField = 'invoiceStatus';
  } else if (isContractOperation) {
    statusField = 'contractStatus';
  } else if (isInventoryOperation) {
    statusField = 'inventoryStatus';
  }

  // Map field names to their definitions
  const fieldMapping = {
    email: 'email',
    first_name: 'first_name',
    firstName: 'firstName',
    last_name: 'last_name',
    lastName: 'lastName',
    role_id: 'role_id',
    roleId: 'roleId',
    is_active: 'is_active',
    isActive: 'isActive',
    name: 'roleName', // Default to roleName for backward compatibility
    roleName: 'roleName',
    priority: isRoleOperation ? 'rolePriority' : 'priority', // Context-aware
    rolePriority: 'rolePriority',
    description: isRoleOperation ? 'roleDescription' : 'description', // Context-aware
    roleDescription: 'roleDescription',
    phone: 'phone',
    url: 'url',
    company_name: 'company_name',
    companyName: 'companyName',
    license_number: 'license_number',
    licenseNumber: 'licenseNumber',
    hourly_rate: 'hourly_rate',
    hourlyRate: 'hourlyRate',
    customer_id: 'customer_id',
    customerId: 'customerId',
    technician_id: 'technicianId',
    technicianId: 'technicianId',
    assigned_technician_id: 'assigned_technician_id',
    assignedTechnicianId: 'assigned_technician_id',
    work_order_id: 'work_order_id',
    workOrderId: 'workOrderId',
    invoice_number: 'invoice_number',
    invoiceNumber: 'invoiceNumber',
    contract_number: 'contract_number',
    contractNumber: 'contractNumber',
    title: 'title',
    amount: 'amount',
    total: 'total',
    tax: 'tax',
    sku: 'sku',
    quantity: 'quantity',
    status: statusField, // Context-aware status mapping
    start_date: 'start_date',
    startDate: 'startDate',
    end_date: 'end_date',
    endDate: 'endDate',
    due_date: 'due_date',
    dueDate: 'dueDate',
    value: 'value',
  };

  // Add required fields
  composite.requiredFields?.forEach(fieldName => {
    const defKey = fieldMapping[fieldName];
    const fieldDef = rules.fields[defKey];
    if (!fieldDef) {
      console.warn(`[ValidationLoader] ⚠️  Field definition not found: ${fieldName} (${defKey})`);
      return;
    }
    schemaFields[fieldName] = buildFieldSchema(fieldDef, fieldName);
  });

  // Add optional fields
  composite.optionalFields?.forEach(fieldName => {
    const defKey = fieldMapping[fieldName];
    const fieldDef = rules.fields[defKey];
    if (!fieldDef) {
      console.warn(`[ValidationLoader] ⚠️  Field definition not found: ${fieldName} (${defKey})`);
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
