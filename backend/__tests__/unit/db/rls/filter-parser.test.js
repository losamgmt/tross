/**
 * RLS Filter Parser Unit Tests
 *
 * Tests for filter-parser.js:
 * - parseFilter: converting filter objects to SQL
 */

const {
  parseFilter,
} = require('../../../../db/helpers/rls/filter-parser');

describe('RLS Filter Parser', () => {
  describe('parseFilter', () => {
    describe('simple equality', () => {
      it('parses single field equality', () => {
        const result = parseFilter({ status: 'active' }, '', 1);
        expect(result.sql).toBe('status = $1');
        expect(result.params).toEqual(['active']);
        expect(result.nextOffset).toBe(2);
      });

      it('parses multiple field equality with AND', () => {
        const result = parseFilter({ status: 'active', type: 'premium' }, '', 1);
        expect(result.sql).toBe('status = $1 AND type = $2');
        expect(result.params).toEqual(['active', 'premium']);
        expect(result.nextOffset).toBe(3);
      });

      it('handles null value as IS NULL', () => {
        const result = parseFilter({ deleted_at: null }, '', 1);
        expect(result.sql).toBe('deleted_at IS NULL');
        expect(result.params).toEqual([]);
        expect(result.nextOffset).toBe(1);
      });

      it('handles array value as IN', () => {
        const result = parseFilter({ status: ['active', 'pending'] }, '', 1);
        expect(result.sql).toBe('status IN ($1, $2)');
        expect(result.params).toEqual(['active', 'pending']);
        expect(result.nextOffset).toBe(3);
      });
    });

    describe('with table alias', () => {
      it('prefixes column with alias', () => {
        const result = parseFilter({ status: 'active' }, 't', 1);
        expect(result.sql).toBe('t.status = $1');
      });

      it('prefixes all columns with alias', () => {
        const result = parseFilter({ status: 'active', role: 'board' }, 'j', 1);
        expect(result.sql).toBe('j.status = $1 AND j.role = $2');
      });
    });

    describe('parameter offset', () => {
      it('starts from specified offset', () => {
        const result = parseFilter({ status: 'active' }, '', 5);
        expect(result.sql).toBe('status = $5');
        expect(result.nextOffset).toBe(6);
      });

      it('continues offset through multiple conditions', () => {
        const result = parseFilter({ a: 1, b: 2 }, '', 10);
        expect(result.sql).toBe('a = $10 AND b = $11');
        expect(result.nextOffset).toBe(12);
      });
    });

    describe('extended operator syntax', () => {
      it('parses $ne (not equal)', () => {
        const result = parseFilter({ status: { $ne: 'deleted' } }, '', 1);
        expect(result.sql).toBe('status != $1');
        expect(result.params).toEqual(['deleted']);
      });

      it('parses $gt (greater than)', () => {
        const result = parseFilter({ count: { $gt: 5 } }, '', 1);
        expect(result.sql).toBe('count > $1');
        expect(result.params).toEqual([5]);
      });

      it('parses $gte (greater than or equal)', () => {
        const result = parseFilter({ count: { $gte: 0 } }, '', 1);
        expect(result.sql).toBe('count >= $1');
      });

      it('parses $lt (less than)', () => {
        const result = parseFilter({ count: { $lt: 100 } }, '', 1);
        expect(result.sql).toBe('count < $1');
      });

      it('parses $lte (less than or equal)', () => {
        const result = parseFilter({ count: { $lte: 50 } }, '', 1);
        expect(result.sql).toBe('count <= $1');
      });

      it('parses $in (in array)', () => {
        const result = parseFilter({ status: { $in: ['a', 'b', 'c'] } }, '', 1);
        expect(result.sql).toBe('status IN ($1, $2, $3)');
        expect(result.params).toEqual(['a', 'b', 'c']);
        expect(result.nextOffset).toBe(4);
      });

      it('parses $nin (not in array)', () => {
        const result = parseFilter({ status: { $nin: ['x', 'y'] } }, '', 1);
        expect(result.sql).toBe('status NOT IN ($1, $2)');
      });

      it('parses $null true as IS NULL', () => {
        const result = parseFilter({ field: { $null: true } }, '', 1);
        expect(result.sql).toBe('field IS NULL');
        expect(result.params).toEqual([]);
      });

      it('parses $null false as IS NOT NULL', () => {
        const result = parseFilter({ field: { $null: false } }, '', 1);
        expect(result.sql).toBe('field IS NOT NULL');
      });
    });

    describe('error handling', () => {
      it('returns empty for null filter', () => {
        const result = parseFilter(null, '', 1);
        expect(result.sql).toBe('');
        expect(result.params).toEqual([]);
      });

      it('returns empty for empty filter', () => {
        const result = parseFilter({}, '', 1);
        expect(result.sql).toBe('');
      });

      it('throws on invalid field name', () => {
        // sanitizeIdentifier from sql-safety.js handles this
        expect(() => parseFilter({ 'bad-field': 1 }, '', 1)).toThrow('Invalid filter field');
        expect(() => parseFilter({ '123abc': 1 }, '', 1)).toThrow('Invalid filter field');
        expect(() => parseFilter({ 'field; DROP TABLE': 1 }, '', 1)).toThrow('Invalid filter field');
      });

      it('throws when exceeding max conditions', () => {
        // RLS_ENGINE.MAX_FILTER_CONDITIONS is 10
        const tooMany = {};
        for (let i = 0; i <= 10; i++) {
          tooMany[`field${i}`] = i;
        }
        expect(() => parseFilter(tooMany, '', 1)).toThrow('exceeds maximum');
      });

      it('throws on unknown operator', () => {
        expect(() => parseFilter({ field: { $unknown: 1 } }, '', 1)).toThrow('Unknown filter operator');
      });

      it('throws on multiple operators in one object', () => {
        expect(() => parseFilter({ field: { $gt: 1, $lt: 10 } }, '', 1)).toThrow('exactly one key');
      });

      it('throws on empty $in array', () => {
        expect(() => parseFilter({ field: { $in: [] } }, '', 1)).toThrow('requires non-empty array');
      });
    });
  });
});
