/**
 * Permission Configuration Loader
 *
 * Dynamically loads permissions from config/permissions.json
 * Provides runtime validation and hot-reload capability
 *
 * BENEFITS:
 * - Change permissions without code changes
 * - Single source of truth shared with frontend
 * - Runtime validation prevents invalid configs
 * - Hot-reload during development
 */

const fs = require('fs');
const path = require('path');

// Path to shared permission config
const PERMISSIONS_CONFIG_PATH = path.join(__dirname, '../../config/permissions.json');

// Cached permission data
let permissionCache = null;
let lastModified = null;

/**
 * Load and validate permissions from JSON file
 * @param {boolean} forceReload - Skip cache and reload from file
 * @returns {Object} Validated permission configuration
 * @throws {Error} If config file is invalid or missing
 */
function loadPermissions(forceReload = false) {
  try {
    // Check if file was modified (for hot-reload)
    const stats = fs.statSync(PERMISSIONS_CONFIG_PATH);
    const fileModified = stats.mtime.getTime();

    // Return cache if valid
    if (!forceReload && permissionCache && lastModified === fileModified) {
      return permissionCache;
    }

    // Load and parse JSON
    const rawData = fs.readFileSync(PERMISSIONS_CONFIG_PATH, 'utf8');
    const config = JSON.parse(rawData);

    // Validate structure
    validatePermissionConfig(config);

    // Cache and return
    permissionCache = config;
    lastModified = fileModified;

    console.log('[Permissions] ✅ Loaded permission config from', PERMISSIONS_CONFIG_PATH);
    console.log('[Permissions] 📊 Roles:', Object.keys(config.roles).length);
    console.log('[Permissions] 📊 Resources:', Object.keys(config.resources).length);

    return config;
  } catch (error) {
    console.error('[Permissions] ❌ Failed to load permissions:', error.message);
    throw new Error(`Permission config error: ${error.message}`);
  }
}

/**
 * Validate permission configuration structure
 * @param {Object} config - Permission configuration object
 * @throws {Error} If validation fails
 */
function validatePermissionConfig(config) {
  // Check required top-level keys
  if (!config.roles || typeof config.roles !== 'object') {
    throw new Error('Missing or invalid "roles" object');
  }
  if (!config.resources || typeof config.resources !== 'object') {
    throw new Error('Missing or invalid "resources" object');
  }

  // Validate roles
  const roleNames = Object.keys(config.roles);
  if (roleNames.length === 0) {
    throw new Error('At least one role must be defined');
  }

  const priorities = new Set();
  for (const [roleName, roleConfig] of Object.entries(config.roles)) {
    if (typeof roleConfig.priority !== 'number' || roleConfig.priority < 1) {
      throw new Error(`Invalid priority for role "${roleName}"`);
    }
    if (priorities.has(roleConfig.priority)) {
      throw new Error(`Duplicate priority ${roleConfig.priority} - each role must have unique priority`);
    }
    priorities.add(roleConfig.priority);
  }

  // Validate resources
  const resourceNames = Object.keys(config.resources);
  if (resourceNames.length === 0) {
    throw new Error('At least one resource must be defined');
  }

  for (const [resourceName, resourceConfig] of Object.entries(config.resources)) {
    if (!resourceConfig.permissions || typeof resourceConfig.permissions !== 'object') {
      throw new Error(`Missing permissions for resource "${resourceName}"`);
    }

    // Validate CRUD operations
    const operations = ['create', 'read', 'update', 'delete'];
    for (const op of operations) {
      if (!resourceConfig.permissions[op]) {
        throw new Error(`Missing "${op}" permission for resource "${resourceName}"`);
      }

      const permission = resourceConfig.permissions[op];
      if (typeof permission.minimumPriority !== 'number') {
        throw new Error(`Invalid minimumPriority for ${resourceName}.${op}`);
      }

      if (!permission.minimumRole || !config.roles[permission.minimumRole]) {
        throw new Error(`Invalid minimumRole "${permission.minimumRole}" for ${resourceName}.${op}`);
      }

      // Verify priority matches role
      const expectedPriority = config.roles[permission.minimumRole].priority;
      if (permission.minimumPriority !== expectedPriority) {
        throw new Error(
          `Priority mismatch for ${resourceName}.${op}: ` +
          `minimumPriority=${permission.minimumPriority} but ` +
          `role "${permission.minimumRole}" has priority=${expectedPriority}`,
        );
      }
    }
  }

  console.log('[Permissions] ✅ Configuration validation passed');
}

