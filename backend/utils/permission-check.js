/**
 * Permission Check Utility
 *
 * Provides O(1) permission checks using role priority numbers.
 * Delegates to permissions-loader for the actual permission matrix.
 *
 * SRP: ONLY provides convenience wrappers around permissions-loader.
 * Does NOT duplicate logic - uses existing hasPermission/hasMinimumRole.
 *
 * USAGE:
 *   const { canAccess, is } = require('../utils/permission-check');
 *
 *   // Check specific permission
 *   if (canAccess(req.dbUser, 'users', 'create')) { ... }
 *
 *   // Quick role check
 *   if (is.admin(req.dbUser)) { ... }
 */

const {
  getRolePriority,
  hasPermission,
  hasMinimumRole: loaderHasMinimumRole,
} = require("../config/permissions-loader");

/**
 * Get user's priority from user object
 * Supports both role_priority (preferred) and role name lookup
 *
 * @param {Object} user - User object with role or role_priority
 * @returns {number} Priority (1-5) or 0 if unknown
 */
function getUserPriority(user) {
  if (!user) {
    return 0;
  }

  // Prefer explicit role_priority (O(1) - no lookup needed)
  if (typeof user.role_priority === "number") {
    return user.role_priority;
  }

  // Fallback to role name lookup via permissions-loader
  return getRolePriority(user.role) ?? 0;
}

/**
 * Check if user can perform operation on resource
 * Delegates to permissions-loader.hasPermission
 *
 * @param {Object} user - User object with role or role_priority
 * @param {string} resource - Resource name (e.g., 'users', 'work_orders')
 * @param {string} operation - CRUD operation ('create', 'read', 'update', 'delete')
 * @returns {boolean} True if user has permission
 */
function canAccess(user, resource, operation) {
  if (!user?.role) {
    return false;
  }
  return hasPermission(user.role, resource, operation);
}

/**
 * Check if user meets minimum role requirement
 * Delegates to permissions-loader.hasMinimumRole
 *
 * @param {Object} user - User object with role or role_priority
 * @param {string} minimumRole - Minimum required role name
 * @returns {boolean} True if user meets requirement
 */
function hasMinimumRoleCheck(user, minimumRole) {
  if (!user?.role) {
    return false;
  }
  return loaderHasMinimumRole(user.role, minimumRole);
}

/**
 * Quick role checks - most common patterns
 * All functions return boolean
 *
 * @example
 *   if (is.admin(req.dbUser)) { ... }
 *   if (is.managerOrAbove(req.dbUser)) { ... }
 */
const is = {
  /** Check if user is admin (priority >= 5) */
  admin: (user) => getUserPriority(user) >= 5,

  /** Check if user is manager or above (priority >= 4) */
  managerOrAbove: (user) => getUserPriority(user) >= 4,

  /** Check if user is dispatcher or above (priority >= 3) */
  dispatcherOrAbove: (user) => getUserPriority(user) >= 3,

  /** Check if user is technician or above (priority >= 2) */
  technicianOrAbove: (user) => getUserPriority(user) >= 2,

  /** Check if user is authenticated with any role (priority >= 1) */
  authenticated: (user) => getUserPriority(user) >= 1,

  /** Check exact role match (case-insensitive) */
  role: (user, roleName) => {
    if (!user?.role || !roleName) {
      return false;
    }
    return user.role.toLowerCase() === roleName.toLowerCase();
  },
};

module.exports = {
  // Core functions
  getUserPriority,
  canAccess,
  hasMinimumRole: hasMinimumRoleCheck,

  // Quick checks
  is,
};
