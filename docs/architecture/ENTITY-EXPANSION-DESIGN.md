# Entity Expansion Design Document

**Date:** March 31, 2026  
**Status:** Phase 2 Design Complete ✅  
**Scope:** 31 entities (all), Field-Centric Metadata Redesign

---

## Executive Summary

This document captures the design decisions for expanding the Tross entity model with 11 new entities AND a fundamental metadata architecture redesign. The design follows a phased approach:

- **Phase 1 (COMPLETE ✅):** Core entity contracts — metadata files created, synced
- **Phase 2 (DESIGN COMPLETE ✅):** Field-Centric Metadata, Guards/Triggers/Actions, FK relationships
- **Phase 3:** Implementation — Approval workflow engine, automation actions

### Phase 1 Completion Summary
- 11 metadata files created in `backend/config/models/`
- `npm run sync:all` passed (31 total entities)  
- Unit and E2E tests pass
- Integration tests skip new entities (no DB tables yet - by design)
- Database will be dropped/rebuilt after Phase 2

### Phase 2 Design Milestone (April 1, 2026)
Major architectural decisions locked in:
- **Field-Centric Design:** All field rules live ON the field, not in entity-level arrays
- **One Concept, One Expression:** Every semantic concept has exactly one canonical form
- **Explicit Defaults:** Every property has documented defaults; all validation at load time
- **Unified Hooks Model:** `beforeChange`/`afterChange` replace Guards/Triggers/Actions
- **Unified Entity Contract:** One contract with optional sections (not two distinct contracts)

### Phase 2 FK Implementation (April 2, 2026) ✅
All 10 entities updated with FK relationships and RLS rules:

| Entity | FK Fields Added | RLS Type |
|--------|----------------|----------|
| work_order | `origin_type`, `origin_id` (polymorphic) | existing |
| quote | `customer_id` (req), `property_id` | direct |
| visit | `work_order_id` (req) | parent |
| recommendation | `customer_id` (req), `asset_id` | direct |
| maintenance_schedule | `customer_id` (req), `asset_id`, `service_template_id` | direct |
| service_agreement | `customer_id` (req) | direct |
| purchase_order | `vendor_id` (req), `work_order_id` | existing |
| receipt | `work_order_id`, `purchase_order_id` | existing |
| payment | `customer_id` (req), `invoice_id` | direct |

**Verification:** 2,879 unit tests ✅ | 2,465 integration tests ✅

### Phase 2A-0: Foundation Work (April 3, 2026) ✅
Pre-migration foundation enabling backwards-compatible field-centric refactoring:

| Component | Status | Purpose |
|-----------|--------|----------|
| `metadata-accessors.js` | ✅ Created | Backwards-compat field property access (reads field-level first, falls back to legacy arrays) |
| `action-handlers.js` | ✅ Created | Generic action type interpreters (notification, create_entity, update_entity, compute) |
| `actions.json` + `actions-schema.json` | ✅ Created | Central actions registry with JSON Schema validation |
| `entity-metadata-validator.js` | ✅ Updated | Added field-level boolean/access/hooks validation (dual-support during migration) |
| Parity tests | ✅ Created | 26 accessor tests + 24 handler tests |

**Key Design Decisions Locked:**
- **JSON for actions registry:** Pure config (no code changes for new actions)
- **Generic hooks system:** Any entity, any field, any change type (not field-specific)
- **Backwards compatibility:** Accessors support both legacy arrays and field-level properties during migration
- **Validator dual-support:** Accepts both UI-mode access (`create/edit/view`) and role-based access (`create/read/update/delete`)

**New Files:**
- `backend/config/metadata-accessors.js` — Field property accessors with deprecation warnings
- `backend/config/action-handlers.js` — Generic action interpreters
- `backend/config/actions.json` — Empty actions registry (populated as hooks are added)
- `backend/config/actions-schema.json` — JSON Schema for actions validation
- `backend/__tests__/unit/config/metadata-accessors.test.js` — 26 tests
- `backend/__tests__/unit/config/action-handlers.test.js` — 24 tests

**Verification:** 2,947 unit tests ✅ | 2,667 integration tests ✅

---

## Quick Start (The 3 Things That Matter Most)

New to this system? Start here. These 3 principles cover 80% of what you need to know.

### 1. Everything About a Field Lives ON the Field

```javascript
// ❌ OLD: Hunt across 6 arrays to understand one field
requiredFields: ['name'],
immutableFields: ['name'],
searchableFields: ['name'],
fieldAccess: { name: { ... } }

// ✅ NEW: One location tells the whole story
fields: {
  name: {
    type: 'string',
    required: true,
    immutable: true,
    searchable: true,
    access: { create: 'customer', read: 'any', update: 'none' },
  }
}
```

**Rule:** When you need to know about a field, look at the field. That's it.

### 2. Hooks Do Two Things: Block or React

```javascript
// beforeChange: Can BLOCK the change (runs BEFORE commit)
beforeChange: [
  { on: 'draft→published', blocked: true, bypassRoles: ['manager'] }
]

// afterChange: Can REACT to the change (runs AFTER commit)
afterChange: [
  { on: 'published', do: 'notify_subscribers' }
]
```

**Rules:**
- `beforeChange` can block, require approval, or conditionally allow
- `afterChange` can only trigger actions (cannot block — change already happened)
- First hook to block wins; all afterChange hooks run

### 3. Actions Live in the Registry, Not in Metadata

```javascript
// In metadata: reference by ID
afterChange: [{ on: 'approved', do: 'create_quote_from_recommendation' }]
```

```json
// In config/actions.json: define once, use everywhere
{
  "create_quote_from_recommendation": {
    "type": "create_entity",
    "entity": "quote",
    "copyFields": ["customer_id", "description"]
  }
}
```

**Rule:** Metadata says WHAT happens. Actions registry says HOW it happens.

---

### Want More? Read These Sections:

