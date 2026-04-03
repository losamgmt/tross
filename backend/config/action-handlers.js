/**
 * Action Handlers
 *
 * GENERIC INTERPRETERS for workflow actions defined in actions.json.
 *
 * This module implements the Interpreter Pattern:
 * - actions.json defines WHAT happens (pure config)
 * - This module defines HOW to interpret that config (generic code)
 *
 * Adding new actions requires ONLY editing actions.json.
 * Adding new action TYPES requires adding a handler here (rare).
 *
 * USAGE:
 *   const { executeAction, getAction } = require('./action-handlers');
 *   await executeAction('create_quote_from_recommendation', context);
 *
 * CONTEXT OBJECT:
 *   {
 *     entity: 'recommendation',     // Source entity key
 *     record: { id, customer_id, ... },  // The changed record
 *     field: 'status',              // Field that triggered hook
 *     oldValue: 'open',             // Previous field value
 *     newValue: 'approved',         // New field value
 *     user: { id, role, ... },      // User who made the change
 *     tx: knexTransaction,          // Optional transaction
 *   }
 *
 * @module config/action-handlers
 */

const path = require('path');
const testLogger = require('./test-logger');

const log = testLogger;

// ============================================================================
// ACTION REGISTRY
// ============================================================================

/**
 * Load actions from JSON file.
 * Cached after first load for performance.
 */
let actionsCache = null;

function loadActions() {
  if (actionsCache) {
    return actionsCache;
  }

  try {
    const actionsPath = path.join(__dirname, 'actions.json');
    const actionsFile = require(actionsPath);
    actionsCache = actionsFile.actions || {};
    return actionsCache;
  } catch (error) {
    log.error('Failed to load actions.json:', error.message);
    return {};
  }
}

/**
 * Get an action definition by ID.
 *
 * @param {string} actionId - Action ID from actions.json
 * @returns {Object|null} Action definition or null if not found
 */
function getAction(actionId) {
  const actions = loadActions();
  return actions[actionId] || null;
}

/**
 * List all registered action IDs.
 *
 * @returns {string[]} Array of action IDs
 */
function listActions() {
  const actions = loadActions();
  return Object.keys(actions);
}

/**
 * Clear cached actions (for testing).
 */
function clearActionsCache() {
  actionsCache = null;
}

// ============================================================================
// CONTEXT VALUE RESOLUTION
// ============================================================================

/**
 * Resolve a value from context.
 * Handles static values, field references, and compute references.
 *
 * @param {*} valueSpec - Value specification (string, object, or literal)
 * @param {Object} context - Execution context
 * @returns {*} Resolved value
 */
function resolveValue(valueSpec, context) {
  // null/undefined pass through
  if (valueSpec === null || valueSpec === undefined) {
    return valueSpec;
  }

  // Object with field reference: { field: 'customer_id' }
  if (typeof valueSpec === 'object' && valueSpec.field) {
    return context.record?.[valueSpec.field];
  }

  // Object with compute reference: { compute: 'now' }
  if (typeof valueSpec === 'object' && valueSpec.compute) {
    return resolveCompute(valueSpec.compute, context);
  }

  // Literal value (string, number, boolean, etc.)
  return valueSpec;
}

/**
 * Resolve a compute reference.
 *
 * @param {string} computeName - Compute function name
 * @param {Object} context - Execution context
 * @returns {*} Computed value
 */
function resolveCompute(computeName, _context) {
  switch (computeName) {
    case 'now':
      return new Date().toISOString();
    case 'next_occurrence':
      // TODO: Implement RRULE next occurrence calculation
      return null;
    default:
      log.log(`Unknown compute: ${computeName}`);
      return null;
  }
}

// ============================================================================
// ACTION TYPE HANDLERS
// ============================================================================

/**
 * Handler registry - maps action types to handler functions.
 * Each handler receives (actionConfig, context) and returns a result object.
 */
