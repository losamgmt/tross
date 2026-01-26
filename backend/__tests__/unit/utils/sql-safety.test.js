/**
 * SQL Safety Utilities Unit Tests
 *
 * Tests for defense-in-depth SQL safety utilities.
 */

const { sanitizeIdentifier, validateFieldAgainstWhitelist } = require('../../../utils/sql-safety');

describe('SQL Safety Utilities', () => {
  describe('sanitizeIdentifier', () => {
    describe('valid identifiers', () => {
      it('should accept simple lowercase identifier', () => {
        expect(sanitizeIdentifier('users')).toBe('users');
      });

      it('should accept identifier with underscore', () => {
        expect(sanitizeIdentifier('work_orders')).toBe('work_orders');
      });

      it('should accept identifier starting with underscore', () => {
        expect(sanitizeIdentifier('_private_table')).toBe('_private_table');
      });

      it('should accept identifier with numbers', () => {
        expect(sanitizeIdentifier('table_v2')).toBe('table_v2');
      });

      it('should accept uppercase identifiers', () => {
        expect(sanitizeIdentifier('USERS')).toBe('USERS');
      });

      it('should accept mixed case identifiers', () => {
        expect(sanitizeIdentifier('WorkOrders')).toBe('WorkOrders');
      });
    });

    describe('invalid identifiers', () => {
      it('should reject non-string input', () => {
        expect(() => sanitizeIdentifier(123)).toThrow('must be a string');
        expect(() => sanitizeIdentifier(null)).toThrow('must be a string');
        expect(() => sanitizeIdentifier(undefined)).toThrow('must be a string');
        expect(() => sanitizeIdentifier({})).toThrow('must be a string');
        expect(() => sanitizeIdentifier([])).toThrow('must be a string');
      });

      it('should reject empty string', () => {
        expect(() => sanitizeIdentifier('')).toThrow('cannot be empty');
      });

      it('should reject identifier exceeding max length', () => {
        const longIdentifier = 'a'.repeat(64);
        expect(() => sanitizeIdentifier(longIdentifier)).toThrow('exceeds maximum length');
      });

      it('should accept identifier at max length', () => {
        const maxIdentifier = 'a'.repeat(63);
        expect(sanitizeIdentifier(maxIdentifier)).toBe(maxIdentifier);
      });

      it('should reject SQL injection attempts', () => {
        expect(() => sanitizeIdentifier('users; DROP TABLE--')).toThrow('contains invalid characters');
        expect(() => sanitizeIdentifier("users'; DELETE FROM users--")).toThrow('contains invalid characters');
        expect(() => sanitizeIdentifier('users" OR 1=1')).toThrow('contains invalid characters');
      });

      it('should reject identifiers with spaces', () => {
        expect(() => sanitizeIdentifier('user table')).toThrow('contains invalid characters');
      });

      it('should reject identifiers with special characters', () => {
        expect(() => sanitizeIdentifier('user-table')).toThrow('contains invalid characters');
        expect(() => sanitizeIdentifier('user.table')).toThrow('contains invalid characters');
        expect(() => sanitizeIdentifier('user@table')).toThrow('contains invalid characters');
      });

      it('should reject identifiers starting with number', () => {
        expect(() => sanitizeIdentifier('123users')).toThrow('contains invalid characters');
      });
    });

    describe('custom context', () => {
      it('should include custom context in error message', () => {
        expect(() => sanitizeIdentifier('', 'table name')).toThrow('Invalid table name');
        expect(() => sanitizeIdentifier(123, 'column')).toThrow('Invalid column');
      });
    });
  });

  describe('validateFieldAgainstWhitelist', () => {
    const allowedFields = ['id', 'name', 'email', 'status'];

    describe('valid fields', () => {
      it('should return field when in whitelist', () => {
        expect(validateFieldAgainstWhitelist('name', allowedFields)).toBe('name');
        expect(validateFieldAgainstWhitelist('email', allowedFields)).toBe('email');
      });

      it('should work with single-item whitelist', () => {
        expect(validateFieldAgainstWhitelist('id', ['id'])).toBe('id');
      });
    });

    describe('invalid fields', () => {
      it('should throw when field not in whitelist', () => {
        expect(() => validateFieldAgainstWhitelist('unknown', allowedFields))
          .toThrow('Invalid field: "unknown" is not allowed');
      });

      it('should include allowed values in error message', () => {
        expect(() => validateFieldAgainstWhitelist('invalid', allowedFields))
          .toThrow('Allowed values: id, name, email, status');
      });

      it('should be case sensitive', () => {
        expect(() => validateFieldAgainstWhitelist('Name', allowedFields))
          .toThrow('is not allowed');
      });
    });

    describe('invalid whitelist', () => {
      it('should throw when whitelist is not an array', () => {
        expect(() => validateFieldAgainstWhitelist('field', null))
          .toThrow('whitelist must be an array');
        expect(() => validateFieldAgainstWhitelist('field', 'not-array'))
          .toThrow('whitelist must be an array');
        expect(() => validateFieldAgainstWhitelist('field', {}))
          .toThrow('whitelist must be an array');
      });

      it('should handle empty whitelist', () => {
        expect(() => validateFieldAgainstWhitelist('field', []))
          .toThrow('is not allowed');
      });
    });

    describe('custom context', () => {
      it('should include custom context in error message', () => {
        expect(() => validateFieldAgainstWhitelist('unknown', allowedFields, 'sort field'))
          .toThrow('Invalid sort field');
      });
    });
  });
});