/**
 * Get role hierarchy map
 * @returns {Object} Map of role name → priority
 */
function getRoleHierarchy() {
  const config = loadPermissions();
  const hierarchy = {};
  for (const [roleName, roleConfig] of Object.entries(config.roles)) {
    hierarchy[roleName] = roleConfig.priority;
  }
  return hierarchy;
}

/**
 * Get permission matrix
 * @returns {Object} Map of resource → operation → minimumPriority
 */
function getPermissionMatrix() {
  const config = loadPermissions();
  const matrix = {};

  for (const [resourceName, resourceConfig] of Object.entries(config.resources)) {
    matrix[resourceName] = {};
    for (const [operation, permission] of Object.entries(resourceConfig.permissions)) {
      matrix[resourceName][operation] = permission.minimumPriority;
    }
  }

  return matrix;
}

/**
 * Get role priority by name
 * @param {string} roleName - Role name (case-insensitive)
 * @returns {number|null} Role priority or null if not found
 */
function getRolePriority(roleName) {
  if (!roleName || typeof roleName !== 'string') {
    return null;
  }

  const hierarchy = getRoleHierarchy();
  const normalized = roleName.toLowerCase();

  return hierarchy[normalized] || null;
}

/**
 * Check if role has permission for operation on resource
 * @param {string} roleName - User's role name
 * @param {string} resource - Resource name (e.g., 'users', 'work_orders')
 * @param {string} operation - CRUD operation ('create', 'read', 'update', 'delete')
 * @returns {boolean} True if role has permission
 */
function hasPermission(roleName, resource, operation) {
  const userPriority = getRolePriority(roleName);
  if (userPriority === null) {
    return false; // Unknown role = no permission
  }

  const matrix = getPermissionMatrix();
  const resourcePermissions = matrix[resource];
  if (!resourcePermissions) {
    return false; // Unknown resource = no permission
  }

  const requiredPriority = resourcePermissions[operation];
  if (requiredPriority === undefined) {
    return false; // Unknown operation = no permission
  }

  // User must have priority >= required priority
  return userPriority >= requiredPriority;
}

/**
 * Get minimum role required for operation
 * @param {string} resource - Resource name
 * @param {string} operation - CRUD operation
 * @returns {string|null} Minimum role name or null if not found
 */
function getMinimumRole(resource, operation) {
  const config = loadPermissions();
  const resourceConfig = config.resources[resource];

  if (!resourceConfig || !resourceConfig.permissions[operation]) {
    return null;
  }

  return resourceConfig.permissions[operation].minimumRole;
}

/**
 * Check if user role meets minimum role requirement
 * @param {string} userRole - User's role name
 * @param {string} requiredRole - Required role name
 * @returns {boolean} True if user role >= required role
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
 * Get row-level security policy for role and resource
 * @param {string} roleName - User's role name
 * @param {string} resource - Resource name
 * @returns {string|null} RLS policy ('own_record_only', 'all_records', etc.) or null
 */
function getRowLevelSecurity(roleName, resource) {
  const config = loadPermissions();
  const resourceConfig = config.resources[resource];

  if (!resourceConfig || !resourceConfig.rowLevelSecurity) {
    return null; // No RLS defined
  }

  const normalized = roleName.toLowerCase();
  return resourceConfig.rowLevelSecurity[normalized] || null;
}

/**
 * Reload permissions from disk (useful for hot-reload)
 * @returns {Object} New permission configuration
 */
function reloadPermissions() {
  console.log('[Permissions] 🔄 Hot-reloading permissions...');
  return loadPermissions(true);
}

// Load permissions on module import (fail-fast if invalid)
loadPermissions();

module.exports = {
  loadPermissions,
  getRoleHierarchy,
  getPermissionMatrix,
  getRolePriority,
  hasPermission,
  hasMinimumRole,
  getMinimumRole,
  getRowLevelSecurity,
  reloadPermissions,

  // Legacy compatibility (for gradual migration)
  ROLE_HIERARCHY: getRoleHierarchy(),
  PERMISSIONS: getPermissionMatrix(),
};
