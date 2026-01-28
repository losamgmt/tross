/**
 * Permission Deriver
 *
 * SINGLE SOURCE OF TRUTH: Derives all permissions from entity metadata.
 * No separate permissions.json required - everything comes from:
 *   1. Database `roles` table (via role-hierarchy-loader.js) - role hierarchy
 *   2. backend/config/models/*-metadata.js - entity permissions
 *
 * ROLE HIERARCHY SSOT:
 *   - In production: Loaded from database at server startup
 *   - In tests: Falls back to role-definitions.js (bootstrap constants)
 *   - See: config/role-hierarchy-loader.js for initialization details
 *
 * This eliminates drift between metadata and permissions config.
 * Change metadata → permissions change automatically.
 *
 * @module config/permissions-deriver
 */

const {
  getRoleHierarchy,
  getRolePriorityToName,
  getRoleDescriptions,
} = require('./role-hierarchy-loader');

// Cache for derived permissions (computed once, reused)
let cachedPermissions = null;

// Synthetic resources not backed by entity metadata
// These are UI navigation resources or system resources
const SYNTHETIC_RESOURCES = {
  audit_logs: {
    description: 'System audit trail and security events',
    rlsPolicy: {
      customer: 'deny_all',
      technician: 'deny_all',
      dispatcher: 'deny_all',
      manager: 'deny_all',
      admin: 'all_records',
    },
    // Entity-level permissions (no fieldAccess to derive from)
    entityPermissions: {
      create: 'customer', // System auto-creates
      read: 'admin',
      update: 'admin',
      delete: 'admin',
    },
  },
  dashboard: {
    description: 'Main dashboard view - role-driven overview',
    rlsPolicy: {
      customer: 'own_record_only',
      technician: 'own_record_only',
      dispatcher: 'all_records',
      manager: 'all_records',
      admin: 'all_records',
    },
    entityPermissions: {
      create: 'admin',
      read: 'customer',
      update: 'admin',
      delete: 'admin',
    },
  },
  admin_panel: {
    description: 'Admin control center - system health, sessions, audit logs',
    rlsPolicy: {
      customer: 'deny_all',
      technician: 'deny_all',
      dispatcher: 'deny_all',
      manager: 'deny_all',
      admin: 'all_records',
    },
    entityPermissions: {
      create: 'admin',
      read: 'admin',
      update: 'admin',
      delete: 'admin',
    },
  },
  system_settings: {
    description: 'System-wide configuration (maintenance mode, feature flags)',
    rlsPolicy: {
      customer: 'deny_all',
      technician: 'deny_all',
      dispatcher: 'deny_all',
      manager: 'deny_all',
      admin: 'all_records',
    },
    entityPermissions: {
      create: 'admin',
      read: 'admin',
      update: 'admin',
      delete: 'admin',
    },
  },
};

/**
 * Get role priority from role name
 * @param {string} roleName - Role name (e.g., 'admin', 'customer')
 * @returns {number} Priority (1-5), or 0 if invalid
 */
function getRolePriorityFromName(roleName) {
  if (!roleName || roleName === 'none') {
    return 0;
  }
  const hierarchy = getRoleHierarchy();
  const index = hierarchy.indexOf(roleName.toLowerCase());
  return index >= 0 ? index + 1 : 0;
}

/**
 * Derive minimum role for CRUD operation from fieldAccess
 *
 * Logic: The minimum role that can perform an operation on ANY field
 * is the minimum role for the entire entity.
 *
 * @param {Object} fieldAccess - Field access map from metadata
 * @param {string} operation - 'create', 'read', 'update', 'delete'
 * @returns {string} Minimum role name (e.g., 'customer', 'admin')
 */
function deriveMinimumRole(fieldAccess, operation) {
  if (!fieldAccess || Object.keys(fieldAccess).length === 0) {
    return 'admin'; // No fieldAccess defined = admin only
  }

  let minPriority = Infinity;
  let minRole = 'admin';

  for (const fieldConfig of Object.values(fieldAccess)) {
    // Skip non-object values or malformed entries
    if (!fieldConfig || typeof fieldConfig !== 'object') {
      continue;
    }

    const roleName = fieldConfig[operation];
    if (!roleName || roleName === 'none') {
      continue;
    }

    const priority = getRolePriorityFromName(roleName);
    if (priority > 0 && priority < minPriority) {
      minPriority = priority;
      minRole = roleName;
    }
  }

  return minRole;
}

/**
 * Build roles configuration from role hierarchy (loaded from DB in production)
 * @returns {Object} Roles object matching permissions.json format
 */
function buildRolesConfig() {
  const priorityToName = getRolePriorityToName();
  const descriptions = getRoleDescriptions();
  const roles = {};
  for (const [priority, roleName] of Object.entries(priorityToName)) {
    roles[roleName] = {
      priority: parseInt(priority, 10),
      description: descriptions[roleName] || `${roleName} role`,
    };
  }
  return roles;
}

/**
 * Build resource configuration from entity metadata
 * @param {Object} metadata - Entity metadata
 * @param {string} resourceName - Resource name (rlsResource)
 * @returns {Object} Resource config matching permissions.json format
 */
