/**
 * Role Definitions - SINGLE SOURCE OF TRUTH
 *
 * ARCHITECTURE: This file is the canonical source for all role-related constants.
 * All other files (constants.js, test-users.js, permissions-deriver.js) MUST
 * derive their role information from this file.
 *
 * NO IMPORTS ALLOWED - This file must be dependency-free to avoid circular imports.
 *
 * Role Hierarchy (lowest to highest priority):
 *   customer (1) → technician (2) → dispatcher (3) → manager (4) → admin (5)
 *
 * Permissions accumulate UPWARD - admin has all permissions of all lower roles.
 */

/**
 * Role definitions with priorities.
 * Priority determines the role hierarchy - higher priority = more permissions.
 * These match the database roles.priority values exactly.
 */
const ROLE_DEFINITIONS = Object.freeze({
  customer: { priority: 1, description: 'Basic access - can view own data and work orders' },
  technician: { priority: 2, description: 'Executes work orders, can view user list' },
  dispatcher: { priority: 3, description: 'Creates and assigns work orders' },
  manager: { priority: 4, description: 'Manages operations - can view roles, manage work orders' },
  admin: { priority: 5, description: 'Full system access - can manage users, roles, and all resources' },
});

/**
 * Role names as an object for constant lookup (e.g., USER_ROLES.ADMIN)
 * Derived from ROLE_DEFINITIONS - DO NOT maintain separately!
 */
const USER_ROLES = Object.freeze(
  Object.keys(ROLE_DEFINITIONS).reduce((acc, role) => {
    acc[role.toUpperCase()] = role;
    return acc;
  }, {}),
);

/**
 * Role hierarchy as array in ascending priority order
 * Used for permission inheritance checks
 * Derived from ROLE_DEFINITIONS - DO NOT maintain separately!
 */
const ROLE_HIERARCHY = Object.freeze(
  Object.entries(ROLE_DEFINITIONS)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([name]) => name),
);

/**
 * Map from priority number to role name
 * Used for fast lookup when we only have a priority
 * Derived from ROLE_DEFINITIONS - DO NOT maintain separately!
 */
const ROLE_PRIORITY_TO_NAME = Object.freeze(
  Object.entries(ROLE_DEFINITIONS).reduce((acc, [name, config]) => {
    acc[config.priority] = name;
    return acc;
  }, {}),
);

/**
 * Map from role name to priority number
 * Inverse of ROLE_PRIORITY_TO_NAME for fast lookup
 * Derived from ROLE_DEFINITIONS - DO NOT maintain separately!
 */
const ROLE_NAME_TO_PRIORITY = Object.freeze(
  Object.entries(ROLE_DEFINITIONS).reduce((acc, [name, config]) => {
    acc[name] = config.priority;
    return acc;
  }, {}),
);

/**
 * Role descriptions for documentation and UI
 * Derived from ROLE_DEFINITIONS - DO NOT maintain separately!
 */
const ROLE_DESCRIPTIONS = Object.freeze(
  Object.entries(ROLE_DEFINITIONS).reduce((acc, [name, config]) => {
    acc[name] = config.description;
    return acc;
  }, {}),
);

/**
 * Get role priority by name (case-insensitive)
 * @param {string} roleName - Role name
 * @returns {number|null} Priority or null if not found
 */
function getRolePriority(roleName) {
  if (!roleName || typeof roleName !== 'string') {
    return null;
  }
  return ROLE_NAME_TO_PRIORITY[roleName.toLowerCase()] || null;
}

/**
 * Get role name by priority
 * @param {number} priority - Role priority
 * @returns {string|null} Role name or null if not found
 */
function getRoleByPriority(priority) {
  return ROLE_PRIORITY_TO_NAME[priority] || null;
}

/**
 * Check if a role has at least the minimum required role
 * @param {string} userRole - User's role name
 * @param {string} requiredRole - Minimum required role name
 * @returns {boolean} True if user has sufficient permissions
 */
function hasMinimumRole(userRole, requiredRole) {
  const userPriority = getRolePriority(userRole);
  const requiredPriority = getRolePriority(requiredRole);

  if (userPriority === null || requiredPriority === null) {
    return false;
  }

  return userPriority >= requiredPriority;
}

/**
 * Validate that a role name exists
 * @param {string} roleName - Role name to validate
 * @returns {boolean} True if valid role
 */
function isValidRole(roleName) {
  return getRolePriority(roleName) !== null;
}

module.exports = {
  // Primary source of truth
  ROLE_DEFINITIONS,

  // Derived constants (for backwards compatibility)
  USER_ROLES,
  ROLE_HIERARCHY,
  ROLE_PRIORITY_TO_NAME,
  ROLE_NAME_TO_PRIORITY,
  ROLE_DESCRIPTIONS,

  // Helper functions
  getRolePriority,
  getRoleByPriority,
  hasMinimumRole,
  isValidRole,
};
