/**
 * Action Handlers Tests
 *
 * Tests the generic action type interpreters for the hooks system.
 */

const path = require('path');

// Mock GenericEntityService to avoid actual DB calls
jest.mock('../../../services/entity/generic-entity-service', () => ({
  create: jest.fn().mockResolvedValue({ id: 999 }),
  update: jest.fn().mockResolvedValue({ id: 1 }),
}));

// Mock db connection for formula queries
jest.mock('../../../db/connection', () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ total: 100 }] }),
}));

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

// Get mock references for assertions
const GenericEntityService = require('../../../services/entity/generic-entity-service');
const db = require('../../../db/connection');

describe('action-handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      it('creates in_app notification via GenericEntityService', async () => {
        const config = {
          type: 'notification',
          template: 'status_change',
          recipient: { field: 'assigned_to' },
          channels: ['in_app'],
        };
        const context = {
          entity: 'task',
          record: { id: 1, assigned_to: 'user123' },
          oldValue: 'pending',
          newValue: 'completed',
        };

        const result = await ACTION_HANDLERS.notification(config, context);

        expect(result.success).toBe(true);
        expect(result.type).toBe('notification');
        expect(result.template).toBe('status_change');
        expect(result.recipientCount).toBe(1);
        expect(result.in_app).toHaveLength(1);
        expect(result.in_app[0].notificationId).toBe(999); // From mock
        expect(GenericEntityService.create).toHaveBeenCalledWith(
          'notification',
          expect.objectContaining({
            user_id: 'user123',
            title: expect.any(String),
            body: expect.any(String),
            type: 'info',
            resource_type: 'task',
            resource_id: 1,
          }),
          expect.objectContaining({ skipHooks: true })
        );
      });

      it('handles role-based recipients by querying users', async () => {
        // Mock getUsersByRole returning users
        db.query.mockResolvedValueOnce({
          rows: [{ id: 501 }],
        });

        const config = {
          type: 'notification',
          template: 'approval_needed',
          recipient: { role: 'manager' },
          channels: ['in_app'],
        };
        const context = {
          entity: 'request',
          record: { id: 1 },
        };

        const result = await ACTION_HANDLERS.notification(config, context);

        expect(result.success).toBe(true);
        expect(result.recipientCount).toBe(1);
        expect(result.in_app).toHaveLength(1);
      });

      it('skips notification when no recipient can be resolved', async () => {
        const config = {
          type: 'notification',
          template: 'test',
          recipient: { field: 'missing_field' },
        };
        const context = { entity: 'test', record: {} };

        const result = await ACTION_HANDLERS.notification(config, context);

        expect(result.success).toBe(true);
        expect(result.skipped).toBe(true);
        expect(result.reason).toBe('no_recipients');
      });
    });

    describe('create_entity handler', () => {
      it('creates entity with copyFields via GenericEntityService', async () => {
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
        expect(result.createdId).toBe(999); // From mock
        expect(GenericEntityService.create).toHaveBeenCalledWith(
          'audit_log',
          expect.objectContaining({
            request_id: 100,
            customer_id: 50,
            action: 'approved',
          }),
          expect.any(Object)
        );
      });

      it('creates entity with mapping', async () => {
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
      it('updates entity via GenericEntityService', async () => {
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
        expect(result.found).toBe(true); // From mock returning { id: 1 }
        expect(GenericEntityService.update).toHaveBeenCalledWith(
          'invoice',
          99,
          { status: 'paid' },
          expect.any(Object)
        );
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
      it('returns computed value and updates target entity', async () => {
        const config = {
          type: 'compute',
          target: 'invoice.total',
          formula: 'SUM(line_items.amount)',
        };
        const context = {
          entity: 'line_item',
          record: { id: 1, invoice_id: 42 },
        };

        const result = await ACTION_HANDLERS.compute(config, context);

        expect(result.success).toBe(true);
        expect(result.type).toBe('compute');
        expect(result.target).toBe('invoice.total');
        expect(result.formula).toBe('SUM(line_items.amount)');
        expect(result.value).toBe(100); // From mocked db.query
        expect(GenericEntityService.update).toHaveBeenCalledWith(
          'invoice',
          42,
          { total: 100 },
          expect.objectContaining({ skipHooks: true })
        );
      });

      it('returns error when target entity/field cannot be parsed', async () => {
        const config = {
          type: 'compute',
          target: 'invalid',
          formula: 'SUM(items.amount)',
        };
        const context = { entity: 'test', record: { id: 1 } };

        const result = await ACTION_HANDLERS.compute(config, context);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid target or missing ID');
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

  describe('role-based notification recipients', () => {
    it('creates notifications for all users with specified role', async () => {
      // Mock getUsersByRole returning multiple users
      db.query.mockResolvedValueOnce({
        rows: [{ id: 101 }, { id: 102 }, { id: 103 }],
      });

      const config = {
        type: 'notification',
        template: 'approval_required',
        recipient: { role: 'manager' },
        channels: ['in_app'],
      };
      const context = {
        entity: 'request',
        record: { id: 1 },
      };

      const result = await ACTION_HANDLERS.notification(config, context);

      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(3);
      expect(result.in_app).toHaveLength(3);
      expect(GenericEntityService.create).toHaveBeenCalledTimes(3);
    });

    it('skips notification when no users have the specified role', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const config = {
        type: 'notification',
        template: 'test',
        recipient: { role: 'nonexistent_role' },
        channels: ['in_app'],
      };
      const context = { entity: 'test', record: { id: 1 } };

      const result = await ACTION_HANDLERS.notification(config, context);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('no_recipients');
    });

    it('marks email channel as pending infrastructure', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 201 }],
      });

      const config = {
        type: 'notification',
        template: 'status_change',
        recipient: { role: 'admin' },
        channels: ['in_app', 'email'],
      };
      const context = {
        entity: 'work_order',
        record: { id: 5 },
      };

      const result = await ACTION_HANDLERS.notification(config, context);

      expect(result.success).toBe(true);
      expect(result.in_app).toHaveLength(1);
      expect(result.email).toHaveLength(1);
      expect(result.email[0].status).toBe('pending_infrastructure');
    });
  });

  describe('RRULE_NEXT formula', () => {
    it('calculates next occurrence from simple frequency enum', async () => {
      const config = {
        type: 'compute',
        target: 'maintenance_schedule.next_due_date',
        formula: 'RRULE_NEXT(frequency, last_generated_date)',
      };
      const context = {
        entity: 'maintenance_schedule',
        record: {
          id: 1,
          frequency: 'weekly',
          last_generated_date: '2026-04-01T10:00:00Z',
        },
      };

      const result = await ACTION_HANDLERS.compute(config, context);

      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
      // Next occurrence should be after the last_generated_date
      const nextDate = new Date(result.value);
      const lastDate = new Date('2026-04-01T10:00:00Z');
      expect(nextDate.getTime()).toBeGreaterThan(lastDate.getTime());
    });

    it('handles biweekly frequency (2-week interval)', async () => {
      const config = {
        type: 'compute',
        target: 'maintenance_schedule.next_due_date',
        formula: 'RRULE_NEXT(frequency, last_generated_date)',
      };
      const context = {
        entity: 'maintenance_schedule',
        record: {
          id: 1,
          frequency: 'biweekly',
          last_generated_date: '2026-04-01T10:00:00Z',
        },
      };

      const result = await ACTION_HANDLERS.compute(config, context);

      expect(result.success).toBe(true);
      const nextDate = new Date(result.value);
      // Biweekly = 2 weeks = 14 days
      const expectedMinDate = new Date('2026-04-01T10:00:00Z');
      expectedMinDate.setDate(expectedMinDate.getDate() + 14);
      // Allow some tolerance for timezone/DST
      expect(nextDate.getTime()).toBeGreaterThanOrEqual(expectedMinDate.getTime() - 86400000);
    });

    it('handles quarterly frequency (3-month interval)', async () => {
      const config = {
        type: 'compute',
        target: 'maintenance_schedule.next_due_date',
        formula: 'RRULE_NEXT(frequency, last_generated_date)',
      };
      const context = {
        entity: 'maintenance_schedule',
        record: {
          id: 1,
          frequency: 'quarterly',
          last_generated_date: '2026-01-15T10:00:00Z',
        },
      };

      const result = await ACTION_HANDLERS.compute(config, context);

      expect(result.success).toBe(true);
      const nextDate = new Date(result.value);
      // Quarterly = 3 months, so around April 15
      expect(nextDate.getMonth()).toBeGreaterThanOrEqual(3); // April = month 3
    });

    it('returns null for unknown frequency', async () => {
      const config = {
        type: 'compute',
        target: 'maintenance_schedule.next_due_date',
        formula: 'RRULE_NEXT(frequency, last_generated_date)',
      };
      const context = {
        entity: 'maintenance_schedule',
        record: {
          id: 1,
          frequency: 'unknown_frequency',
          last_generated_date: '2026-04-01',
        },
      };

      const result = await ACTION_HANDLERS.compute(config, context);

      // compute handler still succeeds but value is null
      expect(result.value).toBeNull();
    });

    it('uses current date when last_date is not set', async () => {
      const config = {
        type: 'compute',
        target: 'maintenance_schedule.next_due_date',
        formula: 'RRULE_NEXT(frequency, last_generated_date)',
      };
      const context = {
        entity: 'maintenance_schedule',
        record: {
          id: 1,
          frequency: 'daily',
          last_generated_date: null,
        },
      };

      const result = await ACTION_HANDLERS.compute(config, context);

      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
      const nextDate = new Date(result.value);
      const now = new Date();
      // Should be tomorrow or later
      expect(nextDate.getTime()).toBeGreaterThan(now.getTime() - 86400000);
    });
  });
});
