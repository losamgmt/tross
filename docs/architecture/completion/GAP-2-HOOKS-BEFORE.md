# GAP-2: beforeChange Hooks

**Status:** 📋 DESIGN  
**Priority:** MEDIUM  
**Parent:** [METADATA-COMPLETION-PLAN.md](../METADATA-COMPLETION-PLAN.md)  
**Depends On:** [HOOKS-ENGINE.md](HOOKS-ENGINE.md)

---

## Purpose

`beforeChange` hooks intercept field changes BEFORE they commit:
- Block forbidden transitions
- Require approval workflows
- Validate business rules beyond schema

---

## Hook Schema

From design spec (ENTITY-EXPANSION-DESIGN.md lines 485-511):

```javascript
fields: {
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
}
```

---

## Hook Properties (from HOOK_CONSTRAINTS)

**Allowed:** `on`, `when`, `blocked`, `bypassRoles`, `requiresApproval`, `description`  
**Forbidden:** `do` (that's for afterChange only)

| Property | Type | Description |
|----------|------|-------------|
| `on` | string | Trigger pattern (see HOOKS-ENGINE.md) |
| `when` | WhenCondition | `{ field, operator, value }` — additional conditions |
| `blocked` | boolean | Reject the change |
| `requiresApproval` | ApprovalRequirement | `{ approver: string, timeout?: number }` |
| `bypassRoles` | string[] | Roles that skip this hook |
| `description` | string | User-facing message |

### Type Definitions

```typescript
type WhenCondition = {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
  value: string | number | boolean | string[];
};

type ApprovalRequirement = {
  approver: string;    // Role name (e.g., 'manager', 'customer')
  timeout?: number;    // Auto-expire in hours (optional)
};
```

---

## Entity-Specific beforeChange Hooks

### Recommendation (from design spec)

```javascript
status: {
  beforeChange: [
    {
      on: 'open→approved',
      requiresApproval: { approver: 'customer' },
      description: 'Customer must approve recommendation',
    },
  ],
},
total_amount: {
  beforeChange: [
    {
      on: 'change',
      when: { field: 'total_amount', operator: '>', value: 10000 },
      requiresApproval: { approver: 'manager' },
      description: 'Changes over $10k require manager approval',
    },
  ],
}
```

### Quote

```javascript
status: {
  beforeChange: [
    {
      on: '→accepted',
      blocked: true,
      bypassRoles: ['customer', 'admin'],
      description: 'Only customer or admin can accept quote',
    },
  ],
}
```

### Invoice

```javascript
status: {
  beforeChange: [
    {
      on: '→paid',
      blocked: true,
      bypassRoles: ['system'],
      description: 'Paid status set by payment system only',
    },
    {
      on: 'paid→',
      blocked: true,
      description: 'Cannot change status after paid',
    },
  ],
}
```

---

## Evaluation Flow (from ENTITY-EXPANSION-DESIGN.md lines 918-942)

```
FOR each hook in beforeChange (in order):
  IF hook.on matches current event:
    IF hook.when condition fails:
      SKIP this hook
    IF hook.blocked AND user.role NOT in hook.bypassRoles:
      REJECT request with 403 Forbidden
      STOP evaluation
    IF hook.requiresApproval:
      CREATE approval_request { approver: hook.requiresApproval.approver }
      RETURN 202 Accepted
      STOP evaluation

IF all hooks pass:
  PROCEED with change
```

**Key Points:**
- First blocking hook wins (short-circuit)
- First approval requirement wins
- Order matters — put most restrictive hooks first

---

## Approval Workflow Integration

When `requiresApproval: { approver: 'manager' }`:

1. Hook creates `approval_request` record
2. Original change is BLOCKED (not committed)
3. Notifies approver (role specified in `approver` property)
4. Approver approves → change is replayed
5. Approver rejects → request closed, no change

```javascript
// In hook-service.js
if (hook.requiresApproval) {
  const approval = await createApprovalRequest({
    target_entity: options.entityKey,
    target_id: options.record.id,
    target_field: options.fieldName,
    proposed_value: options.newValue,
    requested_by: options.user.id,
    approver_role: hook.requiresApproval.approver,  // From { approver: 'manager' }
    timeout_hours: hook.requiresApproval.timeout,    // Optional
    description: hook.description,
  });
  
  return {
    allowed: false,
    requiresApproval: true,
    approval,
  };
}
```

---

## Error Messages

Blocked changes return structured errors:

```javascript
{
  error: 'HOOK_BLOCKED',
  code: 'BEFORE_CHANGE_BLOCKED',
  field: 'status',
  hook: 'draft→sent',
  message: 'Cannot skip approval',
  bypassRoles: ['admin']
}
```

UI can show: "Cannot skip approval. Contact an admin to bypass."

---

## Test Cases

### Unit Tests

1. **Basic blocking:** Change blocked, returns reason
2. **Bypass roles:** Admin bypasses block
3. **Approval required:** Creates approval_request
4. **Conditions:** `when` clause evaluated correctly
5. **No match:** Unmatched transitions pass through

### Integration Tests

1. Full request → hook → block flow
2. Approval workflow end-to-end
3. Bypass with role-based context

---

## Implementation Checklist

- [ ] Define beforeChange hooks for recommendation (high-value approval)
- [ ] Define beforeChange hooks for quote (accept restriction)
- [ ] Define beforeChange hooks for invoice (paid status protection)
- [ ] Wire hook evaluation into update flow
- [ ] Implement approval_request creation
- [ ] Add unit tests for blocking
- [ ] Add integration tests for approval flow
