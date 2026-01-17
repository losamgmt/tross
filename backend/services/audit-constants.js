/**
 * Audit Constants
 *
 * SINGLE SOURCE OF TRUTH for all audit-related string constants.
 * NO MAGIC STRINGS - all audit actions, resource types, and results
 * MUST be defined here and imported where needed.
 *
 * DESIGN DECISIONS:
 * - Deactivate/Reactivate are UPDATE operations, not special actions.
 *   Setting is_active=false/true is logged as an UPDATE with oldValues/newValues.
 * - CRUD actions (create, update, delete) are derived from entity metadata.
 * - Special actions (e.g., invoice_paid, work_order_status_change) are explicit.
 * - EntityToResourceType and EntityActionMap are derived from metadata via derived-constants.js
 *
 * USAGE:
 *   const { AuditActions, ResourceTypes, AuditResults } = require('./audit-constants');
 *
 *   await auditService.log({
 *     action: AuditActions.CUSTOMER_CREATE,
 *     resourceType: ResourceTypes.CUSTOMER,
 *     result: AuditResults.SUCCESS,
 *     ...
 *   });
 */

const {
  getEntityToResourceType,
  getEntityActionMap,
  getResourceType,
  getAuditAction,
} = require('../config/derived-constants');

const AuditActions = {
  // ============================================================================
  // AUTHENTICATION ACTIONS
  // ============================================================================
  LOGIN: 'login',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  LOGOUT_ALL_DEVICES: 'logout_all_devices',
  ADMIN_REVOKE_SESSIONS: 'admin_revoke_sessions',
  TOKEN_REFRESH: 'token_refresh',
  PASSWORD_RESET: 'password_reset',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',

  // ============================================================================
  // USER MANAGEMENT ACTIONS
  // ============================================================================
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',

  // ============================================================================
  // ROLE MANAGEMENT ACTIONS
  // ============================================================================
  ROLE_CREATE: 'role_create',
  ROLE_UPDATE: 'role_update',
  ROLE_DELETE: 'role_delete',
  ROLE_ASSIGN: 'role_assign',
  ROLE_REMOVE: 'role_remove',
  ROLE_CHANGE: 'role_change',

  // ============================================================================
  // CUSTOMER MANAGEMENT ACTIONS
  // ============================================================================
  CUSTOMER_CREATE: 'customer_create',
  CUSTOMER_UPDATE: 'customer_update',
  CUSTOMER_DELETE: 'customer_delete',

  // ============================================================================
  // TECHNICIAN MANAGEMENT ACTIONS
  // ============================================================================
  TECHNICIAN_CREATE: 'technician_create',
  TECHNICIAN_UPDATE: 'technician_update',
  TECHNICIAN_DELETE: 'technician_delete',

  // ============================================================================
  // WORK ORDER MANAGEMENT ACTIONS
  // ============================================================================
  WORK_ORDER_CREATE: 'work_order_create',
  WORK_ORDER_UPDATE: 'work_order_update',
  WORK_ORDER_DELETE: 'work_order_delete',
  WORK_ORDER_ASSIGN: 'work_order_assign',
  WORK_ORDER_STATUS_CHANGE: 'work_order_status_change',

  // ============================================================================
  // INVOICE MANAGEMENT ACTIONS
  // ============================================================================
  INVOICE_CREATE: 'invoice_create',
  INVOICE_UPDATE: 'invoice_update',
  INVOICE_DELETE: 'invoice_delete',
  INVOICE_PAID: 'invoice_paid',
  INVOICE_VOIDED: 'invoice_voided',

  // ============================================================================
  // CONTRACT MANAGEMENT ACTIONS
  // ============================================================================
  CONTRACT_CREATE: 'contract_create',
  CONTRACT_UPDATE: 'contract_update',
  CONTRACT_DELETE: 'contract_delete',
  CONTRACT_ACTIVATED: 'contract_activated',
  CONTRACT_TERMINATED: 'contract_terminated',

  // ============================================================================
  // INVENTORY MANAGEMENT ACTIONS
  // ============================================================================
  INVENTORY_CREATE: 'inventory_create',
  INVENTORY_UPDATE: 'inventory_update',
  INVENTORY_DELETE: 'inventory_delete',
  INVENTORY_ADJUSTMENT: 'inventory_adjustment',
  INVENTORY_REORDER: 'inventory_reorder',
};

