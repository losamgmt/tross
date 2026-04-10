/**
 * HookService Unit Tests
 *
 * Tests hook matching, condition evaluation, and hook execution.
 *
 * STRUCTURE:
 * - matchesOn: Pattern matching for 'on' property
 * - evaluateWhen: Condition evaluation
 * - evaluateBeforeHooks: Blocking and approval logic
 * - evaluateAfterHooks: Action execution
 */

jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../config/action-handlers', () => ({
  getAction: jest.fn(),
  executeAction: jest.fn(),
}));

const {
  matchesOn,
  evaluateWhen,
  evaluateBeforeHooks,
  evaluateAfterHooks,
  HOOK_LIMITS,
} = require('../../../services/hook-service');
const { getAction, executeAction } = require('../../../config/action-handlers');
const { logger } = require('../../../config/logger');

describe('HookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // matchesOn TESTS (pure function)
  // ═══════════════════════════════════════════════════════════════

  describe('matchesOn', () => {
    describe('lifecycle patterns', () => {
      test('create matches on creation operation', () => {
        expect(matchesOn('create', null, 'draft', 'create')).toBe(true);
        expect(matchesOn('create', null, 'draft', 'update')).toBe(false);
      });

      test('delete matches on delete operation', () => {
        expect(matchesOn('delete', 'active', null, 'delete')).toBe(true);
        expect(matchesOn('delete', 'active', null, 'update')).toBe(false);
      });

      test('change matches when value differs', () => {
        expect(matchesOn('change', 'draft', 'sent', 'update')).toBe(true);
        expect(matchesOn('change', 'draft', 'draft', 'update')).toBe(false);
      });
    });

    describe('transition patterns', () => {
      test('exact transition old→new', () => {
        expect(matchesOn('draft→sent', 'draft', 'sent')).toBe(true);
        expect(matchesOn('draft→sent', 'draft', 'approved')).toBe(false);
        expect(matchesOn('draft→sent', 'open', 'sent')).toBe(false);
      });

      test('arrival pattern →new', () => {
        expect(matchesOn('→approved', 'draft', 'approved')).toBe(true);
        expect(matchesOn('→approved', 'sent', 'approved')).toBe(true);
        expect(matchesOn('→approved', 'draft', 'rejected')).toBe(false);
      });

      test('departure pattern old→', () => {
        expect(matchesOn('pending→', 'pending', 'approved')).toBe(true);
        expect(matchesOn('pending→', 'pending', 'rejected')).toBe(true);
        expect(matchesOn('pending→', 'draft', 'approved')).toBe(false);
      });

      test('transition requires actual change', () => {
        // No change = no match even if pattern matches current state
        expect(matchesOn('→approved', 'approved', 'approved')).toBe(false);
        expect(matchesOn('draft→', 'draft', 'draft')).toBe(false);
      });
    });

    describe('exact value patterns', () => {
      test('matches arrival at specific value', () => {
        expect(matchesOn('approved', 'draft', 'approved')).toBe(true);
        expect(matchesOn('approved', 'draft', 'rejected')).toBe(false);
      });

      test('requires actual change', () => {
        expect(matchesOn('approved', 'approved', 'approved')).toBe(false);
      });
    });

    describe('type coercion', () => {
      test('handles numeric values', () => {
        expect(matchesOn('→1', 0, 1)).toBe(true);
        expect(matchesOn('0→1', 0, 1)).toBe(true);
      });

      test('handles boolean-like values', () => {
        expect(matchesOn('→true', 'false', 'true')).toBe(true);
      });

      test('handles null and undefined values', () => {
        // null → value should match arrival pattern
        expect(matchesOn('→draft', null, 'draft')).toBe(true);
        expect(matchesOn('→draft', undefined, 'draft')).toBe(true);
        
        // Should not accidentally match "null" or "undefined" strings
        expect(matchesOn('→null', 'draft', 'sent')).toBe(false);
        expect(matchesOn('null→', 'draft', 'sent')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluateWhen TESTS (pure function)
  // ═══════════════════════════════════════════════════════════════

  describe('evaluateWhen', () => {
    const record = {
      id: 1,
      total_amount: 15000,
      status: 'draft',
      items: ['a', 'b'],
    };

    test('returns true when no condition', () => {
      expect(evaluateWhen(null, record)).toBe(true);
      expect(evaluateWhen(undefined, record)).toBe(true);
    });

    test('equals operator', () => {
      expect(evaluateWhen({ field: 'status', operator: '=', value: 'draft' }, record)).toBe(true);
      expect(evaluateWhen({ field: 'status', operator: '=', value: 'sent' }, record)).toBe(false);
    });

    test('not equals operator', () => {
      expect(evaluateWhen({ field: 'status', operator: '!=', value: 'sent' }, record)).toBe(true);
      expect(evaluateWhen({ field: 'status', operator: '!=', value: 'draft' }, record)).toBe(false);
    });

    test('greater than operator', () => {
      expect(evaluateWhen({ field: 'total_amount', operator: '>', value: 10000 }, record)).toBe(true);
      expect(evaluateWhen({ field: 'total_amount', operator: '>', value: 15000 }, record)).toBe(false);
      expect(evaluateWhen({ field: 'total_amount', operator: '>', value: 20000 }, record)).toBe(false);
    });

    test('less than operator', () => {
      expect(evaluateWhen({ field: 'total_amount', operator: '<', value: 20000 }, record)).toBe(true);
      expect(evaluateWhen({ field: 'total_amount', operator: '<', value: 15000 }, record)).toBe(false);
    });

    test('greater than or equal operator', () => {
      expect(evaluateWhen({ field: 'total_amount', operator: '>=', value: 15000 }, record)).toBe(true);
      expect(evaluateWhen({ field: 'total_amount', operator: '>=', value: 10000 }, record)).toBe(true);
      expect(evaluateWhen({ field: 'total_amount', operator: '>=', value: 20000 }, record)).toBe(false);
    });

    test('less than or equal operator', () => {
      expect(evaluateWhen({ field: 'total_amount', operator: '<=', value: 15000 }, record)).toBe(true);
      expect(evaluateWhen({ field: 'total_amount', operator: '<=', value: 20000 }, record)).toBe(true);
      expect(evaluateWhen({ field: 'total_amount', operator: '<=', value: 10000 }, record)).toBe(false);
    });

    test('in operator', () => {
      expect(evaluateWhen({ field: 'status', operator: 'in', value: ['draft', 'pending'] }, record)).toBe(true);
      expect(evaluateWhen({ field: 'status', operator: 'in', value: ['sent', 'approved'] }, record)).toBe(false);
    });

    test('not_in operator', () => {
      expect(evaluateWhen({ field: 'status', operator: 'not_in', value: ['sent', 'approved'] }, record)).toBe(true);
      expect(evaluateWhen({ field: 'status', operator: 'not_in', value: ['draft', 'pending'] }, record)).toBe(false);
    });

    test('unknown operator returns false with warning', () => {
      expect(evaluateWhen({ field: 'status', operator: 'unknown', value: 'draft' }, record)).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Unknown when operator', expect.any(Object));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluateBeforeHooks TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('evaluateBeforeHooks', () => {
    const baseContext = {
      entity: 'recommendation',
      record: { id: 1, customer_id: 100, total_amount: 5000 },
      field: 'status',
      user: { id: 1, role: 'technician' },
    };

    test('returns allowed when no hooks', async () => {
      const result = await evaluateBeforeHooks({
        hooks: [],
        oldValue: 'draft',
        newValue: 'sent',
        context: baseContext,
      });

      expect(result).toEqual({ allowed: true });
    });

    test('returns allowed when no hooks match', async () => {
      const hooks = [
        { on: '→approved', blocked: true, description: 'Block approval' },
      ];

      const result = await evaluateBeforeHooks({
        hooks,
        oldValue: 'draft',
        newValue: 'sent', // Not approved
        context: baseContext,
      });

      expect(result).toEqual({ allowed: true });
    });

    test('blocks change when blocked hook matches', async () => {
      const hooks = [
        { on: '→sent', blocked: true, description: 'Cannot send directly' },
      ];

      const result = await evaluateBeforeHooks({
        hooks,
        oldValue: 'draft',
        newValue: 'sent',
        context: baseContext,
      });

      expect(result).toEqual({
        allowed: false,
        blockReason: 'Cannot send directly',
      });
    });

    test('allows bypass for authorized roles', async () => {
      const hooks = [
        { on: '→sent', blocked: true, bypassRoles: ['manager'], description: 'Only managers can send' },
      ];

      const managerContext = {
        ...baseContext,
        user: { id: 2, role: 'manager' },
      };

      const result = await evaluateBeforeHooks({
        hooks,
        oldValue: 'draft',
        newValue: 'sent',
        context: managerContext,
      });

      expect(result).toEqual({ allowed: true });
    });

    test('returns requiresApproval when approval hook matches', async () => {
      const hooks = [
        {
          on: '→approved',
          requiresApproval: { approver: 'customer', timeout: 48 },
          description: 'Customer must approve',
        },
      ];

      const result = await evaluateBeforeHooks({
        hooks,
        oldValue: 'open',
        newValue: 'approved',
        context: baseContext,
      });

      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalInfo).toEqual({
        approver: 'customer',
        timeout: 48,
        targetEntity: 'recommendation',
        targetId: 1,
        targetField: 'status',
        proposedValue: 'approved',
        description: 'Customer must approve',
      });
    });

    test('respects when condition', async () => {
      const hooks = [
        {
          on: 'change',
          when: { field: 'total_amount', operator: '>', value: 10000 },
          requiresApproval: { approver: 'manager' },
          description: 'High value requires manager approval',
        },
      ];

      // Low value - should not trigger
      const lowValueResult = await evaluateBeforeHooks({
        hooks,
        oldValue: 5000,
        newValue: 6000,
        context: {
          ...baseContext,
          field: 'total_amount',
          record: { id: 1, total_amount: 6000 },
        },
      });
      expect(lowValueResult).toEqual({ allowed: true });

      // High value - should trigger
      const highValueResult = await evaluateBeforeHooks({
        hooks,
        oldValue: 5000,
        newValue: 15000,
        context: {
          ...baseContext,
          field: 'total_amount',
          record: { id: 1, total_amount: 15000 },
        },
      });
      expect(highValueResult.requiresApproval).toBe(true);
    });

    test('first blocking hook wins (short-circuit)', async () => {
      const hooks = [
        { on: '→sent', blocked: true, description: 'First block' },
        { on: '→sent', blocked: true, description: 'Second block' },
      ];

      const result = await evaluateBeforeHooks({
        hooks,
        oldValue: 'draft',
        newValue: 'sent',
        context: baseContext,
      });

      expect(result.blockReason).toBe('First block');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluateAfterHooks TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('evaluateAfterHooks', () => {
    const baseContext = {
      entity: 'recommendation',
      record: { id: 1, customer_id: 100 },
      field: 'status',
      user: { id: 1 },
    };

    beforeEach(() => {
      getAction.mockReturnValue({ type: 'notification', template: 'test' });
      executeAction.mockResolvedValue({ success: true });
    });

    test('returns empty when no hooks', async () => {
      const result = await evaluateAfterHooks({
        hooks: [],
        oldValue: 'draft',
        newValue: 'sent',
        context: baseContext,
      });

      expect(result).toEqual({ actionsExecuted: [], errors: [] });
    });

    test('executes matching action', async () => {
      const hooks = [
        { on: '→approved', do: 'create_quote_from_recommendation' },
      ];

      const result = await evaluateAfterHooks({
        hooks,
        oldValue: 'open',
        newValue: 'approved',
        context: baseContext,
      });

      expect(executeAction).toHaveBeenCalledWith(
        'create_quote_from_recommendation',
        expect.objectContaining({
          entity: 'recommendation',
          oldValue: 'open',
          newValue: 'approved',
        })
      );
      expect(result.actionsExecuted).toContain('create_quote_from_recommendation');
      expect(result.errors).toHaveLength(0);
    });

    test('executes all matching hooks', async () => {
      const hooks = [
        { on: '→approved', do: 'notify_customer' },
        { on: '→approved', do: 'create_quote_from_recommendation' },
      ];

      const result = await evaluateAfterHooks({
        hooks,
        oldValue: 'draft',
        newValue: 'approved',
        context: baseContext,
      });

      expect(result.actionsExecuted).toHaveLength(2);
      expect(result.actionsExecuted).toContain('notify_customer');
      expect(result.actionsExecuted).toContain('create_quote_from_recommendation');
    });

    test('continues on action error', async () => {
      executeAction
        .mockRejectedValueOnce(new Error('First action failed'))
        .mockResolvedValueOnce({ success: true });

      const hooks = [
        { on: 'change', do: 'failing_action' },
        { on: 'change', do: 'succeeding_action' },
      ];

      const result = await evaluateAfterHooks({
        hooks,
        oldValue: 'draft',
        newValue: 'sent',
        context: baseContext,
      });

      expect(result.actionsExecuted).toContain('succeeding_action');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].action).toBe('failing_action');
    });

    test('stops at cascade depth limit', async () => {
      const hooks = [{ on: 'change', do: 'test_action' }];

      const deepContext = {
        ...baseContext,
        hookDepth: HOOK_LIMITS.maxCascadeDepth, // Already at limit
      };

      const result = await evaluateAfterHooks({
        hooks,
        oldValue: 'draft',
        newValue: 'sent',
        context: deepContext,
      });

      expect(executeAction).not.toHaveBeenCalled();
      expect(result.actionsExecuted).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Hook cascade limit reached',
        expect.any(Object)
      );
    });

    test('handles unknown action gracefully', async () => {
      getAction.mockReturnValue(null);

      const hooks = [{ on: 'change', do: 'unknown_action' }];

      const result = await evaluateAfterHooks({
        hooks,
        oldValue: 'draft',
        newValue: 'sent',
        context: baseContext,
      });

      expect(executeAction).not.toHaveBeenCalled();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Unknown action');
    });

    test('handles inline action objects', async () => {
      const hooks = [
        { on: 'change', do: { log: { message: 'Status changed' } } },
      ];

      const result = await evaluateAfterHooks({
        hooks,
        oldValue: 'draft',
        newValue: 'sent',
        context: baseContext,
      });

      expect(result.actionsExecuted).toContain('inline');
      expect(executeAction).not.toHaveBeenCalled();
    });

    test('warns when hook missing do property', async () => {
      const hooks = [{ on: 'change' }]; // Missing 'do'

      const result = await evaluateAfterHooks({
        hooks,
        oldValue: 'draft',
        newValue: 'sent',
        context: baseContext,
      });

      expect(result.actionsExecuted).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'afterChange hook missing "do" property',
        expect.any(Object)
      );
    });
  });
});
