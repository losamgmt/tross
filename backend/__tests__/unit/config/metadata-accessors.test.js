/**
 * Metadata Accessors Tests
 *
 * Tests the bridge accessors (fieldAccess, hooks, display) that remain in
 * metadata-accessors.js. The generic field-trait accessors (getFieldsWithTrait,
 * fieldHasTrait) are covered by field-trait-accessors.test.js.
 */

const {
  getFieldAccess,
  getAllFieldAccess,
  getBeforeChangeHooks,
  getAfterChangeHooks,
  getAllHooks,
  getEntityDisplayField,
  MIGRATION_CONFIG,
} = require('../../../config/metadata-accessors');

describe('metadata-accessors', () => {
  // Disable deprecation warnings for tests
  beforeAll(() => {
    MIGRATION_CONFIG.warnOnLegacyUsage = false;
  });

  afterAll(() => {
    MIGRATION_CONFIG.warnOnLegacyUsage = process.env.NODE_ENV !== 'test';
  });

  describe('getFieldAccess / getAllFieldAccess', () => {
    it('reads from field-level access property', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          name: {
            type: 'string',
            access: { create: 'customer', read: 'any', update: 'dispatcher', delete: 'none' },
          },
        },
      };
      expect(getFieldAccess(meta, 'name')).toEqual({
        create: 'customer',
        read: 'any',
        update: 'dispatcher',
        delete: 'none',
      });
    });

    it('falls back to legacy fieldAccess', () => {
      const meta = {
        entityKey: 'test',
        fields: { name: { type: 'string' } },
        fieldAccess: {
          name: { create: 'dispatcher', read: 'customer', update: 'dispatcher', delete: 'none' },
        },
      };
      expect(getFieldAccess(meta, 'name')).toEqual({
        create: 'dispatcher',
        read: 'customer',
        update: 'dispatcher',
        delete: 'none',
      });
    });

    it('getAllFieldAccess merges both sources (field-level wins)', () => {
      const meta = {
        fields: {
          name: { type: 'string', access: { create: 'any', read: 'any', update: 'any', delete: 'none' } },
          email: { type: 'string' }, // No field-level access
        },
        fieldAccess: {
          name: { create: 'dispatcher', read: 'dispatcher', update: 'dispatcher', delete: 'none' },
          email: { create: 'dispatcher', read: 'customer', update: 'none', delete: 'none' },
        },
      };
      const result = getAllFieldAccess(meta);
      // name: field-level wins
      expect(result.name).toEqual({ create: 'any', read: 'any', update: 'any', delete: 'none' });
      // email: falls back to legacy
      expect(result.email).toEqual({ create: 'dispatcher', read: 'customer', update: 'none', delete: 'none' });
    });
  });

  describe('hooks', () => {
    it('getBeforeChangeHooks returns hooks array', () => {
      const meta = {
        fields: {
          status: {
            type: 'enum',
            beforeChange: [
              { on: 'open→approved', requiresApproval: { approver: 'customer' } },
            ],
          },
        },
      };
      expect(getBeforeChangeHooks(meta, 'status')).toHaveLength(1);
      expect(getBeforeChangeHooks(meta, 'status')[0].on).toBe('open→approved');
    });

    it('getAfterChangeHooks returns hooks array', () => {
      const meta = {
        fields: {
          status: {
            type: 'enum',
            afterChange: [
              { on: 'approved', do: 'create_quote' },
              { on: 'rejected', do: 'notify_creator' },
            ],
          },
        },
      };
      expect(getAfterChangeHooks(meta, 'status')).toHaveLength(2);
    });

    it('returns empty array for field without hooks', () => {
      const meta = { fields: { name: { type: 'string' } } };
      expect(getBeforeChangeHooks(meta, 'name')).toEqual([]);
      expect(getAfterChangeHooks(meta, 'name')).toEqual([]);
    });

    it('getAllHooks returns organized hooks by field', () => {
      const meta = {
        fields: {
          status: {
            type: 'enum',
            beforeChange: [{ on: 'change', blocked: true }],
            afterChange: [{ on: 'approved', do: 'notify' }],
          },
          name: { type: 'string' },
          priority: {
            type: 'enum',
            afterChange: [{ on: 'change', do: 'log' }],
          },
        },
      };
      const hooks = getAllHooks(meta);
      expect(Object.keys(hooks)).toEqual(['status', 'priority']);
      expect(hooks.status.beforeChange).toHaveLength(1);
      expect(hooks.status.afterChange).toHaveLength(1);
      expect(hooks.priority.beforeChange).toHaveLength(0);
      expect(hooks.priority.afterChange).toHaveLength(1);
    });
  });

  describe('getEntityDisplayField', () => {
    it('prefers displayField over identityField', () => {
      expect(
        getEntityDisplayField({ displayField: 'name', identityField: 'email' }),
      ).toBe('name');
    });

    it('falls back to identityField when no displayField', () => {
      expect(getEntityDisplayField({ identityField: 'email' })).toBe('email');
    });

    it("falls back to 'name' when neither displayField nor identityField is set", () => {
      expect(getEntityDisplayField({})).toBe('name');
    });
  });
});
