# GAP-5: Entity Traits Classification

**Status:** 📋 DESIGN  
**Priority:** LOW (safe, no behavior change)  
**Parent:** [METADATA-COMPLETION-PLAN.md](../METADATA-COMPLETION-PLAN.md)

---

## Current State

| Component | Status |
|-----------|--------|
| `entity-traits.js` ENTITY_TRAITS enum | ✅ EXISTS |
| Helper functions (`hasTrait`, `isSystemTable`, `hasWorkflow`) | ✅ EXISTS |
| Entities using `traits[]` | ❌ 0 of 34 |

---

## Available Entity Traits (ACTUAL)

From `config/entity-traits.js` (verified):

```javascript
const ENTITY_TRAITS = Object.freeze({
  SYSTEM: 'system',           // Internal system table, not user-facing
  WORKFLOW: 'workflow',       // Has status-based lifecycle
  AUDITABLE: 'auditable',     // Changes tracked in audit_log
  UNCOUNTABLE: 'uncountable', // Excluded from dashboard/summary counts
});
```

**Note:** Only 4 traits exist. Entities may have ZERO OR MORE traits (composable).

---

## Trait Semantics

| Trait | Meaning | Behavior Impact |
|-------|---------|-----------------|
| `system` | Internal framework table | Hidden from nav, no user CRUD |
| `workflow` | Has status lifecycle | Status change hooks, approval flows |
| `auditable` | Changes tracked | Writes to audit_log on change |
| `uncountable` | Skip in counts | Excluded from dashboard totals |

---

## Entity Trait Classification

### Workflow Entities
Entities with status-based lifecycle:

| Entity | Traits |
|--------|--------|
| `work_order` | `['workflow', 'auditable']` |
| `invoice` | `['workflow', 'auditable']` |
| `quote` | `['workflow', 'auditable']` |
| `recommendation` | `['workflow', 'auditable']` |
| `purchase_order` | `['workflow', 'auditable']` |
| `service_agreement` | `['workflow', 'auditable']` |
| `visit` | `['workflow', 'auditable']` |

### System Entities
Internal tables not user-facing:

| Entity | Traits |
|--------|--------|
| `saved_view` | `['system']` |
| `role` | `['system']` |

### Auditable-Only Entities
Changes tracked but no workflow:

| Entity | Traits |
|--------|--------|
| `customer` | `['auditable']` |
| `property` | `['auditable']` |
| `technician` | `['auditable']` |
| `vendor` | `['auditable']` |

### No Traits (Standard)
Most entities — no special behaviors:

| Entity | Traits |
|--------|--------|
| `visit_technician` | `[]` (junction) |
| `unit` | `[]` |
| (most others) | `[]` |

---

## Implementation

### Pattern

Add to metadata files (only for entities WITH traits):

```javascript
// In work-order-metadata.js
const workOrderMetadata = {
  entityKey: 'work_order',
  traits: ['workflow', 'auditable'],  // ← Only add if NOT empty
  // ... rest of metadata
};
```

**Note:** Entities with no traits don't need `traits: []` — undefined is equivalent.

### Validation

Validation uses existing `entity-traits.js` helpers:

```javascript
const { ENTITY_TRAITS, hasTrait } = require('./entity-traits');

function validateEntityTraits(metadata) {
  if (!Array.isArray(metadata.traits)) return;
  
  const validTraits = Object.values(ENTITY_TRAITS);
  
  for (const trait of metadata.traits) {
    if (!validTraits.includes(trait)) {
      throw new Error(`Invalid trait '${trait}' for ${metadata.entityKey}`);
    }
  }
}
```

---

## Usage Examples

```javascript
const { hasTrait, hasWorkflow, isSystemTable, ENTITY_TRAITS } = require('./entity-traits');

// Check for workflow status handling
if (hasWorkflow(entityMetadata)) {
  // Enable status change hooks, approval flows
}

// Check for system table
if (isSystemTable(entityMetadata)) {
  // Hide from navigation
}

// Check for auditable
if (hasTrait(entityMetadata, ENTITY_TRAITS.AUDITABLE)) {
  // Write to audit_log on change
}
```

---

## Benefits

1. **Workflow routing:** `workflow` trait enables status hooks
2. **Audit automation:** `auditable` trait triggers audit_log writes
3. **UI filtering:** `system` trait hides from user nav
4. **Dashboard logic:** `uncountable` trait excludes from totals

---

## Implementation Checklist

- [ ] Identify workflow entities (~7 entities)
- [ ] Add `traits: ['workflow', 'auditable']` to those files
- [ ] Identify system entities (~2 entities)
- [ ] Add `traits: ['system']` to those files
- [ ] Verify validation uses existing helpers
- [ ] Most entities need NO changes
