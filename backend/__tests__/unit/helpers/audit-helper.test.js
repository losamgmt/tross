/**
 * Unit Tests for db/helpers/audit-helper.js
 *
 * Tests the audit logging helper that bridges GenericEntityService with audit-service.
 *
 * Test Coverage:
 * - logEntityAudit: Core audit logging function
 * - logEntityAuditIfEnabled: Guarded audit logging (context + enabled)
 * - isAuditEnabled: Entity audit configuration check
 * - Constants re-exports
 */

jest.mock("../../../services/audit/audit-service");
jest.mock("../../../config/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const {
  logEntityAudit,
  logEntityAuditIfEnabled,
  isAuditEnabled,
  EntityToResourceType,
  EntityActionMap,
  AuditResults,
} = require("../../../db/helpers/audit-helper");
const auditService = require("../../../services/audit/audit-service");
const { logger } = require("../../../config/logger");
const {
  AuditActions,
  ResourceTypes,
} = require("../../../services/audit/constants");

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
  // logEntityAuditIfEnabled
  // ==========================================================================
  describe("logEntityAuditIfEnabled", () => {
    const result = { id: 7, email: "a@b.com" };
    const auditContext = { userId: 1, newValues: { email: "a@b.com" } };

    test("delegates to logEntityAudit when context present and entity enabled", async () => {
      await logEntityAuditIfEnabled("create", "customer", result, auditContext);

      expect(auditService.log).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditActions.CUSTOMER_CREATE,
          resourceType: ResourceTypes.CUSTOMER,
          resourceId: 7,
        }),
      );
    });

    test("passes oldValues through for updates", async () => {
      const oldValues = { email: "old@b.com" };

      await logEntityAuditIfEnabled(
        "update",
        "user",
        { id: 42, email: "new@b.com" },
        { userId: 1, newValues: { email: "new@b.com" } },
        oldValues,
      );

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ oldValues }),
      );
    });

    test("is a no-op when auditContext is falsy", async () => {
      await logEntityAuditIfEnabled("create", "customer", result, null);

      expect(auditService.log).not.toHaveBeenCalled();
    });

    test("is a no-op when auditing is disabled for the entity", async () => {
      await logEntityAuditIfEnabled(
        "create",
        "nonexistent",
        result,
        auditContext,
      );

      expect(auditService.log).not.toHaveBeenCalled();
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
