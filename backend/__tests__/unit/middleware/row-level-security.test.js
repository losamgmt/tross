/**
 * Unit Tests: Row-Level Security Middleware
 *
 * Tests the enforceRLS middleware in isolation.
 * ADR-011: Rule-based RLS using declarative grant rules.
 *
 * UNIFIED DATA FLOW:
 * - enforceRLS reads resource from req.entityMetadata.rlsResource
 * - Entity metadata is attached by extractEntity or attachEntity middleware
 * - RLS context is built with role, userId, operation, and dynamic profile IDs
 */

const {
  enforceRLS,
  validateRLSApplied,
  extractProfileIds,
  getOperationFromMethod,
} = require("../../../middleware/row-level-security");
const { HTTP_STATUS } = require("../../../config/constants");

// Mock dependencies
jest.mock("../../../config/logger", () => ({
  logSecurityEvent: jest.fn(),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock("../../../utils/request-helpers", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
  getUserAgent: jest.fn(() => "test-agent"),
}));

describe("Row-Level Security Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      dbUser: { role: "customer", id: 1, customer_profile_id: 100 },
      url: "/api/customers",
      method: "GET",
      // Unified data flow: entityMetadata is set by extractEntity/attachEntity
      entityMetadata: { rlsResource: "customers" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("enforceRLS (ADR-011 context format)", () => {
    test("should attach RLS context with role and profile IDs", () => {
      enforceRLS(req, res, next);

      expect(req.rlsContext).toMatchObject({
        role: "customer",
        userId: 1,
        operation: "read",
        resource: "customers",
        customer_profile_id: 100,
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should extract operation from HTTP method", () => {
      req.method = "POST";

      enforceRLS(req, res, next);

      expect(req.rlsContext.operation).toBe("create");
      expect(next).toHaveBeenCalled();
    });

    test("should map PUT/PATCH to update operation", () => {
      req.method = "PUT";
      enforceRLS(req, res, next);
      expect(req.rlsContext.operation).toBe("update");

      jest.clearAllMocks();
      req.method = "PATCH";
      enforceRLS(req, res, next);
      expect(req.rlsContext.operation).toBe("update");
    });

    test("should map DELETE to delete operation", () => {
      req.method = "DELETE";
      enforceRLS(req, res, next);
      expect(req.rlsContext.operation).toBe("delete");
    });

    test("should reject request when user has no role", () => {
      req.dbUser = { id: 1 }; // No role

      enforceRLS(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Forbidden",
          message: "User has no assigned role",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should reject request when user is missing", () => {
      req.dbUser = null;

      enforceRLS(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(next).not.toHaveBeenCalled();
    });

    test("should extract technician_profile_id for technicians", () => {
      req.dbUser = { role: "technician", id: 3, technician_profile_id: 50 };
      req.entityMetadata = { rlsResource: "work_orders" };

      enforceRLS(req, res, next);

      expect(req.rlsContext).toMatchObject({
        role: "technician",
        userId: 3,
        technician_profile_id: 50,
        resource: "work_orders",
      });
      expect(next).toHaveBeenCalled();
    });

    test("should handle users with multiple profile IDs", () => {
      // Rare case: user has both customer and technician profiles
      req.dbUser = {
        role: "dispatcher",
        id: 5,
        customer_profile_id: 10,
        technician_profile_id: 20,
      };

      enforceRLS(req, res, next);

      expect(req.rlsContext).toMatchObject({
        role: "dispatcher",
        customer_profile_id: 10,
        technician_profile_id: 20,
      });
    });

    test("should handle users with no profile IDs (staff)", () => {
      req.dbUser = { role: "admin", id: 99 };

      enforceRLS(req, res, next);

      expect(req.rlsContext).toMatchObject({
        role: "admin",
        userId: 99,
      });
      expect(req.rlsContext.customer_profile_id).toBeUndefined();
      expect(req.rlsContext.technician_profile_id).toBeUndefined();
    });

    test("should fail when entityMetadata is missing (configuration error)", () => {
      delete req.entityMetadata;

      enforceRLS(req, res, next);

      expect(res.status).toHaveBeenCalledWith(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Internal Server Error",
          code: "SERVER_ERROR",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should fail when rlsResource is missing from entityMetadata", () => {
      req.entityMetadata = {}; // Missing rlsResource

      enforceRLS(req, res, next);

      expect(res.status).toHaveBeenCalledWith(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("extractProfileIds helper", () => {
    test("should extract all *_profile_id columns", () => {
      const user = {
        id: 1,
        role: "customer",
        customer_profile_id: 100,
        technician_profile_id: null,
        email: "test@example.com",
      };

      const result = extractProfileIds(user);

      expect(result).toEqual({
        customer_profile_id: 100,
        technician_profile_id: null,
      });
      expect(result.id).toBeUndefined();
      expect(result.role).toBeUndefined();
    });

    test("should return empty object for null user", () => {
      expect(extractProfileIds(null)).toEqual({});
    });

    test("should return empty object for user without profile IDs", () => {
      const user = { id: 1, role: "admin", email: "admin@example.com" };
      expect(extractProfileIds(user)).toEqual({});
    });

    test("should handle future profile types dynamically", () => {
      // When a new profile type is added (e.g., vendor_profile_id)
      const user = {
        id: 1,
        customer_profile_id: 10,
        vendor_profile_id: 20,
      };

      const result = extractProfileIds(user);

      expect(result).toEqual({
        customer_profile_id: 10,
        vendor_profile_id: 20,
      });
    });
  });

  describe("getOperationFromMethod helper", () => {
    test("should map GET to read", () => {
      expect(getOperationFromMethod("GET")).toBe("read");
    });

    test("should map POST to create", () => {
      expect(getOperationFromMethod("POST")).toBe("create");
    });

    test("should map PUT to update", () => {
      expect(getOperationFromMethod("PUT")).toBe("update");
    });

    test("should map PATCH to update", () => {
      expect(getOperationFromMethod("PATCH")).toBe("update");
    });

    test("should map DELETE to delete", () => {
      expect(getOperationFromMethod("DELETE")).toBe("delete");
    });

    test("should default to read for unknown methods", () => {
      expect(getOperationFromMethod("OPTIONS")).toBe("read");
      expect(getOperationFromMethod("HEAD")).toBe("read");
    });
  });

  describe("validateRLSApplied(req, result)", () => {
    beforeEach(() => {
      req.rlsContext = {
        resource: "customers",
        role: "customer",
        userId: 1,
        operation: "read",
      };
    });

    test("should pass when RLS was applied", () => {
      const result = { data: [], rlsApplied: true };
      expect(() => validateRLSApplied(req, result)).not.toThrow();
    });

    test("should throw when RLS was not applied", () => {
      const result = { data: [] }; // Missing rlsApplied flag
      expect(() => validateRLSApplied(req, result)).toThrow(
        /RLS validation failed/,
      );
    });

    test("should pass when no RLS enforcement is required", () => {
      req.rlsContext = null; // No RLS on this route
      const result = { data: [] }; // No rlsApplied flag
      expect(() => validateRLSApplied(req, result)).not.toThrow();
    });

    test("should throw when result is null", () => {
      expect(() => validateRLSApplied(req, null)).toThrow(
        /RLS validation failed/,
      );
    });

    test("should throw when result is undefined", () => {
      expect(() => validateRLSApplied(req, undefined)).toThrow(
        /RLS validation failed/,
      );
    });

    test("should include error context in exception", () => {
      const result = { data: [] };
      try {
        validateRLSApplied(req, result);
      } catch (error) {
        expect(error.message).toContain("customers");
      }
    });
  });

  describe("Integration with Role Hierarchy", () => {
    test("should build correct context for customer vs admin roles", () => {
      // Customer with profile
      req.dbUser = { role: "customer", id: 1, customer_profile_id: 100 };
      req.entityMetadata = { rlsResource: "customers" };

      enforceRLS(req, res, next);
      expect(req.rlsContext.role).toBe("customer");
      expect(req.rlsContext.customer_profile_id).toBe(100);

      // Admin without profile
      jest.clearAllMocks();
      req.dbUser = { role: "admin", id: 2 };

      enforceRLS(req, res, next);
      expect(req.rlsContext.role).toBe("admin");
      expect(req.rlsContext.customer_profile_id).toBeUndefined();
    });

    test("should build correct context for technician accessing work_orders", () => {
      req.dbUser = { role: "technician", id: 3, technician_profile_id: 50 };
      req.entityMetadata = { rlsResource: "work_orders" };

      enforceRLS(req, res, next);

      expect(req.rlsContext).toMatchObject({
        role: "technician",
        userId: 3,
        technician_profile_id: 50,
        resource: "work_orders",
        operation: "read",
      });
    });

    test("should build correct context for dispatcher (staff role)", () => {
      req.dbUser = { role: "dispatcher", id: 4 };
      req.entityMetadata = { rlsResource: "work_orders" };

      enforceRLS(req, res, next);

      expect(req.rlsContext.role).toBe("dispatcher");
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Error Response Format", () => {
    test("should return standardized error structure", () => {
      req.dbUser = null;

      enforceRLS(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Forbidden",
          message: expect.any(String),
          timestamp: expect.any(String),
        }),
      );
    });

    test("should include ISO timestamp in error response", () => {
      req.dbUser = { id: 1 }; // No role

      enforceRLS(req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(() => new Date(jsonCall.timestamp)).not.toThrow();
    });
  });
});