| If you're... | Read |
|--------------|------|
| Adding a new field | [Unified Field Schema](#unified-field-schema-complete-reference) |
| Adding workflow logic | [Unified Hooks Model](#unified-hooks-model-revision-april-1-2026) |
| Creating a new entity | [Unified Entity Contract](#unified-entity-contract-revision-april-1-2026) |
| Understanding the full picture | [Twelve Guiding Principles](#twelve-guiding-principles) |

---

## Design Principles

### 1. System-Mediated State Changes
Users trigger *actions*, system makes *changes*. Approval workflows use a generic `approval_request` entity rather than per-entity status transition logic.

### 2. Three-Layer Access Model
1. **entityPermissions** — Can this role interact with this entity?
2. **RLS** — Which specific records can they access?
3. **fieldAccess** — Which fields can they read/modify?

### 3. NavGroup = User Intent
- **work** — What am I working on?
- **resources** — What do I use to do work?
- **finance** — Where's the money?

### 4. Metadata as SSOT
All validation, permissions, and workflow rules live in metadata. Services consume the SSOT — no hardcoded business logic.

### 5. Shape Consistency
**Every entity metadata file MUST have the same first-order properties**, even when empty. This principle:
- Eliminates null/undefined checks in consuming code
- Enables generic tooling and iteration
- Makes audits trivial (diff any two files)
- Allows declarative schema validation

### 6. Field-Centric Design (Added April 1, 2026)

**Key Principle:** All field rules live ON the field, not in entity-level arrays.

**The Problem:**
```javascript
// OLD PATTERN — rule membership scattered across multiple arrays
module.exports = {
  fields: { name: { type: 'string' }, status: { type: 'enum' } },
  requiredFields: ['name'],
  immutableFields: ['status'],
  searchableFields: ['name'],
  filterableFields: ['name', 'status'],
  sortableFields: ['name', 'status'],
  fieldAccess: { status: { update: 'manager' } },
};
```
To know everything about `name`, you must check 6+ different places.

**The Solution:**
```javascript
// NEW PATTERN — all field rules consolidated on the field itself
fields: {
  name: {
    type: 'string',
    required: true,
    immutable: false,
    searchable: true,
    filterable: true,
    sortable: true,
    access: { create: 'any', read: 'any', update: 'any', delete: 'any' },
  },
  status: {
    type: 'enum',
    enumKey: 'status',
    required: true,
    immutable: true,      // once set, cannot change directly
    filterable: true,
    sortable: true,
    access: { create: 'system', read: 'any', update: 'system', delete: 'none' },
  },
}
```

**Benefits:**
| Aspect | Old (Arrays) | New (Field-Centric) |
|--------|--------------|---------------------|
| Find all rules for a field | Check 6+ arrays | One location |
| Add new field | Update 6+ arrays | One object |
| Field defaults | Implicit (absent = false?) | Explicit on field |
| Self-documenting | No | Yes |
| Generic iteration | Complex | Trivial |

**What Gets Moved to Fields:**
- `requiredFields: ['a']` → `a: { required: true }`
- `immutableFields: ['a']` → `a: { immutable: true }`
- `searchableFields: ['a']` → `a: { searchable: true }`
- `filterableFields: ['a']` → `a: { filterable: true }`
- `sortableFields: ['a']` → `a: { sortable: true }`
- `fieldAccess.a: { read: 'x' }` → `a: { access: { read: 'x', ... } }`

### 7. One Concept, One Expression (Revision April 1, 2026)

**Every semantic concept has exactly ONE canonical representation.**

| Concept | Canonical Form | Replaces |
|---------|---------------|----------|
| "This field identifies the entity" | `identity: {...}` | `isIdentity`, `namePattern`, `displayField`, `identityField`, `identifierPrefix` |
| "This field cannot change" | `immutable: true` | System constraint only |
| "Who can do what" | `access: {...}` | Role-based access |
| "Block or require approval" | `beforeChange: [...]` | `guards`, `approvalConfig` |
| "React after change" | `afterChange: [...]` | `triggers`, `approvalConfig.onApprove` |

### 8. Unified Identity Property

The identity field declares ALL identity-related information in one place:

```javascript
fields: {
  // AUTO_GENERATED pattern example
  work_order_number: {
    type: 'string',
    maxLength: 20,
    identity: {
      pattern: 'auto_generated',
      prefix: 'WO',
      template: '{prefix}-{year}-{sequence}',
    },
    required: true,
    immutable: true,
    searchable: true,
  },
  
  // USER_PROVIDED pattern example
  name: {
    type: 'string',
    maxLength: 100,
    identity: {
      pattern: 'user_provided',
    },
    required: true,
    searchable: true,
  },
  
  // PERSON_NAME pattern example (on display field)
  display_name: {
    type: 'string',
    identity: {
      pattern: 'person_name',
      compositeFields: ['first_name', 'last_name'],
    },
    // This is a computed/virtual field
  },
}
```

**Validation Rules:**
- Exactly ONE field per entity may have `identity`
- If `identity.pattern: 'auto_generated'`, must have `prefix` and `template`
- If `identity.pattern: 'person_name'`, must have `compositeFields`
- Validated at metadata load time (not runtime)

---

## Unified Hooks Model (Revision April 1, 2026)

### Overview: Two Phases, One Pattern

**Replaces:** Guards, Triggers, Actions (three concepts) and `approvalConfig`

The behavioral layer consists of exactly TWO hook types:

| Hook | Purpose | When | Can Block? |
|------|---------|------|------------|
| `beforeChange` | Validate, block, or require approval | Before commit | Yes |
| `afterChange` | React to committed changes | After commit | No |

### beforeChange Hooks (Blocking Logic)

Evaluated BEFORE a change is applied. Can block, require approval, or conditionally allow.

```javascript
status: {
  type: 'enum',
  beforeChange: [
    // Hook 1: Require approval for specific transition
    {
      on: 'open→approved',
      requiresApproval: { approver: 'customer' },
      description: 'Customer must approve recommendation',
    },
    // Hook 2: Block transition except for certain roles
    {
      on: 'approved→cancelled',
      blocked: true,
      bypassRoles: ['manager'],
      description: 'Only managers can cancel approved items',
    },
  ],
},

total_amount: {
  type: 'decimal',
  beforeChange: [
    // Conditional approval based on value
    {
      on: 'change',
      when: { field: 'total_amount', operator: '>', value: 10000 },
      requiresApproval: { approver: 'manager' },
    },
  ],
},
```

**Event Types for `on`:**
- `'create'` — Field being set on creation
- `'change'` — Any modification
- `'delete'` — Record being deleted
- `'oldValue→newValue'` — Specific transition (enums, status fields)

### afterChange Hooks (Reactive Logic)

Evaluated AFTER a change is successfully committed. Cannot block.

```javascript
status: {
  type: 'enum',
  afterChange: [
    // React to specific transition
    {
      on: 'draft→sent',
      do: 'notify_customer',  // Reference action by ID
    },
    {
      on: 'open→approved',
      do: 'create_quote_from_recommendation',
    },
    // React to any change with inline action
    {
      on: 'change',
      do: { log: { message: 'Status changed', level: 'info' } },
    },
  ],
},
```

**Action Reference:**
- `do: 'action_id'` — Reference action from central registry
- `do: { ... }` — Inline action (simple cases only)

### Actions Registry

Actions are system-level for reusability. All action IDs referenced in hooks MUST exist in this registry.

**File:** `backend/config/actions.json` (pure data, schema-validated)

#### Action Types

| Type | Purpose | Required Properties |
|------|---------|---------------------|
| `notification` | Send notification to user(s) | `template`, `recipient` |
| `create_entity` | Create a new entity record | `entity`, `copyFields` or `mapping` |
| `update_entity` | Update an existing entity | `target`, `updates` |
| `compute` | Recalculate a derived value | `target`, `formula` |
| `external` | Call external service (future) | `service`, `action`, `payload` |

#### Complete Actions Inventory

```json
// backend/config/actions.json — Central registry (pure data)
{
  "notify_customer": {
    "type": "notification",
    "template": "status_change",
    "recipient": { "field": "customer_id" },
    "description": "Notify customer of status change"
  },
  
  "notify_technician": {
    "type": "notification",
    "template": "assignment",
    "recipient": { "field": "assigned_technician_id" },
    "description": "Notify technician of assignment or schedule change"
  },
  
  "notify_creator": {
    "type": "notification",
    "template": "update",
    "recipient": { "field": "created_by" },
    "description": "Notify the record creator of updates"
  },
  
  "notify_approvers": {
    "type": "notification",
    "template": "approval_required",
    "recipient": { "role": "manager" },
    "description": "Notify managers that approval is required"
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
  
  "create_work_order_from_quote": {
    "type": "create_entity",
    "entity": "work_order",
    "copyFields": ["customer_id", "property_id", "unit_id", "description"],
    "setFields": {
      "status": "open",
      "origin_type": "quote",
      "origin_id": { "field": "id" }
    },
    "description": "Create work order from accepted quote"
  },
  
  "generate_invoice": {
    "type": "create_entity",
    "entity": "invoice",
    "copyFields": ["customer_id", "property_id"],
    "setFields": {
      "status": "draft",
      "work_order_id": { "field": "id" }
    },
    "description": "Generate invoice when work order is completed"
  },
  
  "create_work_order_from_schedule": {
    "type": "create_entity",
    "entity": "work_order",
    "copyFields": ["customer_id", "property_id", "service_template_id"],
    "setFields": {
      "status": "scheduled",
      "origin_type": "maintenance_schedule",
      "origin_id": { "field": "id" },
      "scheduled_start": { "compute": "next_occurrence" }
    },
    "description": "Create work order from maintenance schedule trigger"
  },
  
  "apply_pending_change": {
    "type": "update_entity",
    "target": {
      "entity": { "field": "target_entity" },
      "id": { "field": "target_id" }
    },
    "updates": {
      "$dynamic_field": { "field": "proposed_value" }
    },
    "description": "Apply approved change from approval_request"
  },
  
  "update_invoice_paid": {
    "type": "update_entity",
    "target": { "entity": "invoice", "id": { "field": "invoice_id" } },
    "updates": { "status": "paid", "paid_at": { "compute": "now" } },
    "when": { "compute": "invoice_fully_paid" },
    "description": "Mark invoice as paid when payments equal total"
  },
  
  "update_inventory_from_receipt": {
    "type": "update_entity",
    "target": { "entity": "inventory", "id": { "field": "inventory_item_id" } },
    "updates": { "quantity": { "compute": "quantity + received_quantity" } },
    "description": "Update inventory quantity when receipt is completed"
  },
  
  "recalculate_invoice_total": {
    "type": "compute",
    "target": "invoice.total_amount",
    "formula": "SUM(line_items.amount)",
    "description": "Recalculate invoice total from line items"
  },
  
  "recalculate_quote_total": {
    "type": "compute",
    "target": "quote.total_amount",
    "formula": "SUM(line_items.amount)",
    "description": "Recalculate quote total from line items"
  },
  
  "calculate_next_occurrence": {
    "type": "compute",
    "target": "maintenance_schedule.next_occurrence",
    "formula": "RRULE_NEXT(rrule, last_generated)",
    "description": "Calculate next scheduled maintenance date"
  }
}
```

#### Action Validation Schema

```json
// Validated at load time
{
  "$schema": "action-schema",
  "types": {
    "notification": {
      "required": ["template", "recipient"],
      "optional": ["description", "channels"]
    },
    "create_entity": {
      "required": ["entity"],
      "optional": ["copyFields", "mapping", "setFields", "description"]
    },
    "update_entity": {
      "required": ["target", "updates"],
      "optional": ["when", "description"]
    },
    "compute": {
      "required": ["target", "formula"],
      "optional": ["description"]
    }
  }
}
```

#### Actions by Entity

| Entity | Hook Trigger | Action |
|--------|--------------|--------|
| recommendation | `approved` | `create_quote_from_recommendation` |
| recommendation | `status.change` | `notify_customer` |
| quote | `accepted` | `create_work_order_from_quote` |
| quote | `sent` | `notify_customer` |
| quote | `rejected` | `notify_creator` |
| work_order | `closed` | `generate_invoice` |
| work_order | `assigned` | `notify_technician` |
| visit | `confirmed` | `notify_customer`, `notify_technician` |
| maintenance_schedule | `triggered` | `create_work_order_from_schedule` |
| approval_request | `approved` | `apply_pending_change` |
| approval_request | `rejected` | `notify_creator` |
| payment | `completed` | `update_invoice_paid` |
| receipt | `completed` | `update_inventory_from_receipt` |
| invoice | `line_item.change` | `recalculate_invoice_total` |

### Integration: How They Work Together

```
1. User: PATCH /recommendations/123 { status: 'approved' }

2. Hook Service:
   a. Load recommendation-metadata.js
   b. Find field: status, evaluate beforeChange hooks
   c. Match: on: 'open→approved' → requiresApproval: { approver: 'customer' }
   d. Create approval_request, return 202 Accepted

3. Approver: POST /approval-requests/456/approve

4. Approval Service:
   a. Apply the change: status = 'approved'
   b. Evaluate afterChange hooks
   c. Match: on: 'open→approved' → do: 'create_quote_from_recommendation'
   d. Execute action from registry
   e. Commit transaction
```

### What Changed (Unified Hooks Migration)

| Old | New | Rationale |
|-----|-----|-----------|
| `guards: {}` | `beforeChange: []` | Consistent array format |
| `triggers: {}` | `afterChange: []` | Consistent array format |
| `approvalConfig` | `beforeChange` with `requiresApproval` | One canonical way |
| `approvalConfig.onApprove` | `afterChange` hooks | One canonical way |
| String keys `'open→approved'` | `{ on: 'open→approved' }` | Object is extensible |

### Safety: Cascade Prevention

To prevent infinite loops from hooks triggering hooks:
- Maximum cascade depth: 3 (configurable)
- Hooks cannot trigger themselves
- Circular references detected at load time

---

## Property Constraints (Revision April 1, 2026)

Certain properties are only valid in certain contexts. These constraints are validated at load time.

### Identity Constraints

```javascript
const IDENTITY_CONSTRAINTS = {
  // Identity can only exist on string/text fields
  allowedOnTypes: ['string', 'text'],
  
  // Pattern-specific requirements
  patterns: {
    simple: {
      required: [],
      forbidden: ['prefix', 'template', 'compositeFields'],
    },
    computed: {
      required: ['prefix', 'template'],
      forbidden: ['compositeFields'],
    },
    human: {
      required: ['compositeFields'],
      forbidden: ['prefix', 'template'],
    },
  },
  
  // Cross-field validation
  compositeFieldsMustExist: true,  // compositeFields must reference real fields
};
```

**Validation Examples:**
```javascript
// ✅ VALID: auto_generated on string field with required props
work_order_number: {
  type: 'string',
  identity: { pattern: 'auto_generated', prefix: 'WO', template: '{prefix}-{year}-{seq}' },
}

// ❌ INVALID: identity on boolean field
is_active: {
  type: 'boolean',
  identity: { pattern: 'user_provided' },  // Error: identity not allowed on boolean
}

// ❌ INVALID: auto_generated without required props
name: {
  type: 'string',
  identity: { pattern: 'auto_generated' },  // Error: missing prefix, template
}

// ❌ INVALID: compositeFields reference non-existent field
display_name: {
  type: 'string',
  identity: { pattern: 'person_name', compositeFields: ['first_name', 'middle_name'] },
  // Error if 'middle_name' not in fields
}
```

### Hook Constraints

```javascript
const HOOK_CONSTRAINTS = {
  beforeChange: {
    // Properties allowed in beforeChange hooks
    allowed: ['on', 'when', 'blocked', 'bypassRoles', 'requiresApproval', 'description'],
    // Properties that MUST NOT appear
    forbidden: ['do'],
  },
  afterChange: {
    // Properties allowed in afterChange hooks
    allowed: ['on', 'do'],
    // Properties that MUST NOT appear
    forbidden: ['blocked', 'requiresApproval', 'bypassRoles', 'when'],
  },
};
```

**Validation Examples:**
```javascript
// ✅ VALID: beforeChange with blocking
beforeChange: [
  { on: 'draft→published', blocked: true, bypassRoles: ['manager'] }
]

// ✅ VALID: afterChange with action
afterChange: [
  { on: 'approved', do: 'notify_customer' }
]

// ❌ INVALID: afterChange cannot block
afterChange: [
  { on: 'approved', blocked: true }  // Error: 'blocked' forbidden in afterChange
]

// ❌ INVALID: beforeChange cannot have 'do'
beforeChange: [
  { on: 'change', do: 'notify_customer' }  // Error: 'do' forbidden in beforeChange
]
```

### Action Reference Constraints

```javascript
const ACTION_CONSTRAINTS = {
  // All action IDs must exist in actions registry
  mustExistInRegistry: true,
  
  // Inline actions guidance
  inlineAllowed: true,
  inlineGuidance: 'Use inline for simple logging; use registry for reusable actions',
};
```

---

## Hook Execution Model (Revision April 1, 2026)

Defines exactly how hooks are evaluated and executed at runtime.

### Evaluation Order

Hooks are evaluated in **array order** (index 0 first, then 1, etc.).

```javascript
beforeChange: [
  { on: 'change', ... },  // Evaluated first
  { on: 'change', ... },  // Evaluated second
  { on: 'change', ... },  // Evaluated third
]
```

### beforeChange Behavior

```
FOR each hook in beforeChange (in order):
  IF hook.on matches current event:
    IF hook.when condition fails:
      SKIP this hook
    IF hook.blocked AND NOT hook.unless satisfied:
      REJECT request with 403 Forbidden
      STOP evaluation
    IF hook.requiresApproval:
      CREATE approval_request
      RETURN 202 Accepted
      STOP evaluation

IF all hooks pass:
  PROCEED with change
```

**Key Points:**
- First blocking hook wins (short-circuit)
- First approval requirement wins
- Order matters — put most restrictive hooks first

### afterChange Behavior

```
COMMIT the change to database

FOR each hook in afterChange (in order):
  IF hook.on matches current event:
    TRY:
      EXECUTE hook.do (action or inline)
    CATCH error:
      LOG error with context (entity, field, hook index, action)
      CONTINUE with next hook (do NOT rollback)

IF any hooks failed:
  EMIT 'hook_execution_warning' event
  
RETURN success to client
```

**Key Points:**
- All hooks execute (no short-circuit on error)
- Errors are logged, not thrown
- Change is already committed — no rollback
- Recommendation: make actions idempotent for retry safety

### Exception Handling Strategy

| Phase | Error Behavior | Rationale |
|-------|----------------|-----------|
| `beforeChange` | Reject request, no changes | Validation phase; should block |
| `afterChange` | Log, continue, emit warning | Side effects; best-effort |

### Cascade Behavior

When an `afterChange` action creates/updates an entity that has its own hooks:

```
1. Track cascade depth (starts at 0)
2. Increment depth for each nested hook execution
3. If depth > MAX_CASCADE_DEPTH (default: 3):
   - Log warning
   - Skip remaining nested hooks
   - Continue with current level
```

### Observability

For debugging, the hook service logs:
```javascript
{
  timestamp: '...',
  entity: 'recommendation',
  recordId: '123',
  field: 'status',
  event: 'open→approved',
  phase: 'afterChange',
  hookIndex: 0,
  action: 'create_quote_from_recommendation',
  status: 'success' | 'error',
  error: '...',  // if failed
  duration_ms: 42,
}
```

---

## Unified Entity Contract (Revision April 1, 2026)

### Single Contract with Optional Sections

**Replaces:** Two distinct contracts (Standard ~25 props, Junction ~15 props)

One contract, with sections present or absent based on entity type:

```javascript
module.exports = {
  // ═══════════════════════════════════════════════════════════════════
  // ALWAYS PRESENT (all entities)
  // ═══════════════════════════════════════════════════════════════════
  
  entityKey: 'string',              // Required: snake_case key
  tableName: 'string',              // Required: database table name
  primaryKey: 'id',                 // Required: always 'id'
  icon: 'string',                   // Required: Material icon name
  description: 'string',            // Required: Human-readable description
  
  rlsResource: 'string',            // Required: RLS resource name
  rlsRules: [],                     // Required: array of RLS rule objects
  entityPermissions: {},            // Required: CRUD by minimum role
  
  fields: {},                       // Required: field definitions
  enums: {},                        // Required: enum definitions (empty if none)
  
  // ═══════════════════════════════════════════════════════════════════
  // STANDARD ENTITIES (absent for junctions)
  // ═══════════════════════════════════════════════════════════════════
  
  navigation: {                     // UI navigation (null if hidden)
    visibility: 'visible' | 'hidden',
    group: 'work' | 'resources' | 'finance' | 'admin',
    order: number,
  },
  
  features: {                       // Entity capabilities
    supportsFileAttachments: boolean,
    summaryConfig: {} | null,
  },
  
  displayColumns: [],               // Columns for list view
  relationships: {},                // FK/junction relationship definitions
  defaultIncludes: [],              // Default eager-loaded relationships
  dependents: [],                   // Entities that depend on this one
  routeConfig: {},                  // API route configuration
  fieldGroups: {},                  // UI field groupings
  fieldAliases: {},                 // Field display name overrides
  
  // ═══════════════════════════════════════════════════════════════════
  // JUNCTION ENTITIES (absent for standard entities)
  // ═══════════════════════════════════════════════════════════════════
  
  junction: {                       // Junction configuration
    entities: ['entity1', 'entity2'],  // Supports 2+ entities
    uniqueOn: [['entity1_id', 'entity2_id']],
  },
};
```

### Validation Rules (Load-Time)

```javascript
// Validated when metadata loads, not at runtime
const ENTITY_VALIDATION_RULES = [
  // Mutual exclusion
  'If junction present, navigation/features/displayColumns must be absent',
  'If navigation present, junction must be absent',
  
  // Required sections
  'Standard entities MUST have navigation, features, displayColumns',
  'Junction entities MUST have junction with entities and uniqueOn',
  
  // Field validation
  'Exactly ONE field must have identity property',
  'All action IDs in beforeChange/afterChange must exist in actions registry',
];
```

### Examples

**Standard Entity:**
```javascript
// work_order-metadata.js
module.exports = {
  entityKey: 'work_order',
  tableName: 'work_orders',
  primaryKey: 'id',
  icon: 'build',
  description: 'Service work order',
  
  rlsResource: 'work_order',
  rlsRules: [...],
  entityPermissions: { create: 'dispatcher', read: 'customer', ... },
  
  navigation: { visibility: 'visible', group: 'work', order: 1 },
  features: { supportsFileAttachments: true, summaryConfig: {...} },
  displayColumns: ['work_order_number', 'status', 'customer'],
  relationships: { customer: {...}, technician: {...} },
  defaultIncludes: ['customer'],
  dependents: ['visit', 'invoice'],
  
  fields: {
    work_order_number: {
      type: 'string',
      identity: { pattern: 'auto_generated', prefix: 'WO', template: '{prefix}-{year}-{seq}' },
      required: true,
      immutable: true,
    },
    status: {
      type: 'enum',
      enumKey: 'status',
      beforeChange: [{ on: 'open→closed', requiresApproval: { approver: 'customer' } }],
      afterChange: [{ on: 'closed', do: 'generate_invoice' }],
    },
  },
  enums: { status: {...} },
};
```

**Junction Entity:**
```javascript
// visit_technician-metadata.js
module.exports = {
  entityKey: 'visit_technician',
  tableName: 'visit_technicians',
  primaryKey: 'id',
  icon: 'group',
  description: 'Assigns technicians to visits',
  
  rlsResource: 'visit_technician',
  rlsRules: [...],
  entityPermissions: { create: 'dispatcher', read: 'technician', ... },
  
  junction: {
    entities: ['visit', 'technician'],
    uniqueOn: [['visit_id', 'technician_id']],
  },
  
  fields: {
    visit_id: { type: 'foreignKey', references: 'visit', required: true },
    technician_id: { type: 'foreignKey', references: 'technician', required: true },
    role: { type: 'enum', enumKey: 'assignment_role' },  // optional extra data
  },
  enums: { assignment_role: { lead: {...}, support: {...} } },
};
```

---

## Explicit Defaults (Revision April 1, 2026)

### Field Property Defaults

Every property has a documented default. Absence = default value applied.

```javascript
const FIELD_DEFAULTS = {
  // Validation
  required: false,
  unique: false,
  validators: [],
  
  // Behavior  
  immutable: false,
  searchable: false,
  filterable: false,
  sortable: false,
  
  // Access (defaults to open)
  access: {
    create: 'any',
    read: 'any',
    update: 'any',
    delete: 'any',   // Note: field-level delete rarely used
  },
  
  // Hooks
  beforeChange: [],
  afterChange: [],
};
```

### Interpretation Rules

| Property | Absent | Explicit `false` | Explicit `true` |
|----------|--------|------------------|-----------------|
| `required` | Not required | Not required | Required |
| `immutable` | Mutable | Mutable | Cannot change after create |
| `searchable` | Not in text search | Not in text search | In text search |
| Partial `access` | Missing keys = 'any' | — | — |

### `immutable` vs `access.update: 'none'`

These are NOT redundant:

| Property | Meaning |
|----------|---------|
| `immutable: true` | **System constraint:** Field cannot change after create, regardless of role |
| `access: { update: 'none' }` | **Permission:** No role can update via API (but system/hooks can) |

**Rule:** If `immutable: true`, the field cannot be updated by ANYTHING (API, hooks, system). If `access.update: 'none'`, only API is blocked; hooks can still modify.

---

## Unified Field Schema (Complete Reference)

Every field in `fields: {}` follows this structure:

```javascript
fieldName: {
  // ═══════════════════════════════════════════════════════════════════
  // TYPE (required)
  // ═══════════════════════════════════════════════════════════════════
  type: 'string' | 'text' | 'integer' | 'decimal' | 'boolean' | 
        'uuid' | 'timestamp' | 'date' | 'time' | 'json' | 
        'enum' | 'foreignKey',
  
  // Type-specific properties
  maxLength: number,              // string: max characters
  precision: number,              // decimal: total digits
  scale: number,                  // decimal: digits after point
  enumKey: 'string',              // enum: key in enums object
  references: 'string',           // foreignKey: target entity
  
  // ═══════════════════════════════════════════════════════════════════
  // VALIDATION (all default to false/[])
  // ═══════════════════════════════════════════════════════════════════
  required: boolean,              // Must be provided on create
  unique: boolean,                // Must be unique across records
  default: any,                   // Default value if not provided
  validators: [],                 // Custom validator names
  
  // ═══════════════════════════════════════════════════════════════════
  // BEHAVIOR (all default to false)
  // ═══════════════════════════════════════════════════════════════════
  immutable: boolean,             // Cannot change after create (system enforced)
  searchable: boolean,            // Included in full-text search
  filterable: boolean,            // Can filter API results by this field
  sortable: boolean,              // Can sort API results by this field
  
  // ═══════════════════════════════════════════════════════════════════
  // IDENTITY (only ONE field per entity may have this)
  // ═══════════════════════════════════════════════════════════════════
  identity: {
    pattern: 'user_provided' | 'auto_generated' | 'person_name',
    prefix: 'WO',                 // auto_generated: identifier prefix
    template: '{prefix}-{year}-{sequence}',  // auto_generated: format
    compositeFields: ['first_name', 'last_name'],  // person_name: source fields
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // ACCESS CONTROL (defaults to 'any' for all operations)
  // ═══════════════════════════════════════════════════════════════════
  access: {
    create: 'none' | 'system' | 'admin' | 'manager' | 'dispatcher' | 
            'technician' | 'customer' | 'any',
    read: '...',
    update: '...',
    delete: '...',                // Field-level delete rarely used
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // HOOKS (defaults to [])
  // ═══════════════════════════════════════════════════════════════════
  beforeChange: [
    {
      on: 'create' | 'change' | 'delete' | 'oldValue→newValue',
      when: { field, operator, value },     // Optional condition
      blocked: boolean,                     // Hard block
      bypassRoles: ['manager'],             // Roles that bypass the block
      requiresApproval: { approver: 'customer' },
      description: 'string',
    },
  ],
  
  afterChange: [
    {
      on: 'create' | 'change' | 'delete' | 'oldValue→newValue' | 'newValue',
      do: 'action_id' | { inline action },
    },
  ],
}
```

---

## Entity Inventory

### New Entities (11)

| # | Entity | Pattern | NavGroup | Icon | Prefix | Purpose |
|---|--------|---------|----------|------|--------|---------|
| 1 | `quote` | AUTO_GENERATED | work | request_quote | QT | Pre-work estimate |
| 2 | `visit` | AUTO_GENERATED | work | event | VIS | Scheduled appointment |
| 3 | `recommendation` | AUTO_GENERATED | work | lightbulb | REC | Service suggestion |
| 4 | `service_template` | USER_PROVIDED | work | description | — | Reusable work package |
| 5 | `maintenance_schedule` | AUTO_GENERATED | work | schedule | MS | RRULE-based recurrence |
| 6 | `service_agreement` | AUTO_GENERATED | work | handshake | SA | Operational scope for contract |
| 7 | `subcontractor` | USER_PROVIDED | resources | engineering | — | External labor provider |
| 8 | `purchase_order` | AUTO_GENERATED | resources | shopping_cart | PO | Order to vendor |
| 9 | `receipt` | AUTO_GENERATED | finance | receipt | RCT | Payment TO vendor |
| 10 | `payment` | AUTO_GENERATED | finance | payments | PMT | Payment FROM customer |
| 11 | `approval_request` | AUTO_GENERATED | admin | approval | APR | Generic approval workflow |

### Name Pattern Reference
- **PERSON_NAME:** first_name + last_name (not used in new entities)
- **USER_PROVIDED:** Single `name` field as identity
- **AUTO_GENERATED:** System-generated identifier (e.g., QT-2026-0001)

---

## Permission Matrix

### Entity Permissions (CRUD by minimum role)

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| `quote` | dispatcher | customer | dispatcher | manager |
| `visit` | dispatcher | customer | technician | manager |
| `recommendation` | technician | customer | technician | manager |
| `service_template` | manager | technician | manager | manager |
| `maintenance_schedule` | manager | customer | manager | manager |
| `service_agreement` | manager | customer | manager | manager |
| `subcontractor` | manager | technician | manager | admin |
| `purchase_order` | technician | technician | technician | manager |
| `receipt` | dispatcher | dispatcher | manager | admin |
| `payment` | dispatcher | customer | manager | admin |
| `approval_request` | customer | customer | customer | manager |

### RLS Rules Summary

| Entity | Customer | Technician | Dispatcher+ |
|--------|----------|------------|-------------|
| `quote` | direct: customer_id | deny | full |
| `visit` | parent: work_order | parent: work_order | full |
| `recommendation` | direct: customer_id | direct: created_by | full |
| `service_template` | deny | full | full |
| `maintenance_schedule` | parent: service_agreement→contract | deny | full |
| `service_agreement` | parent: contract | full (read) | full |
| `subcontractor` | deny | full | full |
| `purchase_order` | deny | direct: created_by | full |
| `receipt` | deny | deny | full |
| `payment` | parent: invoice | deny | full |
| `approval_request` | direct: requested_by | direct: requested_by | full |

---

## Relationship Preview (Phase 2)

### Planned FK Relationships

```
contract (1)───(1) service_agreement ───(N) maintenance_schedule
                                              │
                                              ▼ (generates)
recommendation ──▶ quote ──▶ work_order ◀────┘
      │              │            │
      └──────────────┼────────────┤
                     │            │
                     │      visit(s) ──▶ [junction: techs, subs]
                     │
                     └──▶ (origin reference)

vendor ◀── purchase_order ◀── receipt
                │
                ▼ (updates)
            inventory

invoice ◀── payment(s)

approval_request ──▶ (any entity, polymorphic via approvalConfig)
```

### Planned Junction Tables

| Junction | Connects | Purpose |
|----------|----------|---------|
| `visit_technician` | visit ↔ technician | Multi-tech assignment |
| `visit_subcontractor` | visit ↔ subcontractor | Subcontractor assignment |
| `service_agreement_item` | service_agreement ↔ service_template | Work packages in agreement |

---

## Approval System Design (Revised April 1, 2026)

### Design Principle: Inversion of Control

**Key Insight:** Configuration belongs with the thing being configured.

The `approval_request` entity is a **pure storage entity** — it does NOT define what can be approved. Instead, each entity defines its own approval requirements via `beforeChange` hooks on relevant fields.

This follows industry patterns:
- **Salesforce:** Approval rules defined per-object, not in a central Approval object
- **ServiceNow:** Workflow rules attached to tables
- **Django/Rails:** Callbacks and validations declared on the model

### Approval via `beforeChange` Hooks

```javascript
// In any entity-metadata.js that needs approval workflows
fields: {
  status: {
    type: 'enum',
    enumKey: 'status',
    beforeChange: [
      {
        on: 'open→approved',
        requiresApproval: { approver: 'customer' },
        description: 'Customer approval to proceed',
      },
    ],
    afterChange: [
      {
        on: 'approved',
        do: 'create_quote_from_recommendation',
      },
    ],
  },
  total_amount: {
    type: 'decimal',
    beforeChange: [
      {
        on: 'change',
        when: { field: 'total_amount', operator: '>', value: 1000 },
        requiresApproval: { approver: 'manager' },
      },
    ],
  },
}
```

### `approval_request` Entity (Pure Storage)

```javascript
fields: {
  target_entity: {
    type: 'string',
    required: true,
    maxLength: 50,
    validators: ['validEntityKey'],  // Introspective validation
  },
  target_id: { type: 'uuid', required: true },
  target_field: { type: 'string', required: true },
  proposed_value: { type: 'json', required: true },
  previous_value: { type: 'json' },
  status: { type: 'enum', enumKey: 'status', default: 'pending' },
  requested_by: { type: 'foreignKey', references: 'user' },
  approved_by: { type: 'foreignKey', references: 'user' },
  decision_notes: { type: 'text' },
  decided_at: { type: 'timestamp' },
}
```

### Runtime Workflow

```
1. User triggers transition (PATCH /recommendations/:id { status: 'approved' })
2. Hook service loads recommendation-metadata.js
3. Evaluates status.beforeChange hooks
4. Match: on: 'open→approved' → requiresApproval
5. Creates approval_request, returns 202 Accepted
6. Approver reviews → POST /approval-requests/:id/approve
7. On approve → system applies change, evaluates afterChange hooks
```

### Benefits of IoC Pattern

| Aspect | Central Registry (Bad) | IoC Pattern (Good) |
|--------|------------------------|---------------------|
| Adding approvable entity | Modify approval_request | Add beforeChange hook to field |
| Single Responsibility | approval_request knows all | Each entity knows itself |
| Open/Closed Principle | Violates | Follows |
| Audit | Hunt across files | One file per entity |

### Versioning via History

Rejected requests remain as history. User creates new request rather than editing rejected one. The `approval_request` table IS the version history.

---

## Status Enums by Entity

### quote
```javascript
status: {
  draft: { label: 'Draft', color: 'secondary' },
  sent: { label: 'Sent', color: 'info' },
  accepted: { label: 'Accepted', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  expired: { label: 'Expired', color: 'warning' },
  cancelled: { label: 'Cancelled', color: 'secondary' },
}
```

### visit
```javascript
status: {
  scheduled: { label: 'Scheduled', color: 'info' },
  confirmed: { label: 'Confirmed', color: 'success' },
  in_progress: { label: 'In Progress', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'secondary' },
  no_show: { label: 'No Show', color: 'error' },
}
```

### recommendation
```javascript
status: {
  draft: { label: 'Draft', color: 'secondary' },
  open: { label: 'Open', color: 'info' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  converted: { label: 'Converted', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'secondary' },
}
```

### purchase_order
```javascript
status: {
  draft: { label: 'Draft', color: 'secondary' },
  pending_approval: { label: 'Pending Approval', color: 'warning' },
  approved: { label: 'Approved', color: 'info' },
  submitted: { label: 'Submitted', color: 'info' },
  shipped: { label: 'Shipped', color: 'info' },
  delivered: { label: 'Delivered', color: 'success' },
  stocked: { label: 'Stocked', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'secondary' },
}
```

### receipt
```javascript
status: {
  pending: { label: 'Pending', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  void: { label: 'Void', color: 'error' },
}
```

### payment
```javascript
status: {
  pending: { label: 'Pending', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  refunded: { label: 'Refunded', color: 'warning' },
}
```

### approval_request
```javascript
status: {
  pending: { label: 'Pending', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  cancelled: { label: 'Cancelled', color: 'secondary' },
}
```

### service_template, subcontractor, service_agreement, maintenance_schedule
```javascript
status: {
  active: { label: 'Active', color: 'success' },
  inactive: { label: 'Inactive', color: 'secondary' },
}
```

---

## Implementation Phases

### Phase 1: Core Contracts (COMPLETE ✅)
- [x] Create 11 entity metadata files
- [x] Core properties only (entityKey, tableName, icon, etc.)
- [x] Status enums defined
- [x] entityPermissions defined
- [x] rlsRules defined (basic patterns)
- [x] No FK fields (deferred to Phase 2)
- [x] No relationships (deferred to Phase 2)
- [x] Run sync:all — 31 entities synced
- [x] Unit tests pass
- [x] E2E tests pass
- [x] Integration tests skip new entities (no DB tables - expected)

**Files Created:**
- `quote-metadata.js` (COMPUTED, QT)
- `visit-metadata.js` (COMPUTED, VIS)
- `recommendation-metadata.js` (COMPUTED, REC)
- `service-template-metadata.js` (SIMPLE)
- `maintenance-schedule-metadata.js` (COMPUTED, MS)
- `service-agreement-metadata.js` (COMPUTED, SA)
- `subcontractor-metadata.js` (SIMPLE)
- `purchase-order-metadata.js` (COMPUTED, PO)
- `receipt-metadata.js` (COMPUTED, RCT)
- `payment-metadata.js` (COMPUTED, PMT)
- `approval-request-metadata.js` (COMPUTED, APR)

### Phase 2: Unified Metadata Architecture (NEXT — DESIGN COMPLETE)

**Scope:** ALL 31+ entities, with four major architectural improvements.

**Guiding Principles:**
1. **One Concept, One Expression:** Every semantic has exactly one canonical form
2. **Explicit Defaults:** All properties have documented defaults; all validation at load time
3. **Unified Hooks:** `beforeChange`/`afterChange` replace guards/triggers/approvalConfig
4. **Unified Contract:** One entity contract with optional sections

#### 2A-0 Foundation (COMPLETE ✅ April 3, 2026)
- [x] Create `metadata-accessors.js` — backwards-compatible field property access
- [x] Create `action-handlers.js` — generic action type interpreters
- [x] Create `actions.json` + `actions-schema.json` — central actions registry
- [x] Update `entity-metadata-validator.js` — dual-support for field-level validation
- [x] Create parity tests (50 tests total)
- [x] Verify all existing tests pass (2,947 unit + 2,667 integration)

#### 2A-1 Field-Centric Migration (IN PROGRESS)
- [ ] Migrate `department` entity (pilot) with searchable/filterable/sortable
- [ ] Update consumers to use `metadata-accessors.js` instead of direct array access
- [ ] Migrate remaining 30 entities in batches:
  - [ ] Batch 1: searchable fields (all entities)
  - [ ] Batch 2: filterable fields (all entities)
  - [ ] Batch 3: sortable fields (all entities)
  - [ ] Batch 4: required fields (all entities)
  - [ ] Batch 5: immutable fields (all entities)
- [ ] Final: Remove deprecated entity-level arrays from all metadata files

#### 2.1 Identity Unification
- [ ] Introduce `identity: { pattern, prefix, template, compositeFields }` on identity fields
- [ ] Remove entity-level `namePattern`, `displayField`, `identityField`, `identifierPrefix`
- [ ] Update computed-name derivation to read from `field.identity`
- [ ] Add load-time validation: exactly one field with `identity`

#### 2.2 Unified Hooks System
- [x] Create `config/actions.json` central actions registry ✅ (April 3, 2026)
- [x] Create `config/actions-schema.json` JSON Schema validation ✅
- [x] Create `config/action-handlers.js` generic interpreters ✅
- [x] Add hooks validation to `entity-metadata-validator.js` ✅
- [ ] Replace `guards: {}` with `beforeChange: []`
- [ ] Replace `triggers: {}` with `afterChange: []`
- [ ] Remove `approvalConfig` (use `beforeChange` with `requiresApproval`)
- [ ] Build hook evaluation in generic-entity-service
- [ ] Add cascade depth limit (max 3)
- [ ] Add load-time validation for action IDs

#### 2.3 Unified Entity Contract
- [ ] Introduce `navigation: { visibility, group, order }`
- [ ] Introduce `features: { supportsFileAttachments, summaryConfig }`
- [ ] Introduce `junction: { entities, uniqueOn }` for junctions
- [ ] Remove `navVisibility`, `navGroup`, `navOrder` (top-level)
- [ ] Add mutual exclusion validation: `navigation` XOR `junction`

#### 2.4 Relationships & FK Fields (COMPLETE ✅ April 2, 2026)
- [x] Add FK fields to 10 entities (see FK Implementation table above)
- [ ] Create 3 junction tables using new junction contract (visit_technician, visit_subcontractor, service_agreement_item)

#### 2.5 Work Order Origin (COMPLETE ✅ April 2, 2026)
- [x] Add `origin_type` enum field to work_order (direct, quote, recommendation, maintenance_schedule)
- [x] Add `origin_id` field to work_order

#### 2.6 Database & Testing
- [ ] Drop and rebuild database with new schema
- [ ] Run full test suite (unit, integration, E2E)
- [ ] Deploy to production

### Phase 3: Hook Engine Implementation (Future)
- [ ] Implement hook evaluation service
- [ ] Build approval workflow engine using `beforeChange.requiresApproval`
- [ ] Implement actions executor for `afterChange.do`
- [ ] Add cascade depth tracking
- [ ] Notification triggers on approval events
- [ ] Status-based RLS (e.g., tech edits PO only in draft)

---

## Consumer Migration Specifications (Revision April 1, 2026)

Detailed specifications for updating consumers of entity metadata.

### validation-schema-builder.js

**File:** `backend/utils/validation-schema-builder.js`

**Current Pattern (Array-Based):**
```javascript
// Reads from entity-level arrays
const requiredFields = metadata.requiredFields || [];
const immutableFields = new Set(metadata.immutableFields || []);
const fieldAccess = metadata.fieldAccess || {};

// Derive creatable fields from fieldAccess object
function deriveCreatableFields(metadata) {
  return Object.keys(metadata.fieldAccess).filter(f => 
    metadata.fieldAccess[f].create !== 'none'
  );
}
```

**New Pattern (Field-Centric):**
```javascript
// Reads from field properties directly
function deriveFieldProperties(metadata) {
  const result = {
    required: [],
    immutable: [],
    creatable: [],
    updatable: [],
  };
  
  for (const [fieldName, field] of Object.entries(metadata.fields)) {
    if (field.required) result.required.push(fieldName);
    if (field.immutable) result.immutable.push(fieldName);
    if (field.access?.create !== 'none') result.creatable.push(fieldName);
    if (field.access?.update !== 'none' && !field.immutable) {
      result.updatable.push(fieldName);
    }
  }
  
  return result;
}

// Role-aware filtering reads from field.access
function hasFieldPermission(fieldName, operation, userRole, metadata) {
  const field = metadata.fields[fieldName];
  const requiredRole = field?.access?.[operation] ?? 'any';
  return roleAtLeast(userRole, requiredRole);
}
```

**Migration Steps:**

| Step | Change | File Location |
|------|--------|---------------|
| 1 | Replace `metadata.requiredFields` | Line ~232 |
| 2 | Replace `metadata.immutableFields` | Line ~165 |
| 3 | Replace `metadata.fieldAccess` | Lines ~140, ~158 |
| 4 | Add `deriveFieldProperties()` helper | New function |
| 5 | Update cache key to include schema version | Line ~215 |

**Backward Compatibility:**
```javascript
// Support both patterns during migration
function getRequiredFields(metadata) {
  // New: field-centric
  if (metadata.fields) {
    return Object.entries(metadata.fields)
      .filter(([_, f]) => f.required)
      .map(([name]) => name);
  }
  // Legacy: array-based
  return metadata.requiredFields || [];
}
```

### generic-entity-service.js

**File:** `backend/services/generic-entity-service.js`

**Changes Required:**

| Feature | Current | New |
|---------|---------|-----|
| Required field check | `requiredFields.includes(f)` | `field.required === true` |
| Immutable check | `immutableFields.includes(f)` | `field.immutable === true` |
| Field access check | `fieldAccess[f].update` | `field.access.update` |
| Identity field | `metadata.identityField` | Find `field.identity` property |
| Display field | `metadata.displayField` | `field.identity.pattern === 'person_name'` |

**Hook Evaluation (New):**
```javascript
async function evaluateBeforeChangeHooks(entity, field, change, context) {
  const hooks = metadata.fields[field]?.beforeChange || [];
  
  for (const hook of hooks) {
    if (!matchesEvent(hook.on, change)) continue;
    if (hook.when && !evaluateCondition(hook.when, context)) continue;
    
    if (hook.blocked) {
      if (hook.bypassRoles?.includes(context.userRole)) continue;
      throw new HookBlockedError(entity, field, hook.description);
    }
    
    if (hook.requiresApproval) {
      return { requiresApproval: true, approver: hook.requiresApproval.approver };
    }
  }
  
  return { allowed: true };
}
```

### field-access-controller.js

**File:** `backend/utils/field-access-controller.js`

**Changes Required:**

```javascript
// Current: Looks up fieldAccess object
function getFieldAccess(metadata, fieldName, operation) {
  return metadata.fieldAccess?.[fieldName]?.[operation] ?? 'any';
}

// New: Reads from field directly
function getFieldAccess(metadata, fieldName, operation) {
  return metadata.fields?.[fieldName]?.access?.[operation] ?? 'any';
}
```

### metadata-loader.js (New File)

**File:** `backend/config/metadata-loader.js`

**Purpose:** Centralized metadata loading with validation and defaults application.

```javascript
const FIELD_DEFAULTS = require('./field-defaults');

function loadEntityMetadata(entityKey) {
  const raw = require(`./models/${entityKey}-metadata.js`);
  
  // Apply defaults to each field
  const fields = {};
  for (const [name, field] of Object.entries(raw.fields || {})) {
    fields[name] = { ...FIELD_DEFAULTS, ...field };
    
    // Apply access defaults
    fields[name].access = {
      create: 'any',
      read: 'any', 
      update: 'any',
      delete: 'any',
      ...field.access,
    };
  }
  
  // Validate constraints
  validateIdentityConstraints(fields);
  validateHookConstraints(fields);
  
  return { ...raw, fields };
}
```

### Summary: Files to Modify

| File | Changes | Effort |
|------|---------|--------|
| `validation-schema-builder.js` | Read from fields, add backward compat | Medium |
| `generic-entity-service.js` | Read from fields, add hook evaluation | Large |
| `field-access-controller.js` | Update getFieldAccess() | Small |
| `metadata-loader.js` | **Create new** — centralized loading | Medium |
| `entity-metadata.types.js` | Update TypeScript definitions | Small |

---

## Design Decisions Log

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Approval config location | Central in approval_request vs IoC in each entity | IoC | Open/Closed principle; config belongs with entity |
| target_entity validation | Hardcoded enum vs Introspective | Introspective | Avoids string literals; auto-validates against metadata |
| Phase 2 scope | 11 new entities vs All 31 entities | All 31 | Unification opportunity; cross-entity relationships |
| Approval pattern | Per-entity statusTransitions vs Generic approval_request | Generic | One system for all; versioning built-in |
| subcontractor pattern | PERSON_NAME vs USER_PROVIDED | USER_PROVIDED | Companies have names, not first/last |
| visit.update permission | dispatcher vs technician | technician | Techs update status/actuals |
| payment.create | technician vs dispatcher | dispatcher | System-mediated; defer field collection |
| NavGroup for service_agreement | finance vs work | work | Operational scope, not financial terms |
| NavGroup for approval_request | system vs admin | admin | "system" invalid; admin for workflow visibility |
| Multi-hop RLS | Verify support | Confirmed | MAX_HOPS=5, chains work |
| TECHNICIAN_MANAGED FAL | Use FAL constant vs explicit object | Explicit | No TECHNICIAN_MANAGED constant exists |
| **Metadata shape** | Sparse properties vs Consistent shape | **Consistent** | All entities have same first-order props |
| **Field rules location** | Entity-level arrays vs Field-centric | **Field-centric** | One location per field; self-documenting |
| **Identity representation** | Multiple props vs Unified `identity: {}` | **Unified** | One Concept, One Expression principle |
| **Hooks model** | Guards + Triggers + approvalConfig | **beforeChange/afterChange** | Two phases, consistent format |
| **Actions location** | Per-entity vs System-level | **System-level** | Reusable; single definition; testable |
| **Entity contracts** | Two distinct vs Unified with sections | **Unified** | One contract, presence/absence indicates type |
| **Default strategy** | Implicit vs Explicit documented | **Explicit** | FIELD_DEFAULTS constant; clear semantics |
| **immutable vs access.update** | Redundant vs Distinct | **Distinct** | immutable=system constraint, access=role-based |
| **Multi-way junctions** | pairs only vs N entities | **N entities** | `junction.entities: ['a', 'b', 'c']` |
| **Cascade prevention** | None vs Depth limit | **Depth limit** | Max cascade depth of 3 |
| **Validation timing** | Runtime vs Load-time | **Load-time** | Fail fast; all metadata validated on startup |
| **Property constraints** | Scattered checks vs Centralized | **Centralized** | IDENTITY_CONSTRAINTS, HOOK_CONSTRAINTS validated at load |
| **Identity on field types** | Allow any vs Restrict | **Restrict** | Only string/text fields can have `identity` |
| **Hook property separation** | Mixed vs Strict | **Strict** | `beforeChange` has blocking; `afterChange` has actions |
| **afterChange errors** | Rollback vs Log-and-continue | **Log-and-continue** | Change committed; best-effort side effects |
| **Hook execution order** | Undefined vs Array order | **Array order** | First to last, deterministic |
| **Identity pattern names** | simple/computed/human vs user_provided/auto_generated/person_name | **user_provided/auto_generated/person_name** | Names as Documentation (P8); self-explanatory |
| **Template syntax** | Full templating engine vs Simple interpolation | **Simple interpolation** | `{variable}` syntax; no engine overhead |
| **Migration rollback** | Manual vs Checkpoint-based | **Checkpoint-based** | Safe recovery for 31-entity migration |
| **Capacity limit source** | Arbitrary vs Evidence-based | **Evidence-based** | Industry patterns (Salesforce, ServiceNow) + calculation |
| **schemaVersion status** | Implement now vs Reserve for future | **Reserve for future** | Property accepted, not enforced in Phase 2 |
| **Validation parallelism** | Sequential vs Index-based parallel | **Index-based parallel** | O(n) scaling via pre-built indexes |
| **Block exception naming** | `unless: { role }` vs `bypassRoles: []` | **bypassRoles** | No mental inversion; array-first; self-documenting |
| **Actions registry scope** | Per-entity vs System-level | **System-level** | Reusable; validated at load; single definition |
| **Consumer migration** | Big-bang vs Backward-compatible | **Backward-compatible** | Support both patterns during transition |
| **Actions file format** | JS module vs JSON | **JSON** | Pure data, no code; schema-validated at load; safe to import |

---

## Architecture Summary (Quick Reference)

### Twelve Guiding Principles

**Structural Principles (How metadata is shaped):**
1. **One Concept, One Expression:** No redundant representations
2. **Explicit Defaults:** All defaults documented in FIELD_DEFAULTS
3. **Unified Hooks:** `beforeChange`/`afterChange` only
4. **Unified Contract:** One entity contract with optional sections
5. **Property Constraints:** Context-specific property validation at load time
6. **Execution Model:** Defined hook evaluation order and error handling

**Operational Principles (How the system behaves):**
7. **Progressive Complexity:** Simple fields are simple; advanced features invisible until needed
8. **Names as Documentation:** If the name needs explanation, rename it
9. **Directed Acyclic Dependencies:** No circular imports; boot order is deterministic
10. **Correlation Over Logging:** One correlationId threads through all operations
11. **Graceful Defaults, Future Slots:** Reserve property names now; require them later
12. **Budget-Based Limits:** Control total work (max 20 executions), not just depth

### Field-Centric Design
```javascript
fieldName: {
  type: 'string',
  required: true,          // Was: requiredFields array
  immutable: false,        // Was: immutableFields array
  searchable: true,        // Was: searchableFields array
  filterable: true,        // Was: filterableFields array
  sortable: true,          // Was: sortableFields array
  access: { ... },         // Was: fieldAccess object
  identity: { ... },       // Was: namePattern, displayField, identifierPrefix
  beforeChange: [ ... ],   // Was: guards, approvalConfig
  afterChange: [ ... ],    // Was: triggers, approvalConfig.onApprove
}
```

### Unified Entity Contract
```javascript
{
  // Always present
  entityKey, tableName, primaryKey, icon, description,
  rlsResource, rlsRules, entityPermissions, fields, enums,
  
  // Standard entities (absent for junctions)
  navigation: { visibility, group, order },
  features: { supportsFileAttachments, summaryConfig },
  displayColumns, relationships, defaultIncludes, dependents,
  
  // Junctions only (absent for standard)
  junction: { entities: [...], uniqueOn: [...] },
}
```

### Property Constraints
```javascript
IDENTITY_CONSTRAINTS = {
  allowedOnTypes: ['string', 'text'],
  patterns: { user_provided, auto_generated, person_name },
  compositeFieldsMustExist: true,
}

HOOK_CONSTRAINTS = {
  beforeChange: { allowed: [on, when, blocked, bypassRoles, requiresApproval, description] },
  afterChange: { allowed: [on, do], forbidden: [blocked, requiresApproval, bypassRoles] },
}
```

### Execution Model
```
beforeChange: Array order, short-circuit on block/approval
afterChange: Array order, log-and-continue on error
Cascade depth: Max 3
```

### Key Locations
- Entity metadata: `backend/config/models/{entity}-metadata.js`
- Type definitions: `backend/config/models/entity-metadata.types.js`
- Field types: `backend/config/field-types.js`
- Actions registry: `backend/config/actions.json`
- Constraints: `backend/config/constraints.js`
- Design doc: `docs/architecture/ENTITY-EXPANSION-DESIGN.md`

---

## Transaction Model (Revision April 1, 2026)

### Transaction Boundaries

```
BEGIN TRANSACTION
  1. Load metadata
  2. Evaluate beforeChange hooks
     - First block → ROLLBACK, return 403
     - First approval → CREATE approval_request, COMMIT, return 202
  3. Apply change to database
  4. Evaluate afterChange hooks (all, log errors)
COMMIT
```

### Approval Requests

Approval requests are **separate transactions** — created and committed before returning 202.

### Recovery

| Scenario | Recovery |
|----------|----------|
| Crash between step 3-4 | Change committed; hooks may not run. Check `pending_hook_log` on restart. |
| Orphaned approval_request | Daily cleanup job deletes stale requests after 7 days. |
| afterChange action fails | Logged; change committed. Make actions idempotent for retry. |

---

## Complete Entity Example (Revision April 1, 2026)

Full `recommendation-metadata.js` demonstrating all features:

```javascript
module.exports = {
  schemaVersion: 1,
  entityKey: 'recommendation',
  tableName: 'recommendations',
  primaryKey: 'id',
  icon: 'lightbulb',
  description: 'Service suggestion for customer approval',
  
  rlsResource: 'recommendations',
  rlsRules: [
    { id: 'customer-own', roles: 'customer', operations: '*',
      access: { type: 'direct', field: 'customer_id', value: 'customer_profile_id' } },
    { id: 'staff-full', roles: ['dispatcher', 'manager', 'admin'], operations: '*', access: null },
  ],
  entityPermissions: { create: 'technician', read: 'customer', update: 'technician', delete: 'manager' },
  
  navigation: { visibility: 'visible', group: 'work', order: 5 },
  displayColumns: ['recommendation_number', 'status', 'customer_id'],
  
  fields: {
    recommendation_number: {
      type: 'string',
      maxLength: 20,
      identity: { pattern: 'auto_generated', prefix: 'REC', template: '{prefix}-{year}-{sequence}' },
      required: true,
      immutable: true,
      searchable: true,
      access: { create: 'none', read: 'customer', update: 'none', delete: 'none' },
    },
    status: {
      type: 'enum',
      enumKey: 'status',
      required: true,
      beforeChange: [
        { on: 'open->approved', requiresApproval: { approver: 'customer' },
          description: 'Customer must approve recommendation' },
        { on: 'approved->cancelled', blocked: true, bypassRoles: ['manager'],
          description: 'Only managers can cancel approved items' },
      ],
      afterChange: [
        { on: 'approved', do: 'create_quote_from_recommendation' },
        { on: 'change', do: { log: { message: 'Status changed', level: 'info' } } },
      ],
    },
    description: { type: 'text', required: true, searchable: true },
    estimated_cost: {
      type: 'decimal',
      precision: 2,
      beforeChange: [
        { on: 'change', when: { field: 'estimated_cost', operator: '>', value: 10000 },
          requiresApproval: { approver: 'manager' } },
      ],
    },
  },
  
  enums: {
    status: {
      draft: { label: 'Draft', color: 'secondary' },
      open: { label: 'Open', color: 'info' },
      approved: { label: 'Approved', color: 'success' },
      rejected: { label: 'Rejected', color: 'error' },
      converted: { label: 'Converted', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'secondary' },
    },
  },
};
```

---

## Event Key Syntax (Revision April 1, 2026)

Both arrow forms are valid; normalized at load time:

```javascript
{ on: 'open→approved' }   // Unicode arrow (canonical)
{ on: 'open->approved' }  // ASCII arrow (easier to type)
```

**Normalization:**
```javascript
const normalizeEventKey = (key) => key.replace(/->/g, '→');
```

All examples in this document use `→` but implementations accept both.

---

## Type Definitions (Revision April 1, 2026)

### When Condition

```typescript
type WhenCondition = {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value: string | number | boolean | string[];
};
```

### Bypass Roles

```typescript
// bypassRoles: Array of role names that are exempt from the block
type BypassRoles = string[];  // e.g., ['manager', 'admin']
```

### Approval Requirement

```typescript
type ApprovalRequirement = {
  approver: string;         // Role name
  timeout?: number;         // Auto-expire in hours (optional)
};
```

### Inline Action Shapes

```typescript
type InlineAction = 
  | { log: { message: string; level: 'info' | 'warn' | 'error' } }
  | { emit: { event: string; payload?: Record<string, unknown> } };
```

### Action Context

```typescript
type ActionContext = {
  entity: string;
  recordId: string;
  field: string;
  previousValue: unknown;
  newValue: unknown;
  user: { id: string; role: string };
  correlationId: string;
};
```

### Identity Template Syntax (Revision April 1, 2026)

Templates use simple variable interpolation with curly braces. No templating engine — just string replacement.

**Available Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `{prefix}` | The `prefix` value from identity config | `WO` |
| `{year}` | Current 4-digit year | `2026` |
| `{year2}` | Current 2-digit year | `26` |
| `{month}` | Current month (01-12) | `04` |
| `{day}` | Current day (01-31) | `01` |
| `{sequence}` | Auto-incrementing sequence (per entity, per year) | `0001` |
| `{seq}` | Alias for `{sequence}` | `0001` |
| `{uuid4}` | Random UUID v4 (first 8 chars) | `a1b2c3d4` |

**Format Specifiers:**

```javascript
// Default padding (4 digits for sequence)
'{prefix}-{year}-{sequence}'        // WO-2026-0001

// Custom padding with :N syntax
'{prefix}-{year}-{sequence:6}'      // WO-2026-000001

// Literal braces escaped with double braces
'{{literal}}-{prefix}'              // {literal}-WO
```

**Validation Rules:**
- All variables in template must be from the allowed list
- Unknown variables → load-time error
- `{prefix}` requires `prefix` property in identity config
- Template is validated at metadata load time, not runtime

---

## Progressive Disclosure & Entity Defaults (Revision April 1, 2026)

### Entity-Level Defaults

Minimal config expands to full at load time:

```javascript
const ENTITY_DEFAULTS = {
  primaryKey: 'id',
  rlsRules: [],
  enums: {},
  relationships: {},
  defaultIncludes: [],
  dependents: [],
  routeConfig: { useGenericRouter: true },
  fieldGroups: {},
  fieldAliases: {},
  features: { supportsFileAttachments: false, summaryConfig: null },
};
```

### Minimal Valid Standard Entity

Only **9 required properties** (not 19):

```javascript
module.exports = {
  entityKey: 'thing',
  tableName: 'things',
  icon: 'star',
  description: 'A thing',
  rlsResource: 'thing',
  entityPermissions: { create: 'any', read: 'any', update: 'any', delete: 'any' },
  fields: { name: { type: 'string', identity: { pattern: 'user_provided' } } },
  navigation: { visibility: 'visible', group: 'resources', order: 99 },
  displayColumns: ['name'],
};
// All else: defaults applied at load time
```

---

## Schema Evolution Strategy (Revision April 1, 2026)

### Adding Fields

| Field Type | Safe Approach |
|------------|---------------|
| Optional | Add with `required: false` — safe |
| Required | Add with `default: value` first, backfill, then remove default |

### Removing Fields

1. Remove from hooks/access (make invisible)
2. Run migration to null values
3. Remove from metadata
4. Drop column in separate migration

### Immutable Patterns

| Change | Allowed? |
|--------|----------|
| Identity pattern | ❌ Identity pattern is immutable per entity |
| Entity key | ❌ Would break all references |
| Action rename | ⚠️ Update all references first |

### Migration Rollback Strategy (Revision April 1, 2026)

For the Phase 2 field-centric migration (31 entities), employ checkpoint-based rollback:

**1. Pre-Migration:**
```bash
# Create checkpoint of all metadata files
npm run migration:checkpoint create phase2-field-centric
# Creates: migrations/checkpoints/phase2-field-centric/
#   - All 31 *-metadata.js files copied
#   - manifest.json with file hashes
```

**2. Per-Entity Migration:**
```bash
# Migrate one entity at a time with validation
npm run migration:entity work_order --validate

# If validation fails:
npm run migration:entity work_order --rollback
# Restores from checkpoint, logs failure reason
```

**3. Batch Recovery:**
```bash
# If multiple entities fail or systemic issue discovered:
npm run migration:checkpoint restore phase2-field-centric
# Restores ALL files from checkpoint
```

**Validation Gates (per entity):**
- ✅ File parses without error
- ✅ Required properties present
- ✅ Field types valid
- ✅ Hook references exist in actions registry
- ✅ Cross-entity references valid (FK targets exist)

**Failure Handling:**
| Failure Point | Recovery |
|---------------|----------|
| Entity 1-10 | Fix issue, retry from failed entity |
| Entity 11-20 | Evaluate pattern; consider batch rollback |
| Entity 21-31 | Complete forward if >80% done; else batch rollback |

### Metadata Versioning

**Status:** Reserved for future use — property accepted but not enforced in Phase 2.

```javascript
module.exports = {
  schemaVersion: 1,  // Bump on breaking changes
  entityKey: 'work_order',
  // ...
};
```

**Current Behavior (Phase 2):**
- `schemaVersion` is an optional property
- If present, validated as positive integer
- NOT used for runtime decisions yet

**Future Implementation (Phase 3+):**
```javascript
// services/metadata-loader.js
const CURRENT_SCHEMA_VERSION = 1;

function loadMetadata(entityKey) {
  const meta = require(`./models/${entityKey}-metadata.js`);
  
  if (meta.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(`${entityKey}: schemaVersion ${meta.schemaVersion} requires newer service`);
  }
  
  if (meta.schemaVersion < CURRENT_SCHEMA_VERSION) {
    logger.warn(`${entityKey}: schemaVersion ${meta.schemaVersion} is deprecated`);
    meta = migrateSchema(meta, meta.schemaVersion, CURRENT_SCHEMA_VERSION);
  }
  
  return meta;
}
```

**When to Bump schemaVersion:**
- Adding required properties (not optional)
- Changing property semantics (e.g., `pattern` values)
- Removing supported properties

---

## Observability Layer (Revision April 1, 2026)

### Tracing Context (Per-Request)

```javascript
const requestContext = {
  correlationId: 'uuid',          // Thread through all logs
  cascadePath: [],                // ['recommendation.status', 'quote.create']
  hookExecutions: [],             // Array of hook execution logs
};
```

### Metrics (Optional)

```javascript
const METRICS = {
  hook_execution_total: 'Counter',       // Labels: entity, field, phase, status
  hook_execution_duration: 'Histogram',  // Labels: entity, field, phase
  load_time_validation_errors: 'Counter',
  cascade_depth_exceeded: 'Counter',
};
```

### Approval Flow Tracing

Each approval_request stores `correlation_id` from original request, enabling:
```
Original Request → approval_request.correlation_id → Approval Decision → Final Change
```

---

## Error Taxonomy (Revision April 1, 2026)

All errors return a consistent shape with distinguishable codes.

### Error Codes

```javascript
const ERROR_CODES = {
  // 400 - Bad Request
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  
  // 403 - Forbidden  
  PERMISSION_DENIED: 'PERMISSION_DENIED',      // RLS denied
  HOOK_BLOCKED: 'HOOK_BLOCKED',                // beforeChange blocked
  IMMUTABLE_FIELD: 'IMMUTABLE_FIELD',          // attempt to change immutable
  
  // 202 - Accepted
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  
  // 500 - Internal
  HOOK_EXECUTION_ERROR: 'HOOK_EXECUTION_ERROR',
  ACTION_FAILED: 'ACTION_FAILED',
  CONFIG_ERROR: 'CONFIG_ERROR',
};
```

### Error Response Shape

```javascript
{
  error: {
    code: 'HOOK_BLOCKED',
    message: 'Status transition not allowed',
    details: {
      entity: 'recommendation',
      field: 'status',
      transition: 'open→approved',
      hookIndex: 0,
      hookDescription: 'Customer must approve',
    }
  }
}
```

### Load-Time Error Shape

```javascript
{
  type: 'LOAD_ERROR',
  file: 'recommendation-metadata.js',
  path: 'fields.status.beforeChange[0]',
  message: 'Action "notify_customer" not found in actions registry',
}
```

---

## Testing Utilities (Revision April 1, 2026)

### Proposed Helpers (`backend/__tests__/helpers/metadata-test-utils.js`)

```javascript
const createMinimalEntity = (overrides = {}) => ({
  entityKey: 'test_entity',
  tableName: 'test_entities',
  primaryKey: 'id',
  icon: 'star',
  description: 'Test entity',
  rlsResource: 'test',
  rlsRules: [],
  entityPermissions: { create: 'any', read: 'any', update: 'any', delete: 'any' },
  fields: { name: { type: 'string' } },
  enums: {},
  ...overrides,
});

const createFieldWithHook = (hookType, hookDef) => ({
  type: 'enum',
  enumKey: 'status',
  [hookType]: [hookDef],
});

const mockActionsRegistry = (actions = {}) => ({
  get: (id) => actions[id],
  has: (id) => id in actions,
});
```

### Unit Test Pattern

```javascript
describe('beforeChange hook evaluation', () => {
  it('blocks transition when blocked:true and role not in bypassRoles', () => {
    const field = createFieldWithHook('beforeChange', {
      on: 'draft->published',
      blocked: true,
      bypassRoles: ['manager'],
    });
    const result = evaluateHook(field, 'draft->published', { role: 'technician' });
    expect(result.blocked).toBe(true);
  });
});
```

---

## Boot Order & Performance (Revision April 1, 2026)

### Boot Order

1. `field-types.js` — pure, no dependencies
2. `constants.js` — pure constants  
3. `constraints.js` — IDENTITY_CONSTRAINTS, HOOK_CONSTRAINTS
4. `actions.json` — pure action definitions (loaded as data, no imports)
5. `*-metadata.js` — loaded in parallel, validated after all loaded
6. Cross-entity validation (compositeFields refs, action IDs)

### Parallel Validation Strategy (Revision April 1, 2026)

To maintain O(n) validation as entity count grows:

**Phase 1: Parallel Load (Independent)**
```javascript
// Load all metadata files in parallel — no dependencies between files
const metadataPromises = entityFiles.map(file => 
  import(file).then(m => ({ file, meta: m.default }))
);
const allMetadata = await Promise.all(metadataPromises);
```

**Phase 2: Index Build (Single-Pass)**
```javascript
// Build indexes for cross-entity lookups — O(n)
const entityIndex = new Map();      // entityKey → metadata
const fieldIndex = new Map();       // entityKey.fieldName → field definition
const actionRefIndex = new Set();   // all action IDs referenced

for (const { file, meta } of allMetadata) {
  entityIndex.set(meta.entityKey, meta);
  for (const [fieldName, field] of Object.entries(meta.fields)) {
    fieldIndex.set(`${meta.entityKey}.${fieldName}`, field);
    collectActionRefs(field, actionRefIndex);
  }
}
```

**Phase 3: Parallel Validate (Independent per Entity)**
```javascript
// Validate each entity in parallel — O(n) total, parallelized
const validationPromises = allMetadata.map(({ file, meta }) =>
  validateEntity(meta, { entityIndex, fieldIndex, actionRefIndex })
    .catch(err => ({ file, error: err }))
);
const results = await Promise.all(validationPromises);
const errors = results.filter(r => r.error);
```

**Cross-Entity Checks (O(1) per check via indexes):**
| Check | Complexity | Method |
|-------|------------|--------|
| FK target exists | O(1) | `entityIndex.has(targetEntityKey)` |
| compositeField exists | O(1) | `fieldIndex.has(\`${entityKey}.${fieldName}\`)` |
| Action ID exists | O(1) | `actionsRegistry.has(actionId)` |

**Scaling Characteristics:**
| Entities | Load | Validate | Total |
|----------|------|----------|-------|
| 31 | ~50ms | ~30ms | ~80ms |
| 100 | ~100ms | ~80ms | ~180ms |
| 500 | ~300ms | ~200ms | ~500ms |

**Fallback for Circular Dependencies:**
If validation needs results from another entity's validation (rare):
1. Mark as "deferred"
2. Complete first pass
3. Run deferred validations with full context

### Performance Budget

| Operation | Target | Notes |
|-----------|--------|-------|
| Startup (31 entities) | < 200ms | Current estimate |
| Startup (100 entities) | < 500ms | Future scale |
| Per-request metadata lookup | < 1ms | Cached by entityKey |
| Hook evaluation (10 hooks) | < 5ms | Array iteration |
| Load-time validation | < 100ms | Parallel per entity |

### Development Hot Reload (Future)

- Watch `config/models/*.js` and `config/actions.json`
- On change: re-validate changed file only
- Skip full cross-entity validation in dev mode
- Full validation on production build

### Capacity Limits & Hook Budget

| Resource | Limit | Rationale | Source |
|----------|-------|-----------|--------|
| Hooks per field | Max 10 | Most fields need 0-2; 10 accommodates complex status machines | Salesforce Flow: max 10 triggers/object |
| Cascade depth | Max 3 levels | A→B→C→D is readable; deeper chains indicate design smell | ServiceNow: max 3 business rule nesting |
| compositeFields | Max 5 fields | `first middle last suffix title` covers all name patterns | Industry practice |
| Inline action size | Max 500 chars | Forces registry for complex actions; keeps metadata scannable | Empirical: 500 chars ≈ 10 lines |
| Total hook executions | Max 20 | 3 levels × 5 hooks + buffer; prevents runaway cascades | Calculated from cascade model |
| Max execution time | 5000ms | P99 API response should be <2s; 5s = hard failure threshold | SLA requirement |

**Limit Derivation:**
```
maxTotalExecutions = maxCascadeDepth × avgHooksPerLevel × safetyFactor
                   = 3 × 5 × 1.3 ≈ 20
```

**Tuning Guidance:**
- These limits are STARTING POINTS based on industry patterns
- Monitor `cascade_depth_exceeded` and `hook_budget_exceeded` metrics
- Adjust per environment if needed (config, not code)
- If consistently hitting limits → refactor hooks, not raise limits

```javascript
// Principle 12: Budget-Based Limits
const HOOK_BUDGET = {
  maxHooksPerField: 10,
  maxCascadeDepth: 3,
  maxTotalExecutions: 20,    // Total hooks across ALL cascade levels
  maxExecutionTime: 5000,    // ms — circuit breaker
};

// Enforcement: If budget exceeded:
// 1. Log warning with full cascade path
// 2. Return partial success with X-Hook-Budget-Exceeded header
// 3. Complete what we can, skip the rest
```

---

## Anti-Patterns (Revision April 1, 2026)

### ❌ Hooks on every field
Don't add empty hooks arrays. Only add hooks to fields that need them.
```javascript
// BAD: noise
status: { type: 'enum', beforeChange: [], afterChange: [] }

// GOOD: omit if empty (defaults apply)
status: { type: 'enum' }
```

### ❌ Overly complex `when` conditions
If you need AND/OR logic, consider a custom validator instead.
```javascript
// BAD: complex condition
when: { field: 'amount', operator: '>', value: 1000 }  // AND role check in unless?

// BETTER: custom validator
validators: ['requiresManagerApprovalForLargeAmounts']
```

### ❌ Inline actions for complex logic
Use registry actions for anything beyond simple logging.
```javascript
// BAD: complex inline
do: { createEntity: { ... }, sendEmail: { ... }, updateInventory: { ... } }

// GOOD: registry reference
do: 'process_order_completion'
```

### ❌ Circular hook cascades
If entity A's afterChange creates entity B, and B's afterChange updates A — infinite loop risk.
The system will halt at MAX_CASCADE_DEPTH, but design to avoid this.

---

## References

- [METADATA-SSOT-AUDIT.md](./METADATA-SSOT-AUDIT.md) — 12-layer architecture audit
- [entity-metadata.types.js](../../backend/config/models/entity-metadata.types.js) — Type contract
- [DESIGN-REVIEW-FRAMEWORK.md](./DESIGN-REVIEW-FRAMEWORK.md) — Adversarial review process
- [Microsoft D365 Field Service](https://learn.microsoft.com/en-us/dynamics365/field-service/) — Industry patterns

---

*Document created: March 31, 2026*  
*Phase 1 completed: March 31, 2026*  
*Shape consistency principle added: April 1, 2026*  
*Field-centric design locked in: April 1, 2026*  
*Unified architecture (4 principles) locked in: April 1, 2026*  
*Property Constraints and Execution Model added: April 1, 2026*  
*Operational Readiness (10 solutions) added: April 1, 2026*  
*Review synthesis and Anti-Patterns added: April 1, 2026*  
*51-Point Review APPROVED: April 1, 2026*  
*Action Items (6) resolved: Identity renaming, Template syntax, Migration rollback, Capacity rationale, schemaVersion clarity, Validation parallelization*  
*Final Design Gaps (4) resolved: bypassRoles naming, Actions registry, Quick Start, Consumer specs — April 1, 2026*  
*DESIGN COMPLETE — Ready for Phase 2 Implementation*