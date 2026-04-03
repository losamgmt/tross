/**
 * Action Handlers Tests
 *
 * Tests the generic action type interpreters for the hooks system.
 */

const path = require('path');
const {
  resolveValue,
  resolveCompute,
  executeAction,
  executeActions,
  getAction,
  listActions,
  clearActionsCache,
  ACTION_HANDLERS,
} = require('../../../config/action-handlers');

describe('action-handlers', () => {
  beforeEach(() => {
    clearActionsCache();
  });

  describe('resolveValue', () => {
    it('returns static values unchanged', () => {
      expect(resolveValue('hello')).toBe('hello');
      expect(resolveValue(123)).toBe(123);
      expect(resolveValue(true)).toBe(true);
      expect(resolveValue(null)).toBe(null);
    });

    it('returns undefined for undefined', () => {
      expect(resolveValue(undefined)).toBeUndefined();
    });

    it('resolves field references from context.record', () => {
      const context = {
        record: { name: 'Test Entity', status: 'active' },
      };
      expect(resolveValue({ field: 'name' }, context)).toBe('Test Entity');
      expect(resolveValue({ field: 'status' }, context)).toBe('active');
    });

    it('returns undefined for missing field references', () => {
      const context = { record: { name: 'Test' } };
      expect(resolveValue({ field: 'missing' }, context)).toBeUndefined();
    });

    it('handles missing context.record', () => {
      const context = {};
      expect(resolveValue({ field: 'name' }, context)).toBeUndefined();
    });

    it('resolves compute references', () => {
      const context = { currentUser: { id: 42 } };
      const result = resolveValue({ compute: 'now' }, context);
      // Returns ISO string
      expect(typeof result).toBe('string');
      expect(new Date(result).toString()).not.toBe('Invalid Date');
    });
  });

  describe('resolveCompute', () => {
    it('resolves "now" to ISO timestamp string', () => {
      const before = new Date();
      const result = resolveCompute('now');
      const after = new Date();
      
      expect(typeof result).toBe('string');
      const resultDate = new Date(result);
      expect(resultDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(resultDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('returns null for next_occurrence (not implemented)', () => {
      expect(resolveCompute('next_occurrence')).toBeNull();
    });

    it('returns null for unknown compute references', () => {
      expect(resolveCompute('unknownCompute')).toBeNull();
    });
  });

  describe('ACTION_HANDLERS', () => {
    describe('notification handler', () => {
      it('builds notification payload from config', async () => {
        const config = {
          type: 'notification',
          template: 'status_changed',
          recipient: { field: 'assigned_to' },
          channels: ['in_app'],
        };
        const context = {
          entity: 'task',
          record: { id: 1, assigned_to: 'user123' },
        };

        const result = await ACTION_HANDLERS.notification(config, context);

        expect(result.success).toBe(true);
        expect(result.type).toBe('notification');
        expect(result.template).toBe('status_changed');
      });

      it('handles role-based recipients', async () => {
        const config = {
          type: 'notification',
          template: 'approval_needed',
          recipient: { role: 'manager' },
        };
        const context = {
          entity: 'request',
          record: { id: 1 },
        };

        const result = await ACTION_HANDLERS.notification(config, context);

        expect(result.success).toBe(true);
        expect(result.recipient).toBe('manager');
      });
    });

    describe('create_entity handler', () => {
      it('builds create payload with copyFields', async () => {
        const config = {
          type: 'create_entity',
          entity: 'audit_log',
          copyFields: ['request_id', 'customer_id'],
          setFields: {
            action: 'approved',
          },
        };
        const context = {
          entity: 'request',
          record: { id: 1, request_id: 100, customer_id: 50, name: 'Test' },
        };

        const result = await ACTION_HANDLERS.create_entity(config, context);

        expect(result.success).toBe(true);
        expect(result.type).toBe('create_entity');
        expect(result.entity).toBe('audit_log');
        expect(result.data.request_id).toBe(100);
        expect(result.data.customer_id).toBe(50);
        expect(result.data.action).toBe('approved');
      });

      it('builds create payload with mapping', async () => {
        const config = {
          type: 'create_entity',
          entity: 'quote',
          mapping: {
            source_id: 'request_id',
            customer_id: 'customer_id',
          },
          setFields: {
            status: 'draft',
          },
        };
        const context = {
          entity: 'request',
          record: { id: 1, source_id: 200, customer_id: 75 },
        };

        const result = await ACTION_HANDLERS.create_entity(config, context);

        expect(result.success).toBe(true);
        expect(result.data.request_id).toBe(200);
        expect(result.data.customer_id).toBe(75);
        expect(result.data.status).toBe('draft');
      });

      it('adds origin tracking automatically', async () => {
        const config = {
          type: 'create_entity',
          entity: 'audit_log',
        };
        const context = {
          entity: 'request',
          record: { id: 42 },
        };

        const result = await ACTION_HANDLERS.create_entity(config, context);

        expect(result.data.origin_type).toBe('request');
        expect(result.data.origin_id).toBe(42);
      });
    });

    describe('update_entity handler', () => {
      it('builds update payload with setFields', async () => {
        const config = {
          type: 'update_entity',
          target: { entity: 'invoice', id: { field: 'invoice_id' } },
          updates: {
            status: 'paid',
          },
        };
        const context = {
          entity: 'payment',
          record: { id: 1, invoice_id: 99 },
        };

        const result = await ACTION_HANDLERS.update_entity(config, context);

        expect(result.success).toBe(true);
        expect(result.type).toBe('update_entity');
        expect(result.entity).toBe('invoice');
        expect(result.id).toBe(99);
        expect(result.updates.status).toBe('paid');
      });

      it('returns error for missing target', async () => {
        const config = {
          type: 'update_entity',
          target: { entity: 'invoice', id: { field: 'missing_field' } },
          updates: { status: 'paid' },
        };
        const context = {
          record: { id: 1 },
        };

        const result = await ACTION_HANDLERS.update_entity(config, context);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Missing target');
      });
    });

    describe('compute handler', () => {
      it('returns computed value', async () => {
        const config = {
          type: 'compute',
          target: 'invoice.total',
          formula: 'SUM(line_items.amount)',
        };

        const result = await ACTION_HANDLERS.compute(config, {});

        expect(result.success).toBe(true);
        expect(result.type).toBe('compute');
        expect(result.target).toBe('invoice.total');
        expect(result.formula).toBe('SUM(line_items.amount)');
      });
    });
  });

  describe('executeAction', () => {
    it('executes inline action objects', async () => {
      const inlineAction = {
        type: 'notification',
        template: 'test',
        recipient: { role: 'admin' },
      };
      const context = { entity: 'test', record: {} };

      const result = await executeAction(inlineAction, context);

      expect(result.success).toBe(true);
    });

    it('returns error for unknown action type in inline action', async () => {
      const inlineAction = { type: 'unknown_type' };
      
      const result = await executeAction(inlineAction, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown inline action');
    });

    it('handles log inline actions', async () => {
      const inlineAction = { log: { message: 'test message' } };
      
      const result = await executeAction(inlineAction, {});

      expect(result.success).toBe(true);
      expect(result.type).toBe('log');
    });
  });

  describe('executeActions (batch)', () => {
    it('executes multiple inline actions in sequence', async () => {
      const actions = [
        { type: 'notification', template: 'a', recipient: { role: 'admin' } },
        { type: 'notification', template: 'b', recipient: { role: 'user' } },
      ];
      const context = { entity: 'test', record: {} };

      const result = await executeActions(actions, context);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(result.success).toBe(true);
    });

    it('continues executing on partial failure', async () => {
      const actions = [
        { type: 'notification', template: 'good', recipient: { role: 'admin' } },
        { type: 'bad_type' }, // Will fail
        { type: 'notification', template: 'also_good', recipient: { role: 'user' } },
      ];

      const result = await executeActions(actions, { entity: 'test', record: {} });

      expect(result.results).toHaveLength(3);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
      expect(result.success).toBe(false); // Overall failure because one failed
    });
  });

  describe('registry functions', () => {
    it('getAction returns null for non-existent action', () => {
      expect(getAction('non_existent')).toBeNull();
    });

    it('listActions returns array of action names', () => {
      const actions = listActions();
      expect(Array.isArray(actions)).toBe(true);
    });
  });
});
