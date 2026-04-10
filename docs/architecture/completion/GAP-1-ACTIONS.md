# GAP-1: Actions Registry

**Status:** 📋 DESIGN  
**Priority:** MEDIUM  
**Parent:** [METADATA-COMPLETION-PLAN.md](../METADATA-COMPLETION-PLAN.md)

---

## Current State

| File | Status | Content |
|------|--------|---------|
| `config/actions.json` | ✅ EXISTS | Schema defined, `"actions": {}` EMPTY |
| `config/action-handlers.js` | ✅ EXISTS | Interpreter for 4 action types |

The infrastructure is built. The registry is empty.

---

## Actions from Design Spec (Actual)

From `ENTITY-EXPANSION-DESIGN.md`, the following 14 actions are defined:

### Notification Actions (4)

| Action Key | Type | Description |
|------------|------|-------------|
| `notify_customer` | notification | Notify customer of status change |
| `notify_technician` | notification | Notify technician of assignment |
| `notify_creator` | notification | Notify record creator of updates |
| `notify_approvers` | notification | Notify managers that approval is required |

### Create Entity Actions (4)

| Action Key | Target Entity | Description |
|------------|---------------|-------------|
| `create_quote_from_recommendation` | quote | Create quote from approved recommendation |
| `create_work_order_from_quote` | work_order | Create work order from accepted quote |
| `generate_invoice` | invoice | Generate invoice when work order completed |
| `create_work_order_from_schedule` | work_order | Create work order from maintenance schedule |

### Update Entity Actions (3)

| Action Key | Target | Description |
|------------|--------|-------------|
| `apply_pending_change` | dynamic | Apply approved change from approval_request |
| `update_invoice_paid` | invoice | Mark invoice as paid when payments equal total |
| `update_inventory_from_receipt` | inventory | Update inventory quantity on receipt |

### Compute Actions (3)

| Action Key | Target | Description |
|------------|--------|-------------|
| `recalculate_invoice_total` | invoice.total_amount | Recalculate invoice total from line items |
| `recalculate_quote_total` | quote.total_amount | Recalculate quote total from line items |
| `calculate_next_occurrence` | maintenance_schedule.next_occurrence | Calculate next scheduled maintenance date |

---

## Action Schema (from ENTITY-EXPANSION-DESIGN.md)

The design doc specifies this exact format:

```json
{
  "notify_customer": {
    "type": "notification",
    "template": "status_change",
    "recipient": { "field": "customer_id" },
    "description": "Notify customer of status change"
  },
  
  "create_quote_from_recommendation": {
    "type": "create_entity",
    "entity": "quote",
    "copyFields": ["customer_id", "property_id", "description", "estimated_cost"],
    "mapping": { "estimated_cost": "total_amount" },
    "setFields": {
      "status": "draft",
      "origin_type": "recommendation",
      "origin_id": { "field": "id" }
    },
    "description": "Create quote from approved recommendation"
  },
  
  "update_invoice_paid": {
    "type": "update_entity",
    "target": { "entity": "invoice", "id": { "field": "invoice_id" } },
    "updates": { "status": "paid", "paid_at": { "compute": "now" } },
    "when": { "compute": "invoice_fully_paid" },
    "description": "Mark invoice as paid when payments equal total"
  },
  
  "recalculate_invoice_total": {
    "type": "compute",
    "target": "invoice.total_amount",
    "formula": "SUM(line_items.amount)",
    "description": "Recalculate invoice total from line items"
  }
}
```

---

## Implementation Plan

### Phase 1: Core Actions (4 notifications)

These enable basic workflow notifications:

```json
{
  "notify_customer": { "type": "notification", "template": "status_change", "recipient": { "field": "customer_id" } },
  "notify_technician": { "type": "notification", "template": "assignment", "recipient": { "field": "assigned_technician_id" } },
  "notify_creator": { "type": "notification", "template": "update", "recipient": { "field": "created_by" } },
  "notify_approvers": { "type": "notification", "template": "approval_required", "recipient": { "role": "manager" } }
}
```

### Phase 2: Entity Creation Actions (4 create_entity)

These enable workflow progression:

```json
{
  "create_quote_from_recommendation": { "type": "create_entity", "entity": "quote", ... },
  "create_work_order_from_quote": { "type": "create_entity", "entity": "work_order", ... },
  "generate_invoice": { "type": "create_entity", "entity": "invoice", ... },
  "create_work_order_from_schedule": { "type": "create_entity", "entity": "work_order", ... }
}
```

### Phase 3: Update & Compute Actions (6 remaining)

```json
{
  "apply_pending_change": { "type": "update_entity", ... },
  "update_invoice_paid": { "type": "update_entity", ... },
  "update_inventory_from_receipt": { "type": "update_entity", ... },
  "recalculate_invoice_total": { "type": "compute", ... },
  "recalculate_quote_total": { "type": "compute", ... },
  "calculate_next_occurrence": { "type": "compute", ... }
}
```

---

## Validation

Action handlers already exist in `action-handlers.js`. The handlers validate configs during execution:

```javascript
// Existing handler pattern (verified)
const handlers = {
  notification: async (config, context) => { /* validates template, recipient */ },
  create_entity: async (config, context) => { /* validates entity, copyFields */ },
  update_entity: async (config, context) => { /* validates target, updates */ },
  compute: async (config, context) => { /* validates target, formula */ },
};
```

---

## Test Strategy

### Unit Tests

1. **Action loading:** Verify actions.json parses correctly
2. **Handler dispatch:** Verify correct handler called per type
3. **Field resolution:** Verify `{ field: 'customer_id' }` resolves from context

### Integration Tests

1. Hook triggers action → action creates record
2. Notification action resolves targets correctly
3. Compute action calculates correctly

---

## Files to Modify

| File | Change |
|------|--------|
| `config/actions.json` | Populate `actions` object |
| `config/action-handlers.js` | Add validation on load |

---

## Dependencies

| This Gap | Depends On | Blocks |
|----------|------------|--------|
| GAP-1 | Nothing | GAP-2, GAP-3 (hooks need actions) |

---

## Implementation Checklist

- [ ] Define Phase 1 actions in actions.json
- [ ] Add startup validation in action-handlers.js
- [ ] Test action execution manually
- [ ] Add unit tests for each action type
- [ ] Document action schema for future additions
