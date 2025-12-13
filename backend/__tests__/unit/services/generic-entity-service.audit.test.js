/**
 * Generic Entity Service - Audit Logging Integration Tests
 *
 * Tests that GenericEntityService correctly integrates with audit-helper
 * for create, update, and delete operations.
 *
 * MOCKING STRATEGY:
 * - db/connection: createDBMock() from __tests__/mocks
 * - config/logger: createLoggerMock() from __tests__/mocks
 * - db/helpers/audit-helper: Mocked to verify calls
 */

// ============================================================================
// MOCKS - Must be set up before imports
// ============================================================================
jest.mock('../../../db/connection', () => require('../../mocks').createDBMock());
jest.mock('../../../config/logger', () => ({
  logger: require('../../mocks').createLoggerMock(),
}));

const mockLogEntityAudit = jest.fn();
const mockIsAuditEnabled = jest.fn();

jest.mock('../../../db/helpers/audit-helper', () => ({
  logEntityAudit: mockLogEntityAudit,
  isAuditEnabled: mockIsAuditEnabled,
}));

// ============================================================================
// IMPORTS - After mocks
// ============================================================================
const GenericEntityService = require('../../../services/generic-entity-service');
const db = require('../../../db/connection');

describe('GenericEntityService - Audit Logging', () => {
  // Mock client for transactions
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default: audit is enabled for all entities
    mockIsAuditEnabled.mockReturnValue(true);

    // Set up mock client for delete operations
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.getClient.mockResolvedValue(mockClient);
  });

  // ==========================================================================
  // CREATE - Audit Logging
  // ==========================================================================

  describe('create - audit logging', () => {
    const mockCreatedRecord = {
      id: 1,
      email: 'test@example.com',
      company_name: 'Test Co',
      is_active: true,
    };

    const mockAuditContext = {
      userId: 123,
      ipAddress: '192.168.1.1',
      userAgent: 'Test-Agent/1.0',
    };

    beforeEach(() => {
      db.query.mockResolvedValue({
        rows: [mockCreatedRecord],
        rowCount: 1,
      });
    });

    test('should call logEntityAudit on create with auditContext', async () => {
      // Act
      await GenericEntityService.create(
        'customer',
        { email: 'test@example.com', company_name: 'Test Co' },
        { auditContext: mockAuditContext },
      );

      // Assert
      expect(mockLogEntityAudit).toHaveBeenCalledTimes(1);
      expect(mockLogEntityAudit).toHaveBeenCalledWith(
        'create',
        'customer',
        expect.objectContaining({ id: 1 }),
        mockAuditContext,
      );
    });

    test('should NOT call logEntityAudit without auditContext', async () => {
      // Act
      await GenericEntityService.create('customer', {
        email: 'test@example.com',
        company_name: 'Test Co',
      });

      // Assert
      expect(mockLogEntityAudit).not.toHaveBeenCalled();
    });

    test('should NOT call logEntityAudit with empty auditContext', async () => {
      // Act
      await GenericEntityService.create(
        'customer',
        { email: 'test@example.com', company_name: 'Test Co' },
        { auditContext: null },
      );

      // Assert
      expect(mockLogEntityAudit).not.toHaveBeenCalled();
    });

    test('should NOT call logEntityAudit if audit disabled for entity', async () => {
      // Arrange
      mockIsAuditEnabled.mockReturnValue(false);

      // Act
      await GenericEntityService.create(
        'customer',
        { email: 'test@example.com', company_name: 'Test Co' },
        { auditContext: mockAuditContext },
      );

      // Assert
      expect(mockLogEntityAudit).not.toHaveBeenCalled();
    });

    test('should return result even without auditContext', async () => {
      // Act
      const result = await GenericEntityService.create('customer', {
        email: 'test@example.com',
        company_name: 'Test Co',
      });

      // Assert
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });
  });

  // ==========================================================================
  // UPDATE - Audit Logging
  // ==========================================================================

  describe('update - audit logging', () => {
    const mockOldRecord = {
      id: 1,
      email: 'old@example.com',
      company_name: 'Old Co',
      is_active: true,
    };

    const mockUpdatedRecord = {
      id: 1,
      email: 'old@example.com',
      company_name: 'New Co',
      is_active: true,
    };

    const mockAuditContext = {
      userId: 123,
      ipAddress: '192.168.1.1',
      userAgent: 'Test-Agent/1.0',
    };

    test('should call logEntityAudit with old and new values', async () => {
      // Arrange - first query fetches old values, second updates, third re-fetches with JOINs
      db.query
        .mockResolvedValueOnce({ rows: [mockOldRecord], rowCount: 1 }) // findById for old values
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // actual update (returns id)
        .mockResolvedValueOnce({ rows: [mockUpdatedRecord], rowCount: 1 }); // re-fetch via findByField

      // Act
      await GenericEntityService.update(
        'customer',
        1,
        { company_name: 'New Co' },
        { auditContext: mockAuditContext },
      );

      // Assert
      expect(mockLogEntityAudit).toHaveBeenCalledTimes(1);
      expect(mockLogEntityAudit).toHaveBeenCalledWith(
        'update',
        'customer',
        expect.objectContaining({ id: 1, company_name: 'New Co' }),
        mockAuditContext,
        expect.objectContaining({ id: 1, company_name: 'Old Co' }), // old values
      );
    });

    test('should NOT call logEntityAudit without auditContext', async () => {
      // Arrange - update + re-fetch
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rows: [mockUpdatedRecord], rowCount: 1 }); // re-fetch

      // Act
      await GenericEntityService.update('customer', 1, { company_name: 'New Co' });

      // Assert
      expect(mockLogEntityAudit).not.toHaveBeenCalled();
    });

    test('should NOT fetch old values without auditContext', async () => {
      // Arrange - update + re-fetch
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rows: [mockUpdatedRecord], rowCount: 1 }); // re-fetch

      // Act
      await GenericEntityService.update('customer', 1, { company_name: 'New Co' });

      // Assert - 2 queries: update + re-fetch (no findById for old values)
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    test('should return null for non-existent entity (no audit)', async () => {
      // Arrange - findById for old values, update returns nothing (no re-fetch)
      db.query
        .mockResolvedValueOnce({ rows: [mockOldRecord], rowCount: 1 }) // findById for old values
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no rows updated (id not found)

      // Act
      const result = await GenericEntityService.update(
        'customer',
        999,
        { company_name: 'New Co' },
        { auditContext: mockAuditContext },
      );

      // Assert
      expect(result).toBeNull();
      expect(mockLogEntityAudit).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // DELETE - Audit Logging
  // ==========================================================================

  describe('delete - audit logging', () => {
    const mockDeletedRecord = {
      id: 1,
      email: 'test@example.com',
      company_name: 'Test Co',
      is_active: true,
    };

    const mockAuditContext = {
      userId: 123,
      ipAddress: '192.168.1.1',
      userAgent: 'Test-Agent/1.0',
    };

    test('should call logEntityAudit with old values on delete', async () => {
      // Arrange - transaction queries: BEGIN, SELECT, CASCADE, DELETE, COMMIT
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDeletedRecord], rowCount: 1 }) // SELECT (exists)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CASCADE DELETE
        .mockResolvedValueOnce({ rows: [mockDeletedRecord], rowCount: 1 }) // DELETE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      // Act
      await GenericEntityService.delete('customer', 1, {
        auditContext: mockAuditContext,
      });

      // Assert
      expect(mockLogEntityAudit).toHaveBeenCalledTimes(1);
      expect(mockLogEntityAudit).toHaveBeenCalledWith(
        'delete',
        'customer',
        expect.objectContaining({ id: 1 }),
        mockAuditContext,
        expect.objectContaining({ id: 1 }), // old values
      );
    });

    test('should NOT call logEntityAudit without auditContext', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDeletedRecord], rowCount: 1 }) // SELECT
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CASCADE DELETE
        .mockResolvedValueOnce({ rows: [mockDeletedRecord], rowCount: 1 }) // DELETE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      // Act
      await GenericEntityService.delete('customer', 1);

      // Assert
      expect(mockLogEntityAudit).not.toHaveBeenCalled();
    });

    test('should return null for non-existent entity (no audit)', async () => {
      // Arrange - entity not found
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT (not found)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

      // Act
      const result = await GenericEntityService.delete('customer', 999, {
        auditContext: mockAuditContext,
      });

      // Assert
      expect(result).toBeNull();
      expect(mockLogEntityAudit).not.toHaveBeenCalled();
    });

    test('should NOT call logEntityAudit if audit disabled for entity', async () => {
      // Arrange
      mockIsAuditEnabled.mockReturnValue(false);
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDeletedRecord], rowCount: 1 }) // SELECT
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CASCADE DELETE
        .mockResolvedValueOnce({ rows: [mockDeletedRecord], rowCount: 1 }) // DELETE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      // Act
      await GenericEntityService.delete('customer', 1, {
        auditContext: mockAuditContext,
      });

      // Assert
      expect(mockLogEntityAudit).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('edge cases', () => {
    test('should handle auditContext with partial fields', async () => {
      // Arrange
      const partialContext = { userId: 123 }; // no ipAddress or userAgent
      db.query.mockResolvedValue({
        rows: [{ id: 1, email: 'test@example.com', company_name: 'Test Co' }],
        rowCount: 1,
      });

      // Act
      await GenericEntityService.create(
        'customer',
        { email: 'test@example.com', company_name: 'Test Co' },
        { auditContext: partialContext },
      );

      // Assert
      expect(mockLogEntityAudit).toHaveBeenCalledWith(
        'create',
        'customer',
        expect.any(Object),
        partialContext,
      );
    });

    test('should handle options with other fields alongside auditContext', async () => {
      // Arrange
      db.query.mockResolvedValue({
        rows: [{ id: 1, email: 'test@example.com', company_name: 'Test Co' }],
        rowCount: 1,
      });

      // Act
      await GenericEntityService.create(
        'customer',
        { email: 'test@example.com', company_name: 'Test Co' },
        {
          auditContext: { userId: 123 },
          someOtherOption: 'value', // should be ignored
        },
      );

      // Assert
      expect(mockLogEntityAudit).toHaveBeenCalled();
    });
  });
});
