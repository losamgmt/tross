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
const { RRule } = require('rrule');

const log = testLogger;

// ============================================================================
// LAZY SERVICE IMPORTS (avoid circular dependencies)
// ============================================================================

/**
 * Get GenericEntityService with lazy loading to avoid circular imports.
 * Action handlers are loaded from config/, which is loaded before services/.
 */
let _GenericEntityService = null;
function getGenericEntityService() {
  if (!_GenericEntityService) {
    _GenericEntityService = require('../services/entity/generic-entity-service');
  }
  return _GenericEntityService;
}

/**
 * Get database connection for formula queries.
 */
let _db = null;
function getDb() {
  if (!_db) {
    _db = require('../db/connection');
  }
  return _db;
}

/**
 * Resolve users by role name.
 * Queries the roles table to get role_id, then finds all active users with that role.
 *
 * @param {string} roleName - Role name (e.g., 'manager', 'admin')
 * @returns {Promise<number[]>} Array of user IDs with that role
 */
async function getUsersByRole(roleName) {
  const db = getDb();

  try {
    // Query users by role name (joining roles table)
    const query = `
      SELECT u.id
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE LOWER(r.name) = LOWER($1)
        AND u.is_active = true
        AND r.is_active = true
    `;

    const result = await db.query(query, [roleName]);
    return result.rows.map((row) => row.id);
  } catch (error) {
    log.error('Failed to get users by role:', { roleName, error: error.message });
    return [];
  }
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

/**
 * Simple notification templates.
 * Maps template names to title/body generators.
 *
 * Future: Could be moved to config/notification-templates.json
 */
const NOTIFICATION_TEMPLATES = {
  status_change: {
    title: (ctx) => `${ctx.entity} Status Updated`,
    body: (ctx) => `${ctx.entity} #${ctx.record?.id} status changed from ${ctx.oldValue} to ${ctx.newValue}`,
    type: 'info',
  },
  assignment: {
    title: (ctx) => `New ${ctx.entity} Assignment`,
    body: (ctx) => `You have been assigned to ${ctx.entity} #${ctx.record?.id}`,
    type: 'assignment',
  },
  update: {
    title: (ctx) => `${ctx.entity} Updated`,
    body: (ctx) => `${ctx.entity} #${ctx.record?.id} has been updated`,
    type: 'info',
  },
  approval_required: {
    title: (ctx) => `${ctx.entity} Needs Approval`,
    body: (ctx) => `${ctx.entity} #${ctx.record?.id} is awaiting your approval`,
    type: 'warning',
  },
};

/**
 * Resolve a notification template to title/body.
 *
 * @param {string} templateName - Template name from actions.json
 * @param {Object} context - Execution context
 * @returns {{ title: string, body: string, type: string }}
 */
function resolveNotificationTemplate(templateName, context) {
  const template = NOTIFICATION_TEMPLATES[templateName];
  if (!template) {
    log.log(`Unknown notification template: ${templateName}, using fallback`);
    return {
      title: `Notification: ${context.entity}`,
      body: `Action triggered for ${context.entity} #${context.record?.id}`,
      type: 'info',
    };
  }
  return {
    title: template.title(context),
    body: template.body(context),
    type: template.type,
  };
}

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
// FORMULA EVALUATOR
// ============================================================================

/**
 * Evaluate a formula for compute actions.
 * Supports:
 * - SUM(related_table.field) - SQL aggregation
 * - RRULE_NEXT(rrule, last_date) - Next RRule occurrence
 * - Simple arithmetic expressions
 *
 * @param {string} formula - Formula string
 * @param {Object} context - Execution context with entity, record, etc.
 * @param {string} targetEntity - Target entity for the computation
 * @param {number} targetId - Target entity ID
 * @returns {Promise<*>} Computed value
 */
async function evaluateFormula(formula, context, targetEntity, targetId) {
  const db = getDb();

  // SUM(related_table.field) - SQL aggregation
  const sumMatch = formula.match(/^SUM\(([\w_]+)\.([\w_]+)\)$/i);
  if (sumMatch) {
    const [, relatedTable, field] = sumMatch;
    // Determine the FK field name (e.g., invoice_id for invoices)
    const fkField = `${targetEntity}_id`;

    const query = `
      SELECT COALESCE(SUM(${field}), 0) as total
      FROM ${relatedTable}
      WHERE ${fkField} = $1
    `;

    try {
      const result = await db.query(query, [targetId]);
      return parseFloat(result.rows[0]?.total || 0);
    } catch (error) {
      log.error('Formula SUM evaluation failed:', error.message);
      return null;
    }
  }

  // RRULE_NEXT(rrule_field, last_date_field) - calculate next occurrence
  // Supports both RRULE string and simple frequency enum
  const rruleMatch = formula.match(/^RRULE_NEXT\((\w+),\s*(\w+)\)$/i);
  if (rruleMatch) {
    const [, rruleField, lastDateField] = rruleMatch;
    const rruleValue = context.record?.[rruleField];
    const lastDate = context.record?.[lastDateField];

    // Use lastDate as base, or now if not set
    const baseDate = lastDate ? new Date(lastDate) : new Date();

    try {
      let rule;

      if (typeof rruleValue === 'string' && rruleValue.startsWith('RRULE:')) {
        // Full RRULE string: RRULE:FREQ=WEEKLY;INTERVAL=2
        rule = RRule.fromString(rruleValue);
      } else if (typeof rruleValue === 'string') {
        // Simple frequency enum: daily, weekly, monthly, etc.
        const freqMap = {
          daily: RRule.DAILY,
          weekly: RRule.WEEKLY,
          biweekly: RRule.WEEKLY,
          monthly: RRule.MONTHLY,
          quarterly: RRule.MONTHLY,
          semiannually: RRule.MONTHLY,
          annually: RRule.YEARLY,
        };
        const intervalMap = {
          daily: 1,
          weekly: 1,
          biweekly: 2,
          monthly: 1,
          quarterly: 3,
          semiannually: 6,
          annually: 1,
        };

        const freq = freqMap[rruleValue.toLowerCase()];
        const interval = intervalMap[rruleValue.toLowerCase()] || 1;

        if (!freq) {
          log.log(`RRULE_NEXT: Unknown frequency "${rruleValue}"`);
          return null;
        }

        rule = new RRule({
          freq,
          interval,
          dtstart: baseDate,
        });
      } else {
        log.log('RRULE_NEXT: No valid rrule value found');
        return null;
      }

      // Get next occurrence after baseDate
      const next = rule.after(baseDate, false); // false = exclusive (after, not on)
      return next ? next.toISOString() : null;
    } catch (error) {
      log.error('RRULE_NEXT evaluation failed:', error.message);
      return null;
    }
  }

  // Simple arithmetic: field + value or field - value
  const arithmeticMatch = formula.match(/^([\w_]+)\s*([+\-])\s*([\w_]+)$/);
  if (arithmeticMatch) {
    const [, leftField, operator, rightField] = arithmeticMatch;
    const left = context.record?.[leftField] ?? 0;
    const right = context.record?.[rightField] ?? 0;
    return operator === '+' ? left + right : left - right;
  }

  log.log(`Unknown formula format: ${formula}`);
  return null;
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

    // Resolve recipients - can be single user or multiple users by role
    let recipientIds = [];

    if (recipient?.field) {
      // Direct field reference (e.g., customer_id)
      const userId = resolveValue(recipient, context);
      if (userId) {
        recipientIds = [userId];
      }
    } else if (recipient?.role) {
      // Role-based recipients (e.g., all managers)
      recipientIds = await getUsersByRole(recipient.role);
    }

    // Skip if no recipients resolved
    if (recipientIds.length === 0) {
      log.log('NOTIFICATION: No recipients resolved, skipping', { template, recipient });
      return { success: true, type: 'notification', skipped: true, reason: 'no_recipients' };
    }

    // Resolve template to title/body
    const { title, body, type } = resolveNotificationTemplate(template, context);

    log.log('NOTIFICATION:', {
      template,
      title,
      recipientCount: recipientIds.length,
      channels,
      sourceEntity: context.entity,
      sourceId: context.record?.id,
    });

    const results = {
      in_app: [],
      email: [],
      errors: [],
    };

    // Process in_app notifications
    if (channels.includes('in_app')) {
      const GenericEntityService = getGenericEntityService();

      for (const userId of recipientIds) {
        try {
          const notificationData = {
            user_id: userId,
            title,
            body,
            type,
            resource_type: context.entity,
            resource_id: context.record?.id,
          };

          const result = await GenericEntityService.create('notification', notificationData, {
            user: context.user?.id || 'system',
            skipHooks: true, // Avoid recursive hooks on notification creation
          });

          results.in_app.push({ userId, notificationId: result?.id });
        } catch (error) {
          log.error('Failed to create notification:', { userId, error: error.message });
          results.errors.push({ userId, channel: 'in_app', error: error.message });
        }
      }
    }

    // Email channel - queue for async delivery (infrastructure pending)
    if (channels.includes('email')) {
      // TODO: Queue email jobs when email infrastructure is implemented
      log.log('EMAIL: Queuing emails for recipients (pending infrastructure)', {
        recipientCount: recipientIds.length,
        template,
      });
      results.email = recipientIds.map((userId) => ({ userId, status: 'pending_infrastructure' }));
    }

    return {
      success: results.errors.length === 0,
      type: 'notification',
      template,
      recipientCount: recipientIds.length,
      in_app: results.in_app,
      email: results.email,
      errors: results.errors.length > 0 ? results.errors : undefined,
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

    // Create the entity using GenericEntityService
    try {
      const GenericEntityService = getGenericEntityService();
      const result = await GenericEntityService.create(entity, data, {
        user: context.user?.id || 'system',
        skipHooks: false, // Allow hooks on created entity
      });

      return {
        success: true,
        type: 'create_entity',
        entity,
        data,
        createdId: result?.id,
      };
    } catch (error) {
      log.error(`Failed to create ${entity}:`, error.message);
      return { success: false, type: 'create_entity', entity, error: error.message };
    }
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

    // Update the entity using GenericEntityService
    try {
      const GenericEntityService = getGenericEntityService();
      const result = await GenericEntityService.update(targetEntity, targetId, resolvedUpdates, {
        user: context.user?.id || 'system',
        skipHooks: false, // Allow hooks on updated entity
      });

      return {
        success: true,
        type: 'update_entity',
        entity: targetEntity,
        id: targetId,
        updates: resolvedUpdates,
        found: !!result,
      };
    } catch (error) {
      log.error(`Failed to update ${targetEntity}:`, error.message);
      return { success: false, type: 'update_entity', entity: targetEntity, error: error.message };
    }
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

    // Parse target: 'entity.field'
    const [targetEntity, targetField] = target.split('.');

    // Resolve target ID: prefer FK field (e.g., invoice_id), fallback to record.id
    // FK takes priority because compute is typically triggered by a child record
    // updating a parent entity (e.g., line_item updates invoice total)
    const targetId = context.record?.[`${targetEntity}_id`] || context.record?.id;

    if (!targetEntity || !targetField || !targetId) {
      log.log('COMPUTE: Invalid target or missing ID', { target, targetId });
      return { success: false, type: 'compute', error: 'Invalid target or missing ID' };
    }

    log.log('COMPUTE:', {
      target,
      targetEntity,
      targetField,
      targetId,
      formula,
      sourceEntity: context.entity,
      sourceId: context.record?.id,
    });

    // Evaluate the formula
    const computedValue = await evaluateFormula(formula, context, targetEntity, targetId);

    if (computedValue === null) {
      log.log('COMPUTE: Formula evaluation returned null', { formula });
      return { success: true, type: 'compute', target, formula, value: null, skipped: true };
    }

    // Update the target entity with the computed value
    try {
      const GenericEntityService = getGenericEntityService();
      await GenericEntityService.update(targetEntity, targetId, { [targetField]: computedValue }, {
        user: context.user?.id || 'system',
        skipHooks: true, // Avoid recursive hooks on compute updates
      });

      return {
        success: true,
        type: 'compute',
        target,
        formula,
        value: computedValue,
      };
    } catch (error) {
      log.error('COMPUTE: Update failed:', error.message);
      return { success: false, type: 'compute', target, error: error.message };
    }
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
