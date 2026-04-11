# HOOKS-ENGINE Design

**Status:** 📋 DESIGN  
**Priority:** HIGH (blocks GAP-2, GAP-3)  
**Parent:** [METADATA-COMPLETION-PLAN.md](../METADATA-COMPLETION-PLAN.md)

---

## Purpose

Build a hook evaluation engine that:
1. Reads `beforeChange[]` and `afterChange[]` from field metadata
2. Evaluates conditions (`on`, `when`)
3. Executes blocking logic (beforeChange) or reactive logic (afterChange)
4. Calls actions from the registry

---

## Existing Infrastructure

### What We Have

| Component | Location | Status |
|-----------|----------|--------|
| `action-handlers.js` | `config/action-handlers.js` | ✅ EXISTS - handlers for all 4 action types |
| `actions.json` | `config/actions.json` | ⚠️ EXISTS but EMPTY |
| `entity-metadata-validator.js` | `config/entity-metadata-validator.js` | ✅ Has field validation infrastructure |

### Key Pattern: Field-Centric Reads

From `metadata-accessors.js` pattern — hooks live ON the field:
```javascript
fields: {
  status: {
    type: 'enum',
    beforeChange: [...],  // We will read this
    afterChange: [...],   // We will read this
  }
}
```

---

## Hook Constraints (from ENTITY-EXPANSION-DESIGN.md lines 848-860)

```javascript
const HOOK_CONSTRAINTS = {
  beforeChange: {
    allowed: ['on', 'when', 'blocked', 'bypassRoles', 'requiresApproval', 'description'],
    forbidden: ['do'],
  },
  afterChange: {
    allowed: ['on', 'do'],
    forbidden: ['blocked', 'requiresApproval', 'bypassRoles', 'when'],
  },
};
```

**Key Rules:**
- `beforeChange` can block or require approval, but CANNOT execute actions (`do`)
- `afterChange` can ONLY execute actions (`do`), cannot block or have conditions (`when`)

---

## Type Definitions (from ENTITY-EXPANSION-DESIGN.md lines 2173-2218)

```typescript
// Condition for when a hook should apply
type WhenCondition = {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
  value: string | number | boolean | string[];
};

// Approval requirement structure
type ApprovalRequirement = {
  approver: string;    // Role name (e.g., 'manager', 'customer')
  timeout?: number;    // Auto-expire in hours (optional)
};

// Context passed to action handlers
type ActionContext = {
  entity: string;
  record: Record<string, unknown>;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  user: { id: string; role: string };
  tx?: Transaction;
  correlationId: string;
};
```

---

## Design: HookService

### Location
`backend/services/hook-service.js`

### Interface

```javascript
/**
 * Evaluate and execute hooks for a field change.
 * 
 * @param {Object} options
 * @param {string} options.entityKey - Entity being modified
 * @param {string} options.fieldName - Field being changed
 * @param {*} options.oldValue - Previous value
 * @param {*} options.newValue - New value
 * @param {Object} options.record - Full record (for context)
 * @param {Object} options.user - User making change
 * @param {Object} [options.tx] - Transaction (for atomic operations)
 * @returns {Promise<HookResult>}
 */
async function evaluateHooks(options) { }

/**
 * @typedef {Object} HookResult
 * @property {boolean} allowed - Whether change is allowed
 * @property {boolean} requiresApproval - Whether approval workflow triggered
 * @property {Object[]} actionsExecuted - Actions that ran
 * @property {string} [blockReason] - Why change was blocked
 */
```

### Algorithm

```
EVALUATE_HOOKS(entity, field, oldValue, newValue, context):
  
  1. Load field metadata: metadata.fields[field]
  
  2. BEFORE CHANGE (blocking phase):
     for each hook in field.beforeChange:
       if matches(hook.on, oldValue, newValue):
         if hook.blocked:
           if context.user.role NOT in hook.bypassRoles:
             RETURN { allowed: false, blockReason: hook.description }
         if hook.requiresApproval:
           CREATE approval_request
           RETURN { allowed: false, requiresApproval: true }
  
  3. ALLOW CHANGE (caller commits the change)
  
  4. AFTER CHANGE (reactive phase):
     for each hook in field.afterChange:
       if matches(hook.on, oldValue, newValue):
         action = resolveAction(hook.do)
         EXECUTE action(context)
  
  5. RETURN { allowed: true, actionsExecuted: [...] }
```

