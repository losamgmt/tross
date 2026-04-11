# Hook System Testing Architecture Audit

> Generated from comprehensive codebase analysis. Synthesizes existing patterns, industry best practices, and specific recommendations for completing hook system test coverage.

## Executive Summary

**Current State**: Hook infrastructure is implemented and wired into GenericEntityService, but **test coverage is incomplete**:
- ✅ `hook-service.js` has 37 unit tests (pure function testing)
- ❌ `GenericEntityService` hook integration is **NOT tested**
- ❌ No integration scenarios for hook behavior exist

**Critical Gap**: The service layer calls `evaluateBeforeHooks` and `evaluateAfterHooks`, but these calls are never verified by tests. Existing tests pass because entities used in tests don't have hooks defined.

---

## Part 1: Existing Testing Architecture

### 1.1 Test Directory Structure
```
__tests__/
├── unit/                    # Fast, isolated tests (5s timeout)
│   ├── services/            # Service layer tests
│   ├── config/              # Configuration tests
│   └── middleware/          # Middleware tests
├── integration/             # Real DB tests (10s timeout)
│   ├── all-entities.test.js # Factory-of-factories entry point
│   └── *.test.js            # Direct integration tests
├── factory/                 # Test generation infrastructure
│   ├── entity-registry.js   # SSOT for entity discovery
│   ├── runner.js            # Scenario executor
│   ├── service-registry.js  # Service metadata
│   └── scenarios/           # 15 scenario files
└── mocks/                   # Centralized mock factories
    ├── db-mocks.js          # createDBMock(), mockTransaction()
    ├── service-mocks.js     # Service mocking utilities
    └── index.js             # Unified export
```

### 1.2 Key Patterns

#### Factory-of-Factories Pattern
The factory pattern generates tests dynamically from metadata:

```javascript
// entity-registry.js - Auto-discovers entities from config/models
function getAllEntityNames() { 
  return Object.keys(models).filter(isBusinessEntity); 
}

// runner.js - Runs all applicable scenarios for an entity
function runEntityTests(entityName, ctx) {
  const metadata = getEntityMetadata(entityName);
  Object.entries(allScenarios).forEach(([name, scenarioFn]) => {
    scenarioFn(metadata, ctx); // Scenarios self-select
  });
}
```

#### Scenario Self-Selection Pattern
Scenarios check preconditions and skip gracefully:

```javascript
// crud.scenarios.js
function crudScenarios(metadata, ctx) {
  const caps = getCapabilities(metadata);
  if (!caps.canCreate) return; // Skip if can't create
  
  ctx.it('should create entity', async () => {
    // Test implementation
  });
}
```

#### Centralized Mock Pattern
All mocks in `__tests__/mocks/` with consistent interfaces:

```javascript
// In test files
jest.mock('../../../db/connection', () => require('../../mocks').createDBMock());
jest.mock('../../../config/logger', () => ({ logger: require('../../mocks').createLoggerMock() }));
```

### 1.3 Current Scenario Categories (15 files)
| Category | Purpose | Self-Selection Criteria |
|----------|---------|------------------------|
| `crud` | Basic CRUD operations | All entities |
| `validation` | Field validation rules | Has required fields |
| `relationships` | FK relationships | Has relationships defined |
| `rls` | Row-level security | Has RLS policy |
| `lifecycle` | Status/timestamp fields | Has status field |
| `audit` | Audit trail testing | Has audit fields |
| `fieldAccess` | Field-level permissions | Has field restrictions |
| `rlsFilter` | RLS filtering | Has filter RLS |
| `computed` | Computed columns | Has computed fields |
| `error` | Error handling | All entities |
| `search` | Search functionality | Has searchable fields |
| `response` | Response formatting | All entities |

---

## Part 2: Current Hook System Implementation

### 2.1 Hook Service (Pure Functions)
Location: `backend/services/hook-service.js`

| Function | Purpose | Test Coverage |
|----------|---------|---------------|
| `matchesOn(hook, context)` | Match hook triggers | ✅ 8 tests |
| `evaluateWhen(hook, context)` | Evaluate conditions | ✅ 9 tests |
| `evaluateBeforeHooks(params)` | Pre-mutation hooks | ✅ 10 tests |
| `evaluateAfterHooks(params)` | Post-mutation hooks | ✅ 10 tests |

