# Metadata Completion - Implementation Plan

**Status:** ✅ READY FOR IMPLEMENTATION  
**Last Review:** April 10, 2026 (Multi-persona audit complete)  
**Goal:** 85% → 100% completion  
**Estimated Effort:** ~2-3 focused sessions

---

## Design Documents (Reviewed & Refined)

| Document | Purpose | Status |
|----------|---------|--------|
| [METADATA-COMPLETION-PLAN.md](METADATA-COMPLETION-PLAN.md) | Coordinator | ✅ Final |
| [GAP-1-ACTIONS.md](completion/GAP-1-ACTIONS.md) | Actions registry | ✅ Reviewed |
| [GAP-2-HOOKS-BEFORE.md](completion/GAP-2-HOOKS-BEFORE.md) | beforeChange hooks | ✅ Reviewed |
| [GAP-3-HOOKS-AFTER.md](completion/GAP-3-HOOKS-AFTER.md) | afterChange hooks | ✅ Reviewed |
| [GAP-4-STRUCTURE.md](completion/GAP-4-STRUCTURE.md) | Entity structureType | ✅ Reviewed |
| [GAP-5-TRAITS.md](completion/GAP-5-TRAITS.md) | Entity traits[] | ✅ Reviewed |
| [HOOKS-ENGINE.md](completion/HOOKS-ENGINE.md) | Hook evaluation service | ✅ Reviewed |

---

## Implementation Phases

### Phase A: Foundation (No Behavior Change)

Safe infrastructure work. All existing tests must continue passing.

#### A.1: Populate Actions Registry
**Effort:** 30 min  
**Files:** `config/actions.json`

```bash
# Steps:
1. Copy 14 actions from ENTITY-EXPANSION-DESIGN.md lines 575-680
2. Validate JSON syntax
3. Run existing action-handlers tests: npm test -- action-handlers
4. Verify: Actions load without error on server start
```

**Acceptance:**
- [ ] `actions.json` has 14 action definitions
- [ ] Server starts without errors
- [ ] Existing tests pass

#### A.2: Add Entity Traits to Workflow Entities
**Effort:** 20 min  
**Files:** 7 entity metadata files

```javascript
// Add to each workflow entity:
traits: ['workflow', 'auditable'],
```

**Entities:**
- work_order-metadata.js
- invoice-metadata.js
- quote-metadata.js
- recommendation-metadata.js
- purchase_order-metadata.js
- service_agreement-metadata.js
- visit-metadata.js

**Acceptance:**
- [ ] 7 entities have `traits: ['workflow', 'auditable']`
- [ ] `npm run sync:all` passes
- [ ] All tests pass

#### A.3: Add Entity Structure to Junction Tables
**Effort:** 10 min  
**Files:** 3 entity metadata files

```javascript
// Add to each junction table:
structureType: 'junction',
```

**Entities:**
- visit-technician-metadata.js
- visit-subcontractor-metadata.js
- property-role-metadata.js

**Acceptance:**
- [ ] 3 entities have `structureType: 'junction'`
- [ ] All tests pass

---

### Phase B: Hook Engine (Infrastructure)

Build the hook evaluation service. Still no behavior change (no entities use hooks yet).

#### B.1: Create Hook Service
**Effort:** 1 hour  
**Files:** Create `services/hook-service.js`

```javascript
// Core exports:
module.exports = {
  evaluateBeforeHooks,  // Returns { allowed, blockReason, requiresApproval }
  evaluateAfterHooks,   // Returns { actionsExecuted, errors }
  matchesOn,            // Pattern matching for 'on' property
};
```

**Implementation per HOOKS-ENGINE.md:**
- Pattern matching for `on` (create, change, delete, transitions)
- Cascade depth tracking (max 3)
- Context building for action execution

**Acceptance:**
- [ ] `hook-service.js` created
- [ ] Unit tests for `matchesOn` function
- [ ] Unit tests for cascade depth limiting

#### B.2: Hook Service Unit Tests
**Effort:** 45 min  
**Files:** Create `__tests__/unit/services/hook-service.test.js`

**Test cases:**
1. `matchesOn` - all 6 pattern types
2. `evaluateBeforeHooks` - blocked hook returns `allowed: false`
3. `evaluateBeforeHooks` - bypassRoles allows blocked transition
4. `evaluateBeforeHooks` - requiresApproval returns correct flag
5. `evaluateAfterHooks` - triggers action from registry
6. Cascade depth limiting at depth 3

