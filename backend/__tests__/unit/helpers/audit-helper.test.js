/**
 * Unit Tests for db/helpers/audit-helper.js
 *
 * Tests the audit logging helper that bridges GenericEntityService with audit-service.
 *
 * Test Coverage:
 * - logEntityAudit: Core audit logging function
 * - buildAuditContext: Request context extraction
 * - getClientIp: IP extraction with proxy support
 * - getUserAgent: User agent extraction
 * - isAuditEnabled: Entity audit configuration check
 * - Constants re-exports
 */

jest.mock("../../../services/audit-service");
jest.mock("../../../config/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const {
  logEntityAudit,
  buildAuditContext,
  getClientIp,
  getUserAgent,
  isAuditEnabled,
  EntityToResourceType,
  EntityActionMap,
  AuditResults,
} = require("../../../db/helpers/audit-helper");
const auditService = require("../../../services/audit-service");
const { logger } = require("../../../config/logger");
const {
  AuditActions,
  ResourceTypes,
} = require("../../../services/audit-constants");

describe("db/helpers/audit-helper.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auditService.log.mockResolvedValue(undefined);
  });

  // ==========================================================================
  // logEntityAudit
  // ==========================================================================
  describe("logEntityAudit", () => {
    describe("successful logging", () => {
      test("should log create operation with correct constants", async () => {
        const result = { id: 123, email: "test@example.com" };
        const auditContext = {
          userId: 1,
          ipAddress: "127.0.0.1",
          userAgent: "Test Agent",
          newValues: { email: "test@example.com" },
        };

        await logEntityAudit("create", "customer", result, auditContext);

        expect(auditService.log).toHaveBeenCalledWith({
          userId: 1,
          action: AuditActions.CUSTOMER_CREATE,
          resourceType: ResourceTypes.CUSTOMER,
          resourceId: 123,
          oldValues: null,
          newValues: { email: "test@example.com" },
          ipAddress: "127.0.0.1",
          userAgent: "Test Agent",
          result: AuditResults.SUCCESS,
        });
      });

      test("should log update operation with old and new values", async () => {
        const result = { id: 456 };
        const auditContext = {
          userId: 2,
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          oldValues: { status: "active" },
          newValues: { status: "inactive" },
        };

        await logEntityAudit("update", "user", result, auditContext);

        expect(auditService.log).toHaveBeenCalledWith({
          userId: 2,
          action: AuditActions.USER_UPDATE,
          resourceType: ResourceTypes.USER,
          resourceId: 456,
          oldValues: { status: "active" },
          newValues: { status: "inactive" },
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          result: AuditResults.SUCCESS,
        });
      });

      test("should log delete operation with old values only", async () => {
        const result = { id: 789 };
        const auditContext = {
          userId: 3,
          oldValues: { name: "Deleted Role" },
        };

        await logEntityAudit("delete", "role", result, auditContext);

        expect(auditService.log).toHaveBeenCalledWith({
          userId: 3,
          action: AuditActions.ROLE_DELETE,
          resourceType: ResourceTypes.ROLE,
          resourceId: 789,
          oldValues: { name: "Deleted Role" },
          newValues: null,
          ipAddress: null,
          userAgent: null,
          result: AuditResults.SUCCESS,
        });
      });

      test("should handle null userId gracefully", async () => {
        const result = { id: 1 };
        const auditContext = {
          userId: null,
          ipAddress: "10.0.0.1",
        };

        await logEntityAudit("create", "technician", result, auditContext);

        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: null,
            action: AuditActions.TECHNICIAN_CREATE,
            resourceType: ResourceTypes.TECHNICIAN,
          }),
        );
      });

      test("should work with all 8 entities", async () => {
        const entities = [
          "user",
          "role",
          "customer",
          "technician",
          "work_order",
          "invoice",
          "contract",
          "inventory",
        ];

        for (const entity of entities) {
          jest.clearAllMocks();
          await logEntityAudit("create", entity, { id: 1 }, { userId: 1 });
          expect(auditService.log).toHaveBeenCalledTimes(1);
        }
      });
    });

    describe("validation and error handling", () => {
      test("should warn and skip for invalid operation", async () => {
        await logEntityAudit(
          "invalid_op",
          "customer",
          { id: 1 },
          { userId: 1 },
        );

        expect(logger.warn).toHaveBeenCalledWith("Invalid audit operation", {
          operation: "invalid_op",
          entityName: "customer",
        });
        expect(auditService.log).not.toHaveBeenCalled();
      });

      test("should warn and skip for null operation", async () => {
        await logEntityAudit(null, "customer", { id: 1 }, { userId: 1 });

        expect(logger.warn).toHaveBeenCalledWith(
          "Invalid audit operation",
          expect.any(Object),
        );
        expect(auditService.log).not.toHaveBeenCalled();
      });

      test("should warn and skip for invalid entity name", async () => {
        await logEntityAudit("create", "nonexistent", { id: 1 }, { userId: 1 });

        expect(logger.warn).toHaveBeenCalledWith(
          "Invalid entity name for audit",
          { operation: "create", entityName: "nonexistent" },
        );
        expect(auditService.log).not.toHaveBeenCalled();
      });

      test("should warn and skip if no audit context provided", async () => {
        await logEntityAudit("create", "customer", { id: 1 }, null);

        expect(logger.warn).toHaveBeenCalledWith("No audit context provided", {
          operation: "create",
          entityName: "customer",
        });
        expect(auditService.log).not.toHaveBeenCalled();
      });

      test("should warn and skip if audit context is undefined", async () => {
        await logEntityAudit("create", "customer", { id: 1 }, undefined);

        expect(logger.warn).toHaveBeenCalled();
        expect(auditService.log).not.toHaveBeenCalled();
      });

      test("should handle result without id gracefully", async () => {
        await logEntityAudit("create", "customer", {}, { userId: 1 });

        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceId: null,
          }),
        );
      });

      test("should handle null result gracefully", async () => {
        await logEntityAudit("create", "customer", null, { userId: 1 });

        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceId: null,
          }),
        );
      });
    });

    describe("non-blocking behavior", () => {
      test("should not throw when audit service fails", async () => {
        auditService.log.mockRejectedValue(
          new Error("Database connection failed"),
        );

        // Should not throw
        await expect(
          logEntityAudit("create", "customer", { id: 1 }, { userId: 1 }),
        ).resolves.toBeUndefined();

        expect(logger.error).toHaveBeenCalledWith(
          "Failed to write audit log",
          expect.objectContaining({
            error: "Database connection failed",
            operation: "create",
            entityName: "customer",
          }),
        );
      });

      test("should log error details when audit fails", async () => {
        auditService.log.mockRejectedValue(new Error("Timeout"));

        await logEntityAudit("update", "user", { id: 42 }, { userId: 1 });

        expect(logger.error).toHaveBeenCalledWith("Failed to write audit log", {
          error: "Timeout",
          operation: "update",
          entityName: "user",
          resourceId: 42,
        });
      });
    });
  });

  // ==========================================================================
  // buildAuditContext
  // ==========================================================================
  describe("buildAuditContext", () => {
    test("should extract all fields from request", () => {
      const mockReq = {
        user: { userId: 42 },
        ip: "10.0.0.1",
        headers: { "user-agent": "Test Browser" },
      };

      const context = buildAuditContext(mockReq, {
        oldValues: { name: "Old" },
        newValues: { name: "New" },
      });

      expect(context).toEqual({
        userId: 42,
        ipAddress: "10.0.0.1",
        userAgent: "Test Browser",
        oldValues: { name: "Old" },
        newValues: { name: "New" },
      });
    });

    test("should handle missing user gracefully", () => {
      const mockReq = {
        ip: "127.0.0.1",
        headers: {},
      };

      const context = buildAuditContext(mockReq);

      expect(context.userId).toBeNull();
    });

    test("should handle empty options", () => {
      const mockReq = {
        user: { userId: 1 },
        ip: "127.0.0.1",
        headers: { "user-agent": "Agent" },
      };

      const context = buildAuditContext(mockReq);

      expect(context.oldValues).toBeNull();
      expect(context.newValues).toBeNull();
    });
  });

  // ==========================================================================
  // getClientIp
  // ==========================================================================
  describe("getClientIp", () => {
    test("should return null for null request", () => {
      expect(getClientIp(null)).toBeNull();
    });

    test("should return null for undefined request", () => {
      expect(getClientIp(undefined)).toBeNull();
    });

    test("should extract IP from X-Forwarded-For header", () => {
      const req = {
        headers: {
          "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
        },
        ip: "10.0.0.1",
      };

      expect(getClientIp(req)).toBe("203.0.113.195");
    });

    test("should handle single IP in X-Forwarded-For", () => {
      const req = {
        headers: { "x-forwarded-for": "192.168.1.100" },
      };

      expect(getClientIp(req)).toBe("192.168.1.100");
    });

    test("should fall back to req.ip", () => {
      const req = {
        headers: {},
        ip: "172.16.0.1",
      };

      expect(getClientIp(req)).toBe("172.16.0.1");
    });

    test("should fall back to connection.remoteAddress", () => {
      const req = {
        headers: {},
        connection: { remoteAddress: "::1" },
      };

      expect(getClientIp(req)).toBe("::1");
    });

    test("should return null if no IP available", () => {
      const req = { headers: {} };

      expect(getClientIp(req)).toBeNull();
    });
  });

  // ==========================================================================
  // getUserAgent
  // ==========================================================================
  describe("getUserAgent", () => {
    test("should return null for null request", () => {
      expect(getUserAgent(null)).toBeNull();
    });

    test("should return null for undefined request", () => {
      expect(getUserAgent(undefined)).toBeNull();
    });

    test("should extract user-agent header", () => {
      const req = {
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0)" },
      };

      expect(getUserAgent(req)).toBe("Mozilla/5.0 (Windows NT 10.0)");
    });

    test("should return null if no user-agent header", () => {
      const req = { headers: {} };

      expect(getUserAgent(req)).toBeNull();
    });
  });

  // ==========================================================================
  // isAuditEnabled
  // ==========================================================================
  describe("isAuditEnabled", () => {
    test("should return true for valid entities by default", () => {
      expect(isAuditEnabled("user")).toBe(true);
      expect(isAuditEnabled("customer")).toBe(true);
      expect(isAuditEnabled("work_order")).toBe(true);
    });

    test("should return false for invalid entity name", () => {
      expect(isAuditEnabled("nonexistent")).toBe(false);
      expect(isAuditEnabled(null)).toBe(false);
      expect(isAuditEnabled(undefined)).toBe(false);
    });
  });

  // ==========================================================================
  // Constants re-exports
  // ==========================================================================
  describe("constants re-exports", () => {
    test("should re-export EntityToResourceType", () => {
      expect(EntityToResourceType).toBeDefined();
      expect(EntityToResourceType.customer).toBe(ResourceTypes.CUSTOMER);
      expect(EntityToResourceType.user).toBe(ResourceTypes.USER);
    });

    test("should re-export EntityActionMap", () => {
      expect(EntityActionMap).toBeDefined();
      expect(EntityActionMap.customer.create).toBe(
        AuditActions.CUSTOMER_CREATE,
      );
      expect(EntityActionMap.user.delete).toBe(AuditActions.USER_DELETE);
    });

    test("should re-export AuditResults", () => {
      expect(AuditResults).toBeDefined();
      expect(AuditResults.SUCCESS).toBe("success");
      expect(AuditResults.FAILURE).toBe("failure");
    });
  });
});
