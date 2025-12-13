/**
 * Unit Tests for services/audit-service.js - Validation & Error Handling
 *
 * Tests error scenarios and validation logic for audit service.
 * Follows AAA pattern and DRY principles.
 *
 * Test Coverage: Error handling, edge cases
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
const {
  AuditActions,
  ResourceTypes,
  AuditResults,
} = require("../../../services/audit-constants");

describe("services/audit-service.js - Validation & Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger methods
    logger.info.mockImplementation(() => {});
    logger.error.mockImplementation(() => {});

    // Mock db.query by default
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe("log() - Error Handling", () => {
    test("should handle database errors gracefully without throwing", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Database connection failed"));

      // Act & Assert - should not throw
      await expect(
        auditService.log({
          action: AuditActions.LOGIN,
          resourceType: ResourceTypes.AUTH,
          userId: 1,
        }),
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        "Error writing audit log",
        expect.objectContaining({
          error: "Database connection failed",
          action: AuditActions.LOGIN,
          userId: 1,
        }),
      );
    });
  });

  describe("getUserAuditTrail() - Error Handling", () => {
    test("should handle database errors", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Connection timeout"));

      // Act & Assert
      await expect(auditService.getUserAuditTrail(1)).rejects.toThrow(
        "Connection timeout",
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching user audit trail",
        { error: "Connection timeout", userId: 1 },
      );
    });

    test("should return empty array when no logs found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await auditService.getUserAuditTrail(999);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getSecurityEvents() - Error Handling", () => {
    test("should handle database errors", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Query failed"));

      // Act & Assert
      await expect(auditService.getSecurityEvents()).rejects.toThrow(
        "Query failed",
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching security events",
        { error: "Query failed" },
      );
    });
  });

  describe("getResourceAuditTrail() - Error Handling", () => {
    test("should handle database errors", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(
        auditService.getResourceAuditTrail(ResourceTypes.USER, 1),
      ).rejects.toThrow("Database error");

      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching resource audit trail",
        {
          error: "Database error",
          resourceType: ResourceTypes.USER,
          resourceId: 1,
        },
      );
    });

    test("should return empty array when no logs found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await auditService.getResourceAuditTrail(
        ResourceTypes.ROLE,
        999,
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getFailedLoginAttempts() - Error Handling", () => {
    test("should return 0 on database error (fail open)", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Database unavailable"));

      // Act
      const result = await auditService.getFailedLoginAttempts("1.1.1.1");

      // Assert
      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        "Error checking failed login attempts",
        {
          error: "Database unavailable",
          ipAddress: "1.1.1.1",
        },
      );
    });

    test("should return 0 when no attempts found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [{ count: "0" }] });

      // Act
      const result = await auditService.getFailedLoginAttempts("8.8.8.8");

      // Assert
      expect(result).toBe(0);
    });
  });

  describe("cleanupOldLogs() - Error Handling", () => {
    test("should handle database errors", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("DELETE failed"));

      // Act & Assert
      await expect(auditService.cleanupOldLogs(90)).rejects.toThrow(
        "DELETE failed",
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Error cleaning up audit logs",
        { error: "DELETE failed" },
      );
    });
  });
});
