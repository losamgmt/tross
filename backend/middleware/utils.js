/**
 * Middleware Utils
 *
 * SRP: Shared helper functions for middleware modules.
 * Reduces duplication across auth, RLS, and permission middleware.
 *
 * USAGE:
 *   const { requireDbUser, getSecurityContext } = require('./utils');
 *
 *   // In middleware:
 *   const securityContext = getSecurityContext(req);
 *   if (!securityContext) {
 *     return ResponseFormatter.unauthorized(res);
 *   }
 */

const { logger } = require('../config/logger');

/**
 * Get client IP address from request
 * Handles X-Forwarded-For for proxied requests
 *
 * @param {Object} req - Express request
 * @returns {string|null} Client IP or null
 */
function getClientIp(req) {
  if (!req) {
    return null;
  }

  // X-Forwarded-For can be comma-separated list
  const forwardedFor = req.headers?.['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || null;
}

/**
 * Get user agent from request
 *
 * @param {Object} req - Express request
 * @returns {string|null} User agent or null
 */
function getUserAgent(req) {
  if (!req || !req.headers) {
    return null;
  }
  return req.headers['user-agent'] || null;
}

/**
 * Extract security context from request
 *
 * Used by RLS and permission middleware to get consistent user info.
 *
 * @param {Object} req - Express request
 * @returns {Object|null} Security context or null if not authenticated
 */
function getSecurityContext(req) {
  if (!req.user) {
    return null;
  }

  return {
    userId: req.user.userId,
    roleId: req.user.roleId,
    roleName: req.user.roleName,
    isActive: req.user.isActive !== false, // default to true
  };
}

/**
 * Check if request has valid database user
 *
 * @param {Object} req - Express request
 * @returns {boolean} True if user exists with valid userId
 */
function hasDbUser(req) {
  return !!(req.user && req.user.userId);
}

/**
 * Check if user has specific role (case-insensitive)
 *
 * @param {Object} req - Express request
 * @param {string} roleName - Role to check
 * @returns {boolean} True if user has role
 */
function hasRole(req, roleName) {
  if (!req.user || !req.user.roleName) {
    return false;
  }
  return req.user.roleName.toLowerCase() === roleName.toLowerCase();
}

/**
 * Check if user has minimum role level
 *
 * Role hierarchy: customer < technician < dispatcher < manager < admin
 *
 * @param {Object} req - Express request
 * @param {string} minRole - Minimum required role
 * @returns {boolean} True if user meets or exceeds role level
 */
function hasMinimumRole(req, minRole) {
  const { getRoleNameToPriority } = require('../config/role-hierarchy-loader');

  if (!req.user || !req.user.roleName) {
    return false;
  }

  const roleNameToPriority = getRoleNameToPriority();
  const userPriority = roleNameToPriority[req.user.roleName.toLowerCase()];
  const requiredPriority = roleNameToPriority[minRole.toLowerCase()];

  if (userPriority === undefined || requiredPriority === undefined) {
    logger.warn('Unknown role in priority check', {
      userRole: req.user.roleName,
      requiredRole: minRole,
    });
    return false;
  }

  // Higher priority number = higher privilege
  return userPriority >= requiredPriority;
}

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

/**
 * Create a middleware that requires specific permission
 *
 * Factory function for permission checking middleware.
 *
 * @param {string} resource - Resource name (e.g., 'customers')
 * @param {string} action - Action name (e.g., 'read', 'create')
 * @returns {Function} Express middleware
 */
function createPermissionCheck(resource, action) {
  const PermissionsLoader = require('../config/permissions-loader');
  const ResponseFormatter = require('../utils/response-formatter');

  return (req, res, next) => {
    const context = getSecurityContext(req);

    if (!context) {
      return ResponseFormatter.unauthorized(res);
    }

    const hasPermission = PermissionsLoader.hasPermission(
      context.roleName,
      resource,
      action,
    );

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: context.userId,
        role: context.roleName,
        resource,
        action,
      });
      return ResponseFormatter.forbidden(res, `No ${action} permission for ${resource}`);
    }

    next();
  };
}

module.exports = {
  // Request helpers
  getClientIp,
  getUserAgent,

  // Authentication helpers
  getSecurityContext,
  hasDbUser,
  hasRole,
  hasMinimumRole,

  // Middleware utilities
  asyncHandler,
  createPermissionCheck,
};
