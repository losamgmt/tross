/**
 * Audit Helper for GenericEntityService
 *
 * SRP LITERALISM: ONLY bridges GenericEntityService operations with audit-service
 *
 * PHILOSOPHY:
 * - COMPOSABLE: Uses existing audit-service.log()
 * - NON-BLOCKING: Audit failures don't break operations
 * - CONSTANTS-BASED: Uses audit-constants.js - NO MAGIC STRINGS
 * - OPTIONAL: Caller controls whether to audit
 *
 * USAGE:
 *   // After successful create
 *   await logEntityAudit('create', 'customer', result, {
 *     userId: req.user.userId,
 *     ipAddress: getClientIp(req),
 *     userAgent: getUserAgent(req),
 *     newValues: { email, company_name }
 *   });
 *
 * INTEGRATION:
 *   GenericEntityService.create('customer', data, { auditContext })
 *   - If auditContext provided, logs after success
 *   - If omitted, no audit (internal operations, migrations, etc.)
 */

const auditService = require('../../services/audit/audit-service');
const { logger } = require('../../config/logger');
const allMetadata = require('../../config/models');
const {
  AuditResults,
  EntityToResourceType,
  EntityActionMap,
} = require('../../services/audit/constants');

/**
 * Valid operations for audit logging
 * Maps to keys in EntityActionMap
 * DESIGN DECISION: Only CREATE, UPDATE, DELETE - deactivation is an UPDATE with is_active=false
 */
const VALID_OPERATIONS = ['create', 'update', 'delete'];

/**
 * Log an entity operation to the audit trail
 *
 * NON-BLOCKING: Catches and logs errors but never throws
 * This ensures audit failures don't break the main operation
 *
 * USES CONSTANTS: All actions and resource types come from audit-constants.js
 *
 * @param {string} operation - 'create', 'update', or 'delete'
 * @param {string} entityName - Entity name (e.g., 'user', 'customer')
 * @param {Object} result - The result from the operation (contains id)
 * @param {Object} auditContext - Context for audit logging
 * @param {number|null} auditContext.userId - User performing the action
 * @param {string} [auditContext.ipAddress] - Client IP address
 * @param {string} [auditContext.userAgent] - Client user agent
 * @param {Object} [auditContext.oldValues] - Previous values (for update/delete)
 * @param {Object} [auditContext.newValues] - New values (for create/update)
 * @returns {Promise<void>}
 *
 * @example
 *   await logEntityAudit('create', 'customer', { id: 123, email: 'test@example.com' }, {
 *     userId: 1,
 *     ipAddress: '127.0.0.1',
 *     userAgent: 'Mozilla/5.0...',
 *     newValues: { email: 'test@example.com', company_name: 'ACME' }
 *   });
 */
async function logEntityAudit(
  operation,
  entityName,
  result,
  auditContext,
  oldValues = null,
) {
  // Validate operation
  if (!operation || !VALID_OPERATIONS.includes(operation)) {
    logger.warn('Invalid audit operation', { operation, entityName });
    return;
  }

  // Validate entity has resource type mapping
  const resourceType = EntityToResourceType[entityName];
  if (!resourceType) {
    logger.warn('Invalid entity name for audit', { operation, entityName });
    return;
  }

  // Validate entity has action mapping for this operation
  const entityActions = EntityActionMap[entityName];
  const action = entityActions?.[operation];
  if (!action) {
    logger.warn('No audit action defined for operation', {
      operation,
      entityName,
    });
    return;
  }

  if (!auditContext) {
    logger.warn('No audit context provided', { operation, entityName });
    return;
  }

  // Determine old and new values:
  // - For updates: oldValues param (5th arg) OR auditContext.oldValues, result is newValues
  // - For creates: result is newValues, no oldValues
  // - For deletes: result is oldValues, no newValues
  const effectiveOldValues = oldValues || auditContext.oldValues || null;
  const effectiveNewValues =
    operation === 'delete' ? null : auditContext.newValues || result || null;

  try {
    await auditService.log({
      userId: auditContext.userId || null,
      action,
      resourceType,
      resourceId: result?.id || null,
      oldValues: operation === 'create' ? null : effectiveOldValues,
      newValues: effectiveNewValues,
      ipAddress: auditContext.ipAddress || null,
      userAgent: auditContext.userAgent || null,
      result: AuditResults.SUCCESS,
    });
  } catch (error) {
    // Non-blocking - log and continue
    logger.error('Failed to write audit log', {
      error: error.message,
      operation,
      entityName,
      resourceId: result?.id,
    });
  }
}

/**
 * Log an entity operation only when a caller-supplied audit context is present
 * AND auditing is enabled for the entity.
 *
 * Collapses the `if (auditContext && isAuditEnabled(entity)) { await logEntityAudit(...) }`
 * guard that every GenericEntityService mutation path repeated.
 *
 * @param {string} operation - 'create', 'update', or 'delete'
 * @param {string} entityName - Entity name (e.g., 'user', 'customer')
 * @param {Object} result - The operation result (contains id)
 * @param {Object} [auditContext] - Audit context; when falsy, nothing is logged
 * @param {Object} [oldValues=null] - Previous values (for update/delete)
 * @returns {Promise<void>}
 */
async function logEntityAuditIfEnabled(
  operation,
  entityName,
  result,
  auditContext,
  oldValues = null,
) {
  if (auditContext && isAuditEnabled(entityName)) {
    await logEntityAudit(operation, entityName, result, auditContext, oldValues);
  }
}

/**
 * Check if audit logging should be performed for an entity
 *
 * Some entities may be configured to skip audit logging
 * (e.g., high-volume, non-sensitive data)
 *
 * @param {string} entityName - Entity name
 * @returns {boolean} True if auditing is enabled for this entity
 */
function isAuditEnabled(entityName) {
  const metadata = allMetadata[entityName];

  // Default to true if not explicitly disabled
  if (!metadata) {
    return false;
  }

  // Check for explicit audit settings in metadata
  // Currently all entities are audited; this allows future opt-out
  return metadata.auditEnabled !== false;
}

module.exports = {
  logEntityAudit,
  logEntityAuditIfEnabled,
  isAuditEnabled,
  // Re-export constants for convenience (tests, etc.)
  // Original definitions are in services/audit-constants.js
  EntityToResourceType,
  EntityActionMap,
  AuditResults,
};
