/**
 * Role Hierarchy Loader
 *
 * ============================================================================
 * SSOT ARCHITECTURE: Database roles.priority is the TRUE source of truth
 * ============================================================================
 *
 * This module provides role hierarchy data for the permission system.
 *
 * IN PRODUCTION:
 *   - Reads from database `roles` table at server startup
 *   - Caches in memory for O(1) permission checks during request handling
 *   - Database is the SSOT for role priorities
 *
 * IN TESTS / BEFORE DB IS READY:
 *   - Falls back to role-definitions.js (bootstrap constants)
 *   - These constants MUST match the database seed data
 *   - See: backend/seeds/seed-data.sql for canonical values
 *
 * INITIALIZATION:
 *   - Call `initializeFromDatabase()` at server startup (after DB is ready)
 *   - For tests, `initializeFromFallback()` uses bootstrap constants
 *   - Module auto-falls back if DB initialization hasn't happened
 *
 * @module config/role-hierarchy-loader
 */

const { logger } = require('./logger');

// Fallback constants (used for tests and before DB initialization)
const {
  ROLE_HIERARCHY: FALLBACK_ROLE_HIERARCHY,
  ROLE_PRIORITY_TO_NAME: FALLBACK_ROLE_PRIORITY_TO_NAME,
  ROLE_NAME_TO_PRIORITY: FALLBACK_ROLE_NAME_TO_PRIORITY,
  ROLE_DESCRIPTIONS: FALLBACK_ROLE_DESCRIPTIONS,
} = require('./role-definitions');

// ============================================================================
// Module State
// ============================================================================

/** @type {boolean} Whether we've initialized from DB (production path) */
let isInitializedFromDB = false;

/** @type {boolean} Whether we're in fallback mode (tests/pre-DB) */
let isUsingFallback = false;

/** @type {string[]} Role names in priority order (lowest to highest) */
let roleHierarchy = null;

/** @type {Object<number, string>} Map from priority number → role name */
let rolePriorityToName = null;

/** @type {Object<string, number>} Map from role name → priority number */
let roleNameToPriority = null;

/** @type {Object<string, string>} Map from role name → description */
let roleDescriptions = null;

// ============================================================================
// Initialization Functions
// ============================================================================

/**
 * Initialize role hierarchy from database (PRODUCTION PATH)
 * Call this at server startup AFTER database connection is established.
 *
 * @param {Object} db - Database connection module with query() method
 * @returns {Promise<boolean>} True if initialization succeeded
 * @throws {Error} If database query fails
 */
async function initializeFromDatabase(db) {
  try {
    const result = await db.query(`
      SELECT name, priority, description 
      FROM roles 
      WHERE is_active = true 
      ORDER BY priority ASC
    `);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('No active roles found in database');
    }

    // Build derived structures from DB data
    roleHierarchy = [];
    rolePriorityToName = {};
    roleNameToPriority = {};
    roleDescriptions = {};

    for (const row of result.rows) {
      const name = row.name.toLowerCase();
      const priority = parseInt(row.priority, 10);

      roleHierarchy.push(name);
      rolePriorityToName[priority] = name;
      roleNameToPriority[name] = priority;
      roleDescriptions[name] = row.description || `${name} role`;
    }

    // Freeze for immutability
    roleHierarchy = Object.freeze(roleHierarchy);
    rolePriorityToName = Object.freeze(rolePriorityToName);
    roleNameToPriority = Object.freeze(roleNameToPriority);
    roleDescriptions = Object.freeze(roleDescriptions);

    isInitializedFromDB = true;
    isUsingFallback = false;

    logger.info('[RoleHierarchy] Initialized from database:', {
      roles: roleHierarchy.length,
      hierarchy: roleHierarchy.join(' → '),
    });

    return true;
  } catch (error) {
    logger.error('[RoleHierarchy] Failed to initialize from database:', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Initialize role hierarchy from fallback constants (TESTS/DEV PATH)
 * Use this for unit tests that don't have a database connection.
 *
 * @returns {boolean} Always true
 */
function initializeFromFallback() {
  roleHierarchy = FALLBACK_ROLE_HIERARCHY;
  rolePriorityToName = FALLBACK_ROLE_PRIORITY_TO_NAME;
  roleNameToPriority = FALLBACK_ROLE_NAME_TO_PRIORITY;
  roleDescriptions = FALLBACK_ROLE_DESCRIPTIONS;

  isInitializedFromDB = false;
  isUsingFallback = true;

  if (process.env.NODE_ENV !== 'test') {
    logger.warn('[RoleHierarchy] Using FALLBACK constants (not from database)');
  }

  return true;
}

/**
 * Clear cached data (for tests that need to reset state)
 */
function clearCache() {
  isInitializedFromDB = false;
  isUsingFallback = false;
  roleHierarchy = null;
  rolePriorityToName = null;
  roleNameToPriority = null;
  roleDescriptions = null;
}

// ============================================================================
// Accessor Functions (Lazy initialization with fallback)
// ============================================================================

/**
 * Ensure role data is loaded (fallback if not initialized)
 * @private
 */
function ensureInitialized() {
  if (roleHierarchy === null) {
    // Auto-fallback for tests or code that runs before DB initialization
    initializeFromFallback();
  }
}

/**
 * Get role hierarchy array (lowest to highest priority)
 * @returns {string[]} ['customer', 'technician', 'dispatcher', 'manager', 'admin']
 */
function getRoleHierarchy() {
  ensureInitialized();
  return roleHierarchy;
}

/**
 * Get priority-to-name map
 * @returns {Object<number, string>} { 1: 'customer', 2: 'technician', ... }
 */
function getRolePriorityToName() {
  ensureInitialized();
  return rolePriorityToName;
}

/**
 * Get name-to-priority map
 * @returns {Object<string, number>} { customer: 1, technician: 2, ... }
 */
function getRoleNameToPriority() {
  ensureInitialized();
  return roleNameToPriority;
}

/**
 * Get role descriptions map
 * @returns {Object<string, string>} { admin: 'Full system access...', ... }
 */
function getRoleDescriptions() {
  ensureInitialized();
  return roleDescriptions;
}

/**
 * Get role priority by name (case-insensitive)
 * @param {string} roleName - Role name
 * @returns {number|null} Priority or null if not found
 */
function getRolePriority(roleName) {
  if (!roleName || typeof roleName !== 'string') {
    return null;
  }
  ensureInitialized();
  return roleNameToPriority[roleName.toLowerCase()] || null;
}

/**
 * Get role name by priority
 * @param {number} priority - Role priority
 * @returns {string|null} Role name or null if not found
 */
function getRoleByPriority(priority) {
  ensureInitialized();
  return rolePriorityToName[priority] || null;
}

/**
 * Check initialization status
 * @returns {{ isFromDB: boolean, isFallback: boolean, isReady: boolean }}
 */
function getStatus() {
  return {
    isFromDB: isInitializedFromDB,
    isFallback: isUsingFallback,
    isReady: roleHierarchy !== null,
  };
}

module.exports = {
  // Initialization
  initializeFromDatabase,
  initializeFromFallback,
  clearCache,

  // Accessors (lazy init with fallback)
  getRoleHierarchy,
  getRolePriorityToName,
  getRoleNameToPriority,
  getRoleDescriptions,
  getRolePriority,
  getRoleByPriority,

  // Status
  getStatus,
};