const handlers = {
  /**
   * notification - Send notification to user(s)
   *
   * Config:
   *   template: 'status_change'
   *   recipient: { field: 'customer_id' } | { role: 'manager' }
   *   channels: ['in_app', 'email']
   */
  notification: async (config, context) => {
    const { template, recipient, channels = ['in_app'] } = config;

    // Resolve recipient
    let recipientId = null;
    let recipientRole = null;

    if (recipient?.field) {
      recipientId = resolveValue(recipient, context);
    } else if (recipient?.role) {
      recipientRole = recipient.role;
    }

    // Log for now - actual notification service integration later
    log.log('NOTIFICATION:', {
      template,
      recipientId,
      recipientRole,
      channels,
      sourceEntity: context.entity,
      sourceId: context.record?.id,
    });

    // TODO: Call notification service
    // await notificationService.send({ template, recipientId, recipientRole, channels, context });

    return {
      success: true,
      type: 'notification',
      template,
      recipient: recipientId || recipientRole,
    };
  },

  /**
   * create_entity - Create a new entity record
   *
   * Config:
   *   entity: 'quote'
   *   copyFields: ['customer_id', 'property_id']
   *   mapping: { source_field: 'target_field' }
   *   setFields: { status: 'draft', origin_type: 'recommendation' }
   */
  create_entity: async (config, context) => {
    const { entity, copyFields = [], mapping = {}, setFields = {} } = config;

    // Build the new record data
    const data = {};

    // Copy fields directly
    for (const field of copyFields) {
      if (context.record?.[field] !== undefined) {
        data[field] = context.record[field];
      }
    }

    // Apply mappings (source → target)
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (context.record?.[sourceField] !== undefined) {
        data[targetField] = context.record[sourceField];
      }
    }

    // Set static/computed values
    for (const [field, valueSpec] of Object.entries(setFields)) {
      data[field] = resolveValue(valueSpec, context);
    }

    // Add origin tracking if not explicitly set
    if (!data.origin_type && context.entity) {
      data.origin_type = context.entity;
    }
    if (!data.origin_id && context.record?.id) {
      data.origin_id = context.record.id;
    }

    log.log('CREATE_ENTITY:', {
      targetEntity: entity,
      data,
      sourceEntity: context.entity,
      sourceId: context.record?.id,
    });

    // TODO: Call generic entity service to create
    // const result = await GenericEntityService.create(entity, data, { tx: context.tx });

    return {
      success: true,
      type: 'create_entity',
      entity,
      data,
      // createdId: result.id,
    };
  },

  /**
   * update_entity - Update an existing entity record
   *
   * Config:
   *   target: { entity: 'invoice', id: { field: 'invoice_id' } }
   *   updates: { status: 'paid', paid_at: { compute: 'now' } }
   *   when: { compute: 'invoice_fully_paid' } (optional)
   */
  update_entity: async (config, context) => {
    const { target, updates, when } = config;

    // Resolve target entity and ID
    const targetEntity =
      typeof target.entity === 'string'
        ? target.entity
        : resolveValue(target.entity, context);
    const targetId = resolveValue(target.id, context);

    if (!targetEntity || !targetId) {
      log.log('UPDATE_ENTITY: Missing target entity or ID', { target, context: context.entity });
      return { success: false, type: 'update_entity', error: 'Missing target' };
    }

    // Check condition if present
    if (when) {
      const conditionMet = resolveValue(when, context);
      if (!conditionMet) {
        log.log('UPDATE_ENTITY: Condition not met, skipping', { when });
        return { success: true, type: 'update_entity', skipped: true, reason: 'condition_not_met' };
      }
    }

    // Resolve update values
    const resolvedUpdates = {};
    for (const [field, valueSpec] of Object.entries(updates)) {
      resolvedUpdates[field] = resolveValue(valueSpec, context);
    }

    log.log('UPDATE_ENTITY:', {
      targetEntity,
      targetId,
      updates: resolvedUpdates,
      sourceEntity: context.entity,
    });

    // TODO: Call generic entity service to update
    // await GenericEntityService.update(targetEntity, targetId, resolvedUpdates, { tx: context.tx });

    return {
      success: true,
      type: 'update_entity',
      entity: targetEntity,
      id: targetId,
      updates: resolvedUpdates,
    };
  },

  /**
   * compute - Recalculate a derived value
   *
   * Config:
   *   target: 'invoice.total_amount'
   *   formula: 'SUM(line_items.amount)'
   */
  compute: async (config, context) => {
    const { target, formula } = config;

    log.log('COMPUTE:', {
      target,
      formula,
      sourceEntity: context.entity,
      sourceId: context.record?.id,
    });

    // TODO: Implement formula evaluation
    // This will require a simple expression parser for aggregations

    return {
      success: true,
      type: 'compute',
      target,
      formula,
      // value: computedValue,
    };
  },
};

// ============================================================================
// MAIN EXECUTION FUNCTION
// ============================================================================

/**
 * Execute an action by ID.
 *
 * @param {string} actionId - Action ID from actions.json
 * @param {Object} context - Execution context
 * @returns {Object} Execution result { success, type, ... }
 */
async function executeAction(actionId, context) {
  // Handle inline actions (object instead of string ID)
  if (typeof actionId === 'object') {
    return executeInlineAction(actionId, context);
  }

  // Look up action in registry
  const action = getAction(actionId);
  if (!action) {
    log.error(`Action not found: ${actionId}`);
    return { success: false, error: `Action not found: ${actionId}` };
  }

  // Get handler for action type
  const handler = handlers[action.type];
  if (!handler) {
    log.error(`Unknown action type: ${action.type}`);
    return { success: false, error: `Unknown action type: ${action.type}` };
  }

  // Execute with error handling
  try {
    log.log(`Executing action: ${actionId}`, { type: action.type });
    const result = await handler(action, context);
    return { ...result, actionId };
  } catch (error) {
    log.error(`Action execution failed: ${actionId}`, error);
    return { success: false, actionId, error: error.message };
  }
}

/**
 * Execute an inline action (object instead of registry ID).
 *
 * @param {Object} inlineAction - Inline action definition
 * @param {Object} context - Execution context
 * @returns {Object} Execution result
 */
async function executeInlineAction(inlineAction, context) {
  // Handle simple log action
  if (inlineAction.log) {
    const { message, level = 'info' } = inlineAction.log;
    log[level]?.('INLINE_LOG:', message, { entity: context.entity, field: context.field });
    return { success: true, type: 'log', message };
  }

  // Handle other inline patterns
  if (inlineAction.type) {
    const handler = handlers[inlineAction.type];
    if (handler) {
      return handler(inlineAction, context);
    }
  }

  log.log('Unknown inline action format:', inlineAction);
  return { success: false, error: 'Unknown inline action format' };
}

/**
 * Execute multiple actions in sequence.
 *
 * @param {Array} actionIds - Array of action IDs or inline actions
 * @param {Object} context - Execution context
 * @returns {Object} Combined results { success, results: [...] }
 */
async function executeActions(actionIds, context) {
  const results = [];
  let allSuccess = true;

  for (const actionId of actionIds) {
    const result = await executeAction(actionId, context);
    results.push(result);
    if (!result.success) {
      allSuccess = false;
      // Continue executing - afterChange hooks should not block each other
    }
  }

  return { success: allSuccess, results };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main API
  executeAction,
  executeActions,

  // Registry access
  getAction,
  listActions,

  // Testing utilities
  clearActionsCache,
  resolveValue,
  resolveCompute,

  // Handler registry (for extension and testing)
  handlers,
  ACTION_HANDLERS: handlers, // Alias for clearer test readability
};
