/**
 * Unit Tests for services/audit-service.js - V2.0 Convenience Methods
 *
 * Tests the contract v2.0 convenience methods for deactivation/reactivation tracking.
 * These methods replace deprecated deactivated_by/deactivated_at fields on entities.
 * Follows AAA pattern and DRY principles.
 *
 * Test Coverage: logDeactivation, logReactivation, getCreator, getLastEditor, getDeactivator
 */

// Mock dependencies BEFORE requiring the module
jest.mock("../../../db/connection", () => ({
  query: jest.fn(),
}));

jest.mock("../../../config/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const db = require("../../../db/connection");
const { logger } = require("../../../config/logger");
const auditService = require("../../../services/audit-service");
const { ResourceTypes } = require("../../../services/audit-constants");

describe("services/audit-service.js - V2.0 Convenience Methods", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configure existing mocks
    logger.info.mockImplementation(() => {});
    logger.error.mockImplementation(() => {});

    // Configure db.query mock
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  // ============================================================================
  // logDeactivation()
  // ============================================================================
  describe("logDeactivation()", () => {
    test("should log deactivation with correct action and values", async () => {
      // Arrange
      const resourceType = "users";
      const resourceId = 123;
      const userId = 1;
      const ipAddress = "192.168.1.1";
      const userAgent = "Mozilla/5.0";

      // Act
      await auditService.logDeactivation(
        resourceType,
        resourceId,
        userId,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO audit_logs"),
        expect.arrayContaining([
          1, // userId
          "USERS_DEACTIVATE", // action (uppercased resourceType + _DEACTIVATE)
          "users", // resourceType
          123, // resourceId
          JSON.stringify({ is_active: true }), // oldValues
          JSON.stringify({ is_active: false }), // newValues
          "192.168.1.1", // ipAddress
          "Mozilla/5.0", // userAgent
        ]),
      );
    });

    test("should work without optional ipAddress and userAgent", async () => {
      // Act
      await auditService.logDeactivation("roles", 5, 1);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO audit_logs"),
        expect.arrayContaining([
          1, // userId
          "ROLES_DEACTIVATE",
          "roles",
          5,
        ]),
      );
    });

    test("should handle null userId gracefully", async () => {
      // Act
      await auditService.logDeactivation("customers", 10, null);

      // Assert
      expect(db.query).toHaveBeenCalled();
      const callArgs = db.query.mock.calls[0][1];
      expect(callArgs[0]).toBeNull(); // userId is null
    });
  });

  // ============================================================================
  // logReactivation()
  // ============================================================================
  describe("logReactivation()", () => {
    test("should log reactivation with correct action and values", async () => {
      // Arrange
      const resourceType = "technicians";
      const resourceId = 456;
      const userId = 2;
      const ipAddress = "10.0.0.1";
      const userAgent = "Chrome/120";

      // Act
      await auditService.logReactivation(
        resourceType,
        resourceId,
        userId,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO audit_logs"),
        expect.arrayContaining([
          2, // userId
          "TECHNICIANS_REACTIVATE", // action
          "technicians", // resourceType
          456, // resourceId
          JSON.stringify({ is_active: false }), // oldValues
          JSON.stringify({ is_active: true }), // newValues
          "10.0.0.1", // ipAddress
          "Chrome/120", // userAgent
        ]),
      );
    });

    test("should work without optional parameters", async () => {
      // Act
      await auditService.logReactivation("contracts", 99, 5);

      // Assert
      expect(db.query).toHaveBeenCalled();
      const callArgs = db.query.mock.calls[0][1];
      expect(callArgs[1]).toBe("CONTRACTS_REACTIVATE");
    });
  });

  // ============================================================================
  // getCreator()
  // ============================================================================
  describe("getCreator()", () => {
    test("should return creator info for a resource", async () => {
      // Arrange
      const mockCreator = { user_id: 1, created_at: "2025-01-01T00:00:00Z" };
      db.query.mockResolvedValue({ rows: [mockCreator] });

      // Act
      const result = await auditService.getCreator("users", 123);

      // Assert
      expect(result).toEqual(mockCreator);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE resource_type = $1"),
        ["users", 123],
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("action LIKE '%CREATE'"),
        expect.any(Array),
      );
    });

    test("should return null when no creator found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await auditService.getCreator("customers", 999);

      // Assert
      expect(result).toBeNull();
    });

    test("should handle database errors", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("DB connection lost"));

      // Act & Assert
      await expect(auditService.getCreator("roles", 1)).rejects.toThrow(
        "DB connection lost",
      );

      expect(logger.error).toHaveBeenCalledWith("Error getting creator", {
        error: "DB connection lost",
        resourceType: "roles",
        resourceId: 1,
      });
    });
  });

  // ============================================================================
  // getLastEditor()
  // ============================================================================
  describe("getLastEditor()", () => {
    test("should return last editor info for a resource", async () => {
      // Arrange
      const mockEditor = { user_id: 5, updated_at: "2025-01-15T12:30:00Z" };
      db.query.mockResolvedValue({ rows: [mockEditor] });

      // Act
      const result = await auditService.getLastEditor("contracts", 50);

      // Assert
      expect(result).toEqual(mockEditor);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("action LIKE '%UPDATE'"),
        expect.any(Array),
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY created_at DESC"),
        expect.any(Array),
      );
    });

    test("should return null when no editor found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await auditService.getLastEditor("invoices", 999);

      // Assert
      expect(result).toBeNull();
    });

    test("should handle database errors", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Query timeout"));

      // Act & Assert
      await expect(auditService.getLastEditor("work_orders", 1)).rejects.toThrow(
        "Query timeout",
      );

      expect(logger.error).toHaveBeenCalledWith("Error getting last editor", {
        error: "Query timeout",
        resourceType: "work_orders",
        resourceId: 1,
      });
    });
  });

  // ============================================================================
  // getDeactivator()
  // ============================================================================
  describe("getDeactivator()", () => {
    test("should return deactivator info when resource is currently inactive", async () => {
      // Arrange - deactivation found, no subsequent reactivation
      const mockDeactivator = {
        user_id: 3,
        deactivated_at: "2025-01-20T10:00:00Z",
      };
      db.query
        .mockResolvedValueOnce({ rows: [mockDeactivator] }) // First query: deactivation
        .mockResolvedValueOnce({ rows: [] }); // Second query: no reactivation

      // Act
      const result = await auditService.getDeactivator("users", 42);

      // Assert
      expect(result).toEqual(mockDeactivator);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    test("should return null when resource was reactivated after deactivation", async () => {
      // Arrange - deactivation found, but reactivation happened after
      const mockDeactivator = {
        user_id: 3,
        deactivated_at: "2025-01-20T10:00:00Z",
      };
      const mockReactivation = { created_at: "2025-01-21T10:00:00Z" };
      db.query
        .mockResolvedValueOnce({ rows: [mockDeactivator] }) // First query: deactivation
        .mockResolvedValueOnce({ rows: [mockReactivation] }); // Second query: reactivation found

      // Act
      const result = await auditService.getDeactivator("users", 42);

      // Assert
      expect(result).toBeNull();
    });

    test("should return null when no deactivation found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await auditService.getDeactivator("roles", 999);

      // Assert
      expect(result).toBeNull();
    });

    test("should handle database errors", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Connection refused"));

      // Act & Assert
      await expect(auditService.getDeactivator("technicians", 1)).rejects.toThrow(
        "Connection refused",
      );

      expect(logger.error).toHaveBeenCalledWith("Error getting deactivator", {
        error: "Connection refused",
        resourceType: "technicians",
        resourceId: 1,
      });
    });
  });

  // ============================================================================
  // getHistory() - delegates to getResourceAuditTrail
  // ============================================================================
  describe("getHistory()", () => {
    test("should return complete history for a resource", async () => {
      // Arrange
      const mockHistory = [
        { id: 3, action: "UPDATE", created_at: "2025-01-03" },
        { id: 2, action: "UPDATE", created_at: "2025-01-02" },
        { id: 1, action: "CREATE", created_at: "2025-01-01" },
      ];
      db.query.mockResolvedValue({ rows: mockHistory });

      // Act
      const result = await auditService.getHistory("contracts", 100);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE resource_type = $1 AND resource_id = $2"),
        ["contracts", 100, 50], // default limit is 50
      );
    });

    test("should respect custom limit", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      await auditService.getHistory("users", 5, 10);

      // Assert
      expect(db.query).toHaveBeenCalledWith(expect.any(String), ["users", 5, 10]);
    });
  });
});
