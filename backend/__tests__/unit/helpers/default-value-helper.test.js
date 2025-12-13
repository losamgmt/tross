/**
 * Default Value Helper Unit Tests
 *
 * Tests for: backend/db/helpers/default-value-helper.js
 *
 * Coverage:
 * - getNextOrdinalValue() - MAX + 1 strategy for ordinal fields
 * - Input validation (required params, types)
 * - Security whitelists (allowed tables, allowed fields)
 * - Edge cases (empty table, existing values, database errors)
 */

const { getNextOrdinalValue } = require('../../../db/helpers/default-value-helper');
const db = require('../../../db/connection');

// Mock the database connection
jest.mock('../../../db/connection');

// Mock the logger to prevent console noise
jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Default Value Helper', () => {
  // ============================================================================
  // SETUP & TEARDOWN
  // ============================================================================

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // getNextOrdinalValue() TESTS
  // ============================================================================

  describe('getNextOrdinalValue()', () => {
    // --------------------------------------------------------------------------
    // SUCCESS CASES
    // --------------------------------------------------------------------------

    describe('success cases', () => {
      it('should return default value when table is empty', async () => {
        // Arrange: COALESCE(MAX(null), 50-1) + 1 = 50
        db.query.mockResolvedValue({
          rows: [{ next_value: 50 }],
        });

        // Act
        const result = await getNextOrdinalValue('roles', 'priority', 50);

        // Assert
        expect(result).toBe(50);
        expect(db.query).toHaveBeenCalledTimes(1);
        expect(db.query).toHaveBeenCalledWith(
          'SELECT COALESCE(MAX(priority), $1 - 1) + 1 as next_value FROM roles',
          [50]
        );
      });

      it('should return max + 1 when table has existing records', async () => {
        // Arrange: max priority is 100, so returns 101
        db.query.mockResolvedValue({
          rows: [{ next_value: 101 }],
        });

        // Act
        const result = await getNextOrdinalValue('roles', 'priority', 50);

        // Assert
        expect(result).toBe(101);
      });

      it('should use default value of 1 when not specified', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ next_value: 1 }],
        });

        // Act
        const result = await getNextOrdinalValue('roles', 'priority');

        // Assert
        expect(result).toBe(1);
        expect(db.query).toHaveBeenCalledWith(
          'SELECT COALESCE(MAX(priority), $1 - 1) + 1 as next_value FROM roles',
          [1]
        );
      });

      it('should work with different allowed tables', async () => {
        const allowedTables = ['roles', 'users', 'work_orders', 'invoices'];

        for (const tableName of allowedTables) {
          db.query.mockResolvedValue({ rows: [{ next_value: 5 }] });

          const result = await getNextOrdinalValue(tableName, 'priority', 1);

          expect(result).toBe(5);
        }
      });

      it('should work with different allowed fields', async () => {
        const allowedFields = ['priority', 'sequence_number', 'sort_order', 'display_order'];

        for (const fieldName of allowedFields) {
          db.query.mockResolvedValue({ rows: [{ next_value: 10 }] });

          const result = await getNextOrdinalValue('roles', fieldName, 1);

          expect(result).toBe(10);
        }
      });

      it('should return integer even if database returns string', async () => {
        // Arrange: PostgreSQL may return string for numeric
        db.query.mockResolvedValue({
          rows: [{ next_value: '42' }],
        });

        // Act
        const result = await getNextOrdinalValue('roles', 'priority', 1);

        // Assert
        expect(result).toBe(42);
        expect(typeof result).toBe('number');
      });
    });

    // --------------------------------------------------------------------------
    // INPUT VALIDATION
    // --------------------------------------------------------------------------

    describe('input validation', () => {
      it('should throw when tableName is missing', async () => {
        await expect(getNextOrdinalValue(undefined, 'priority', 1)).rejects.toThrow(
          'tableName is required and must be a string'
        );
      });

      it('should throw when tableName is null', async () => {
        await expect(getNextOrdinalValue(null, 'priority', 1)).rejects.toThrow(
          'tableName is required and must be a string'
        );
      });

      it('should throw when tableName is empty string', async () => {
        await expect(getNextOrdinalValue('', 'priority', 1)).rejects.toThrow(
          'tableName is required and must be a string'
        );
      });

      it('should throw when tableName is not a string', async () => {
        await expect(getNextOrdinalValue(123, 'priority', 1)).rejects.toThrow(
          'tableName is required and must be a string'
        );
      });

      it('should throw when fieldName is missing', async () => {
        await expect(getNextOrdinalValue('roles', undefined, 1)).rejects.toThrow(
          'fieldName is required and must be a string'
        );
      });

      it('should throw when fieldName is null', async () => {
        await expect(getNextOrdinalValue('roles', null, 1)).rejects.toThrow(
          'fieldName is required and must be a string'
        );
      });

      it('should throw when fieldName is empty string', async () => {
        await expect(getNextOrdinalValue('roles', '', 1)).rejects.toThrow(
          'fieldName is required and must be a string'
        );
      });

      it('should throw when fieldName is not a string', async () => {
        await expect(getNextOrdinalValue('roles', { field: 'priority' }, 1)).rejects.toThrow(
          'fieldName is required and must be a string'
        );
      });
    });

    // --------------------------------------------------------------------------
    // SECURITY WHITELISTS
    // --------------------------------------------------------------------------

    describe('security whitelists', () => {
      it('should throw for non-whitelisted table name', async () => {
        await expect(
          getNextOrdinalValue('malicious_table', 'priority', 1)
        ).rejects.toThrow("Table 'malicious_table' is not in the allowed list for ordinal generation");
      });

      it('should throw for SQL injection attempt in table name', async () => {
        await expect(
          getNextOrdinalValue('roles; DROP TABLE users; --', 'priority', 1)
        ).rejects.toThrow(/not in the allowed list/);
      });

      it('should throw for non-whitelisted field name', async () => {
        await expect(
          getNextOrdinalValue('roles', 'malicious_field', 1)
        ).rejects.toThrow("Field 'malicious_field' is not in the allowed list for ordinal generation");
      });

      it('should throw for SQL injection attempt in field name', async () => {
        await expect(
          getNextOrdinalValue('roles', 'priority; DROP TABLE roles; --', 1)
        ).rejects.toThrow(/not in the allowed list/);
      });

      it('should not call database for non-whitelisted inputs', async () => {
        try {
          await getNextOrdinalValue('bad_table', 'priority', 1);
        } catch {
          // Expected to throw
        }

        expect(db.query).not.toHaveBeenCalled();
      });
    });

    // --------------------------------------------------------------------------
    // ERROR HANDLING
    // --------------------------------------------------------------------------

    describe('error handling', () => {
      it('should propagate database errors', async () => {
        // Arrange
        const dbError = new Error('Connection refused');
        db.query.mockRejectedValue(dbError);

        // Act & Assert
        await expect(getNextOrdinalValue('roles', 'priority', 1)).rejects.toThrow(
          'Connection refused'
        );
      });

      it('should log errors before propagating', async () => {
        // Arrange
        const { logger } = require('../../../config/logger');
        const dbError = new Error('Query timeout');
        db.query.mockRejectedValue(dbError);

        // Act
        try {
          await getNextOrdinalValue('roles', 'priority', 1);
        } catch {
          // Expected
        }

        // Assert
        expect(logger.error).toHaveBeenCalledWith('getNextOrdinalValue failed', {
          table: 'roles',
          field: 'priority',
          error: 'Query timeout',
        });
      });
    });

    // --------------------------------------------------------------------------
    // EDGE CASES
    // --------------------------------------------------------------------------

    describe('edge cases', () => {
      it('should handle very large ordinal values', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ next_value: 2147483647 }], // Max 32-bit integer
        });

        // Act
        const result = await getNextOrdinalValue('roles', 'priority', 1);

        // Assert
        expect(result).toBe(2147483647);
      });

      it('should handle zero as default value', async () => {
        // Arrange: COALESCE(MAX(null), 0-1) + 1 = 0
        db.query.mockResolvedValue({
          rows: [{ next_value: 0 }],
        });

        // Act
        const result = await getNextOrdinalValue('roles', 'priority', 0);

        // Assert
        expect(result).toBe(0);
        expect(db.query).toHaveBeenCalledWith(
          'SELECT COALESCE(MAX(priority), $1 - 1) + 1 as next_value FROM roles',
          [0]
        );
      });

      it('should handle negative default value', async () => {
        // Arrange: COALESCE(MAX(null), -10-1) + 1 = -10
        db.query.mockResolvedValue({
          rows: [{ next_value: -10 }],
        });

        // Act
        const result = await getNextOrdinalValue('roles', 'priority', -10);

        // Assert
        expect(result).toBe(-10);
      });
    });
  });
});
