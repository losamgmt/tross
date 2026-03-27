/**
 * Unit Tests: db/helpers/cascade-helper.js
 *
 * Tests generic cascade delete helper with strategy support.
 * SRP: Verify cascade operations work correctly for all dependency types and strategies.
 */

// Mock dependencies BEFORE requiring the helper
jest.mock('../../../config/logger');

const {
  cascadeDeleteDependents,
  DELETE_STRATEGIES,
} = require('../../../db/helpers/cascade-helper');
const { createMockClient } = require('../../mocks');

describe('db/helpers/cascade-helper.js', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =============================================================================
  // DELETE_STRATEGIES ENUM
  // =============================================================================
  describe('DELETE_STRATEGIES', () => {
    test('should export all strategy types', () => {
      expect(DELETE_STRATEGIES.CASCADE).toBe('cascade');
      expect(DELETE_STRATEGIES.RESTRICT).toBe('restrict');
      expect(DELETE_STRATEGIES.NULLIFY).toBe('nullify');
      expect(DELETE_STRATEGIES.SOFT).toBe('soft');
    });

    test('should be frozen (immutable)', () => {
      expect(Object.isFrozen(DELETE_STRATEGIES)).toBe(true);
    });
  });

  // =============================================================================
  // BASIC FUNCTIONALITY
  // =============================================================================
  describe('Basic cascade operations', () => {
    test('should return empty result when no dependents defined', async () => {
      const metadata = {
        tableName: 'inventory',
        dependents: [],
      };

      const result = await cascadeDeleteDependents(mockClient, metadata, 1);

      expect(result).toEqual({
        totalDeleted: 0,
        totalUpdated: 0,
        details: [],
      });
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should return empty result when dependents is undefined', async () => {
      const metadata = {
        tableName: 'inventory',
        // dependents not defined
      };

      const result = await cascadeDeleteDependents(mockClient, metadata, 1);

      expect(result).toEqual({
        totalDeleted: 0,
        totalUpdated: 0,
        details: [],
      });
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should handle single polymorphic dependent', async () => {
      const metadata = {
        tableName: 'roles',
        dependents: [
          {
            table: 'audit_logs',
            foreignKey: 'resource_id',
            polymorphicType: { column: 'resource_type', value: 'roles' },
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 5 });

      const result = await cascadeDeleteDependents(mockClient, metadata, 123);

      expect(result).toEqual({
        totalDeleted: 5,
        totalUpdated: 0,
        details: [
          {
            table: 'audit_logs',
            foreignKey: 'resource_id',
            polymorphic: true,
            strategy: 'cascade',
            action: 'deleted',
            affected: 5,
          },
        ],
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM audit_logs WHERE resource_id = $1 AND resource_type = $2',
        [123, 'roles'],
      );
    });

    test('should handle single non-polymorphic dependent', async () => {
      const metadata = {
        tableName: 'customers',
        dependents: [
          {
            table: 'notes',
            foreignKey: 'customer_id',
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 3 });

      const result = await cascadeDeleteDependents(mockClient, metadata, 456);

      expect(result).toEqual({
        totalDeleted: 3,
        totalUpdated: 0,
        details: [
          {
            table: 'notes',
            foreignKey: 'customer_id',
            polymorphic: false,
            strategy: 'cascade',
            action: 'deleted',
            affected: 3,
          },
        ],
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM notes WHERE customer_id = $1',
        [456],
      );
    });
  });

  // =============================================================================
  // DELETE STRATEGIES
  // =============================================================================
  describe('Delete strategies', () => {
    describe('CASCADE strategy', () => {
      test('should delete dependents (default behavior)', async () => {
        const metadata = {
          tableName: 'users',
          dependents: [
            {
              table: 'sessions',
              foreignKey: 'user_id',
              strategy: 'cascade',
            },
          ],
        };

        mockClient.query.mockResolvedValue({ rowCount: 3 });

        const result = await cascadeDeleteDependents(mockClient, metadata, 1);

        expect(result.totalDeleted).toBe(3);
        expect(result.totalUpdated).toBe(0);
        expect(result.details[0].action).toBe('deleted');
        expect(mockClient.query).toHaveBeenCalledWith(
          'DELETE FROM sessions WHERE user_id = $1',
          [1],
        );
      });

      test('should default to CASCADE when no strategy specified', async () => {
        const metadata = {
          tableName: 'users',
          dependents: [
            {
              table: 'sessions',
              foreignKey: 'user_id',
              // no strategy
            },
          ],
        };

        mockClient.query.mockResolvedValue({ rowCount: 2 });

        const result = await cascadeDeleteDependents(mockClient, metadata, 1);

        expect(result.details[0].strategy).toBe('cascade');
        expect(result.details[0].action).toBe('deleted');
      });
    });

    describe('RESTRICT strategy', () => {
      test('should throw error when dependents exist', async () => {
        const metadata = {
          tableName: 'users',
          dependents: [
            {
              table: 'open_tickets',
              foreignKey: 'user_id',
              strategy: 'restrict',
            },
          ],
        };

        // Mock COUNT query returning 2 dependents
        mockClient.query.mockResolvedValue({ rows: [{ count: '2' }] });

        await expect(
          cascadeDeleteDependents(mockClient, metadata, 1),
        ).rejects.toThrow('Cannot delete users: 2 dependent open_tickets record(s) exist');
      });

      test('should allow delete when no dependents exist', async () => {
        const metadata = {
          tableName: 'users',
          dependents: [
            {
              table: 'open_tickets',
              foreignKey: 'user_id',
              strategy: 'restrict',
            },
          ],
        };

        // Mock COUNT query returning 0 dependents
        mockClient.query.mockResolvedValue({ rows: [{ count: '0' }] });

        const result = await cascadeDeleteDependents(mockClient, metadata, 1);

        expect(result.totalDeleted).toBe(0);
        expect(result.details[0].action).toBe('checked');
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT COUNT(*)'),
          [1],
        );
      });
    });

    describe('NULLIFY strategy', () => {
      test('should set FK to NULL instead of deleting', async () => {
        const metadata = {
          tableName: 'users',
          dependents: [
            {
              table: 'comments',
              foreignKey: 'author_id',
              strategy: 'nullify',
            },
          ],
        };

        mockClient.query.mockResolvedValue({ rowCount: 5 });

        const result = await cascadeDeleteDependents(mockClient, metadata, 1);

        expect(result.totalDeleted).toBe(0);
        expect(result.totalUpdated).toBe(5);
        expect(result.details[0].action).toBe('nullified');
        expect(mockClient.query).toHaveBeenCalledWith(
          'UPDATE comments SET author_id = NULL WHERE author_id = $1',
          [1],
        );
      });
    });

    describe('SOFT strategy', () => {
      test('should set is_active = false instead of deleting', async () => {
        const metadata = {
          tableName: 'users',
          dependents: [
            {
              table: 'sessions',
              foreignKey: 'user_id',
              strategy: 'soft',
            },
          ],
        };

        mockClient.query.mockResolvedValue({ rowCount: 3 });

        const result = await cascadeDeleteDependents(mockClient, metadata, 1);

        expect(result.totalDeleted).toBe(0);
        expect(result.totalUpdated).toBe(3);
        expect(result.details[0].action).toBe('soft_deleted');
        expect(mockClient.query).toHaveBeenCalledWith(
          'UPDATE sessions SET is_active = false WHERE user_id = $1',
          [1],
        );
      });
    });
  });

  // =============================================================================
  // MULTIPLE DEPENDENTS
  // =============================================================================
  describe('Multiple dependents', () => {
    test('should process multiple dependents in order', async () => {
      const metadata = {
        tableName: 'users',
        dependents: [
          {
            table: 'audit_logs',
            foreignKey: 'resource_id',
            polymorphicType: { column: 'resource_type', value: 'users' },
          },
          {
            table: 'user_sessions',
            foreignKey: 'user_id',
          },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 10 }) // audit_logs
        .mockResolvedValueOnce({ rowCount: 2 }); // user_sessions

      const result = await cascadeDeleteDependents(mockClient, metadata, 789);

      expect(result.totalDeleted).toBe(12);
      expect(result.totalUpdated).toBe(0);
      expect(result.details).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    test('should handle mixed strategies', async () => {
      const metadata = {
        tableName: 'users',
        dependents: [
          { table: 'audit_logs', foreignKey: 'user_id', strategy: 'cascade' },
          { table: 'comments', foreignKey: 'author_id', strategy: 'nullify' },
          { table: 'sessions', foreignKey: 'user_id', strategy: 'soft' },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 5 })  // delete audit_logs
        .mockResolvedValueOnce({ rowCount: 3 })  // nullify comments
        .mockResolvedValueOnce({ rowCount: 2 }); // soft delete sessions

      const result = await cascadeDeleteDependents(mockClient, metadata, 1);

      expect(result.totalDeleted).toBe(5);
      expect(result.totalUpdated).toBe(5); // 3 nullified + 2 soft deleted
      expect(result.details[0].action).toBe('deleted');
      expect(result.details[1].action).toBe('nullified');
      expect(result.details[2].action).toBe('soft_deleted');
    });

    test('should accumulate totals correctly', async () => {
      const metadata = {
        tableName: 'customers',
        dependents: [
          { table: 'audit_logs', foreignKey: 'customer_id' },
          { table: 'notes', foreignKey: 'customer_id' },
          { table: 'preferences', foreignKey: 'customer_id' },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 5 })
        .mockResolvedValueOnce({ rowCount: 3 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await cascadeDeleteDependents(mockClient, metadata, 1);

      expect(result.totalDeleted).toBe(9);
      expect(result.details).toHaveLength(3);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================
  describe('Edge cases', () => {
    test('should handle zero rows affected gracefully', async () => {
      const metadata = {
        tableName: 'roles',
        dependents: [
          {
            table: 'audit_logs',
            foreignKey: 'resource_id',
            polymorphicType: { column: 'resource_type', value: 'roles' },
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      const result = await cascadeDeleteDependents(mockClient, metadata, 999);

      expect(result).toEqual({
        totalDeleted: 0,
        totalUpdated: 0,
        details: [
          {
            table: 'audit_logs',
            foreignKey: 'resource_id',
            polymorphic: true,
            strategy: 'cascade',
            action: 'deleted',
            affected: 0,
          },
        ],
      });
    });

    test('should propagate database errors', async () => {
      const metadata = {
        tableName: 'roles',
        dependents: [
          {
            table: 'audit_logs',
            foreignKey: 'resource_id',
            polymorphicType: { column: 'resource_type', value: 'roles' },
          },
        ],
      };

      const dbError = new Error('Connection lost');
      mockClient.query.mockRejectedValue(dbError);

      await expect(
        cascadeDeleteDependents(mockClient, metadata, 123),
      ).rejects.toThrow('Connection lost');
    });

    test('should handle partial cascade failure', async () => {
      const metadata = {
        tableName: 'users',
        dependents: [
          {
            table: 'audit_logs',
            foreignKey: 'resource_id',
            polymorphicType: { column: 'resource_type', value: 'users' },
          },
          { table: 'user_sessions', foreignKey: 'user_id' },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 5 }) // First succeeds
        .mockRejectedValueOnce(new Error('Table does not exist')); // Second fails

      await expect(
        cascadeDeleteDependents(mockClient, metadata, 123),
      ).rejects.toThrow('Table does not exist');
    });
  });

  // =============================================================================
  // QUERY STRUCTURE VALIDATION
  // =============================================================================
  describe('Query structure', () => {
    test('should build correct polymorphic DELETE query', async () => {
      const metadata = {
        tableName: 'technicians',
        dependents: [
          {
            table: 'audit_logs',
            foreignKey: 'resource_id',
            polymorphicType: { column: 'resource_type', value: 'technicians' },
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      await cascadeDeleteDependents(mockClient, metadata, 42);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM audit_logs WHERE resource_id = $1 AND resource_type = $2',
        [42, 'technicians'],
      );
    });

    test('should build correct simple FK DELETE query', async () => {
      const metadata = {
        tableName: 'work_orders',
        dependents: [
          {
            table: 'line_items',
            foreignKey: 'work_order_id',
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      await cascadeDeleteDependents(mockClient, metadata, 99);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM line_items WHERE work_order_id = $1',
        [99],
      );
    });

    test('should build correct polymorphic NULLIFY query', async () => {
      const metadata = {
        tableName: 'users',
        dependents: [
          {
            table: 'comments',
            foreignKey: 'author_id',
            polymorphicType: { column: 'author_type', value: 'users' },
            strategy: 'nullify',
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      await cascadeDeleteDependents(mockClient, metadata, 1);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE comments SET author_id = NULL WHERE author_id = $1 AND author_type = $2',
        [1, 'users'],
      );
    });

    test('should preserve exact polymorphic type value from metadata', async () => {
      const metadata = {
        tableName: 'inventory',
        dependents: [
          {
            table: 'audit_logs',
            foreignKey: 'resource_id',
            polymorphicType: { column: 'resource_type', value: 'inventory' },
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      await cascadeDeleteDependents(mockClient, metadata, 1);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'inventory'],
      );
    });

    test('should throw on unknown strategy', async () => {
      const metadata = {
        tableName: 'users',
        dependents: [
          {
            table: 'sessions',
            foreignKey: 'user_id',
            strategy: 'invalid_strategy',
          },
        ],
      };

      await expect(
        cascadeDeleteDependents(mockClient, metadata, 1),
      ).rejects.toThrow('Unknown delete strategy: invalid_strategy');
    });

    test('should use configurable softDeleteColumn', async () => {
      const metadata = {
        tableName: 'users',
        dependents: [
          {
            table: 'sessions',
            foreignKey: 'user_id',
            strategy: 'soft',
            softDeleteColumn: 'deleted_at',
          },
        ],
      };

      mockClient.query.mockResolvedValue({ rowCount: 2 });

      const result = await cascadeDeleteDependents(mockClient, metadata, 1);

      expect(result.totalUpdated).toBe(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE sessions SET deleted_at = false WHERE user_id = $1',
        [1],
      );
    });
  });
});
