/**
 * URL Parameter Validators
 *
 * Middleware for validating and coercing URL parameters (e.g., /api/users/:id).
 * Replaces manual parseInt() scattered across routes with centralized validation.
 *
 * All validators attach validated values to req.validated = {}
 */
const { toSafeInteger } = require('./type-coercion');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Create a standard validation error response
 *
 * @private
 * @param {string} message - Error message
 * @param {string} field - Field that failed validation
 * @returns {Object} Error response object
 */
function createValidationError(message, field) {
  return {
    error: 'Validation Error',
    message,
    field,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate numeric ID parameter
 *
 * Usage:
 *   router.get('/:id', validateIdParam(), handler)
 *   // Access validated ID: req.validated.id
 *
 * @param {Object} options - Validation options
 * @param {string} options.paramName - Name of param to validate (default: 'id')
 * @param {number} options.min - Minimum value (default: 1)
 * @param {number} options.max - Maximum value (default: MAX_SAFE_INTEGER)
 * @returns {Function} Express middleware
 */
function validateIdParam(options = {}) {
  const { paramName = 'id', min = 1, max = Number.MAX_SAFE_INTEGER } = options;

  return (req, res, next) => {
    try {
      const value = req.params[paramName];
      const validated = toSafeInteger(value, paramName, {
        min,
        max,
        allowNull: false,
      });

      // Attach to req.validated
      if (!req.validated) {req.validated = {};}
      req.validated[paramName] = validated;

      // LEGACY SUPPORT: Also attach to req.validatedId for backward compatibility
      if (paramName === 'id') {
        req.validatedId = validated;
      }

      next();
    } catch (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createValidationError(error.message, paramName));
    }
  };
}

/**
 * Validate multiple numeric ID parameters
 *
 * Usage:
 *   router.put('/:userId/role/:roleId', validateIdParams(['userId', 'roleId']), handler)
 *   // Access: req.validated.userId, req.validated.roleId
 *
 * @param {string[]} paramNames - Array of param names to validate
 * @returns {Function} Express middleware
 */
function validateIdParams(paramNames) {
  return (req, res, next) => {
    try {
      if (!req.validated) {req.validated = {};}

      for (const paramName of paramNames) {
        const value = req.params[paramName];
        const validated = toSafeInteger(value, paramName, {
          min: 1,
          allowNull: false,
        });
        req.validated[paramName] = validated;
      }

      next();
    } catch (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createValidationError(error.message, 'params'));
    }
  };
}

/**
 * Validate string slug parameter (lowercase, alphanumeric + hyphens)
 *
 * Usage:
 *   router.get('/:slug', validateSlugParam(), handler)
 *   // Access: req.validated.slug
 *
 * @param {Object} options - Validation options
 * @param {string} options.paramName - Name of param to validate (default: 'slug')
 * @param {number} options.minLength - Minimum length (default: 1)
 * @param {number} options.maxLength - Maximum length (default: 100)
 * @returns {Function} Express middleware
 */
function validateSlugParam(options = {}) {
  const { paramName = 'slug', minLength = 1, maxLength = 100 } = options;
  const slugPattern = /^[a-z0-9-]+$/;

  return (req, res, next) => {
    const value = req.params[paramName];

    if (!value || typeof value !== 'string') {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createValidationError(`${paramName} is required`, paramName));
    }

    const trimmed = value.trim();

    if (trimmed.length < minLength || trimmed.length > maxLength) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createValidationError(
            `${paramName} must be between ${minLength} and ${maxLength} characters`,
            paramName,
          ),
        );
    }

    if (!slugPattern.test(trimmed)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createValidationError(
            `${paramName} must contain only lowercase letters, numbers, and hyphens`,
            paramName,
          ),
        );
    }

    if (!req.validated) {req.validated = {};}
    req.validated[paramName] = trimmed;

    next();
  };
}

module.exports = {
  validateIdParam,
  validateIdParams,
  validateSlugParam,
};
