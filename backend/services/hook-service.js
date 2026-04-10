/**
 * Hook Service
 *
 * Evaluates beforeChange and afterChange hooks defined in entity field metadata.
 *
 * DESIGN: See docs/architecture/completion/HOOKS-ENGINE.md
 *
 * beforeChange hooks:
 * - Can block changes (blocked: true)
 * - Can require approval (requiresApproval: { approver: 'role' })
 * - Cannot execute actions (no 'do' property)
 *
 * afterChange hooks:
 * - Can execute actions (do: 'action_key')
 * - Cannot block or require approval
 * - Errors are logged but don't fail the request
 *
 * @module services/hook-service
 */

const { logger } = require('../config/logger');
const { getAction, executeAction } = require('../config/action-handlers');

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Safety limits to prevent runaway hook cascades.
 * maxCascadeDepth: Maximum depth of hook-triggered-hook chains.
 */
const HOOK_LIMITS = {
  maxCascadeDepth: 3,
};

// ============================================================================
// HOOK MATCHING
// ============================================================================

/**
 * Check if a hook's 'on' pattern matches the current change.
 *
 * Patterns:
 * - 'create': Field set on record creation
 * - 'change': Any modification (oldValue !== newValue)
 * - 'delete': Record deletion
 * - 'old→new': Specific transition (e.g., 'draft→sent')
 * - '→new': Arrival at value (e.g., '→approved')
 * - 'old→': Departure from value (e.g., 'pending→')
 *
 * @param {string} onPattern - The hook's 'on' property
 * @param {*} oldValue - Previous field value
 * @param {*} newValue - New field value
 * @param {string} operation - Operation type: 'create', 'update', or 'delete'
 * @returns {boolean} True if hook should trigger
 */
function matchesOn(onPattern, oldValue, newValue, operation = 'update') {
  // Lifecycle patterns
  if (onPattern === 'create') return operation === 'create';
  if (onPattern === 'delete') return operation === 'delete';
  if (onPattern === 'change') return oldValue !== newValue;

  // Normalize values for comparison (null/undefined → empty string)
  const oldStr = oldValue == null ? '' : String(oldValue);
  const newStr = newValue == null ? '' : String(newValue);

  // Transition patterns (contain →)
  if (onPattern.includes('→')) {
    const [from, to] = onPattern.split('→');
    const fromMatch = !from || from === oldStr;
    const toMatch = !to || to === newStr;
    return fromMatch && toMatch && oldValue !== newValue;
  }

  // Exact value match (arrival at specific value)
  return onPattern === newStr && oldValue !== newValue;
}

/**
 * Evaluate a 'when' condition against context.
 *
 * @param {Object} whenCondition - { field, operator, value }
 * @param {Object} record - The record being changed
 * @returns {boolean} True if condition is satisfied
 */
function evaluateWhen(whenCondition, record) {
  if (!whenCondition) return true;

  const { field, operator, value } = whenCondition;
  const fieldValue = record[field];

  switch (operator) {
    case '=':
      return fieldValue === value;
    case '!=':
      return fieldValue !== value;
    case '>':
      return fieldValue > value;
    case '<':
      return fieldValue < value;
    case '>=':
      return fieldValue >= value;
    case '<=':
      return fieldValue <= value;
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue);
    default:
      logger.warn('Unknown when operator', { operator, field });
      return false;
  }
}

// ============================================================================
// BEFORE CHANGE HOOKS
// ============================================================================

/**
 * Evaluate beforeChange hooks for a field change.
 *
 * @param {Object} options
 * @param {Object[]} options.hooks - Array of beforeChange hook definitions
 * @param {*} options.oldValue - Previous field value
 * @param {*} options.newValue - New field value
 * @param {Object} options.context - { entity, record, field, user, tx }
 * @param {string} [options.operation='update'] - Operation type
 * @returns {Promise<{allowed: boolean, blockReason?: string, requiresApproval?: boolean, approvalInfo?: Object}>}
 */