---

## Hook Matching Logic

### The `on` Property

| Pattern | Meaning | Example |
|---------|---------|---------|
| `'create'` | Field set on creation | Initial status assignment |
| `'change'` | Any modification | Audit logging |
| `'delete'` | Record deletion | Cleanup triggers |
| `'old→new'` | Specific transition | `'draft→sent'` |
| `'→new'` | Arrival at value | `'→approved'` |
| `'old→'` | Departure from value | `'pending→'` |

### Matching Function

```javascript
function matchesOn(onPattern, oldValue, newValue, operation) {
  if (onPattern === 'create') return operation === 'create';
  if (onPattern === 'change') return oldValue !== newValue;
  if (onPattern === 'delete') return operation === 'delete';
  
  // Transition patterns
  if (onPattern.includes('→')) {
    const [from, to] = onPattern.split('→');
    const fromMatch = !from || from === String(oldValue);
    const toMatch = !to || to === String(newValue);
    return fromMatch && toMatch;
  }
  
  // Exact value match
  return onPattern === String(newValue);
}
```

---

## Safety: Cascade Prevention

### Configuration
```javascript
const HOOK_LIMITS = {
  maxCascadeDepth: 3,
  maxActionsPerHook: 5,
  maxTotalExecutions: 20,
};
```

### Tracking
```javascript
// Context carries depth counter
context.hookDepth = (context.hookDepth || 0) + 1;
if (context.hookDepth > HOOK_LIMITS.maxCascadeDepth) {
  throw new HookCascadeError('Max hook depth exceeded');
}
```

---

## Integration Points

### Where Hook Evaluation Gets Called

| Service Method | Hook Phase | When |
|----------------|------------|------|
| `genericEntityService.create()` | before + after | On record creation |
| `genericEntityService.update()` | before + after | On record update |
| `genericEntityService.deactivate()` | before + after | On soft-delete |

### Transaction Handling

Hooks run INSIDE the existing transaction:
```javascript
// In genericEntityService.update():
async update(entityName, id, data, options) {
  return this.db.transaction(async (tx) => {
    // 1. Evaluate beforeChange hooks
    const hookResult = await hookService.evaluateBeforeHooks({
      entityKey: entityName,
      changes: data,
      existing: currentRecord,
      user: options.user,
      tx,
    });
    
    if (!hookResult.allowed) {
      throw new HookBlockedError(hookResult.blockReason);
    }
    
    // 2. Apply the change
    const updated = await this.applyUpdate(tx, entityName, id, data);
    
    // 3. Evaluate afterChange hooks
    await hookService.evaluateAfterHooks({
      entityKey: entityName,
      record: updated,
      changes: data,
      user: options.user,
      tx,
    });
    
    return updated;
  });
}
```

---

## Test Strategy

### Unit Tests (`hook-service.test.js`)

1. **Matching tests:** Verify all `on` patterns match correctly
2. **Blocking tests:** Verify `blocked: true` stops changes
3. **Bypass tests:** Verify `bypassRoles` allows changes
4. **Approval tests:** Verify `requiresApproval` creates approval_request
5. **Action tests:** Verify afterChange triggers actions
6. **Cascade tests:** Verify depth limiting works

### Integration Tests

1. Full update flow with hooks
2. Approval workflow end-to-end
3. Action execution with transaction rollback

---

## Industry Standard Comparison

| Pattern | Our Approach | Rails ActiveRecord | Django Signals |
|---------|--------------|-------------------|----------------|
| Hook location | On field metadata | Model callbacks | Explicit connect |
| Blocking | `beforeChange.blocked` | `before_save` return false | `pre_save` raise |
| Reactive | `afterChange.do` | `after_commit` | `post_save` |
| Declarative | ✅ JSON config | ❌ Ruby code | ❌ Python code |

Our approach is **more declarative** than industry standard, aligning with SSOT principles.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `services/hook-service.js` | CREATE | Hook evaluation engine |
| `services/hook-service.test.js` | CREATE | Unit tests |
| `utils/hook-errors.js` | CREATE | Error classes |
| `services/generic-entity-service.js` | MODIFY | Add hook calls |

---

## Next Steps

1. ✅ Review this design
2. Create GAP-1-ACTIONS.md (populate actions.json)
3. After implementation: wire into generic-entity-service
