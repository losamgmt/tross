/**
 * RLS Rule Matcher Unit Tests
 *
 * Tests for rule-matcher.js:
 * - matchRules: matching rules by role and operation
 * - getContextValue: getting context values from rlsContext
 * - isValidAccessType: validating access type
 */

const {
  matchRules,
  getContextValue,
  isValidAccessType,
} = require('../../../../db/helpers/rls/rule-matcher');

describe('RLS Rule Matcher', () => {
  describe('matchRules', () => {
    const testRules = [
      {
        id: 'admin-full-access',
        roles: ['admin'],
        operations: ['*'],
        access: null,
      },
      {
        id: 'customer-read',
        roles: ['customer'],
        operations: ['read', 'summary'],
        access: { type: 'direct', field: 'customer_profile_id', value: 'customerProfileId' },
      },
      {
        id: 'technician-work-orders',
        roles: ['technician', 'dispatcher'],
        operations: ['read', 'update'],
        access: { type: 'direct', field: 'assigned_technician_id', value: 'technicianProfileId' },
      },
    ];

    it('matches rule by exact role', () => {
      const matches = matchRules(testRules, 'admin', 'read');
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('admin-full-access');
    });

    it('matches rule with wildcard operation', () => {
      const matches = matchRules(testRules, 'admin', 'delete');
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('admin-full-access');
    });

    it('matches rule by specific operation', () => {
      const matches = matchRules(testRules, 'customer', 'read');
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('customer-read');
    });

    it('matches rule where role is in array', () => {
      const matches = matchRules(testRules, 'dispatcher', 'read');
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('technician-work-orders');
    });

    it('returns empty array for non-matching role', () => {
      const matches = matchRules(testRules, 'visitor', 'read');
      expect(matches).toHaveLength(0);
    });

    it('returns empty array for non-matching operation', () => {
      const matches = matchRules(testRules, 'customer', 'delete');
      expect(matches).toHaveLength(0);
    });

    it('handles invalid input gracefully', () => {
      expect(matchRules(null, 'admin', 'read')).toEqual([]);
      expect(matchRules([], null, 'read')).toEqual([]);
      expect(matchRules([], 'admin', null)).toEqual([]);
    });

    it('matches multiple rules if applicable', () => {
      const rulesWithOverlap = [
        { id: 'rule1', roles: ['manager'], operations: ['read'], access: null },
        { id: 'rule2', roles: ['manager'], operations: ['*'], access: { type: 'direct', field: 'x', value: 'y' } },
      ];
      const matches = matchRules(rulesWithOverlap, 'manager', 'read');
      expect(matches).toHaveLength(2);
    });
  });

  describe('getContextValue', () => {
    const testContext = {
      userId: 1,
      customerProfileId: 100,
      technicianProfileId: 200,
    };

    it('returns valid context values', () => {
      expect(getContextValue(testContext, 'userId')).toBe(1);
      expect(getContextValue(testContext, 'customerProfileId')).toBe(100);
      expect(getContextValue(testContext, 'technicianProfileId')).toBe(200);
    });

    it('returns undefined for unknown keys', () => {
      expect(getContextValue(testContext, 'unknownKey')).toBeUndefined();
    });

    it('handles missing context', () => {
      expect(getContextValue(null, 'userId')).toBeUndefined();
      expect(getContextValue(undefined, 'userId')).toBeUndefined();
    });
  });

  describe('isValidAccessType', () => {
    it('accepts valid access types', () => {
      expect(isValidAccessType('direct')).toBe(true);
      expect(isValidAccessType('junction')).toBe(true);
      expect(isValidAccessType('parent')).toBe(true);
    });

    it('rejects invalid access types', () => {
      expect(isValidAccessType('unknown')).toBe(false);
      expect(isValidAccessType('')).toBe(false);
      expect(isValidAccessType(null)).toBe(false);
    });
  });
});
