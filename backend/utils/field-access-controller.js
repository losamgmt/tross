/**
 * Field Access & Response Transform Utility
 *
 * SINGLE RESPONSIBILITY: Field-level CRUD permissions based on metadata
 *
 * This utility provides centralized, metadata-driven field access control.
 * Instead of hard-coding field visibility in routes, define it in metadata.
 *
 * Key concepts:
 * - Each field has CRUD permissions: { create, read, update, delete }
 * - Each permission specifies the MINIMUM role required ('none' = never allowed)
 * - Permissions accumulate UPWARD through role hierarchy
 * - Role hierarchy: SSOT from database (loaded at startup via role-hierarchy-loader)
 *
 * Usage:
 *   const { getFieldsForOperation, filterDataByRole } = require('../utils/field-access-controller');
 *
 *   // Get fields user can read
 *   const readableFields = getFieldsForOperation(metadata, 'dispatcher', 'read');
 *
 *   // Filter response data to only readable fields
 *   const sanitizedData = filterDataByRole(data, metadata, 'customer', 'read');
 */

const { UNIVERSAL_FIELD_ACCESS } = require("../config/constants");
const {
  getRoleHierarchy,
  getRolePriorityToName,
} = require("../config/role-hierarchy-loader");
const AppError = require("./app-error");

/**
 * Get the index of a role in the hierarchy (higher = more permissions)
 *
 * @param {string|number} role - Role name or priority number
 * @returns {number} Index in hierarchy (-1 if not found)
 */
function getRoleIndex(role) {
  const roleName = normalizeRoleName(role);
  const roleHierarchy = getRoleHierarchy();
  return roleHierarchy.indexOf(roleName);
}

/**
 * Normalize role to string name
 * Handles both role names ('customer') and role priority numbers (1)
 *
 * @param {string|number} role - Role name or priority
 * @returns {string} Role name (lowercase)
 */
function normalizeRoleName(role) {
  if (typeof role === "string") {
    return role.toLowerCase();
  }

  // Map priority numbers to role names (from DB-loaded hierarchy)
  const priorityToName = getRolePriorityToName();
  if (typeof role === "number" && priorityToName[role]) {
    return priorityToName[role];
  }

  return "customer"; // Default to lowest permission
}

/**
 * Check if a role has permission for an operation on a field
 *
 * @param {string|number} userRole - User's role name or priority
 * @param {string} requiredRole - Minimum role required for operation ('none' = never)
 * @returns {boolean} True if user has permission
 */
function hasFieldPermission(userRole, requiredRole) {
  // 'none' means no one can do this operation
  if (requiredRole === "none") {
    return false;
  }

  const userIndex = getRoleIndex(userRole);
  const requiredIndex = getRoleIndex(requiredRole);

  // User's role must be >= required role in hierarchy
  return userIndex >= requiredIndex;
}

/**
 * Get all fields a user can perform an operation on
 *
 * Combines UNIVERSAL_FIELD_ACCESS with entity-specific fieldAccess
 * Returns array of field names the user has permission for
 *
 * @param {Object} metadata - Entity metadata with fieldAccess config
 * @param {string|number} userRole - User's role name or priority
 * @param {string} operation - CRUD operation: 'create', 'read', 'update', 'delete'
 * @returns {Array<string>} Field names user can perform operation on
 */
function getFieldsForOperation(metadata, userRole, operation) {
  const allowedFields = [];

  // Combine universal + entity-specific field access
  const fieldAccess = {
    ...UNIVERSAL_FIELD_ACCESS,
    ...(metadata.fieldAccess || {}),
  };

  for (const [fieldName, permissions] of Object.entries(fieldAccess)) {
    const requiredRole = permissions[operation];
    if (requiredRole && hasFieldPermission(userRole, requiredRole)) {
      allowedFields.push(fieldName);
    }
  }

  return allowedFields;
}