---

### Phase C: Wire Hooks into Service Layer

Connect hooks to actual data flow. This introduces behavior changes.

#### C.1: Wire Hook Service into GenericEntityService
**Effort:** 1 hour  
**Files:** Modify `services/generic-entity-service.js`

```javascript
// In update():
async update(entityName, id, data, options) {
  return this.db.transaction(async (tx) => {
    const metadata = getEntityMetadata(entityName);
    const existing = await this.findById(entityName, id, { tx });
    
    // 1. Evaluate beforeChange for changed fields
    for (const [field, newValue] of Object.entries(data)) {
      const hooks = metadata.fields?.[field]?.beforeChange;
      if (hooks?.length) {
        const result = await hookService.evaluateBeforeHooks({
          hooks,
          oldValue: existing[field],
          newValue,
          context: { entity: entityName, record: existing, user: options.user },
        });
        if (!result.allowed) {
          throw new HookBlockedError(result.blockReason);
        }
      }
    }
    
    // 2. Apply update
    const updated = await this.applyUpdate(tx, entityName, id, data);
    
    // 3. Evaluate afterChange for changed fields
    for (const [field, newValue] of Object.entries(data)) {
      const hooks = metadata.fields?.[field]?.afterChange;
      if (hooks?.length) {
        await hookService.evaluateAfterHooks({
          hooks,
          oldValue: existing[field],
          newValue,
          context: { entity: entityName, record: updated, user: options.user, tx },
        });
      }
    }
    
    return updated;
  });
}
```

**Acceptance:**
- [ ] Hook service integrated into update flow
- [ ] Entity without hooks: no behavior change
- [ ] All existing tests pass

#### C.2: Integration Tests
**Effort:** 30 min  
**Files:** Create `__tests__/integration/hook-service.int.test.js`

**Test cases:**
1. Update entity with no hooks → success
2. Update entity with blocking hook → 403 Forbidden
3. Update entity with afterChange hook → action triggered

---

### Phase D: Activate Hooks on Entities

Add hooks to actual entity metadata. Each entity gets its own small PR.

#### D.1: Quote Entity Hooks
**Effort:** 30 min  
**File:** `quote-metadata.js`

```javascript
fields: {
  status: {
    // ... existing
    afterChange: [
      { on: '→accepted', do: 'create_work_order_from_quote' },
      { on: 'change', do: 'notify_customer' },
    ],
  },
}
```

#### D.2: Recommendation Entity Hooks
**Effort:** 30 min  
**File:** `recommendation-metadata.js`

```javascript
fields: {
  status: {
    afterChange: [
      { on: '→approved', do: 'create_quote_from_recommendation' },
    ],
  },
}
```

#### D.3: Work Order Entity Hooks
**Effort:** 30 min  
**File:** `work-order-metadata.js`

```javascript
fields: {
  status: {
    afterChange: [
      { on: '→completed', do: 'generate_invoice' },
    ],
  },
}
```

---

## Summary Timeline

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| A.1 Actions | 30 min | None |
| A.2 Traits | 20 min | None |
| A.3 Structure | 10 min | None |
| B.1 Hook Service | 1 hr | A.1 |
| B.2 Unit Tests | 45 min | B.1 |
| C.1 Wire Service | 1 hr | B.1 |
| C.2 Int Tests | 30 min | C.1 |
| D.1-3 Entity Hooks | 1.5 hr | C.1 |

**Total:** ~6 hours of focused work

---

## Principles Applied

- **KISS:** Each phase is small and focused
- **SRP:** Hook service has one job: evaluate hooks
- **DRY:** Actions defined once, used everywhere
- **Iterative:** Phase A is safe, Phase B adds infrastructure, Phase C/D add behavior

---

## Rollback Strategy

Each phase can be reverted independently:
- **Phase A:** Remove traits/structure from metadata files
- **Phase B:** Remove hook-service.js
- **Phase C:** Revert generic-entity-service.js changes
- **Phase D:** Remove hooks from entity metadata

---

## Success Criteria

- [ ] `actions.json` populated with 14 actions
- [ ] `hook-service.js` created with tests
- [ ] 7 workflow entities have `traits: ['workflow', 'auditable']`
- [ ] 3 junction entities have `structureType: 'junction'`
- [ ] At least 3 entities have live hooks
- [ ] All 11,112+ tests still pass
