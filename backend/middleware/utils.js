/**
 * Middleware Utils
 *
 * SRP: Shared helper functions for middleware modules.
 *
 * NOTE: This file only exports asyncHandler.
 * Other security/auth helpers live in their canonical locations:
 * - getClientIp, getUserAgent: utils/request-helpers.js
 * - hasMinimumRole, hasPermission: config/permissions-loader.js
 * - Role definitions: config/role-definitions.js
 */

/**
 * Wrap async middleware to catch errors
 *
 * @param {Function} fn - Async middleware function
 * @returns {Function} Wrapped middleware that catches async errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  asyncHandler,
};
