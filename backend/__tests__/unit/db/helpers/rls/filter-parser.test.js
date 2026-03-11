/**
 * RLS Filter Parser Unit Tests
 *
 * Tests for filter-to-SQL conversion.
 */

const { parseFilter, OPERATORS } = require('../../../../../db/helpers/rls/filter-parser');
const { RLS_ENGINE } = require('../../../../../config/constants');

describe('RLS Filter Parser', () => {
  describe('OPERATORS', () => {
    it('should be a frozen object', () => {
      expect(Object.isFrozen(OPERATORS)).toBe(true);
    });

    it('should contain expected operators', () => {
      const expectedOps = ['$eq', '$ne', '$lt', '$gt', '$lte', '$gte', '$in', '$nin', '$null'];
      for (const op of expectedOps) {
        expect(OPERATORS[op]).toBeDefined();
      }
    });
  });

  describe('parseFilter', () => {
    describe('basic functionality', () => {
      it('should return empty result for null filter', () => {
        const result = parseFilter(null, 't', 1);
        expect(result).toEqual({ sql: '', params: [], nextOffset: 1 });
      });

      it('should return empty result for undefined filter', () => {
        const result = parseFilter(undefined, 't', 1);
        expect(result).toEqual({ sql: '', params: [], nextOffset: 1 });
      });

      it('should return empty result for empty object', () => {
        const result = parseFilter({}, 't', 1);
        expect(result).toEqual({ sql: '', params: [], nextOffset: 1 });
      });

      it('should handle single field equality', () => {
        const filter = { name: 'test' };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toBe('t.name = $1');
        expect(result.params).toEqual(['test']);
        expect(result.nextOffset).toBe(2);
      });

      it('should handle multiple fields with AND', () => {
        const filter = { name: 'test', status: 'active' };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toContain('t.name = $1');
        expect(result.sql).toContain(' AND ');
        expect(result.sql).toContain('t.status = $2');
        expect(result.params).toEqual(['test', 'active']);
        expect(result.nextOffset).toBe(3);
      });
    });

    describe('table alias handling', () => {
      it('should use table alias when provided', () => {
        const result = parseFilter({ field: 'value' }, 'my_table', 1);
        expect(result.sql).toBe('my_table.field = $1');
      });

      it('should omit table alias when null', () => {
        const result = parseFilter({ field: 'value' }, null, 1);
        expect(result.sql).toBe('field = $1');
      });

      it('should omit table alias when empty string', () => {
        const result = parseFilter({ field: 'value' }, '', 1);
        expect(result.sql).toBe('field = $1');
      });
    });

    describe('parameter offset', () => {
      it('should start from provided offset', () => {
        const result = parseFilter({ field: 'value' }, 't', 5);
        expect(result.sql).toBe('t.field = $5');
        expect(result.nextOffset).toBe(6);
      });

      it('should track offset across multiple fields', () => {
        const filter = { a: 1, b: 2, c: 3 };
        const result = parseFilter(filter, 't', 10);
        expect(result.nextOffset).toBe(13);
        expect(result.params).toEqual([1, 2, 3]);
      });
    });

    describe('operators', () => {
      it('should handle $eq operator explicitly', () => {
        const filter = { status: { $eq: 'active' } };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toBe('t.status = $1');
        expect(result.params).toEqual(['active']);
      });

      it('should handle $ne operator', () => {
        const filter = { status: { $ne: 'deleted' } };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toBe('t.status != $1');
        expect(result.params).toEqual(['deleted']);
      });

      it('should handle $lt operator', () => {
        const filter = { age: { $lt: 18 } };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toBe('t.age < $1');
        expect(result.params).toEqual([18]);
      });

      it('should handle $gt operator', () => {
        const filter = { age: { $gt: 21 } };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toBe('t.age > $1');
        expect(result.params).toEqual([21]);
      });

      it('should handle $lte operator', () => {
        const filter = { price: { $lte: 100 } };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toBe('t.price <= $1');
        expect(result.params).toEqual([100]);
      });

      it('should handle $gte operator', () => {
        const filter = { price: { $gte: 50 } };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toBe('t.price >= $1');
        expect(result.params).toEqual([50]);
      });

      it('should handle $in operator with array', () => {
        const filter = { status: { $in: ['active', 'pending'] } };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toBe('t.status IN ($1, $2)');
        expect(result.params).toEqual(['active', 'pending']);
      });

      it('should handle $null operator for IS NULL', () => {
        const filter = { deleted_at: { $null: true } };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toBe('t.deleted_at IS NULL');
        expect(result.params).toEqual([]);
        expect(result.nextOffset).toBe(1); // No param consumed
      });

      it('should handle $null false for IS NOT NULL', () => {
        const filter = { assigned_to: { $null: false } };
        const result = parseFilter(filter, 't', 1);

        expect(result.sql).toBe('t.assigned_to IS NOT NULL');
        expect(result.params).toEqual([]);
      });
    });

    describe('error handling', () => {
      it('should throw for invalid field name', () => {
        const filter = { 'DROP TABLE users': 'value' };

        expect(() => parseFilter(filter, 't', 1)).toThrow();
      });

      it('should throw for field with special characters', () => {
        const filter = { "field'; --": 'value' };

        expect(() => parseFilter(filter, 't', 1)).toThrow();
      });

      it('should throw for unknown operator', () => {
        const filter = { field: { unknown_op: 'value' } };

        expect(() => parseFilter(filter, 't', 1)).toThrow('Unknown filter operator');
      });

      it('should throw when exceeding MAX_FILTER_CONDITIONS', () => {
        const filter = {};
        for (let i = 0; i <= RLS_ENGINE.MAX_FILTER_CONDITIONS; i++) {
          filter[`field_${i}`] = i;
        }

        expect(() => parseFilter(filter, 't', 1)).toThrow('Filter exceeds maximum');
      });

      it('should accept exactly MAX_FILTER_CONDITIONS', () => {
        const filter = {};
        for (let i = 0; i < RLS_ENGINE.MAX_FILTER_CONDITIONS; i++) {
          filter[`field_${i}`] = i;
        }

        expect(() => parseFilter(filter, 't', 1)).not.toThrow();
      });
    });
  });
});
