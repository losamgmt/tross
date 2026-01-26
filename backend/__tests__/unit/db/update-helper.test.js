/**
 * Update Helper Unit Tests
 *
 * Tests for UPDATE query building utilities.
 */

const { buildUpdateClause, ImmutableFieldError } = require('../../../db/helpers/update-helper');

describe('Update Helper', () => {
  describe('buildUpdateClause', () => {
    describe('basic functionality', () => {
      it('should build updates for simple fields', () => {
        const data = { name: 'John', email: 'john@example.com' };
        const result = buildUpdateClause(data);

        expect(result.hasUpdates).toBe(true);
        expect(result.updates).toContain('name = $1');
        expect(result.updates).toContain('email = $2');
        expect(result.values).toEqual(['John', 'john@example.com']);
      });

      it('should skip undefined values', () => {
        const data = { name: 'John', email: undefined };
        const result = buildUpdateClause(data);

        expect(result.updates).toHaveLength(1);
        expect(result.updates).toContain('name = $1');
        expect(result.values).toEqual(['John']);
      });

      it('should include null values', () => {
        const data = { name: 'John', email: null };
        const result = buildUpdateClause(data);

        expect(result.updates).toHaveLength(2);
        expect(result.values).toContain(null);
      });

      it('should return hasUpdates false when no updates', () => {
        const data = { someField: undefined };
        const result = buildUpdateClause(data);

        expect(result.hasUpdates).toBe(false);
        expect(result.updates).toHaveLength(0);
        expect(result.values).toHaveLength(0);
      });

      it('should handle empty data object', () => {
        const result = buildUpdateClause({});

        expect(result.hasUpdates).toBe(false);
        expect(result.updates).toEqual([]);
        expect(result.values).toEqual([]);
      });
    });

    describe('immutable field handling', () => {
      it('should throw ImmutableFieldError for universal immutables (id)', () => {
        const data = { id: 999, name: 'John' };

        expect(() => buildUpdateClause(data)).toThrow(ImmutableFieldError);
      });

      it('should throw ImmutableFieldError for universal immutables (created_at)', () => {
        const data = { created_at: new Date(), name: 'John' };

        expect(() => buildUpdateClause(data)).toThrow(ImmutableFieldError);
      });

      it('should throw for entity-specific excluded fields', () => {
        const data = { auth0_id: 'new-id', name: 'John' };

        expect(() => buildUpdateClause(data, ['auth0_id'])).toThrow(ImmutableFieldError);
      });

      it('should include all violations in error', () => {
        const data = { id: 1, created_at: new Date(), name: 'John' };

        try {
          buildUpdateClause(data);
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ImmutableFieldError);
          expect(error.violations).toHaveLength(2);
          expect(error.violations.map(v => v.field)).toContain('id');
          expect(error.violations.map(v => v.field)).toContain('created_at');
        }
      });

      it('should not throw for undefined immutable fields', () => {
        const data = { id: undefined, name: 'John' };
        const result = buildUpdateClause(data);

        expect(result.hasUpdates).toBe(true);
        expect(result.updates).toContain('name = $1');
      });
    });

    describe('JSONB field handling', () => {
      it('should add ::jsonb cast for JSONB fields', () => {
        const data = { settings: { theme: 'dark' } };
        const result = buildUpdateClause(data, [], { jsonbFields: ['settings'] });

        expect(result.updates).toContain('settings = $1::jsonb');
        expect(result.values).toEqual([JSON.stringify({ theme: 'dark' })]);
      });

      it('should handle null JSONB fields without cast', () => {
        const data = { settings: null };
        const result = buildUpdateClause(data, [], { jsonbFields: ['settings'] });

        expect(result.updates).toContain('settings = $1');
        expect(result.values).toEqual([null]);
      });

      it('should handle nested JSONB objects', () => {
        const data = { metadata: { level1: { level2: 'value' } } };
        const result = buildUpdateClause(data, [], { jsonbFields: ['metadata'] });

        expect(result.values[0]).toBe(JSON.stringify({ level1: { level2: 'value' } }));
      });
    });

    describe('trim field handling', () => {
      it('should trim specified string fields', () => {
        const data = { name: '  John  ', email: 'john@example.com' };
        const result = buildUpdateClause(data, [], { trimFields: ['name'] });

        expect(result.values).toContain('John');
        expect(result.values).toContain('john@example.com'); // Not trimmed
      });

      it('should not trim non-string values', () => {
        const data = { count: 5 };
        const result = buildUpdateClause(data, [], { trimFields: ['count'] });

        expect(result.values).toContain(5);
      });

      it('should handle multiple trim fields', () => {
        const data = { name: '  John  ', title: '  Manager  ' };
        const result = buildUpdateClause(data, [], { trimFields: ['name', 'title'] });

        expect(result.values).toEqual(['John', 'Manager']);
      });
    });

    describe('combined options', () => {
      it('should handle both JSONB and trim fields', () => {
        const data = { name: '  John  ', settings: { key: 'value' } };
        const result = buildUpdateClause(data, [], {
          jsonbFields: ['settings'],
          trimFields: ['name'],
        });

        expect(result.updates).toContain('name = $1');
        expect(result.updates).toContain('settings = $2::jsonb');
        expect(result.values[0]).toBe('John');
        expect(result.values[1]).toBe(JSON.stringify({ key: 'value' }));
      });
    });
  });

  describe('ImmutableFieldError', () => {
    it('should have correct error name', () => {
      const error = new ImmutableFieldError([{ field: 'id', message: 'test' }]);
      expect(error.name).toBe('ImmutableFieldError');
    });

    it('should have correct error code', () => {
      const error = new ImmutableFieldError([{ field: 'id', message: 'test' }]);
      expect(error.code).toBe('IMMUTABLE_FIELD_VIOLATION');
    });

    it('should have 400 status code', () => {
      const error = new ImmutableFieldError([{ field: 'id', message: 'test' }]);
      expect(error.statusCode).toBe(400);
    });

    it('should include field names in message', () => {
      const error = new ImmutableFieldError([
        { field: 'id', message: 'test' },
        { field: 'created_at', message: 'test' },
      ]);
      expect(error.message).toContain('id');
      expect(error.message).toContain('created_at');
    });

    it('should store violations for API response', () => {
      const violations = [
        { field: 'id', message: 'test1' },
        { field: 'created_at', message: 'test2' },
      ];
      const error = new ImmutableFieldError(violations);
      expect(error.violations).toEqual(violations);
    });
  });
});
