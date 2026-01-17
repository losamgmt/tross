/**
 * Status Enums
 *
 * SINGLE SOURCE OF TRUTH for all entity status values.
 * This file is dependency-free to avoid circular imports.
 *
 * STATUS BY ENTITY TYPE:
 * - User/Customer/Technician: active, inactive, suspended
 * - WorkOrder: pending, assigned, in_progress, completed, cancelled
 * - Invoice: draft, sent, paid, overdue, cancelled, void
 * - Contract: draft, active, expired, cancelled, terminated
 * - Role/Inventory: No status field (uses is_active only)
 *
 * USAGE:
 *   const { STATUS_ENUMS, getStatusValues } = require('./status-enums');
 *
 *   // Get all values for an entity's status field
 *   const workOrderStatuses = getStatusValues('work_order');
 *   // => ['pending', 'assigned', 'in_progress', 'completed', 'cancelled']
 *
 *   // Access specific enum
 *   STATUS_ENUMS.WORK_ORDER.PENDING
 *   // => 'pending'
 */

// =============================================================================
// USER/PERSON STATUS (User, Customer, Technician)
// =============================================================================

const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
});

// =============================================================================
// WORK ORDER STATUS
// =============================================================================

const WORK_ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

// =============================================================================
// INVOICE STATUS
// =============================================================================

const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  VOID: 'void',
});

// =============================================================================
// CONTRACT STATUS
// =============================================================================

const CONTRACT_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  TERMINATED: 'terminated',
});

// =============================================================================
// PRIORITY ENUM (for Work Orders)
// =============================================================================

const PRIORITY = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
});

// =============================================================================
// AGGREGATED ENUMS
// =============================================================================

const STATUS_ENUMS = Object.freeze({
  USER: USER_STATUS,
  CUSTOMER: USER_STATUS,
  TECHNICIAN: USER_STATUS,
  WORK_ORDER: WORK_ORDER_STATUS,
  INVOICE: INVOICE_STATUS,
  CONTRACT: CONTRACT_STATUS,
});

const OTHER_ENUMS = Object.freeze({
  PRIORITY,
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get status values for an entity as an array
 * @param {string} entityName - Entity name (e.g., 'work_order', 'user')
 * @returns {Array<string>} Array of status values, or empty array if no status
 */
function getStatusValues(entityName) {
  const normalizedName = entityName.toUpperCase().replace(/-/g, '_');
  const statusEnum = STATUS_ENUMS[normalizedName];
  return statusEnum ? Object.values(statusEnum) : [];
}

/**
 * Get default status for an entity
 * @param {string} entityName - Entity name
 * @returns {string|null} Default status value or null
 */
function getDefaultStatus(entityName) {
  const normalizedName = entityName.toUpperCase().replace(/-/g, '_');

  // Define defaults per entity type
  const defaults = {
    USER: USER_STATUS.ACTIVE,
    CUSTOMER: USER_STATUS.ACTIVE,
    TECHNICIAN: USER_STATUS.ACTIVE,
    WORK_ORDER: WORK_ORDER_STATUS.PENDING,
    INVOICE: INVOICE_STATUS.DRAFT,
    CONTRACT: CONTRACT_STATUS.DRAFT,
  };

  return defaults[normalizedName] || null;
}

/**
 * Check if entity has a status field
 * @param {string} entityName - Entity name
 * @returns {boolean} True if entity has status values defined
 */
function hasStatus(entityName) {
  const normalizedName = entityName.toUpperCase().replace(/-/g, '_');
  return normalizedName in STATUS_ENUMS;
}

/**
 * Validate a status value for an entity
 * @param {string} entityName - Entity name
 * @param {string} status - Status value to validate
 * @returns {boolean} True if valid status for entity
 */
function isValidStatus(entityName, status) {
  const values = getStatusValues(entityName);
  return values.includes(status);
}

/**
 * Get priority values
 * @returns {Array<string>} Array of priority values
 */
function getPriorityValues() {
  return Object.values(PRIORITY);
}

module.exports = {
  // Individual enums (for direct access)
  USER_STATUS,
  WORK_ORDER_STATUS,
  INVOICE_STATUS,
  CONTRACT_STATUS,
  PRIORITY,

  // Aggregated enums
  STATUS_ENUMS,
  OTHER_ENUMS,

  // Helper functions
  getStatusValues,
  getDefaultStatus,
  hasStatus,
  isValidStatus,
  getPriorityValues,
};
