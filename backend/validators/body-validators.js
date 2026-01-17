/**
 * Request Body Validation Middleware
 *
 * Special-case validators for endpoints that don't use genericValidateBody.
 * For entity CRUD operations, use genericValidateBody from middleware/generic-entity.js
 * which provides role-aware, metadata-driven validation.
 *
 * This module contains ONLY:
 * 1. Auth-related validators (login, token refresh, callbacks)
 * 2. Profile update validator (stricter than general user update)
 * 3. Role assignment validator
 *
 * Philosophy: Explicit is better than implicit. No auto-generation.
 */
const Joi = require('joi');
const ResponseFormatter = require('../utils/response-formatter');

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
  req.body = value;
  next();
};

// ============================================================================
// PROFILE UPDATE VALIDATOR
// ============================================================================
// Used by PUT /api/auth/me - only allows first_name and last_name updates
// This is stricter than a general user update (which allows email, role_id, etc.)

/**
 * Profile Update Validation
 * Validates: PUT /api/auth/me
 * Only allows users to update their own first_name and last_name
 */
const validateProfileUpdate = createValidator(
  Joi.object({
    first_name: Joi.string().trim().min(1).max(100).messages({
      'string.empty': 'First name cannot be empty',
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name cannot exceed 100 characters',
    }),
    last_name: Joi.string().trim().min(1).max(100).messages({
      'string.empty': 'Last name cannot be empty',
      'string.min': 'Last name must be at least 1 character',
      'string.max': 'Last name cannot exceed 100 characters',
    }),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field (first_name or last_name) must be provided',
    }),
);

// ============================================================================
// ROLE ASSIGNMENT VALIDATOR
// ============================================================================
// Used by PUT /api/admin/users/:id/role

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

// ============================================================================
// AUTH0 VALIDATORS
// ============================================================================
// Special validators for Auth0 OAuth flow - not entity CRUD

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
  // Profile validator (stricter than general user update)
  validateProfileUpdate,

  // Role assignment validator
  validateRoleAssignment,

  // Auth0 OAuth flow validators
  validateAuthCallback,
  validateAuth0Token,
  validateAuth0Refresh,
  validateRefreshToken,
};