function buildResourceConfig(metadata, resourceName) {
  const { fieldAccess, rlsPolicy, entityPermissions } = metadata;

  // Standard CRUD operations (always derived or overridden)
  const standardOps = ['create', 'read', 'update', 'delete'];
  const permissions = {};

  for (const op of standardOps) {
    // Use entityPermissions override if provided, else derive from fieldAccess
    let minRole;
    let description;

    // Check for explicit entityPermissions
    if (entityPermissions && op in entityPermissions) {
      const permValue = entityPermissions[op];

      // null or 'none' means operation is disabled (system-only)
      if (permValue === null || permValue === 'none') {
        // Use special marker: priority 0 means "no one can access via API"
        permissions[op] = {
          minimumRole: null,
          minimumPriority: 0,
          description: `Operation disabled - ${op} is system-only (not available via API)`,
          disabled: true,
        };
        continue;
      }

      minRole = permValue;
      description = `Entity-level override - ${op} requires ${minRole}`;
    } else {
      minRole = deriveMinimumRole(fieldAccess, op);
      description = `Derived from fieldAccess - minimum role for ${op}`;
    }

    const priority = getRolePriorityFromName(minRole);

    permissions[op] = {
      minimumRole: minRole,
      minimumPriority: priority,
      description,
    };
  }

  // Add any custom operations from entityPermissions (beyond CRUD)
  if (entityPermissions) {
    for (const [op, minRole] of Object.entries(entityPermissions)) {
      if (!standardOps.includes(op)) {
        const priority = getRolePriorityFromName(minRole);
        permissions[op] = {
          minimumRole: minRole,
          minimumPriority: priority,
          description: `Custom operation - ${op} requires ${minRole}`,
        };
      }
    }
  }

  // Build navVisibility (for UI navigation filtering)
  // If explicit navVisibility provided, use it; otherwise fall back to read permission
  let navVisibility = null;
  if (metadata.navVisibility) {
    const navRole = metadata.navVisibility;
    const navPriority = getRolePriorityFromName(navRole);
    navVisibility = {
      minimumRole: navRole,
      minimumPriority: navPriority,
      description: 'Explicit navVisibility - minimum role to see in nav menus',
    };
  } else if (permissions.read && !permissions.read.disabled) {
    // Fall back to read permission for nav visibility
    navVisibility = {
      minimumRole: permissions.read.minimumRole,
      minimumPriority: permissions.read.minimumPriority,
      description: 'Derived from read permission - nav visibility follows read access',
    };
  }

  return {
    description: metadata.description || `${resourceName} resource`,
    rowLevelSecurity: rlsPolicy || {},
    permissions,
    navVisibility,
  };
}

/**
 * Build synthetic resource configuration
 * @param {string} resourceName - Resource name
 * @param {Object} config - Synthetic resource config
 * @returns {Object} Resource config matching permissions.json format
 */
function buildSyntheticResourceConfig(resourceName, config) {
  const permissions = {};

  for (const [op, minRole] of Object.entries(config.entityPermissions)) {
    const priority = getRolePriorityFromName(minRole);
    permissions[op] = {
      minimumRole: minRole,
      minimumPriority: priority,
      description: `Synthetic resource - ${op} permission`,
    };
  }

  // For synthetic resources, nav visibility follows read permission
  // (or explicit navVisibility if defined on the synthetic resource)
  const readPerm = permissions.read;
  const navVisibility = config.navVisibility
    ? {
      minimumRole: config.navVisibility,
      minimumPriority: getRolePriorityFromName(config.navVisibility),
      description: 'Explicit navVisibility for synthetic resource',
    }
    : readPerm
      ? {
        minimumRole: readPerm.minimumRole,
        minimumPriority: readPerm.minimumPriority,
        description: 'Derived from read permission - nav visibility follows read access',
      }
      : null;

  return {
    description: config.description,
    rowLevelSecurity: config.rlsPolicy,
    permissions,
    navVisibility,
  };
}

/**
 * Derive complete permissions configuration from metadata
 * This replaces the need for config/permissions.json
 *
 * @param {boolean} forceReload - Force re-derivation (ignore cache)
 * @returns {Object} Complete permissions config
 */
function derivePermissions(forceReload = false) {
  if (cachedPermissions && !forceReload) {
    return cachedPermissions;
  }

  // Load all entity metadata
  const allMetadata = require('./models');

  // Build roles from constants
  const roles = buildRolesConfig();

  // Build resources from entity metadata
  const resources = {};

  for (const [entityName, metadata] of Object.entries(allMetadata)) {
    // Skip entities without rlsResource (like file_attachments)
    // They're handled specially or use parent entity permissions
    const resourceName = metadata.rlsResource;
    if (!resourceName) {
      // Still add if it has an rlsPolicy (like file_attachments)
      if (metadata.rlsPolicy) {
        // Use table name as resource for polymorphic entities
        const polyResourceName = metadata.tableName || entityName;
        resources[polyResourceName] = buildResourceConfig(metadata, polyResourceName);
      }
      continue;
    }

    resources[resourceName] = buildResourceConfig(metadata, resourceName);
  }

  // Add synthetic resources (dashboard, admin_panel, etc.)
  for (const [resourceName, config] of Object.entries(SYNTHETIC_RESOURCES)) {
    resources[resourceName] = buildSyntheticResourceConfig(resourceName, config);
  }

  // Build complete config
  cachedPermissions = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://trossapp.com/schemas/permissions.json',
    title: 'TrossApp Permission Configuration (DERIVED)',
    description: 'Auto-derived from entity metadata - DO NOT EDIT MANUALLY',
    version: '4.0.0-derived',
    lastModified: new Date().toISOString().split('T')[0],
    roles,
    resources,
  };

  return cachedPermissions;
}

/**
 * Clear the cache (useful for tests or hot-reload)
 */
function clearCache() {
  cachedPermissions = null;
}

module.exports = {
  derivePermissions,
  deriveMinimumRole,
  getRolePriorityFromName,
  buildRolesConfig,
  buildResourceConfig,
  clearCache,
  SYNTHETIC_RESOURCES,
  // Re-export accessor for backwards compatibility (consumers should migrate to role-hierarchy-loader)
  getRoleDescriptions,
};
