# RLS Engine Unit Testing Plan

## Overview

Unit tests for the Rule-Based RLS Engine (ADR-011).

## Module Structure

```
backend/__tests__/unit/db/helpers/rls/
├── README.md                    # This file
├── filter-parser.test.js        # Filter → SQL conversion
├── rule-matcher.test.js         # Rule matching logic
├── clause-builder.test.js       # SQL clause building
├── sql-cache.test.js            # Memoization cache
├── path-validator.test.js       # Startup validation
└── index.test.js                # Integration (buildRLSFilter)
```

## Test Categories per Module

### 1. filter-parser.test.js

**OPERATORS export:**
- Verify frozen object
- Contains expected operators (eq, ne, lt, gt, lte, gte, in, is_null, is_not_null)

**parseFilter():**
- Empty filter → empty result
- Single field equality → parameterized SQL
- Multiple fields → AND-joined conditions
- Each operator type:
  - `eq`: `field = $n`
  - `ne`: `field != $n`
  - `lt`, `gt`, `lte`, `gte`: comparisons
  - `in`: `field = ANY($n::text[])` (array param)
  - `is_null`: `field IS NULL` (no param)
  - `is_not_null`: `field IS NOT NULL` (no param)
- Table alias handling (with/without)
- Parameter offset tracking
- Error cases:
  - Invalid field name (SQL injection attempt)
  - Unknown operator
  - Exceeds MAX_FILTER_CONDITIONS

### 2. rule-matcher.test.js

**matchRules():**
- No rules → empty array
- No matching role → empty array
- No matching operation → empty array
- Single role match
- Multiple roles with wildcard `*`
- Role array matching
- Operations as string vs array
- Operation wildcard `*`
- Multiple matching rules retained

**getContextValue():**
- Standard keys (userId, customerProfileId, technicianProfileId)
- Literal/non-context values returned as-is
- Undefined context key → undefined

**isValidAccessType():**
- Valid types (direct, junction) → true
- Invalid types (parent, custom) → false

### 3. clause-builder.test.js

**buildAccessClause():**
- null access → TRUE clause
- Unknown type → AppError

**buildDirectClause():**
- Valid field + context value → parameterized condition
- Missing field → AppError
- Missing context value → FALSE
- Table alias handling

**buildJunctionClause():**
- Complete junction config → EXISTS subquery
- Missing junction config → AppError
- Missing required fields → AppError
- Filter resolution (context value interpolation)
- Unique alias generation (j0, j1, j2...)
- nextAliasCounter tracking

**combineClausesOr():**
- Empty array → FALSE
- Single clause → returned as-is
- Multiple clauses → OR-joined
- FALSE clauses filtered out
- TRUE clause short-circuits

**resolveFilterValues():**
- Context reference resolved
- Literal values preserved
- Mixed resolution

### 4. sql-cache.test.js

**getCacheKey():**
- Correct format: `entity:operation:role`

**getCachedClause() / cacheClause():**
- Cache miss → null
- Cache hit after set
- Different keys isolated

**Eviction:**
- Entries evicted when exceeding CACHE_MAX_SIZE
- Oldest entries evicted first

**clearCache():**
- All entries removed
- Stats reflect cleared state

**invalidateEntity():**
- Only matching entity keys removed
- Other entities unaffected

**getCacheStats():**
- Returns correct size and maxSize

### 5. path-validator.test.js

**validateAllRules():**
- Valid metadata → { valid: true, errors: [] }
- Exceeds MAX_RULES_PER_ENTITY → error
- Invalid rules accumulate errors

**validateRule():**
- Missing id → error
- Missing roles → error
- Missing operations → error
- Invalid roles type → error
- Invalid operations type → error

**validateAccess():**
- Non-object access → error
- Missing type → error
- Invalid type → error with valid types listed
- Valid direct access
- Invalid direct field → error
- Valid junction access

**validateJunctionAccess():**
- Missing junction config → error
- Missing table/localKey/foreignKey → errors
- Invalid identifier names → errors
- Exceeds MAX_FILTER_CONDITIONS → error
- Through validation (hop counting)
- Cycle detection

**countHops():**
- Single hop → 1
- Multi-hop → correct count

**detectCycle():**
- No cycle → null
- Cycle present → error message

### 6. index.test.js (Integration)

**buildRLSFilter():**
- Missing context/metadata → not applied
- No rlsRules → not applied
- No matching rules → deny (1=0)
- Full access (null access) → no filter
- Direct access rule → parameterized WHERE
- Junction access rule → EXISTS
- Multiple rules → OR-combined
- Alias counter flows through rules
- Parameter offset tracking

**validateAllRules():**
- Valid metadata → no throw
- Invalid metadata → throws AppError

**Module exports:**
- All expected exports present

## Test Fixtures

### Sample RLS Rules
```javascript
const directRule = {
  id: 'owner-read',
  roles: ['customer'],
  operations: ['read'],
  access: { type: 'direct', field: 'customer_profile_id', value: 'customerProfileId' }
};

const junctionRule = {
  id: 'unit-access',
  roles: ['customer'],
  operations: ['read'],
  access: {
    type: 'junction',
    junction: {
      table: 'customer_units',
      localKey: 'id',
      foreignKey: 'unit_id',
      filter: { customer_profile_id: 'customerProfileId' }
    }
  }
};

const fullAccessRule = {
  id: 'admin-all',
  roles: ['admin'],
  operations: '*',
  access: null
};
```

### Sample Context
```javascript
const customerContext = {
  role: 'customer',
  userId: 1,
  customerProfileId: 100,
  technicianProfileId: null
};

const adminContext = {
  role: 'admin',
  userId: 2,
  customerProfileId: null,
  technicianProfileId: null
};
```

## Mocking Strategy

- No database mocking needed (pure functions)
- Mock `logger` to verify logging calls
- Use real `sanitizeIdentifier` (integration boundary)
- Use real `RLS_ENGINE` constants

## Coverage Targets

- Line coverage: 90%+
- Branch coverage: 85%+
- All error paths tested
- All edge cases documented