/**
 * Check if a user can perform an operation on a specific field
 *
 * @param {Object} metadata - Entity metadata with fieldAccess config
 * @param {string|number} userRole - User's role name or priority
 * @param {string} fieldName - Field to check
 * @param {string} operation - CRUD operation: 'create', 'read', 'update', 'delete'
 * @returns {boolean} True if user has permission
 */
function canAccessField(metadata, userRole, fieldName, operation) {
  // Check entity-specific first, then universal
  const fieldAccess =
    metadata.fieldAccess?.[fieldName] || UNIVERSAL_FIELD_ACCESS[fieldName];

  if (!fieldAccess) {
    // Field not defined in access control - default to no access
    return false;
  }

  const requiredRole = fieldAccess[operation];
  return hasFieldPermission(userRole, requiredRole);
}

/**
 * Filter data to only include fields user can read
 *
 * @param {Object|Array} data - Single record or array of records
 * @param {Object} metadata - Entity metadata with fieldAccess config
 * @param {string|number} userRole - User's role name or priority
 * @param {string} [operation='read'] - CRUD operation (usually 'read' for responses)
 * @returns {Object|Array} Filtered data with only accessible fields
 */
function filterDataByRole(data, metadata, userRole, operation = "read") {
  const allowedFields = getFieldsForOperation(metadata, userRole, operation);
  const allowedSet = new Set(allowedFields);

  if (Array.isArray(data)) {
    return data.map((record) => pickFields(record, allowedSet));
  }

  return pickFields(data, allowedSet);
}

/**
 * Filter input data to only include fields user can write (create/update)
 *
 * @param {Object} data - Input data for create/update
 * @param {Object} metadata - Entity metadata with fieldAccess config
 * @param {string|number} userRole - User's role name or priority
 * @param {string} operation - 'create' or 'update'
 * @returns {Object} Filtered data with only writable fields
 */
function filterWritableFields(data, metadata, userRole, operation) {
  const allowedFields = getFieldsForOperation(metadata, userRole, operation);
  const allowedSet = new Set(allowedFields);

  return pickFields(data, allowedSet);
}

/**
 * Validate that user can perform operation on all provided fields
 * Throws error listing fields user cannot access
 *
 * @param {Object} data - Input data with fields to validate
 * @param {Object} metadata - Entity metadata with fieldAccess config
 * @param {string|number} userRole - User's role name or priority
 * @param {string} operation - CRUD operation
 * @throws {Error} If user cannot access any of the provided fields
 */
function validateFieldAccess(data, metadata, userRole, operation) {
  const disallowedFields = [];

  for (const fieldName of Object.keys(data)) {
    if (!canAccessField(metadata, userRole, fieldName, operation)) {
      disallowedFields.push(fieldName);
    }
  }

  if (disallowedFields.length > 0) {
    const roleName = normalizeRoleName(userRole);
    throw new AppError(
      `Access denied: Role '${roleName}' cannot ${operation} field(s): ${disallowedFields.join(", ")}`,
      403,
      "FORBIDDEN",
    );
  }
}

/**
 * Pick only specified fields from an object
 *
 * @param {Object} obj - Source object
 * @param {Set<string>} fieldSet - Set of fields to include
 * @returns {Object} New object with only specified fields
 */
function pickFields(obj, fieldSet) {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (fieldSet.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Omit specified fields from an object
 *
 * @param {Object} obj - Source object
 * @param {Array<string>} fields - Fields to exclude
 * @returns {Object} New object without specified fields
 */
function omitFields(obj, fields) {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const fieldsSet = new Set(fields);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!fieldsSet.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

module.exports = {
  // Core field access functions
  getFieldsForOperation,
  canAccessField,
  hasFieldPermission,
  validateFieldAccess,

  // Data filtering functions
  filterDataByRole,
  filterWritableFields,

  // Utility functions
  normalizeRoleName,
  getRoleIndex,
  pickFields,
  omitFields,
};
