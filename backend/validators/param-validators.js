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
      // silent: true - URL params are ALWAYS strings, coercion is expected and not noteworthy
      const validated = toSafeInteger(value, paramName, {
        min,
        max,
        allowNull: false,
        silent: true,
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
        // silent: true - URL params are ALWAYS strings, coercion is expected
        const validated = toSafeInteger(value, paramName, {
          min: 1,
          allowNull: false,
          silent: true,
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

module.exports = {
  validateIdParam,
  validateIdParams,
};
