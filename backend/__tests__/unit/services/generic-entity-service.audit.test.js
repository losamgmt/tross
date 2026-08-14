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
jest.mock("../../../db/connection", () =>
  require("../../mocks").createDBMock(),
);
jest.mock("../../../config/logger", () => ({
  logger: require("../../mocks").createLoggerMock(),
}));

const mockLogEntityAuditIfEnabled = jest.fn();

jest.mock("../../../db/helpers/audit-helper", () => ({
  logEntityAuditIfEnabled: mockLogEntityAuditIfEnabled,
}));

// ============================================================================
// IMPORTS - After mocks
// ============================================================================
const GenericEntityService = require("../../../services/entity/generic-entity-service");
const db = require("../../../db/connection");

describe("GenericEntityService - Audit Logging", () => {
  // Mock client for transactions
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Transaction client mirrors the pool: txn-control statements auto-resolve,
    // and data queries delegate to db.query (which each test configures). Tests
    // that need a bespoke sequence (delete) still queue mockResolvedValueOnce,
    // which takes precedence over this default implementation.
    mockClient = {
      query: jest.fn((sql, params) => {
        const normalized =
          typeof sql === "string" ? sql.trim().toUpperCase() : "";
        if (/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)/.test(normalized)) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return db.query(sql, params);
      }),
      release: jest.fn(),
    };
    db.getClient.mockResolvedValue(mockClient);
  });

  // ==========================================================================
  // CREATE - Audit Logging
  // ==========================================================================

  describe("create - audit logging", () => {
    const mockCreatedRecord = {
      id: 1,
      first_name: "John",
      last_name: "Doe",
      email: "test@example.com",
      organization_name: "Test Co",
      is_active: true,
    };

    const mockAuditContext = {
      userId: 123,
      ipAddress: "192.168.1.1",
      userAgent: "Test-Agent/1.0",
    };

    beforeEach(() => {
      db.query.mockResolvedValue({
        rows: [mockCreatedRecord],
        rowCount: 1,
      });
    });

    test("should call logEntityAuditIfEnabled on create with auditContext", async () => {
      // Act
      await GenericEntityService.create(
        "customer",
        {
          first_name: "John",
          last_name: "Doe",
          email: "test@example.com",
          organization_name: "Test Co",
        },
        { auditContext: mockAuditContext },
      );

      // Assert
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledTimes(1);
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledWith(
        "create",
        "customer",
        expect.objectContaining({ id: 1 }),
        mockAuditContext,
        null,
        expect.anything(),
      );
    });

    test("delegates to logEntityAuditIfEnabled with the caller's (absent) context", async () => {
      // Act
      await GenericEntityService.create("customer", {
        first_name: "John",
        last_name: "Doe",
        email: "test@example.com",
        organization_name: "Test Co",
      });

      // Assert - the service always delegates; the helper owns the enabled/context guard
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledWith(
        "create",
        "customer",
        expect.objectContaining({ id: 1 }),
        undefined,
        null,
        expect.anything(),
      );
    });

    test("delegates to logEntityAuditIfEnabled with a null context (helper no-ops)", async () => {
      // Act
      await GenericEntityService.create(
        "customer",
        {
          first_name: "John",
          last_name: "Doe",
          email: "test@example.com",
          organization_name: "Test Co",
        },
        { auditContext: null },
      );

      // Assert - the service forwards the caller's (null) context; the helper no-ops
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledWith(
        "create",
        "customer",
        expect.objectContaining({ id: 1 }),
        null,
        null,
        expect.anything(),
      );
    });

    test("should return result even without auditContext", async () => {
      // Act
      const result = await GenericEntityService.create("customer", {
        first_name: "John",
        last_name: "Doe",
        email: "test@example.com",
        organization_name: "Test Co",
      });

      // Assert
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });
  });

  // ==========================================================================
  // UPDATE - Audit Logging
  // ==========================================================================

  describe("update - audit logging", () => {
    const mockOldRecord = {
      id: 1,
      first_name: "John",
      last_name: "Doe",
      email: "old@example.com",
      organization_name: "Old Co",
      phone: "555-1234",
      is_active: true,
    };

    const mockUpdatedRecord = {
      id: 1,
      first_name: "John",
      last_name: "Doe",
      email: "old@example.com",
      organization_name: "Old Co",
      phone: "555-9999",
      is_active: true,
    };

    const mockAuditContext = {
      userId: 123,
      ipAddress: "192.168.1.1",
      userAgent: "Test-Agent/1.0",
    };

    test("should call logEntityAuditIfEnabled with old and new values", async () => {
      // Arrange - first query fetches old values, second updates, third re-fetches with JOINs
      db.query
        .mockResolvedValueOnce({ rows: [mockOldRecord], rowCount: 1 }) // findById for old values
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // actual update (returns id)
        .mockResolvedValueOnce({ rows: [mockUpdatedRecord], rowCount: 1 }); // re-fetch via findByField

      // Act
      await GenericEntityService.update(
        "customer",
        1,
        { phone: "555-9999" },
        { auditContext: mockAuditContext },
      );

      // Assert
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledTimes(1);
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledWith(
        "update",
        "customer",
        expect.objectContaining({ id: 1, phone: "555-9999" }),
        mockAuditContext,
        expect.objectContaining({ id: 1, phone: "555-1234" }), // old values
        expect.anything(), // Unit-of-Work client
      );
    });

    test("delegates to logEntityAuditIfEnabled even without auditContext", async () => {
      // Arrange - oldRecord fetch + update + re-fetch
      db.query
        .mockResolvedValueOnce({ rows: [mockOldRecord], rowCount: 1 }) // oldRecord findById
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rows: [mockUpdatedRecord], rowCount: 1 }); // re-fetch

      // Act
      await GenericEntityService.update("customer", 1, { phone: "555-9999" });

      // Assert - the service delegates; the helper owns the enabled/context guard
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledWith(
        "update",
        "customer",
        expect.objectContaining({ id: 1 }),
        undefined,
        expect.objectContaining({ id: 1 }),
        expect.anything(), // Unit-of-Work client
      );
    });

    test("should fetch old values for hooks even without auditContext", async () => {
      // Arrange - findById for hooks + update + re-fetch
      db.query
        .mockResolvedValueOnce({ rows: [mockOldRecord], rowCount: 1 }) // findById for hooks
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rows: [mockUpdatedRecord], rowCount: 1 }); // re-fetch

      // Act
      await GenericEntityService.update("customer", 1, { phone: "555-9999" });

      // Assert - 3 queries: findById for hooks + update + re-fetch
      // (old values now fetched for hook evaluation even without auditContext)
      expect(db.query).toHaveBeenCalledTimes(3);
    });

    test("should return null for non-existent entity (no audit)", async () => {
      // Arrange - findById for old values, update returns nothing (no re-fetch)
      db.query
        .mockResolvedValueOnce({ rows: [mockOldRecord], rowCount: 1 }) // findById for old values
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no rows updated (id not found)

      // Act
      const result = await GenericEntityService.update(
        "customer",
        999,
        { phone: "555-9999" },
        { auditContext: mockAuditContext },
      );

      // Assert
      expect(result).toBeNull();
      expect(mockLogEntityAuditIfEnabled).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // DELETE - Audit Logging
  // ==========================================================================

  describe("delete - audit logging", () => {
    const mockDeletedRecord = {
      id: 1,
      email: "test@example.com",
      company_name: "Test Co",
      is_active: true,
    };

    const mockAuditContext = {
      userId: 123,
      ipAddress: "192.168.1.1",
      userAgent: "Test-Agent/1.0",
    };

    test("should call logEntityAuditIfEnabled with old values on delete", async () => {
      // Arrange - transaction queries: BEGIN, SELECT, CASCADE, DELETE, COMMIT
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDeletedRecord], rowCount: 1 }) // SELECT (exists)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CASCADE DELETE
        .mockResolvedValueOnce({ rows: [mockDeletedRecord], rowCount: 1 }) // DELETE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      // Act
      await GenericEntityService.delete("customer", 1, {
        auditContext: mockAuditContext,
      });

      // Assert
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledTimes(1);
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledWith(
        "delete",
        "customer",
        expect.objectContaining({ id: 1 }),
        mockAuditContext,
        expect.objectContaining({ id: 1 }), // old values
      );
    });

    test("delegates to logEntityAuditIfEnabled even without auditContext", async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDeletedRecord], rowCount: 1 }) // SELECT
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CASCADE DELETE
        .mockResolvedValueOnce({ rows: [mockDeletedRecord], rowCount: 1 }) // DELETE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      // Act
      await GenericEntityService.delete("customer", 1);

      // Assert - the service delegates; the helper owns the enabled/context guard
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledWith(
        "delete",
        "customer",
        expect.objectContaining({ id: 1 }),
        undefined,
        expect.objectContaining({ id: 1 }),
      );
    });

    test("should return null for non-existent entity (no audit)", async () => {
      // Arrange - entity not found
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT (not found)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

      // Act
      const result = await GenericEntityService.delete("customer", 999, {
        auditContext: mockAuditContext,
      });

      // Assert
      expect(result).toBeNull();
      expect(mockLogEntityAuditIfEnabled).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("edge cases", () => {
    test("should handle auditContext with partial fields", async () => {
      // Arrange
      const partialContext = { userId: 123 }; // no ipAddress or userAgent
      db.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            first_name: "John",
            last_name: "Doe",
            email: "test@example.com",
            organization_name: "Test Co",
          },
        ],
        rowCount: 1,
      });

      // Act
      await GenericEntityService.create(
        "customer",
        {
          first_name: "John",
          last_name: "Doe",
          email: "test@example.com",
          organization_name: "Test Co",
        },
        { auditContext: partialContext },
      );

      // Assert
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalledWith(
        "create",
        "customer",
        expect.any(Object),
        partialContext,
        null,
        expect.anything(),
      );
    });

    test("should handle options with other fields alongside auditContext", async () => {
      // Arrange
      db.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            first_name: "John",
            last_name: "Doe",
            email: "test@example.com",
            organization_name: "Test Co",
          },
        ],
        rowCount: 1,
      });

      // Act
      await GenericEntityService.create(
        "customer",
        {
          first_name: "John",
          last_name: "Doe",
          email: "test@example.com",
          organization_name: "Test Co",
        },
        {
          auditContext: { userId: 123 },
          someOtherOption: "value", // should be ignored
        },
      );

      // Assert
      expect(mockLogEntityAuditIfEnabled).toHaveBeenCalled();
    });
  });
});
