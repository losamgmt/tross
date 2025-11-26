/**
 * Unit Tests: db/helpers/delete-helper.js
 *
 * Tests generic delete helper with transaction + audit cascade + hooks.
 * Focus: Behavior testing, not implementation details.
 */

// Mock dependencies BEFORE requiring the helper
jest.mock('../../../db/connection');
jest.mock('../../../config/logger');

const { deleteWithAuditCascade } = require('../../../db/helpers/delete-helper');
const db = require('../../../db/connection');
const { MODEL_ERRORS } = require('../../../config/constants');
const {
  createMockClient,
  mockSuccessfulTransaction,
  mockFailedTransaction,
  mockRecordNotFound,
} = require('../../mocks');

describe('db/helpers/delete-helper.js', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock client for each test
    mockClient = createMockClient();
    db.getClient = jest.fn().mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =============================================================================
  // BASIC FUNCTIONALITY
  // =============================================================================
  describe('Basic delete operations', () => {
    test('should successfully delete a record with audit cascade', async () => {
      const mockRecord = { id: 1, name: 'Test User', email: 'test@example.com' };

      mockSuccessfulTransaction(mockClient, {
        record: mockRecord,
        auditLogsDeleted: 3,
      });

      const result = await deleteWithAuditCascade({
        tableName: 'users',
        id: 1,
      });

      expect(result).toEqual(mockRecord);
      expect(mockClient).toHaveCommittedTransaction();
      expect(mockClient).toHaveReleasedConnection();
    });

    test('should throw error when record not found', async () => {
      mockRecordNotFound(mockClient);

      await expect(
        deleteWithAuditCascade({
          tableName: 'users',
          id: 999,
        }),
      ).rejects.toThrow(MODEL_ERRORS.USER.NOT_FOUND);

      expect(mockClient).toHaveRolledBackTransaction();
      expect(mockClient).toHaveReleasedConnection();
    });

    test('should handle zero audit logs to cascade', async () => {
      const mockRecord = { id: 1, name: 'Test Customer' };

      mockSuccessfulTransaction(mockClient, {
        record: mockRecord,
        auditLogsDeleted: 0,
      });

      const result = await deleteWithAuditCascade({
        tableName: 'customers',
        id: 1,
      });

      expect(result).toEqual(mockRecord);
      expect(mockClient).toHaveCommittedTransaction();
    });
  });

  // =============================================================================
  // TRANSACTION HANDLING
  // =============================================================================
  describe('Transaction rollback', () => {
    test('should rollback transaction on database error', async () => {
      mockFailedTransaction(mockClient, new Error('Database connection lost'), 'select');

      await expect(
        deleteWithAuditCascade({
          tableName: 'roles',
          id: 1,
        }),
      ).rejects.toThrow('Database connection lost');

      expect(mockClient).toHaveRolledBackTransaction();
      expect(mockClient).toHaveReleasedConnection();
    });

    test('should rollback transaction when beforeDelete hook throws', async () => {
      const mockRecord = { id: 1, name: 'Protected Role' };
      const beforeDeleteHook = jest.fn().mockRejectedValue(
        new Error('Cannot delete protected role'),
      );

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockRecord] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        deleteWithAuditCascade({
          tableName: 'roles',
          id: 1,
          beforeDelete: beforeDeleteHook,
        }),
      ).rejects.toThrow('Cannot delete protected role');

      expect(beforeDeleteHook).toHaveBeenCalled();
      expect(mockClient).toHaveRolledBackTransaction();
      expect(mockClient).toHaveReleasedConnection();
    });

    test('should rollback transaction when audit delete fails', async () => {
      mockFailedTransaction(mockClient, new Error('Audit delete constraint violation'), 'audit');

      await expect(
        deleteWithAuditCascade({
          tableName: 'users',
          id: 1,
        }),
      ).rejects.toThrow('Audit delete constraint violation');

      expect(mockClient).toHaveRolledBackTransaction();
      expect(mockClient).toHaveReleasedConnection();
    });
  });

  // =============================================================================
  // BEFORE DELETE HOOK
  // =============================================================================
  describe('beforeDelete hook', () => {
    test('should execute beforeDelete hook with full context', async () => {
      const mockRecord = { id: 1, name: 'Test User' };
      const mockOptions = { req: { dbUser: { id: 2 } }, force: false };
      const beforeDeleteHook = jest.fn().mockResolvedValue();

      mockSuccessfulTransaction(mockClient, {
        record: mockRecord,
        auditLogsDeleted: 1,
      });

      await deleteWithAuditCascade({
        tableName: 'users',
        id: 1,
        beforeDelete: beforeDeleteHook,
        options: mockOptions,
      });

      expect(beforeDeleteHook).toHaveBeenCalledWith(mockRecord, {
        client: mockClient,
        options: mockOptions,
        record: mockRecord,
        tableName: 'users',
        id: 1,
      });
      expect(mockClient).toHaveCommittedTransaction();
    });

    test('should allow beforeDelete hook to query database within transaction', async () => {
      const mockRecord = { id: 1, name: 'Admin Role' };
      const beforeDeleteHook = jest.fn(async (record, context) => {
        const result = await context.client.query(
          'SELECT COUNT(*) FROM users WHERE role_id = $1',
          [record.id],
        );
        if (parseInt(result.rows[0].count) > 0 && !context.options.force) {
          throw new Error(MODEL_ERRORS.ROLE.USERS_ASSIGNED(result.rows[0].count));
        }
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockRecord] }) // SELECT record
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // Hook: COUNT query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE audit
        .mockResolvedValueOnce({ rows: [mockRecord] }) // DELETE record
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await deleteWithAuditCascade({
        tableName: 'roles',
        id: 1,
        beforeDelete: beforeDeleteHook,
        options: { force: true },
      });

      expect(beforeDeleteHook).toHaveBeenCalled();
      expect(mockClient).toHaveCommittedTransaction();
    });

    test('should prevent self-deletion via beforeDelete hook', async () => {
      const mockRecord = { id: 5, email: 'admin@example.com' };
      const mockReq = { dbUser: { id: 5 } };
      const beforeDeleteHook = jest.fn((record, context) => {
        if (context.options.req?.dbUser?.id === record.id) {
          throw new Error('Cannot delete your own account');
        }
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockRecord] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        deleteWithAuditCascade({
          tableName: 'users',
          id: 5,
          beforeDelete: beforeDeleteHook,
          options: { req: mockReq },
        }),
      ).rejects.toThrow('Cannot delete your own account');

      expect(beforeDeleteHook).toHaveBeenCalled();
      expect(mockClient).toHaveRolledBackTransaction();
    });
  });

  // =============================================================================
  // AUDIT CASCADE BEHAVIOR
  // =============================================================================
  describe('Audit log cascade', () => {
    test('should cascade delete audit logs for the deleted resource', async () => {
      const mockRecord = { id: 42, name: 'Test Record' };

      mockSuccessfulTransaction(mockClient, {
        record: mockRecord,
        auditLogsDeleted: 7,
      });

      const result = await deleteWithAuditCascade({
        tableName: 'work_orders',
        id: 42,
      });

      expect(result).toEqual(mockRecord);
      expect(mockClient).toHaveCommittedTransaction();
    });
  });

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================
  describe('Error messages', () => {
    test('should use MODEL_ERRORS for known models', async () => {
      mockRecordNotFound(mockClient);

      await expect(
        deleteWithAuditCascade({ tableName: 'users', id: 1 }),
      ).rejects.toThrow(MODEL_ERRORS.USER.NOT_FOUND);
    });

    test('should use generic error for unknown table', async () => {
      mockRecordNotFound(mockClient);

      await expect(
        deleteWithAuditCascade({ tableName: 'unknown_table', id: 1 }),
      ).rejects.toThrow('unknown_table not found');
    });
  });

  // =============================================================================
  // RESOURCE CLEANUP
  // =============================================================================
  describe('Resource cleanup', () => {
    test('should release client when transaction succeeds', async () => {
      const mockRecord = { id: 1 };

      mockSuccessfulTransaction(mockClient, {
        record: mockRecord,
        auditLogsDeleted: 0,
      });

      await deleteWithAuditCascade({ tableName: 'users', id: 1 });

      expect(mockClient).toHaveReleasedConnection();
    });

    test('should release client when transaction fails', async () => {
      mockFailedTransaction(mockClient, new Error('DB error'), 'select');

      await expect(
        deleteWithAuditCascade({ tableName: 'users', id: 1 }),
      ).rejects.toThrow('DB error');

      expect(mockClient).toHaveReleasedConnection();
    });
  });
});