### 2.2 Integration Points (GenericEntityService)
Hooks are evaluated in two service methods:

**create() method** (line ~1068):
```javascript
if (metadata.fields) {
  for (const [fieldName, value] of Object.entries(finalData)) {
    const hooks = metadata.fields[fieldName]?.afterChange;
    if (hooks?.length > 0) {
      await evaluateAfterHooks({ hooks, oldValue: null, newValue: value, ... });
    }
  }
}
```

**update() method** (line ~1257):
```javascript
// Before mutation
if (hooks?.length > 0) {
  const hookResult = await evaluateBeforeHooks({ hooks, oldValue, newValue, ... });
  if (!hookResult.allowed) {
    throw new AppError(hookResult.blockReason || 'Change blocked', 403, 'FORBIDDEN');
  }
}

// After mutation
await evaluateAfterHooks({ hooks, oldValue, newValue: newRecord[fieldName], ... });
```

### 2.3 Test Coverage Gap
| Component | Lines | Tests | Coverage |
|-----------|-------|-------|----------|
| hook-service.js | ~310 | 37 | ✅ High |
| GenericEntityService + hooks | ~50 | 0 | ❌ **None** |
| Integration scenarios | 0 | 0 | ❌ **None** |

---

## Part 3: Industry Best Practices

### 3.1 Testing Pyramid
```
          /\
         /  \  E2E (hooks.scenarios.js)
        /----\
       /      \  Integration (service + hooks + DB)
      /--------\
     /          \  Unit (hook-service.js, GenericEntityService mocked)
    /------------\
```

### 3.2 Testing Principles Applied

| Principle | Application |
|-----------|-------------|
| **Test behavior, not implementation** | Test that blocked hooks prevent mutations, not internal function calls |
| **Arrange-Act-Assert** | Clear test structure in all test files |
| **Single responsibility** | One assertion per test where practical |
| **Test isolation** | Each test resets state, no test dependencies |
| **Metadata-driven testing** | Scenarios self-select based on entity capabilities |

### 3.3 Hook Testing Best Practices

1. **Unit Level**: Mock `hook-service` module, verify call arguments
2. **Integration Level**: Real hooks + real DB, verify end-to-end behavior
3. **Edge Cases**: Approval workflows, blocking conditions, action failures
4. **Performance**: Hooks shouldn't cause N+1 query problems

---

## Part 4: Recommended Implementation

### 4.1 Layer 1: Unit Tests for GenericEntityService

Add to `__tests__/unit/services/generic-entity-service.test.js`:

```javascript
// Add mock at top
jest.mock('../../../services/hook-service', () => ({
  evaluateBeforeHooks: jest.fn().mockResolvedValue({ allowed: true }),
  evaluateAfterHooks: jest.fn().mockResolvedValue({ executed: [] }),
}));

const hookService = require('../../../services/hook-service');

describe('hook integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('update() with beforeChange hooks', () => {
    // Use entity with hooks defined (or mock metadata)
    
    it('should call evaluateBeforeHooks with correct arguments', async () => {
      // Arrange: Setup entity with beforeChange hook
      // Act: Call update()
      // Assert: Verify evaluateBeforeHooks was called with expected params
    });

    it('should throw 403 when beforeHook blocks change', async () => {
      hookService.evaluateBeforeHooks.mockResolvedValueOnce({
        allowed: false,
        blockReason: 'Policy violation',
      });
      // Act & Assert: Expect AppError(403)
    });

    it('should throw 202 when hook requires approval', async () => {
      hookService.evaluateBeforeHooks.mockResolvedValueOnce({
        allowed: false,
        requiresApproval: true,
        approvalInfo: { description: 'Manager approval needed' },
      });
      // Act & Assert: Expect AppError(202, 'APPROVAL_REQUIRED')
    });
  });

  describe('create() with afterChange hooks', () => {
    it('should call evaluateAfterHooks after successful create', async () => {
      // Verify afterHooks called with oldValue: null, newValue: created value
    });
  });

  describe('update() with afterChange hooks', () => {
    it('should call evaluateAfterHooks with old and new values', async () => {
      // Verify both oldValue and newValue are passed correctly
    });
  });
});
```

