# Metadata Completion Plan - Coordinator Document

**Status:** ✅ DESIGN REVIEWED & READY  
**Goal:** 85% → 100% metadata refactor completion  
**Date:** April 10, 2026  
**Last Review:** April 10, 2026 (Multi-persona audit complete)

---

## Executive Summary

The field-centric metadata migration is **85% complete**. This document coordinates the remaining 15% — the hooks/actions/traits system that is DESIGNED but NOT IMPLEMENTED.

## Current State (Verified April 10, 2026)

### ✅ Implemented
- 34 entity metadata files using `TIER1_FIELDS`, `withTraits()`
- Field trait system (`TRAITS`, `TRAIT_SETS`)
- Accessor layer (11 consumer files)
- RLS engine with ADR-011 rules
- Sync pipeline (34 entities synced)
- 11,112 passing tests

### ❌ Gaps (Design Exists, Code Doesn't)
| Gap ID | Component | Design Location | Implementation Status |
|--------|-----------|-----------------|----------------------|
| GAP-1 | Actions Registry | ENTITY-EXPANSION-DESIGN.md | File exists, `"actions": {}` empty |
| GAP-2 | beforeChange Hooks | ENTITY-EXPANSION-DESIGN.md | 0 entities use `beforeChange` |
| GAP-3 | afterChange Hooks | ENTITY-EXPANSION-DESIGN.md | 0 entities use `afterChange` |
| GAP-4 | Entity Structure | entity-traits.js | 0 entities use `structureType` |
| GAP-5 | Entity Traits | entity-traits.js | 0 entities use `traits[]` |

---

## Design Document Index

Each gap is addressed by a focused design document:

| Document | Covers | Priority | Blocking? |
|----------|--------|----------|-----------|
| [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) | Executable steps | — | — |
| [GAP-1-ACTIONS.md](./completion/GAP-1-ACTIONS.md) | Actions registry population | Medium | No |
| [GAP-2-HOOKS-BEFORE.md](./completion/GAP-2-HOOKS-BEFORE.md) | beforeChange hook wiring | High | No |
| [GAP-3-HOOKS-AFTER.md](./completion/GAP-3-HOOKS-AFTER.md) | afterChange hook wiring | High | No |
| [GAP-4-STRUCTURE.md](./completion/GAP-4-STRUCTURE.md) | Entity structureType migration | Low | No |
| [GAP-5-TRAITS.md](./completion/GAP-5-TRAITS.md) | Entity traits[] migration | Low | No |
| [HOOKS-ENGINE.md](./completion/HOOKS-ENGINE.md) | Hook evaluation engine | High | Yes (for GAP-2/3) |

---

## Implementation Order

### Phase A: Foundation (No Entity Changes)
1. **HOOKS-ENGINE** — Build the hook evaluation service
2. **GAP-1-ACTIONS** — Populate actions.json

### Phase B: Entity Classification (Safe, No Behavior Change)
3. **GAP-4-STRUCTURE** — Add `structureType` to entities
4. **GAP-5-TRAITS** — Add `traits[]` to entities

### Phase C: Hook Activation (Behavior Changes)
5. **GAP-2-HOOKS-BEFORE** — Add beforeChange hooks to entities
6. **GAP-3-HOOKS-AFTER** — Add afterChange hooks to entities

---

## Design Principles (Cross-Reference)

All designs must align with:

1. **ARCHITECTURE.md** — KISS, Security-First, SSOT
2. **ARCHITECTURE_LOCK.md** — Locked patterns (Entity Contract, Triple-Tier Security)
3. **ENTITY-EXPANSION-DESIGN.md** — Field-centric model, Unified Hooks
4. **ADR-011** — Rule-based RLS engine patterns

---

## Success Criteria

- [ ] `actions.json` populated with 15 actions from design doc
- [ ] Hook evaluation engine passes unit tests
- [ ] At least 3 workflow entities have hooks wired
- [ ] All 34 entities have `structureType` (default: 'standard')
- [ ] Workflow entities have `traits: ['workflow']`
- [ ] All existing tests still pass (11,112)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Hooks cause infinite loops | Max cascade depth (3), cycle detection at load |
| Actions break transactions | All actions run within existing tx |
| Migration breaks tests | Dry-run mode first, feature flags |

---

## Next Steps

1. ✅ Coordinator document created
2. ✅ All GAP-*.md design documents created
3. ✅ Designs reviewed and refined for consistency
4. ✅ Implementation plan created: [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)
5. Begin Phase A: Foundation work
3. Cross-reference and refine each design
4. Discuss implementation approach