/**
 * Resource types for audit logging
 *
 * These correspond to database tables and entity names.
 * Used for polymorphic foreign key in audit_logs table.
 *
 * NOTE: AUTH is special (not an entity). Entity resource types
 * are derived from metadata via getEntityToResourceType().
 */
const ResourceTypes = {
  // Authentication (special - not an entity)
  AUTH: 'auth',

  // Core entities - values match entity names from metadata
  // These are for backwards compatibility and type-safety in code
  USER: 'user',
  ROLE: 'role',
  CUSTOMER: 'customer',
  TECHNICIAN: 'technician',
  WORK_ORDER: 'work_order',
  INVOICE: 'invoice',
  CONTRACT: 'contract',
  INVENTORY: 'inventory',
};

/**
 * Audit result statuses
 */
const AuditResults = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  ERROR: 'error',
};

/**
 * Map entity names (from metadata) to ResourceTypes.
 *
 * DERIVED FROM METADATA via derived-constants.js.
 * Uses metadata.rlsResource if defined, otherwise entity name.
 *
 * Used by GenericEntityService and audit-helper to convert
 * entity names to snake_case resource types.
 *
 * @returns {Object} Frozen map of entityName → resourceType
 */
function getEntityResourceTypeMap() {
  return getEntityToResourceType();
}

/**
 * Map entity names + operations to audit action strings.
 *
 * DERIVED FROM METADATA via derived-constants.js.
 * Returns { entityName: { create, update, delete } } map.
 *
 * Used by GenericEntityService to dynamically select audit action.
 * Only CREATE, UPDATE, DELETE - deactivation is an UPDATE with is_active=false.
 *
 * @example
 *   getEntityCrudActionMap().customer.create === 'customer_create'
 *
 * @returns {Object} Frozen map of entityName → { create, update, delete }
 */
function getEntityCrudActionMap() {
  return getEntityActionMap();
}

// For backwards compatibility, create static objects that match old API
// These are lazy-initialized on first access
let _cachedEntityToResourceType = null;
let _cachedEntityActionMap = null;

/**
 * Legacy EntityToResourceType getter (backwards compatible)
 *
 * @deprecated Use getEntityResourceTypeMap() for clarity
 */
const EntityToResourceType = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!_cachedEntityToResourceType) {
        _cachedEntityToResourceType = getEntityToResourceType();
      }
      return _cachedEntityToResourceType[prop];
    },
    ownKeys() {
      if (!_cachedEntityToResourceType) {
        _cachedEntityToResourceType = getEntityToResourceType();
      }
      return Object.keys(_cachedEntityToResourceType);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (!_cachedEntityToResourceType) {
        _cachedEntityToResourceType = getEntityToResourceType();
      }
      if (prop in _cachedEntityToResourceType) {
        return { enumerable: true, configurable: true, value: _cachedEntityToResourceType[prop] };
      }
      return undefined;
    },
  },
);

/**
 * Legacy EntityActionMap getter (backwards compatible)
 *
 * @deprecated Use getEntityCrudActionMap() for clarity
 */
const EntityActionMap = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!_cachedEntityActionMap) {
        _cachedEntityActionMap = getEntityActionMap();
      }
      return _cachedEntityActionMap[prop];
    },
    ownKeys() {
      if (!_cachedEntityActionMap) {
        _cachedEntityActionMap = getEntityActionMap();
      }
      return Object.keys(_cachedEntityActionMap);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (!_cachedEntityActionMap) {
        _cachedEntityActionMap = getEntityActionMap();
      }
      if (prop in _cachedEntityActionMap) {
        return { enumerable: true, configurable: true, value: _cachedEntityActionMap[prop] };
      }
      return undefined;
    },
  },
);

module.exports = {
  AuditActions,
  ResourceTypes,
  AuditResults,
  EntityToResourceType, // Backwards compatible proxy
  EntityActionMap, // Backwards compatible proxy
  // New explicit functions
  getEntityResourceTypeMap,
  getEntityCrudActionMap,
  getResourceType,
  getAuditAction,
};
