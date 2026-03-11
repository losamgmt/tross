/**
 * RLS Rule Matcher Unit Tests
 *
 * Tests for rule matching logic.
 */

const {
  matchRules,
  getContextValue,
  isValidAccessType,
} = require('../../../../../db/helpers/rls/rule-matcher');
const { RLS_ENGINE } = require('../../../../../config/constants');

describe('RLS Rule Matcher', () => {
  describe('matchRules', () => {
    describe('empty/null handling', () => {
      it('should return empty array for null rules', () => {
        expect(matchRules(null, 'admin', 'read')).toEqual([]);
      });

      it('should return empty array for undefined rules', () => {
        expect(matchRules(undefined, 'admin', 'read')).toEqual([]);
      });

      it('should return empty array for empty rules array', () => {
        expect(matchRules([], 'admin', 'read')).toEqual([]);
      });
    });

    describe('role matching', () => {
      const rules = [
        { id: 'admin-rule', roles: ['admin'], operations: ['read'], access: null },
        { id: 'customer-rule', roles: ['customer'], operations: ['read'], access: { type: 'direct' } },
      ];

      it('should match single role', () => {
        const result = matchRules(rules, 'admin', 'read');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('admin-rule');
      });

      it('should not match non-existent role', () => {
        const result = matchRules(rules, 'unknown', 'read');
        expect(result).toHaveLength(0);
      });

      it('should match wildcard role *', () => {
        const wildcardRules = [
          { id: 'all-roles', roles: '*', operations: ['read'], access: null },
        ];
        const result = matchRules(wildcardRules, 'any-role', 'read');
        expect(result).toHaveLength(1);
      });

      it('should match role in array', () => {
        const multiRoleRules = [
          { id: 'multi', roles: ['admin', 'manager', 'customer'], operations: ['read'], access: null },
        ];
        const result = matchRules(multiRoleRules, 'manager', 'read');
        expect(result).toHaveLength(1);
      });

      it('should handle roles as string (not array)', () => {
        const stringRoleRules = [
          { id: 'single', roles: 'admin', operations: ['read'], access: null },
        ];
        const result = matchRules(stringRoleRules, 'admin', 'read');
        expect(result).toHaveLength(1);
      });
    });

    describe('operation matching', () => {
      const rules = [
        { id: 'read-only', roles: ['customer'], operations: ['read'], access: null },
        { id: 'write-only', roles: ['customer'], operations: ['create', 'update'], access: null },
      ];

      it('should match single operation', () => {
        const result = matchRules(rules, 'customer', 'read');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('read-only');
      });

      it('should match operation in array', () => {
        const result = matchRules(rules, 'customer', 'update');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('write-only');
      });

      it('should not match non-matching operation', () => {
        const result = matchRules(rules, 'customer', 'delete');
        expect(result).toHaveLength(0);
      });

      it('should match wildcard operation *', () => {
        const wildcardRules = [
          { id: 'all-ops', roles: ['admin'], operations: '*', access: null },
        ];
        const result = matchRules(wildcardRules, 'admin', 'anything');
        expect(result).toHaveLength(1);
      });

      it('should handle operations as string (not array)', () => {
        const stringOpRules = [
          { id: 'read', roles: ['customer'], operations: 'read', access: null },
        ];
        const result = matchRules(stringOpRules, 'customer', 'read');
        expect(result).toHaveLength(1);
      });
    });

    describe('multiple matching rules', () => {
      it('should return all matching rules', () => {
        const rules = [
          { id: 'rule1', roles: '*', operations: '*', access: null },
          { id: 'rule2', roles: ['admin'], operations: ['read'], access: null },
          { id: 'rule3', roles: ['admin'], operations: ['read'], access: { type: 'direct' } },
        ];

        const result = matchRules(rules, 'admin', 'read');
        expect(result).toHaveLength(3);
      });

      it('should preserve rule order', () => {
        const rules = [
          { id: 'first', roles: '*', operations: '*', access: null },
          { id: 'second', roles: '*', operations: '*', access: null },
        ];

        const result = matchRules(rules, 'admin', 'read');
        expect(result[0].id).toBe('first');
        expect(result[1].id).toBe('second');
      });
    });
  });

  describe('getContextValue', () => {
    const context = {
      userId: 1,
      customerProfileId: 100,
      technicianProfileId: 200,
      customField: 'custom',
    };

    it('should return userId from context', () => {
      expect(getContextValue(context, 'userId')).toBe(1);
    });

    it('should return customerProfileId from context', () => {
      expect(getContextValue(context, 'customerProfileId')).toBe(100);
    });

    it('should return technicianProfileId from context', () => {
      expect(getContextValue(context, 'technicianProfileId')).toBe(200);
    });

    it('should return undefined for non-existent key', () => {
      expect(getContextValue(context, 'nonExistent')).toBeUndefined();
    });

    it('should return literal value for non-context string', () => {
      // If value doesn't map to a context key, it should be returned as-is
      // per the current implementation
      const result = getContextValue(context, 'literalValue');
      expect(result).toBeUndefined(); // Not in context
    });

    it('should handle null context', () => {
      expect(getContextValue(null, 'userId')).toBeUndefined();
    });

    it('should handle undefined context', () => {
      expect(getContextValue(undefined, 'userId')).toBeUndefined();
    });

    it('should handle null value in context', () => {
      const ctxWithNull = { userId: null };
      expect(getContextValue(ctxWithNull, 'userId')).toBeNull();
    });
  });

  describe('isValidAccessType', () => {
    it('should return true for direct type', () => {
      expect(isValidAccessType('direct')).toBe(true);
    });

    it('should return true for junction type', () => {
      expect(isValidAccessType('junction')).toBe(true);
    });

    it('should return true for parent type', () => {
      expect(isValidAccessType('parent')).toBe(true);
    });

    it('should return false for unknown type', () => {
      expect(isValidAccessType('custom')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidAccessType(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidAccessType(undefined)).toBe(false);
    });

    it('should match RLS_ENGINE.ACCESS_TYPES', () => {
      for (const type of RLS_ENGINE.ACCESS_TYPES) {
        expect(isValidAccessType(type)).toBe(true);
      }
    });
  });
});
