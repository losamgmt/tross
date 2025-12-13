/**
 * Audit Constants
 *
 * SINGLE SOURCE OF TRUTH for all audit-related string constants.
 * NO MAGIC STRINGS - all audit actions, resource types, and results
 * MUST be defined here and imported where needed.
 *
 * DESIGN DECISION: Deactivate/Reactivate are UPDATE operations, not special actions.
 * Setting is_active=false/true is logged as an UPDATE with oldValues/newValues.
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
 */
const ResourceTypes = {
  // Authentication
  AUTH: 'auth',

  // Core entities (all 8)
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
 * Map entity names (from metadata) to ResourceTypes constants
 *
 * Used by GenericEntityService and audit-helper to convert
 * camelCase entity names to snake_case resource types.
 */
const EntityToResourceType = {
  user: ResourceTypes.USER,
  role: ResourceTypes.ROLE,
  customer: ResourceTypes.CUSTOMER,
  technician: ResourceTypes.TECHNICIAN,
  workOrder: ResourceTypes.WORK_ORDER,
  invoice: ResourceTypes.INVOICE,
  contract: ResourceTypes.CONTRACT,
  inventory: ResourceTypes.INVENTORY,
};

/**
 * Map entity names + operations to AuditActions constants
 *
 * Used by GenericEntityService to dynamically select audit action.
 * Only CREATE, UPDATE, DELETE - deactivation is an UPDATE with is_active=false.
 *
 * @example
 *   EntityActionMap.customer.create === AuditActions.CUSTOMER_CREATE
 */
const EntityActionMap = {
  user: {
    create: AuditActions.USER_CREATE,
    update: AuditActions.USER_UPDATE,
    delete: AuditActions.USER_DELETE,
  },
  role: {
    create: AuditActions.ROLE_CREATE,
    update: AuditActions.ROLE_UPDATE,
    delete: AuditActions.ROLE_DELETE,
  },
  customer: {
    create: AuditActions.CUSTOMER_CREATE,
    update: AuditActions.CUSTOMER_UPDATE,
    delete: AuditActions.CUSTOMER_DELETE,
  },
  technician: {
    create: AuditActions.TECHNICIAN_CREATE,
    update: AuditActions.TECHNICIAN_UPDATE,
    delete: AuditActions.TECHNICIAN_DELETE,
  },
  workOrder: {
    create: AuditActions.WORK_ORDER_CREATE,
    update: AuditActions.WORK_ORDER_UPDATE,
    delete: AuditActions.WORK_ORDER_DELETE,
  },
  invoice: {
    create: AuditActions.INVOICE_CREATE,
    update: AuditActions.INVOICE_UPDATE,
    delete: AuditActions.INVOICE_DELETE,
  },
  contract: {
    create: AuditActions.CONTRACT_CREATE,
    update: AuditActions.CONTRACT_UPDATE,
    delete: AuditActions.CONTRACT_DELETE,
  },
  inventory: {
    create: AuditActions.INVENTORY_CREATE,
    update: AuditActions.INVENTORY_UPDATE,
    delete: AuditActions.INVENTORY_DELETE,
  },
};

module.exports = {
  AuditActions,
  ResourceTypes,
  AuditResults,
  EntityToResourceType,
  EntityActionMap,
};
