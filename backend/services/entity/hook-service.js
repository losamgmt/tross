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

const { logger } = require('../../config/logger');
const { getAction, executeAction } = require('../../config/action-handlers');

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
  if (onPattern === 'create') {return operation === 'create';}
  if (onPattern === 'delete') {return operation === 'delete';}
  if (onPattern === 'change') {return oldValue !== newValue;}

  // Normalize values for comparison (null/undefined → empty string)
  const oldStr = oldValue === null || oldValue === undefined ? '' : String(oldValue);
  const newStr = newValue === null || newValue === undefined ? '' : String(newValue);

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
 * Comparison function per supported `when` operator.
 *
 * The KEYS are the canonical hook operator vocabulary and MUST equal
 * constants.HOOK_WHEN_OPERATORS (enforced by the metadata validator at load and
 * asserted by a unit test). Symbol form is intentional and documented in
 * HOOKS-ENGINE.md — distinct from the query-filter word-forms (`[gt]`, ...).
 */
const OPERATOR_EVALUATORS = Object.freeze({
  '=': (fieldValue, value) => fieldValue === value,
  '!=': (fieldValue, value) => fieldValue !== value,
  '>': (fieldValue, value) => fieldValue > value,
  '<': (fieldValue, value) => fieldValue < value,
  '>=': (fieldValue, value) => fieldValue >= value,
  '<=': (fieldValue, value) => fieldValue <= value,
  in: (fieldValue, value) => Array.isArray(value) && value.includes(fieldValue),
  not_in: (fieldValue, value) =>
    Array.isArray(value) && !value.includes(fieldValue),
});

/**
 * Canonical list of supported `when` operators (derived from OPERATOR_EVALUATORS).
 */
const WHEN_OPERATORS = Object.freeze(Object.keys(OPERATOR_EVALUATORS));

/**
 * Evaluate a 'when' condition against context.
 *
 * @param {Object} whenCondition - { field, operator, value }
 * @param {Object} record - The record being changed
 * @returns {boolean} True if condition is satisfied
 */
function evaluateWhen(whenCondition, record) {
  if (!whenCondition) {return true;}

  const { field, operator, value } = whenCondition;
  const evaluator = OPERATOR_EVALUATORS[operator];

  if (!evaluator) {
    logger.warn('Unknown when operator', { operator, field });
    return false;
  }

  return evaluator(record[field], value);
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

      const actionResult = await executeAction(actionKey, actionContext);
      // executeAction returns {success:false} instead of throwing; inside a Unit
      // of Work a failed reactive action must abort the whole transaction.
      if (actionResult && actionResult.success === false) {
        throw new Error(
          `afterChange action '${actionKey}' failed: ${actionResult.error || 'unknown error'}`,
        );
      }
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
      // Inside a Unit of Work (context.tx) propagate so the enclosing transaction
      // rolls back; on the pool, log-and-continue (legacy behavior).
      if (context.tx) {
        throw error;
      }
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

/**
 * Run all afterChange hooks for a set of changed fields, inside the caller's
 * Unit of Work.
 *
 * SHARED by GenericEntityService create() and update() so the reactive step is
 * defined once (DRY). Threads the transaction `client` as `context.tx` so cascade
 * actions join the same transaction and a failure aborts it (see ADR 013).
 *
 * @param {Object} params
 * @param {Object} params.metadata - Entity metadata (reads fields[x].afterChange)
 * @param {string} params.entityName - Entity name
 * @param {Object} params.changedData - Written fields (fieldName -> newValue)
 * @param {Object} params.record - Post-write record (hook context)
 * @param {Object} [params.oldRecord=null] - Pre-write record; when provided (update),
 *   hooks fire only for fields whose value actually changed. Omit for create.
 * @param {Object} [params.client=null] - The Unit-of-Work pg client (threaded to hooks)
 * @param {number|string} [params.user] - Acting user id (hook context)
 * @param {string} params.operation - 'create' | 'update'
 * @returns {Promise<void>}
 */
async function runAfterChangeHooks({
  metadata,
  entityName,
  changedData,
  record,
  oldRecord = null,
  client = null,
  user,
  operation,
}) {
  if (!metadata.fields) {
    return;
  }

  for (const [fieldName, newValue] of Object.entries(changedData)) {
    const hooks = metadata.fields[fieldName]?.afterChange;
    if (!hooks || hooks.length === 0) {
      continue;
    }

    const oldValue = oldRecord ? oldRecord[fieldName] : null;
    // On update, only react when the value actually changed.
    if (oldRecord && oldValue === newValue) {
      continue;
    }

    await evaluateAfterHooks({
      hooks,
      oldValue,
      newValue,
      context: {
        entity: entityName,
        record,
        field: fieldName,
        user,
        tx: client,
      },
      operation,
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core functions
  evaluateBeforeHooks,
  evaluateAfterHooks,
  runAfterChangeHooks,
  matchesOn,
  evaluateWhen,

  // Configuration (for testing)
  HOOK_LIMITS,
  WHEN_OPERATORS,
};
