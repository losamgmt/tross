/**
 * URL Parameter Validators
 *
 * Middleware for validating and coercing URL parameters (e.g., /api/users/:id).
 * Replaces manual parseInt() scattered across routes with centralized validation.
 *
 * All validators attach validated values to req.validated = {}
 */
const { toSafeInteger } = require('./type-coercion');
const ResponseFormatter = require('../utils/response-formatter');

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

      next();
    } catch (error) {
      return ResponseFormatter.badRequest(res, error.message, [
        { field: paramName, message: error.message },
      ]);
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
      return ResponseFormatter.badRequest(res, error.message, [
        { field: 'params', message: error.message },
      ]);
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
      return ResponseFormatter.badRequest(
        res,
        `${paramName} is required`,
        [{ field: paramName, message: `${paramName} is required` }],
      );
    }

    const trimmed = value.trim();

    if (trimmed.length < minLength || trimmed.length > maxLength) {
      return ResponseFormatter.badRequest(
        res,
        `${paramName} must be between ${minLength} and ${maxLength} characters`,
        [{ field: paramName, message: `${paramName} must be between ${minLength} and ${maxLength} characters` }],
      );
    }

    if (!slugPattern.test(trimmed)) {
      return ResponseFormatter.badRequest(
        res,
        `${paramName} must contain only lowercase letters, numbers, and hyphens`,
        [{ field: paramName, message: `${paramName} must contain only lowercase letters, numbers, and hyphens` }],
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