async function evaluateBeforeHooks({
  hooks,
  oldValue,
  newValue,
  context,
  operation = 'update',
}) {
  if (!hooks || hooks.length === 0) {
    return { allowed: true };
  }

  const userRole = context.user?.role || context.user?.app_metadata?.role;

  for (const hook of hooks) {
    // Check if hook pattern matches
    if (!matchesOn(hook.on, oldValue, newValue, operation)) {
      continue;
    }

    // Check 'when' condition if present
    if (hook.when && !evaluateWhen(hook.when, { ...context.record, [context.field]: newValue })) {
      continue;
    }

    // Check if blocked
    if (hook.blocked) {
      // Check bypassRoles
      const bypassRoles = hook.bypassRoles || [];
      if (bypassRoles.includes(userRole)) {
        logger.debug('Hook bypass via role', {
          hook: hook.description,
          role: userRole,
        });
        continue;
      }

      logger.info('Hook blocked change', {
        entity: context.entity,
        field: context.field,
        hook: hook.description,
        user: context.user?.id,
      });

      return {
        allowed: false,
        blockReason: hook.description || 'Change blocked by policy',
      };
    }

    // Check if requires approval
    if (hook.requiresApproval) {
      logger.info('Hook requires approval', {
        entity: context.entity,
        field: context.field,
        approver: hook.requiresApproval.approver,
        user: context.user?.id,
      });

      return {
        allowed: false,
        requiresApproval: true,
        approvalInfo: {
          approver: hook.requiresApproval.approver,
          timeout: hook.requiresApproval.timeout,
          targetEntity: context.entity,
          targetId: context.record?.id,
          targetField: context.field,
          proposedValue: newValue,
          description: hook.description,
        },
      };
    }
  }

  return { allowed: true };
}

// ============================================================================
// AFTER CHANGE HOOKS
// ============================================================================

/**
 * Evaluate afterChange hooks for a field change.
 * Executes matching actions. Errors are logged but don't fail the request.
 *
 * @param {Object} options
 * @param {Object[]} options.hooks - Array of afterChange hook definitions
 * @param {*} options.oldValue - Previous field value
 * @param {*} options.newValue - New field value
 * @param {Object} options.context - { entity, record, field, user, tx, hookDepth }
 * @param {string} [options.operation='update'] - Operation type
 * @returns {Promise<{actionsExecuted: string[], errors: Object[]}>}
 */
async function evaluateAfterHooks({
  hooks,
  oldValue,
  newValue,
  context,
  operation = 'update',
}) {
  const actionsExecuted = [];
  const errors = [];

  if (!hooks || hooks.length === 0) {
    return { actionsExecuted, errors };
  }

  // Cascade depth check
  const hookDepth = (context.hookDepth || 0) + 1;
  if (hookDepth > HOOK_LIMITS.maxCascadeDepth) {
    logger.warn('Hook cascade limit reached', {
      entity: context.entity,
      field: context.field,
      depth: hookDepth,
      maxDepth: HOOK_LIMITS.maxCascadeDepth,
    });
    return { actionsExecuted, errors };
  }

  for (const hook of hooks) {
    // Check if hook pattern matches
    if (!matchesOn(hook.on, oldValue, newValue, operation)) {
      continue;
    }

    // Execute action
    const actionKey = hook.do;
    if (!actionKey) {
      logger.warn('afterChange hook missing "do" property', { hook });
      continue;
    }

    try {
      // Handle inline action objects
      if (typeof actionKey === 'object') {
        // Inline action (e.g., { log: { message: '...' } })
        logger.debug('Inline action executed', { action: actionKey });
        actionsExecuted.push('inline');
        continue;
      }

      // Named action from registry
      const action = getAction(actionKey);
      if (!action) {
        logger.warn('Unknown action in hook', { action: actionKey });
        errors.push({ action: actionKey, error: 'Unknown action' });
        continue;
      }

      const actionContext = {
        entity: context.entity,
        record: context.record,
        field: context.field,
        oldValue,
        newValue,
        user: context.user,
        tx: context.tx,
        hookDepth,
      };

      await executeAction(actionKey, actionContext);
      actionsExecuted.push(actionKey);

      logger.debug('Action executed', {
        action: actionKey,
        entity: context.entity,
        field: context.field,
      });
    } catch (error) {
      logger.error('afterChange action failed', {
        action: actionKey,
        entity: context.entity,
        field: context.field,
        error: error.message,
      });
      errors.push({ action: actionKey, error: error.message });
      // Continue with next hook — don't fail the request
    }
  }

  if (errors.length > 0) {
    logger.warn('Some afterChange hooks failed', {
      entity: context.entity,
      field: context.field,
      executed: actionsExecuted.length,
      failed: errors.length,
    });
  }

  return { actionsExecuted, errors };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core functions
  evaluateBeforeHooks,
  evaluateAfterHooks,
  matchesOn,
  evaluateWhen,

  // Configuration (for testing)
  HOOK_LIMITS,
};
