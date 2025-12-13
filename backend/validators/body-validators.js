/**
 * Request Body Validation Middleware
 *
 * Comprehensive validation for all POST/PUT endpoints using Joi.
 * Ensures data integrity before it reaches the database.
 *
 * Philosophy: Fail fast with clear, actionable error messages.
 *
 * NOW CENTRALIZED: Uses shared validation rules from config/validation-rules.json
 * This ensures frontend and backend use IDENTICAL validation logic.
 */
const Joi = require('joi');
const { buildCompositeSchema, getValidationMetadata } = require('../utils/validation-loader');
const ResponseFormatter = require('../utils/response-formatter');

// Log validation metadata on startup (console is appropriate for module initialization)
try {
  const metadata = getValidationMetadata();
  console.log(`[ValidationLoader] Loaded validation rules v${metadata.version}`);
} catch (error) {
  console.error('[ValidationLoader] Failed to load validation metadata:', error.message);
}

/**
 * Helper function to create validation middleware
 * DRY principle: Single error handler for all validators
 */
const createValidator = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false, // Return all errors, not just the first
    stripUnknown: true, // Remove unknown fields for security
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));

    return ResponseFormatter.badRequest(res, error.details[0].message, details);
  }

  // Replace req.body with validated/stripped value
  // Routes can now just use req.body directly without manual destructuring
  req.body = value;
  next();
};

/**
 * Helper function to build UPDATE schemas with consistent validation
 * DRY principle: Eliminates repeated .min(1).messages() pattern
 *
 * @param {string} operationName - Name of update operation (e.g., 'updateUser')
 * @returns {Joi.Schema} Configured Joi schema for updates
 */
function buildUpdateSchema(operationName) {
  return buildCompositeSchema(operationName).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  });
}

// ============================================================================
// AUTO-GENERATED RESOURCE VALIDATORS (DRY Factory Pattern)
// ============================================================================
// Generates create/update validators for all resources using metadata
// This eliminates 16+ lines of repetitive validator definitions

const RESOURCES = ['User', 'Role', 'Customer', 'Technician', 'WorkOrder', 'Invoice', 'Contract', 'Inventory'];
const resourceValidators = {};

RESOURCES.forEach(resource => {
  // Generate CREATE validator (e.g., validateUserCreate)
  resourceValidators[`validate${resource}Create`] = createValidator(
    buildCompositeSchema(`create${resource}`),
  );

  // Generate UPDATE validator (e.g., validateUserUpdate)
  resourceValidators[`validate${resource}Update`] = createValidator(
    buildUpdateSchema(`update${resource}`),
  );
});

// Extract individual validators for readability
const {
  validateUserCreate,
  validateUserUpdate,
  validateRoleCreate,
  validateRoleUpdate,
  validateCustomerCreate,
  validateCustomerUpdate,
  validateTechnicianCreate,
  validateTechnicianUpdate,
  validateWorkOrderCreate,
  validateWorkOrderUpdate,
  validateInvoiceCreate,
  validateInvoiceUpdate,
  validateContractCreate,
  validateContractUpdate,
  validateInventoryCreate,
  validateInventoryUpdate,
} = resourceValidators;

// Alias for User update (used in profile endpoints)
const validateProfileUpdate = validateUserUpdate;

// ============================================================================
// SPECIAL-CASE VALIDATORS (Not auto-generated)
// ============================================================================
// These validators have custom business logic beyond simple create/update
const validateRoleAssignment = createValidator(
  Joi.object({
    role_id: Joi.number().integer().positive().required().messages({
      'number.base': 'Role ID must be a number',
      'number.integer': 'Role ID must be an integer',
      'number.positive': 'Role ID must be positive',
      'any.required': 'Role ID is required',
    }),
  }),
);

/**
 * Auth0 Callback Validation
 * Validates: POST /api/auth0/callback
 * Validates authorization code and redirect URI from Auth0 callback
 */
const validateAuthCallback = createValidator(
  Joi.object({
    code: Joi.string().required().trim().messages({
      'string.empty': 'Authorization code is required',
      'any.required': 'Authorization code is required',
    }),
    redirect_uri: Joi.string().uri().optional().trim().messages({
      'string.uri': 'Redirect URI must be a valid URL',
    }),
  }),
);

/**
 * Auth0 Token Validation
 * Validates: POST /api/auth0/validate
 * Validates Auth0 ID token for PKCE flow
 */
const validateAuth0Token = createValidator(
  Joi.object({
    id_token: Joi.string().required().trim().messages({
      'string.empty': 'ID token is required',
      'any.required': 'ID token is required',
    }),
  }),
);

/**
 * Auth0 Refresh Token Validation
 * Validates: POST /api/auth0/refresh
 * Validates refresh token for Auth0 token refresh
 */
const validateAuth0Refresh = createValidator(
  Joi.object({
    refresh_token: Joi.string().required().trim().messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
  }),
);

/**
 * Auth Refresh Token Validation
 * Validates: POST /api/auth/refresh
 * Validates refresh token for internal token refresh
 */
const validateRefreshToken = createValidator(
  Joi.object({
    refreshToken: Joi.string().required().trim().messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
  }),
);

module.exports = {
  validateUserCreate,
  validateUserUpdate,
  validateProfileUpdate,
  validateRoleAssignment,
  validateRoleCreate,
  validateRoleUpdate,
  validateAuthCallback,
  validateAuth0Token,
  validateAuth0Refresh,
  validateRefreshToken,
  validateCustomerCreate,
  validateCustomerUpdate,
  validateTechnicianCreate,
  validateTechnicianUpdate,
  validateWorkOrderCreate,
  validateWorkOrderUpdate,
  validateInvoiceCreate,
  validateInvoiceUpdate,
  validateContractCreate,
  validateContractUpdate,
  validateInventoryCreate,
  validateInventoryUpdate,
};
