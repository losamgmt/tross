/**
 * Permission Configuration Loader
 *
 * ARCHITECTURE v4.0: Derives permissions from entity metadata
 * No more permissions.json file - single source of truth is metadata!
 *
 * BENEFITS:
 * - Change metadata → permissions change automatically
 * - Zero drift between metadata and permissions
 * - No manual sync scripts required
 * - Frontend fetches from API (same derived data)
 */

const { logger } = require("./logger");
const { derivePermissions, clearCache } = require("./permissions-deriver");

// Cached permission data (derived from metadata)
let permissionCache = null;

/**
 * Load permissions derived from entity metadata
 * @param {boolean} forceReload - Force re-derivation (clear cache)
 * @returns {Object} Validated permission configuration
 * @throws {Error} If derivation fails
 */
function loadPermissions(forceReload = false) {
  try {
    // Return cache if valid and not forcing reload
    if (!forceReload && permissionCache) {
      return permissionCache;
    }

    // Clear deriver cache if forcing reload
    if (forceReload) {
      clearCache();
    }

    // Derive permissions from entity metadata
    const config = derivePermissions(forceReload);

    // Validate structure (still validate derived config)
    validatePermissionConfig(config);

    // Cache and return
    permissionCache = config;

    // Log initialization info (logger respects test silence)
    if (process.env.NODE_ENV !== "test") {
      logger.info("[Permissions] Derived from metadata:", {
        roles: Object.keys(config.roles).length,
        resources: Object.keys(config.resources).length,
      });
    }

    return config;
  } catch (error) {
    logger.error("[Permissions] Failed to derive:", { error: error.message });
    throw new Error(`Permission derivation error: ${error.message}`);
  }
}

/**
 * Validate permission configuration structure
 * @param {Object} config - Permission configuration object
 * @throws {Error} If validation fails
 */
function validatePermissionConfig(config) {
  // Check required top-level keys
  if (!config.roles || typeof config.roles !== "object") {
    throw new Error('Missing or invalid "roles" object');
  }
  if (!config.resources || typeof config.resources !== "object") {
    throw new Error('Missing or invalid "resources" object');
  }

  // Validate roles
  const roleNames = Object.keys(config.roles);
  if (roleNames.length === 0) {
    throw new Error("At least one role must be defined");
  }

  const priorities = new Set();
  for (const [roleName, roleConfig] of Object.entries(config.roles)) {
    if (typeof roleConfig.priority !== "number" || roleConfig.priority < 1) {
      throw new Error(`Invalid priority for role "${roleName}"`);
    }
    if (priorities.has(roleConfig.priority)) {
      throw new Error(
        `Duplicate priority ${roleConfig.priority} - each role must have unique priority`,
      );
    }
    priorities.add(roleConfig.priority);
  }

  // Validate resources
  const resourceNames = Object.keys(config.resources);
  if (resourceNames.length === 0) {
    throw new Error("At least one resource must be defined");
  }

  for (const [resourceName, resourceConfig] of Object.entries(
    config.resources,
  )) {
    if (
      !resourceConfig.permissions ||
      typeof resourceConfig.permissions !== "object"
    ) {
      throw new Error(`Missing permissions for resource "${resourceName}"`);
    }

    // Validate CRUD operations
    const operations = ["create", "read", "update", "delete"];
    for (const op of operations) {
      if (!resourceConfig.permissions[op]) {
        throw new Error(
          `Missing "${op}" permission for resource "${resourceName}"`,
        );
      }

      const permission = resourceConfig.permissions[op];
      if (typeof permission.minimumPriority !== "number") {
        throw new Error(`Invalid minimumPriority for ${resourceName}.${op}`);
      }

      // Handle disabled operations (minimumRole: null, minimumPriority: 0)
      if (permission.disabled === true) {
        if (
          permission.minimumPriority !== 0 ||
          permission.minimumRole !== null
        ) {
          throw new Error(
            `Invalid disabled operation for ${resourceName}.${op}: ` +
              "expected minimumPriority=0 and minimumRole=null",
          );
        }
        continue; // Skip further validation for disabled operations
      }

      if (!permission.minimumRole || !config.roles[permission.minimumRole]) {
        throw new Error(
          `Invalid minimumRole "${permission.minimumRole}" for ${resourceName}.${op}`,
        );
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

  // Validation passed - no need to log (reduce noise)
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

  for (const [resourceName, resourceConfig] of Object.entries(
    config.resources,
  )) {
    matrix[resourceName] = {};
    for (const [operation, permission] of Object.entries(
      resourceConfig.permissions,
    )) {
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
  if (!roleName || typeof roleName !== "string") {
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

  // Priority 0 means operation is disabled (system-only, no API access)
  if (requiredPriority === 0) {
    return false;
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
 * Reload permissions (re-derive from metadata)
 * @returns {Object} New permission configuration
 */
function reloadPermissions() {
  logger.info("[Permissions] Re-deriving from metadata...");
  permissionCache = null; // Clear local cache
  return loadPermissions(true);
}

// Derive permissions on module import (fail-fast if invalid)
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
  getRLSRule: getRowLevelSecurity, // Alias for clarity
  reloadPermissions,

  // Legacy compatibility (for gradual migration)
  ROLE_HIERARCHY: getRoleHierarchy(),
  PERMISSIONS: getPermissionMatrix(),
};
