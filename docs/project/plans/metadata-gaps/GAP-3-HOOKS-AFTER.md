# GAP-3: afterChange Hooks

**Status:** 📋 DESIGN  
**Priority:** MEDIUM  
**Parent:** [METADATA-COMPLETION-PLAN.md](../METADATA-COMPLETION-PLAN.md)  
**Depends On:** [HOOKS-ENGINE.md](HOOKS-ENGINE.md), [GAP-1-ACTIONS.md](GAP-1-ACTIONS.md)

---

## Purpose

`afterChange` hooks trigger AFTER a field change commits:
- Send notifications
- Update related records
- Trigger computed recalculations
- Create audit entries

---

## Hook Schema

From design spec (ENTITY-EXPANSION-DESIGN.md lines 2050-2080):

```javascript
fields: {
  status: {
    type: 'enum',
    afterChange: [
      { on: '→approved', do: 'create_quote_from_recommendation' },
      { on: 'change', do: 'notify_customer' },
    ],
  },
}
```

---

## Hook Properties

From design spec `HOOK_CONSTRAINTS.afterChange`:

| Property | Type | Description |
|----------|------|-------------|
| `on` | string | Trigger pattern (see HOOKS-ENGINE.md) |
| `do` | string | Action key from actions.json |

**ALLOWED:** `on`, `do`  
**FORBIDDEN:** `blocked`, `requiresApproval`, `bypassRoles`, `when`

**Note:** `afterChange` is intentionally simpler than `beforeChange` — it can only trigger actions, not make decisions.

---

## Entity-Specific afterChange Hooks

From ENTITY-EXPANSION-DESIGN.md "Actions by Entity" table (lines 727-743):

### Recommendation

```javascript
status: {
  afterChange: [
    { on: '→approved', do: 'create_quote_from_recommendation' },
    { on: 'change', do: 'notify_customer' },
  ],
}
```

### Quote

```javascript
status: {
  afterChange: [
    { on: '→accepted', do: 'create_work_order_from_quote' },
    { on: '→sent', do: 'notify_customer' },
    { on: '→rejected', do: 'notify_creator' },
  ],
}
```

### Work Order

```javascript
status: {
  afterChange: [
    { on: '→closed', do: 'generate_invoice' },
  ],
},
assigned_technician_id: {
  afterChange: [
    { on: 'change', do: 'notify_technician' },
  ],
}
```

### Visit

```javascript
status: {
  afterChange: [
    { on: '→confirmed', do: 'notify_customer' },
    { on: '→confirmed', do: 'notify_technician' },
  ],
}
```

### Invoice (line item change)

```javascript
// On line_item entity, affects parent invoice
amount: {
  afterChange: [
    { on: 'change', do: 'recalculate_invoice_total' },
  ],
}
```

### Inline Action Example

```javascript
// For simple logging, can use inline action
status: {
  afterChange: [
    { on: 'change', do: { log: { message: 'Status changed', level: 'info' } } },
  ],
}
```

---

## Evaluation Flow

```
COMMIT: Quote status changed from 'draft' to 'sent'

1. Change committed to database
2. Load field metadata: quote.fields.status
3. Get afterChange hooks: [{ on: '→sent', do: 'notify_customer' }]
4. Match hook: '→sent' matches arrival at 'sent'
5. Resolve action: 'notify_customer' from actions.json
6. Execute action with context
7. Return { actionsExecuted: ['notify_customer'] }
```

---

## Action Execution

```javascript
// In hook-service.js
async function executeAfterHook(hook, context) {
  const action = actionsRegistry.get(hook.do);
  if (!action) {
    throw new Error(`Unknown action: ${hook.do}`);
  }
  
  const handler = actionHandlers[action.type];
  return handler.execute(action, context);
}
```

---

## Execution Model (from ENTITY-EXPANSION-DESIGN.md)

```
COMMIT the change to database

FOR each hook in afterChange (in order):
  IF hook.on matches current event:
    TRY:
      EXECUTE hook.do (action)
    CATCH error:
      LOG error with context
      CONTINUE with next hook (do NOT rollback)

IF any hooks failed:
  EMIT 'hook_execution_warning' event
  
RETURN success to client
```

**Key Points:**
- All matching hooks run (no short-circuit)
- Errors logged but don't fail the request
- Change is already committed — can't rollback

---

## Cascade Prevention

From HOOKS-ENGINE.md:

```javascript
// Track execution depth
context.hookDepth = (context.hookDepth || 0) + 1;
if (context.hookDepth > 3) {
  logger.warn('Hook cascade limit reached', { hook, context });
  return; // Skip to prevent infinite loop
}
```

---

## Error Handling

afterChange hooks log errors but don't rollback:

```javascript
for (const hook of matchingHooks) {
  try {
    await executeAction(hook.do, context);
    executedActions.push(hook.do);
  } catch (error) {
    logger.error('afterChange hook failed', {
      action: hook.do,
      entity: context.entity,
      field: context.field,
      error: error.message,
    });
    failedActions.push({ action: hook.do, error: error.message });
    // Continue — do NOT throw
  }
}

if (failedActions.length > 0) {
  emit('hook_execution_warning', { entity: context.entity, failedActions });
}
```

---

## Test Cases

### Unit Tests

1. **Action dispatch:** Correct action called per `do`
2. **Pattern matching:** All `on` patterns work (create, change, →value, old→new)
3. **Cascade limit:** Depth > 3 stops execution
4. **Error isolation:** Failed action doesn't abort other hooks

### Integration Tests

1. Quote status → accepted → work order created
2. Work order status → closed → invoice generated
3. Line item amount change → invoice total recalculated
4. Cascade: recommendation → quote → stops at limit

---

## Implementation Checklist

- [ ] Define afterChange hooks for recommendation (→approved)
- [ ] Define afterChange hooks for quote (→accepted, →sent)
- [ ] Define afterChange hooks for work_order (→closed)
- [ ] Implement action execution in hook-service
- [ ] Add cascade depth tracking
- [ ] Implement async hook queue (future)
- [ ] Add unit tests for action dispatch
- [ ] Add integration tests for end-to-end flows