### 4.2 Layer 2: Integration Scenario

Create `__tests__/factory/scenarios/hooks.scenarios.js`:

```javascript
/**
 * Hook system integration scenarios
 * 
 * Self-selects for entities with beforeChange or afterChange hooks defined
 * Tests end-to-end hook execution with real database
 */

function hookScenarios(metadata, ctx) {
  const hasHooks = Object.values(metadata.fields || {}).some(
    field => field.beforeChange?.length > 0 || field.afterChange?.length > 0
  );
  
  if (!hasHooks) return; // Self-select: skip entities without hooks
  
  // Determine which fields have hooks
  const fieldsWithBeforeHooks = Object.entries(metadata.fields)
    .filter(([_, field]) => field.beforeChange?.length > 0)
    .map(([name]) => name);
  
  const fieldsWithAfterHooks = Object.entries(metadata.fields)
    .filter(([_, field]) => field.afterChange?.length > 0)
    .map(([name]) => name);

  // beforeChange hook tests
  if (fieldsWithBeforeHooks.length > 0) {
    ctx.describe('beforeChange hooks', () => {
      ctx.it('should evaluate hooks before field update', async () => {
        // Create entity, update field with hook, verify behavior
      });

      ctx.it('should block update when hook condition triggers', async () => {
        // Trigger blocking condition, verify 403 response
      });
    });
  }

  // afterChange hook tests  
  if (fieldsWithAfterHooks.length > 0) {
    ctx.describe('afterChange hooks', () => {
      ctx.it('should execute after-hooks on create', async () => {
        // Create entity with hooked field, verify action executed
      });

      ctx.it('should execute after-hooks on update', async () => {
        // Update hooked field, verify action with old+new values
      });
    });
  }
}

module.exports = { hookScenarios };
```

### 4.3 Register New Scenario

Update `__tests__/factory/scenarios/index.js`:

```javascript
const { hookScenarios } = require('./hooks.scenarios');

module.exports = {
  // ... existing scenarios
  hooks: hookScenarios,
};
```

---

## Part 5: Implementation Order

### Phase 1: Unit Tests (Highest Priority)
1. Add hook-service mock to generic-entity-service.test.js
2. Add `describe('hook integration')` test block
3. Test blocking behavior (403)
4. Test approval-required behavior (202)
5. Test afterHooks called with correct arguments
6. Run tests: `npm run test:unit`

### Phase 2: Integration Scenarios
1. Create `hooks.scenarios.js` with self-selection logic
2. Register in `scenarios/index.js`
3. Add hooks to test entity metadata (recommendation, quote, invoice)
4. Run tests: `npm run test:integration`

### Phase 3: End-to-End Validation
1. Verify all 5348+ tests still pass
2. Check new coverage metrics
3. Update documentation

---

## Part 6: Entity Metadata Updates Required

For integration tests to run, entities need hooks defined:

```json
// Example: recommendation (in config/models/recommendation.json)
{
  "fields": {
    "status": {
      "type": "enum",
      "beforeChange": [
        {
          "on": { "status": "approved" },
          "when": { "field": "amount", "gt": 5000 },
          "action": "requireApproval",
          "description": "High-value recommendations require manager approval"
        }
      ],
      "afterChange": [
        {
          "on": { "status": "approved" },
          "action": "notify",
          "params": { "recipients": "${assignedTo}" }
        }
      ]
    }
  }
}
```

---

## Appendix: File References

| File | Purpose |
|------|---------|
| [generic-entity-service.test.js](../../backend/__tests__/unit/services/generic-entity-service.test.js) | Add hook unit tests here |
| [hook-service.test.js](../../backend/__tests__/unit/services/hook-service.test.js) | Existing 37 unit tests |
| [scenarios/index.js](../../backend/__tests__/factory/scenarios/index.js) | Register new hooks scenario |
| [runner.js](../../backend/__tests__/factory/runner.js) | Scenario executor |
| [mocks/index.js](../../backend/__tests__/mocks/index.js) | Add hook-service mock if needed |
