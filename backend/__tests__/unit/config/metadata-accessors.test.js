/**
 * Metadata Accessors Tests
 *
 * Tests the backwards-compatible field property accessors.
 * Ensures both legacy arrays and field-centric properties work correctly.
 */

const {
  getRequiredFields,
  isFieldRequired,
  getImmutableFields,
  isFieldImmutable,
  getSearchableFields,
  isFieldSearchable,
  getFilterableFields,
  isFieldFilterable,
  getSortableFields,
  isFieldSortable,
  getFieldAccess,
  getAllFieldAccess,
  getBeforeChangeHooks,
  getAfterChangeHooks,
  getAllHooks,
  checkLegacyUsage,
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

  describe('getRequiredFields', () => {
    it('returns empty array for entity with no required fields', () => {
      const meta = { entityKey: 'test', fields: {} };
      expect(getRequiredFields(meta)).toEqual([]);
    });

    it('reads from field-level required: true', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true },
          phone: { type: 'string' },
        },
      };
      expect(getRequiredFields(meta)).toEqual(['name', 'email']);
    });

    it('falls back to legacy requiredFields array', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        requiredFields: ['name', 'email'],
      };
      expect(getRequiredFields(meta)).toEqual(['name', 'email']);
    });

    it('uses legacy array when present for migration safety', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          name: { type: 'string', required: true },
          email: { type: 'string' }, // NOT required at field level
        },
        requiredFields: ['name', 'email', 'phone'], // Legacy array exists
      };
      // Legacy array takes precedence during migration period
      expect(getRequiredFields(meta)).toEqual(['name', 'email', 'phone']);
    });

    it('derives from field-level when no legacy array exists', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          name: { type: 'string', required: true },
          email: { type: 'string' }, // NOT required at field level
        },
        // No requiredFields array - derive from field-level
      };
      // Only 'name' has required: true
      expect(getRequiredFields(meta)).toEqual(['name']);
    });
  });

  describe('isFieldRequired', () => {
    it('returns true for field-level required: true', () => {
      const meta = {
        fields: { name: { type: 'string', required: true } },
      };
      expect(isFieldRequired(meta, 'name')).toBe(true);
    });

    it('returns false for field-level required: false', () => {
      const meta = {
        fields: { name: { type: 'string', required: false } },
        requiredFields: ['name'], // Legacy says required
      };
      // Field-level wins
      expect(isFieldRequired(meta, 'name')).toBe(false);
    });

    it('falls back to legacy array', () => {
      const meta = {
        fields: { name: { type: 'string' } }, // No required property
        requiredFields: ['name'],
      };
      expect(isFieldRequired(meta, 'name')).toBe(true);
    });

    it('returns false for unknown field', () => {
      const meta = { fields: {}, requiredFields: [] };
      expect(isFieldRequired(meta, 'unknown')).toBe(false);
    });
  });

  describe('getImmutableFields', () => {
    it('reads from field-level immutable: true', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          id: { type: 'integer', immutable: true },
          name: { type: 'string' },
        },
      };
      expect(getImmutableFields(meta)).toEqual(['id']);
    });

    it('falls back to legacy immutableFields array', () => {
      const meta = {
        entityKey: 'test',
        fields: { id: { type: 'integer' } },
        immutableFields: ['id', 'created_at'],
      };
      expect(getImmutableFields(meta)).toEqual(['id', 'created_at']);
    });
  });

  describe('getSearchableFields', () => {
    it('reads from field-level searchable: true', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          name: { type: 'string', searchable: true },
          email: { type: 'string', searchable: true },
          id: { type: 'integer' },
        },
      };
      expect(getSearchableFields(meta)).toEqual(['name', 'email']);
    });

    it('falls back to legacy searchableFields array', () => {
      const meta = {
        entityKey: 'test',
        fields: {},
        searchableFields: ['name', 'description'],
      };
      expect(getSearchableFields(meta)).toEqual(['name', 'description']);
    });
  });

  describe('getFilterableFields', () => {
    it('reads from field-level filterable: true', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          status: { type: 'enum', filterable: true },
          created_at: { type: 'timestamp', filterable: true },
        },
      };
      expect(getFilterableFields(meta)).toEqual(['status', 'created_at']);
    });

    it('falls back to legacy filterableFields array', () => {
      const meta = {
        entityKey: 'test',
        fields: {},
        filterableFields: ['status', 'priority'],
      };
      expect(getFilterableFields(meta)).toEqual(['status', 'priority']);
    });
  });

  describe('getSortableFields', () => {
    it('reads from field-level sortable: true', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          name: { type: 'string', sortable: true },
          created_at: { type: 'timestamp', sortable: true },
        },
      };
      expect(getSortableFields(meta)).toEqual(['name', 'created_at']);
    });

    it('falls back to legacy sortableFields array', () => {
      const meta = {
        entityKey: 'test',
        fields: {},
        sortableFields: ['created_at', 'updated_at'],
      };
      expect(getSortableFields(meta)).toEqual(['created_at', 'updated_at']);
    });
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

  describe('checkLegacyUsage', () => {
    it('returns usesLegacy: false for fully migrated entity', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          name: { type: 'string', required: true, searchable: true, filterable: true, sortable: true },
        },
        // No legacy arrays
      };
      const result = checkLegacyUsage(meta);
      expect(result.usesLegacy).toBe(false);
      expect(result.legacyProperties).toEqual([]);
    });

    it('returns usesLegacy: true for entity with legacy arrays only', () => {
      const meta = {
        entityKey: 'test',
        fields: { name: { type: 'string' } },
        requiredFields: ['name'],
        searchableFields: ['name'],
        filterableFields: ['name'],
        sortableFields: ['name'],
        fieldAccess: { name: { create: 'any', read: 'any', update: 'any', delete: 'none' } },
      };
      const result = checkLegacyUsage(meta);
      expect(result.usesLegacy).toBe(true);
      expect(result.legacyProperties).toContain('requiredFields');
      expect(result.legacyProperties).toContain('searchableFields');
    });

    it('handles partial migration correctly', () => {
      const meta = {
        entityKey: 'test',
        fields: {
          name: { type: 'string', required: true }, // Field-level required
        },
        requiredFields: ['name'], // Both present
        searchableFields: ['name'], // Legacy only
      };
      const result = checkLegacyUsage(meta);
      expect(result.usesLegacy).toBe(true);
      // requiredFields has field-level, so not in legacy
      expect(result.legacyProperties).not.toContain('requiredFields');
      // searchableFields is legacy-only
      expect(result.legacyProperties).toContain('searchableFields');
    });
  });
});
