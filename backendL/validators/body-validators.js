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
const { HTTP_STATUS } = require('../config/constants');
const { buildCompositeSchema, getValidationMetadata } = require('../utils/validation-loader');

// Load validation metadata on startup
try {
  const metadata = getValidationMetadata();
  console.log(`[ValidationLoader] 📋 Loaded validation rules v${metadata.version}`);
  console.log(`[ValidationLoader] 📊 Available operations: ${metadata.operations.join(', ')}`);
  console.log(`[ValidationLoader] 🎯 Policy: ${JSON.stringify(metadata.policy)}`);
} catch (error) {
  console.error('[ValidationLoader] ❌ Failed to load validation metadata:', error.message);
}

/**
 * Helper function to create validation middleware
 * DRY principle: Single error handler for all validators
 */
const createValidator = (schema) => (req, res, next) => {
  console.log('[VALIDATOR] Incoming request body:', JSON.stringify(req.body, null, 2));
  console.log('[VALIDATOR] Body keys:', Object.keys(req.body));
  console.log('[VALIDATOR] Email value:', req.body.email, 'Type:', typeof req.body.email);

  const { error } = schema.validate(req.body, {
    abortEarly: false, // Return all errors, not just the first
    stripUnknown: true, // Remove unknown fields for security
  });

  if (error) {
    console.log('[VALIDATOR] Validation failed:', error.details);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Validation Error',
      message: error.details[0].message,
      details: error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      })),
      timestamp: new Date().toISOString(),
    });
  }

  console.log('[VALIDATOR] Validation passed!');
  next();
};

/**
 * User Creation Validation
 * Validates: POST /api/users
 * USES CENTRALIZED SCHEMA from validation-rules.json
 */
const validateUserCreate = createValidator(
  buildCompositeSchema('createUser'),
);

/**
 * Profile Update Validation (User Updates)
 * Validates: PUT /api/auth/me, PUT /api/users/:id
 * USES CENTRALIZED SCHEMA from validation-rules.json
 */
const validateProfileUpdate = createValidator(
  buildCompositeSchema('updateUser').min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),
);

/**

/**
 * Role Creation Validation
 * Validates: POST /api/roles
 * USES CENTRALIZED SCHEMA from validation-rules.json
 */
const validateRoleCreate = createValidator(
  buildCompositeSchema('createRole'),
);

/**
 * Role Update Validation
 * Validates: PUT /api/roles/:id
 * USES CENTRALIZED SCHEMA from validation-rules.json
 */
const validateRoleUpdate = createValidator(
  buildCompositeSchema('updateRole').min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),
);

/**
 * Role Assignment Validation
 * Validates: PUT /api/users/:id/role
 */
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
  validateProfileUpdate,
  validateRoleAssignment,
  validateRoleCreate,
  validateRoleUpdate,
  validateAuthCallback,
  validateAuth0Token,
  validateAuth0Refresh,
  validateRefreshToken,
};
