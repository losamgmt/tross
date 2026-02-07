/**
 * Unit Tests for services/audit-service.js - V2.0 Convenience Methods
 *
 * Tests the contract v2.0 convenience methods for audit history queries.
 * In v2.0, audit data lives ONLY in audit_logs table (SRP compliance).
 * Follows AAA pattern and DRY principles.
 *
 * DESIGN DECISION: Deactivate/Reactivate are UPDATE operations.
 * getDeactivator() looks for UPDATE with new_values containing is_active: false.
 *
 * Test Coverage: getCreator, getLastEditor, getDeactivator, getHistory
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
      await expect(
        auditService.getLastEditor("work_orders", 1),
      ).rejects.toThrow("Query timeout");

      expect(logger.error).toHaveBeenCalledWith("Error getting last editor", {
        error: "Query timeout",
        resourceType: "work_orders",
        resourceId: 1,
      });
    });
  });

  // ============================================================================
  // getDeactivator()
  // Now looks for UPDATE actions with new_values containing is_active: false
  // ============================================================================
  describe("getDeactivator()", () => {
    test("should return deactivator info when resource was deactivated via UPDATE", async () => {
      // Arrange - UPDATE that set is_active to false, no subsequent reactivation
      const mockDeactivator = {
        user_id: 3,
        deactivated_at: "2025-01-20T10:00:00Z",
      };
      db.query
        .mockResolvedValueOnce({ rows: [mockDeactivator] }) // First query: find UPDATE with is_active: false
        .mockResolvedValueOnce({ rows: [] }); // Second query: no reactivation

      // Act
      const result = await auditService.getDeactivator("users", 42);

      // Assert
      expect(result).toEqual(mockDeactivator);
      expect(db.query).toHaveBeenCalledTimes(2);
      // First call should look for UPDATE with is_active: false
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("action LIKE '%UPDATE'"),
        expect.any(Array),
      );
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("is_active"),
        expect.any(Array),
      );
    });

    test("should return null when resource was reactivated after deactivation", async () => {
      // Arrange - UPDATE set is_active to false, then another UPDATE set it to true
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
      await expect(
        auditService.getDeactivator("technicians", 1),
      ).rejects.toThrow("Connection refused");

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
        { id: 3, action: "user_update", created_at: "2025-01-03" },
        { id: 2, action: "user_update", created_at: "2025-01-02" },
        { id: 1, action: "user_create", created_at: "2025-01-01" },
      ];
      db.query.mockResolvedValue({ rows: mockHistory });

      // Act
      const result = await auditService.getHistory("contracts", 100);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "WHERE resource_type = $1 AND resource_id = $2",
        ),
        ["contracts", 100, 50], // default limit is 50
      );
    });

    test("should respect custom limit", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      await auditService.getHistory("users", 5, 10);

      // Assert
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [
        "users",
        5,
        10,
      ]);
    });
  });
});
