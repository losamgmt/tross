/**
 * RLS Clause Builder Unit Tests
 *
 * Tests for clause-builder.js:
 * - buildAccessClause: building SQL for different access types
 * - buildDirectClause: direct field matching
 * - buildJunctionClause: EXISTS subqueries
 * - combineClausesOr: combining multiple clauses
 */

const {
  buildAccessClause,
  buildDirectClause,
  buildJunctionClause,
  combineClausesOr,
  resolveFilterValues,
} = require('../../../../db/helpers/rls/clause-builder');

describe('RLS Clause Builder', () => {
  const defaultContext = {
    userId: 1,
    customerProfileId: 100,
    technicianProfileId: 200,
  };

  describe('buildAccessClause', () => {
    it('returns TRUE for null access (full access)', () => {
      const result = buildAccessClause(null, defaultContext, 't', 1);
      expect(result.clause).toBe('TRUE');
      expect(result.params).toEqual([]);
      expect(result.nextOffset).toBe(1);
    });

    it('delegates direct type to buildDirectClause', () => {
      const access = { type: 'direct', field: 'user_id', value: 'userId' };
      const result = buildAccessClause(access, defaultContext, 't', 1);
      expect(result.clause).toBe('t.user_id = $1');
      expect(result.params).toEqual([1]);
    });

    it('throws for unknown access type', () => {
      const access = { type: 'unknown' };
      expect(() => buildAccessClause(access, defaultContext, 't', 1)).toThrow('Unknown RLS access type');
    });
  });

  describe('buildDirectClause', () => {
    it('builds equality clause with userId', () => {
      const access = { type: 'direct', field: 'created_by', value: 'userId' };
      const result = buildDirectClause(access, defaultContext, 'orders', 1);
      expect(result.clause).toBe('orders.created_by = $1');
      expect(result.params).toEqual([1]);
      expect(result.nextOffset).toBe(2);
    });

    it('builds equality clause with customerProfileId', () => {
      const access = { type: 'direct', field: 'customer_profile_id', value: 'customerProfileId' };
      const result = buildDirectClause(access, defaultContext, 't', 1);
      expect(result.clause).toBe('t.customer_profile_id = $1');
      expect(result.params).toEqual([100]);
    });

    it('defaults to userId when value not specified', () => {
      const access = { type: 'direct', field: 'owner_id' };
      const result = buildDirectClause(access, defaultContext, 't', 1);
      expect(result.params).toEqual([1]); // Uses userId
    });

    it('returns FALSE when context value is undefined', () => {
      const access = { type: 'direct', field: 'x', value: 'nonExistentKey' };
      const result = buildDirectClause(access, defaultContext, 't', 1);
      expect(result.clause).toBe('FALSE');
      expect(result.params).toEqual([]);
    });

    it('throws when field is missing', () => {
      const access = { type: 'direct', value: 'userId' };
      expect(() => buildDirectClause(access, defaultContext, 't', 1)).toThrow('requires field');
    });

    it('uses correct parameter offset', () => {
      const access = { type: 'direct', field: 'id', value: 'userId' };
      const result = buildDirectClause(access, defaultContext, 't', 5);
      expect(result.clause).toBe('t.id = $5');
      expect(result.nextOffset).toBe(6);
    });
  });

  describe('buildJunctionClause', () => {
    it('builds EXISTS subquery for simple junction', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'customer_units',
          localKey: 'id',
          foreignKey: 'unit_id',
        },
      };
      const result = buildJunctionClause(access, defaultContext, 'units', 1);
      expect(result.clause).toBe('EXISTS (SELECT 1 FROM customer_units j0 WHERE j0.unit_id = units.id)');
      expect(result.params).toEqual([]);
      expect(result.nextOffset).toBe(1);
    });

    it('builds EXISTS with filter condition', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'customer_units',
          localKey: 'id',
          foreignKey: 'unit_id',
          filter: { customer_profile_id: 'customerProfileId' },
        },
      };
      const result = buildJunctionClause(access, defaultContext, 'units', 1);
      expect(result.clause).toBe(
        'EXISTS (SELECT 1 FROM customer_units j0 WHERE j0.unit_id = units.id AND j0.customer_profile_id = $1)'
      );
      expect(result.params).toEqual([100]); // customerProfileId from context
      expect(result.nextOffset).toBe(2);
    });

    it('builds EXISTS with multiple filter conditions', () => {
      const access = {
        type: 'junction',
        junction: {
          table: 'property_roles',
          localKey: 'id',
          foreignKey: 'property_id',
          filter: { user_id: 'userId', role: 'board' },
        },
      };
      const result = buildJunctionClause(access, defaultContext, 'properties', 1);
      expect(result.clause).toContain('j0.user_id = $1 AND j0.role = $2');
      expect(result.params).toEqual([1, 'board']);
    });

    it('throws when junction config is missing', () => {
      const access = { type: 'junction' };
      expect(() => buildJunctionClause(access, defaultContext, 't', 1)).toThrow('requires junction config');
    });

    it('throws when required junction fields are missing', () => {
      const access = { type: 'junction', junction: { table: 'x' } };
      expect(() => buildJunctionClause(access, defaultContext, 't', 1)).toThrow('requires table, localKey, and foreignKey');
    });
  });

  describe('resolveFilterValues', () => {
    it('resolves context references', () => {
      const filter = { customer_profile_id: 'customerProfileId' };
      const resolved = resolveFilterValues(filter, defaultContext);
      expect(resolved).toEqual({ customer_profile_id: 100 });
    });

    it('keeps literal values unchanged', () => {
      const filter = { role: 'board', status: 'active' };
      const resolved = resolveFilterValues(filter, defaultContext);
      expect(resolved).toEqual({ role: 'board', status: 'active' });
    });

    it('mixes context references and literals', () => {
      const filter = { user_id: 'userId', role: 'member' };
      const resolved = resolveFilterValues(filter, defaultContext);
      expect(resolved).toEqual({ user_id: 1, role: 'member' });
    });
  });

  describe('combineClausesOr', () => {
    it('returns FALSE for empty array', () => {
      const result = combineClausesOr([]);
      expect(result.clause).toBe('FALSE');
      expect(result.params).toEqual([]);
    });

    it('returns single clause unwrapped', () => {
      const clauses = [{ clause: 't.id = $1', params: [1], nextOffset: 2 }];
      const result = combineClausesOr(clauses);
      expect(result.clause).toBe('t.id = $1');
      expect(result.params).toEqual([1]);
    });

    it('combines multiple clauses with OR', () => {
      const clauses = [
        { clause: 't.user_id = $1', params: [1], nextOffset: 2 },
        { clause: 't.admin = $2', params: [true], nextOffset: 3 },
      ];
      const result = combineClausesOr(clauses);
      expect(result.clause).toBe('(t.user_id = $1) OR (t.admin = $2)');
      expect(result.params).toEqual([1, true]);
    });

    it('filters out FALSE clauses', () => {
      const clauses = [
        { clause: 'FALSE', params: [] },
        { clause: 't.id = $1', params: [1] },
        { clause: 'FALSE', params: [] },
      ];
      const result = combineClausesOr(clauses);
      expect(result.clause).toBe('t.id = $1');
    });

    it('returns TRUE if any clause is TRUE', () => {
      const clauses = [
        { clause: 't.id = $1', params: [1] },
        { clause: 'TRUE', params: [] },
      ];
      const result = combineClausesOr(clauses);
      expect(result.clause).toBe('TRUE');
      expect(result.params).toEqual([]);
    });

    it('returns FALSE if all clauses are FALSE', () => {
      const clauses = [
        { clause: 'FALSE', params: [] },
        { clause: 'FALSE', params: [] },
      ];
      const result = combineClausesOr(clauses);
      expect(result.clause).toBe('FALSE');
    });
  });
});
