/**
 * RLS Engine Index Unit Tests
 *
 * Integration tests for buildRLSFilter.
 */

const {
  buildRLSFilter,
  validateAllRules,
  matchRules,
  getContextValue,
  isValidAccessType,
  buildAccessClause,
  combineClausesOr,
  clearCache,
  invalidateEntity,
  getCachedClause,
  cacheClause,
} = require('../../../../../db/helpers/rls');

describe('RLS Engine', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('module exports', () => {
    it('should export buildRLSFilter', () => {
      expect(typeof buildRLSFilter).toBe('function');
    });

    it('should export validateAllRules', () => {
      expect(typeof validateAllRules).toBe('function');
    });

    it('should export matchRules', () => {
      expect(typeof matchRules).toBe('function');
    });

    it('should export getContextValue', () => {
      expect(typeof getContextValue).toBe('function');
    });

    it('should export isValidAccessType', () => {
      expect(typeof isValidAccessType).toBe('function');
    });

    it('should export buildAccessClause', () => {
      expect(typeof buildAccessClause).toBe('function');
    });

    it('should export combineClausesOr', () => {
      expect(typeof combineClausesOr).toBe('function');
    });

    it('should export cache functions', () => {
      expect(typeof clearCache).toBe('function');
      expect(typeof invalidateEntity).toBe('function');
      expect(typeof getCachedClause).toBe('function');
      expect(typeof cacheClause).toBe('function');
    });
  });

  describe('buildRLSFilter', () => {
    const baseContext = {
      role: 'customer',
      userId: 1,
      customerProfileId: 100,
      technicianProfileId: null,
    };

    describe('edge cases', () => {
      it('should return not applied for null context', () => {
        const metadata = { tableName: 'test', rlsRules: [] };
        const result = buildRLSFilter(null, metadata, 'read', 1);

        expect(result.applied).toBe(false);
        expect(result.clause).toBe('');
      });

      it('should return not applied for null metadata', () => {
        const result = buildRLSFilter(baseContext, null, 'read', 1);

        expect(result.applied).toBe(false);
        expect(result.clause).toBe('');
      });

      it('should return not applied when no rlsRules defined', () => {
        const metadata = { tableName: 'test', entityType: 'test' };
        const result = buildRLSFilter(baseContext, metadata, 'read', 1);

        expect(result.applied).toBe(false);
      });

      it('should return not applied for empty rlsRules array', () => {
        const metadata = { tableName: 'test', entityType: 'test', rlsRules: [] };
        const result = buildRLSFilter(baseContext, metadata, 'read', 1);

        expect(result.applied).toBe(false);
      });
    });

    describe('no matching rules (deny)', () => {
      it('should return deny clause when no rules match role', () => {
        const metadata = {
          tableName: 'test',
          entityType: 'test',
          rlsRules: [
            { id: 'admin-only', roles: ['admin'], operations: '*', access: null },
          ],
        };
        const result = buildRLSFilter(baseContext, metadata, 'read', 1);

        expect(result.applied).toBe(true);
        expect(result.clause).toBe('1=0');
        expect(result.params).toEqual([]);
      });

      it('should return deny clause when no rules match operation', () => {
        const metadata = {
          tableName: 'test',
          entityType: 'test',
          rlsRules: [
            { id: 'read-only', roles: ['customer'], operations: ['read'], access: null },
          ],
        };
        const result = buildRLSFilter(baseContext, metadata, 'delete', 1);

        expect(result.applied).toBe(true);
        expect(result.clause).toBe('1=0');
      });
    });

    describe('full access (null access)', () => {
      it('should return no filter for null access rule', () => {
        const metadata = {
          tableName: 'test',
          entityType: 'test',
          rlsRules: [
            { id: 'customer-all', roles: ['customer'], operations: '*', access: null },
          ],
        };
        const result = buildRLSFilter(baseContext, metadata, 'read', 1);

        expect(result.applied).toBe(true);
        expect(result.clause).toBe('');
        expect(result.noFilter).toBe(true);
      });
    });

    describe('direct access', () => {
      it('should build parameterized WHERE clause', () => {
        const metadata = {
          tableName: 'orders',
          entityType: 'orders',
          rlsRules: [
            {
              id: 'owner-read',
              roles: ['customer'],
              operations: ['read'],
              access: { type: 'direct', field: 'customer_profile_id', value: 'customerProfileId' },
            },
          ],
        };
        const result = buildRLSFilter(baseContext, metadata, 'read', 1);

        expect(result.applied).toBe(true);
        expect(result.clause).toContain('orders.customer_profile_id = $1');
        expect(result.params).toEqual([100]);
      });

      it('should respect parameter offset', () => {
        const metadata = {
          tableName: 'orders',
          entityType: 'orders',
          rlsRules: [
            {
              id: 'owner-read',
              roles: ['customer'],
              operations: ['read'],
              access: { type: 'direct', field: 'user_id', value: 'userId' },
            },
          ],
        };
        const result = buildRLSFilter(baseContext, metadata, 'read', 5);

        expect(result.clause).toContain('$5');
      });
    });

    describe('junction access', () => {
      it('should build EXISTS subquery', () => {
        const metadata = {
          tableName: 'units',
          entityType: 'units',
          rlsRules: [
            {
              id: 'customer-units',
              roles: ['customer'],
              operations: ['read'],
              access: {
                type: 'junction',
                junction: {
                  table: 'customer_units',
                  localKey: 'id',
                  foreignKey: 'unit_id',
                  filter: { customer_profile_id: 'customerProfileId' },
                },
              },
            },
          ],
        };
        const result = buildRLSFilter(baseContext, metadata, 'read', 1);

        expect(result.applied).toBe(true);
        expect(result.clause).toContain('EXISTS');
        expect(result.clause).toContain('customer_units');
        expect(result.clause).toContain('j0');
        expect(result.params).toEqual([100]);
      });
    });

    describe('multiple rules (OR combination)', () => {
      it('should combine multiple rules with OR', () => {
        const metadata = {
          tableName: 'work_orders',
          entityType: 'work_orders',
          rlsRules: [
            {
              id: 'owner-access',
              roles: ['customer'],
              operations: ['read'],
              access: { type: 'direct', field: 'customer_profile_id', value: 'customerProfileId' },
            },
            {
              id: 'junction-access',
              roles: ['customer'],
              operations: ['read'],
              access: {
                type: 'junction',
                junction: {
                  table: 'customer_units',
                  localKey: 'unit_id',
                  foreignKey: 'unit_id',
                  filter: { customer_profile_id: 'customerProfileId' },
                },
              },
            },
          ],
        };
        const result = buildRLSFilter(baseContext, metadata, 'read', 1);

        expect(result.applied).toBe(true);
        expect(result.clause).toContain('OR');
        expect(result.params.length).toBe(2); // Both rules use customerProfileId
      });

      it('should generate unique aliases for multiple junction rules', () => {
        const metadata = {
          tableName: 'items',
          entityType: 'items',
          rlsRules: [
            {
              id: 'access1',
              roles: ['customer'],
              operations: ['read'],
              access: {
                type: 'junction',
                junction: { table: 'link_a', localKey: 'id', foreignKey: 'item_id' },
              },
            },
            {
              id: 'access2',
              roles: ['customer'],
              operations: ['read'],
              access: {
                type: 'junction',
                junction: { table: 'link_b', localKey: 'id', foreignKey: 'item_id' },
              },
            },
          ],
        };
        const result = buildRLSFilter(baseContext, metadata, 'read', 1);

        expect(result.clause).toContain('j0');
        expect(result.clause).toContain('j1');
      });

      it('should short-circuit when any rule grants full access', () => {
        const metadata = {
          tableName: 'test',
          entityType: 'test',
          rlsRules: [
            {
              id: 'restricted',
              roles: ['customer'],
              operations: ['read'],
              access: { type: 'direct', field: 'user_id', value: 'userId' },
            },
            {
              id: 'full-access',
              roles: ['customer'],
              operations: ['read'],
              access: null,
            },
          ],
        };
        const result = buildRLSFilter(baseContext, metadata, 'read', 1);

        expect(result.noFilter).toBe(true);
        expect(result.clause).toBe('');
      });
    });

    describe('operation handling', () => {
      const metadata = {
        tableName: 'test',
        entityType: 'test',
        rlsRules: [
          { id: 'read', roles: '*', operations: ['read', 'summary'], access: null },
          { id: 'write', roles: '*', operations: ['create', 'update'], access: { type: 'direct', field: 'user_id', value: 'userId' } },
        ],
      };

      it('should match read operation', () => {
        const result = buildRLSFilter(baseContext, metadata, 'read', 1);
        expect(result.noFilter).toBe(true);
      });

      it('should match summary operation', () => {
        const result = buildRLSFilter(baseContext, metadata, 'summary', 1);
        expect(result.noFilter).toBe(true);
      });

      it('should apply filter for create operation', () => {
        const result = buildRLSFilter(baseContext, metadata, 'create', 1);
        expect(result.clause).toContain('user_id');
      });

      it('should deny unmatched operation', () => {
        const result = buildRLSFilter(baseContext, metadata, 'delete', 1);
        expect(result.clause).toBe('1=0');
      });
    });
  });

  describe('validateAllRules', () => {
    it('should not throw for valid metadata', () => {
      const allMetadata = {
        users: {
          rlsRules: [
            { id: 'admin', roles: ['admin'], operations: '*', access: null },
          ],
        },
      };

      expect(() => validateAllRules(allMetadata)).not.toThrow();
    });

    it('should throw AppError for invalid metadata', () => {
      const allMetadata = {
        users: {
          rlsRules: [
            { roles: '*', operations: '*' }, // missing id
          ],
        },
      };

      expect(() => validateAllRules(allMetadata)).toThrow('RLS validation failed');
    });
  });
});
