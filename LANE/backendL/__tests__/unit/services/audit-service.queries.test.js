/**
 * Unit Tests for services/audit-service.js - Query Operations
 *
 * Tests audit trail queries and specialized query methods.
 * Follows AAA pattern and DRY principles.
 *
 * Test Coverage: getUserAuditTrail, getSecurityEvents, getResourceAuditTrail, getFailedLoginAttempts
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
} = require("../../../services/audit-constants");

describe("services/audit-service.js - Query Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger methods
    logger.info.mockImplementation(() => {});
    logger.error.mockImplementation(() => {});

    // Mock db.query by default
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe("getUserAuditTrail()", () => {
    test("should return audit trail for specific user", async () => {
      // Arrange
      const mockLogs = [
        { id: 1, user_id: 1, action: "login", created_at: "2025-01-01" },
        { id: 2, user_id: 1, action: "logout", created_at: "2025-01-02" },
      ];
      db.query.mockResolvedValue({ rows: mockLogs });

      // Act
      const result = await auditService.getUserAuditTrail(1);

      // Assert
      expect(result).toEqual(mockLogs);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE user_id = $1"),
        [1, 100], // default limit
      );
    });

    test("should use custom limit when provided", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      await auditService.getUserAuditTrail(5, 50);

      // Assert
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [5, 50]);
    });

    test("should order results by created_at DESC", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      await auditService.getUserAuditTrail(1);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY created_at DESC"),
        expect.any(Array),
      );
    });
  });

  describe("getSecurityEvents()", () => {
    test("should return security events within time window", async () => {
      // Arrange
      const mockEvents = [
        { id: 1, action: AuditActions.LOGIN_FAILED, created_at: "2025-01-01" },
        {
          id: 2,
          action: AuditActions.UNAUTHORIZED_ACCESS,
          created_at: "2025-01-02",
        },
      ];
      db.query.mockResolvedValue({ rows: mockEvents });

      // Act
      const result = await auditService.getSecurityEvents();

      // Assert
      expect(result).toEqual(mockEvents);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("action IN ($1, $2)"),
        [AuditActions.LOGIN_FAILED, AuditActions.UNAUTHORIZED_ACCESS, 100],
      );
    });

    test("should use custom hours and limit when provided", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      await auditService.getSecurityEvents(48, 200);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '48 hours'"),
        [AuditActions.LOGIN_FAILED, AuditActions.UNAUTHORIZED_ACCESS, 200],
      );
    });

    test("should filter by LOGIN_FAILED and UNAUTHORIZED_ACCESS", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      await auditService.getSecurityEvents(24, 100);

      // Assert
      const callArgs = db.query.mock.calls[0][1];
      expect(callArgs[0]).toBe(AuditActions.LOGIN_FAILED);
      expect(callArgs[1]).toBe(AuditActions.UNAUTHORIZED_ACCESS);
    });

    test("should order results by created_at DESC", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      await auditService.getSecurityEvents();

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY created_at DESC"),
        expect.any(Array),
      );
    });
  });

  describe("getResourceAuditTrail()", () => {
    test("should return audit trail for specific resource", async () => {
      // Arrange
      const mockLogs = [
        { id: 1, resource_type: "user", resource_id: 5, action: "create" },
        { id: 2, resource_type: "user", resource_id: 5, action: "update" },
      ];
      db.query.mockResolvedValue({ rows: mockLogs });

      // Act
      const result = await auditService.getResourceAuditTrail(
        ResourceTypes.USER,
        5,
      );

      // Assert
      expect(result).toEqual(mockLogs);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "WHERE resource_type = $1 AND resource_id = $2",
        ),
        [ResourceTypes.USER, 5, 50], // default limit 50
      );
    });

    test("should use custom limit when provided", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      await auditService.getResourceAuditTrail(ResourceTypes.ROLE, 10, 25);

      // Assert
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [
        ResourceTypes.ROLE,
        10,
        25,
      ]);
    });
  });

  describe("getFailedLoginAttempts()", () => {
    test("should return count of failed login attempts", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [{ count: "5" }] });

      // Act
      const result = await auditService.getFailedLoginAttempts("192.168.1.1");

      // Assert
      expect(result).toBe(5);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("action = $1"),
        [AuditActions.LOGIN_FAILED, "192.168.1.1"],
      );
    });

    test("should use custom time window when provided", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [{ count: "3" }] });

      // Act
      await auditService.getFailedLoginAttempts("127.0.0.1", 30);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '30 minutes'"),
        [AuditActions.LOGIN_FAILED, "127.0.0.1"],
      );
    });

    test("should convert string count to integer", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [{ count: "10" }] });

      // Act
      const result = await auditService.getFailedLoginAttempts("10.0.0.1");

      // Assert
      expect(result).toBe(10);
      expect(typeof result).toBe("number");
    });
  });
});
