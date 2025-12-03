/**
 * Unit Tests for services/audit-service.js - Core Operations
 *
 * Tests core audit logging functionality with mocked database.
 * Follows AAA pattern and DRY principles.
 *
 * Test Coverage: log() method and basic operations
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

describe("services/audit-service.js - Core Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configure existing mocks (don't reassign!)
    logger.info.mockImplementation(() => {});
    logger.error.mockImplementation(() => {});
    
    // Configure db.query mock (already exists from jest.mock above)
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe("log()", () => {
    test("should log audit entry with all fields", async () => {
      // Arrange
      const auditData = {
        userId: 1,
        action: AuditActions.USER_CREATE,
        resourceType: ResourceTypes.USER,
        resourceId: 2,
        oldValues: { name: "Old" },
        newValues: { name: "New" },
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        result: AuditResults.SUCCESS,
        errorMessage: null,
      };

      // Act
      await auditService.log(auditData);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO audit_logs"),
        [
          1,
          AuditActions.USER_CREATE,
          ResourceTypes.USER,
          2,
          JSON.stringify({ name: "Old" }),
          JSON.stringify({ name: "New" }),
          "127.0.0.1",
          "Mozilla/5.0",
          AuditResults.SUCCESS,
          null,
        ],
      );

      expect(logger.info).toHaveBeenCalledWith("Audit event", {
        userId: 1,
        action: AuditActions.USER_CREATE,
        resourceType: ResourceTypes.USER,
        resourceId: 2,
        result: AuditResults.SUCCESS,
        ipAddress: "127.0.0.1",
      });
    });

    test("should use default values for optional fields", async () => {
      // Arrange - minimal required fields
      const auditData = {
        action: AuditActions.LOGIN,
        resourceType: ResourceTypes.AUTH,
      };

      // Act
      await auditService.log(auditData);

      // Assert
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [
        null, // userId default
        AuditActions.LOGIN,
        ResourceTypes.AUTH,
        null, // resourceId default
        null, // oldValues default
        null, // newValues default
        null, // ipAddress default
        null, // userAgent default
        AuditResults.SUCCESS, // result default
        null, // errorMessage default
      ]);
    });

    test("should stringify oldValues and newValues objects", async () => {
      // Arrange
      const complexValues = {
        nested: { data: "value" },
        array: [1, 2, 3],
      };

      // Act
      await auditService.log({
        action: AuditActions.USER_UPDATE,
        resourceType: ResourceTypes.USER,
        oldValues: complexValues,
        newValues: { updated: true },
      });

      // Assert
      const callArgs = db.query.mock.calls[0][1];
      expect(callArgs[4]).toBe(JSON.stringify(complexValues));
      expect(callArgs[5]).toBe(JSON.stringify({ updated: true }));
    });

    test("should handle null values for oldValues and newValues", async () => {
      // Arrange
      const auditData = {
        action: AuditActions.LOGIN,
        resourceType: ResourceTypes.AUTH,
        oldValues: null,
        newValues: null,
      };

      // Act
      await auditService.log(auditData);

      // Assert
      const callArgs = db.query.mock.calls[0][1];
      expect(callArgs[4]).toBeNull();
      expect(callArgs[5]).toBeNull();
    });

    test("should log failed actions with error details", async () => {
      // Arrange
      const auditData = {
        userId: 1,
        action: AuditActions.LOGIN_FAILED,
        resourceType: ResourceTypes.AUTH,
        result: AuditResults.FAILURE,
        errorMessage: "Invalid password",
        ipAddress: "192.168.1.1",
      };

      // Act
      await auditService.log(auditData);

      // Assert
      const callArgs = db.query.mock.calls[0][1];
      expect(callArgs[8]).toBe(AuditResults.FAILURE);
      expect(callArgs[9]).toBe("Invalid password");
    });

    test("should handle undefined values correctly", async () => {
      // Arrange - explicitly pass undefined
      const auditData = {
        action: AuditActions.LOGOUT,
        resourceType: ResourceTypes.AUTH,
        userId: undefined,
        resourceId: undefined,
      };

      // Act
      await auditService.log(auditData);

      // Assert - undefined should become null (default values)
      const callArgs = db.query.mock.calls[0][1];
      expect(callArgs[0]).toBeNull(); // userId
      expect(callArgs[3]).toBeNull(); // resourceId
    });
  });

  describe("cleanupOldLogs()", () => {
    test("should delete logs older than specified days", async () => {
      // Arrange
      db.query.mockResolvedValue({ rowCount: 150 });

      // Act
      const result = await auditService.cleanupOldLogs(365);

      // Assert
      expect(result).toBe(150);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '365 days'"),
      );
    });

    test("should use default retention of 365 days", async () => {
      // Arrange
      db.query.mockResolvedValue({ rowCount: 50 });

      // Act
      await auditService.cleanupOldLogs();

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '365 days'"),
      );
    });

    test("should log info when logs are deleted", async () => {
      // Arrange
      db.query.mockResolvedValue({ rowCount: 100 });

      // Act
      await auditService.cleanupOldLogs(180);

      // Assert
      expect(logger.info).toHaveBeenCalledWith("Old audit logs cleaned up", {
        count: 100,
        daysToKeep: 180,
      });
    });

    test("should not log when no logs deleted", async () => {
      // Arrange
      db.query.mockResolvedValue({ rowCount: 0 });

      // Act
      await auditService.cleanupOldLogs(90);

      // Assert
      expect(logger.info).not.toHaveBeenCalled();
    });

    test("should return 0 when no logs found to delete", async () => {
      // Arrange
      db.query.mockResolvedValue({ rowCount: 0 });

      // Act
      const result = await auditService.cleanupOldLogs(30);

      // Assert
      expect(result).toBe(0);
    });
  });
});
