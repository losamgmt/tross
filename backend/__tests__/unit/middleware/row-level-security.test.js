/**
 * Unit Tests: Row-Level Security Middleware
 *
 * Tests the enforceRLS middleware in isolation.
 * Validates RLS policy attachment and error handling.
 *
 * UNIFIED DATA FLOW:
 * - enforceRLS reads resource from req.entityMetadata.rlsResource
 * - Entity metadata is attached by extractEntity or attachEntity middleware
 * - ONE code path, ONE data shape - no optional parameters, no fallbacks
 */

const {
  enforceRLS,
  validateRLSApplied,
} = require("../../../middleware/row-level-security");
const { getRLSRule } = require("../../../config/permissions-loader");
const { HTTP_STATUS } = require("../../../config/constants");

// Mock dependencies
jest.mock("../../../config/permissions-loader");
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
      dbUser: { role: "customer", id: 1 },
      url: "/api/customers",
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

  describe("enforceRLS (unified signature)", () => {
    test("should attach RLS context to request when policy exists", () => {
      getRLSRule.mockReturnValue("user_id");

      enforceRLS(req, res, next);

      expect(req.rlsContext.filterConfig).toBe("user_id");
      expect(req.rlsContext.resource).toBe("customers");
      expect(req.rlsContext.userId).toBe(1);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should attach null filterConfig when no RLS defined", () => {
      getRLSRule.mockReturnValue(null);
      req.entityMetadata = { rlsResource: "inventory" };

      enforceRLS(req, res, next);

      expect(req.rlsContext.filterConfig).toBeNull();
      expect(req.rlsContext.resource).toBe("inventory");
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should handle different RLS filter configs for different resources", () => {
      getRLSRule.mockReturnValue({ field: "assigned_technician_id", value: "technicianProfileId" });
      req.entityMetadata = { rlsResource: "work_orders" };

      enforceRLS(req, res, next);

      expect(req.rlsContext.filterConfig).toEqual({ field: "assigned_technician_id", value: "technicianProfileId" });
      expect(req.rlsContext.resource).toBe("work_orders");
      expect(next).toHaveBeenCalled();
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

    test("should call getRLSRule with correct parameters", () => {
      // ADR-008: filterConfig object for technician work order access
      getRLSRule.mockReturnValue({ field: "assigned_technician_id", value: "technicianProfileId" });
      req.dbUser.role = "technician";
      req.entityMetadata = { rlsResource: "work_orders" };

      enforceRLS(req, res, next);

      expect(getRLSRule).toHaveBeenCalledWith("technician", "work_orders");
    });

    test("should handle null filterConfig for roles with no access", () => {
      // Technicians have null access to contracts (meaning all records)
      getRLSRule.mockReturnValue(null);
      req.dbUser.role = "technician";
      req.entityMetadata = { rlsResource: "contracts" };

      enforceRLS(req, res, next);

      expect(req.rlsContext.filterConfig).toBeNull();
      expect(req.rlsContext.resource).toBe("contracts");
      expect(next).toHaveBeenCalled();
    });

    test("should preserve user ID for filtering", () => {
      getRLSRule.mockReturnValue({ field: "customer_id", value: "customerProfileId" });
      req.dbUser = { role: "customer", id: 42, customer_profile_id: 100 };
      req.entityMetadata = { rlsResource: "invoices" };

      enforceRLS(req, res, next);

      expect(req.rlsContext.userId).toBe(42);
      expect(req.rlsContext.customerProfileId).toBe(100);
      expect(next).toHaveBeenCalled();
    });

    test("should handle dispatcher with null filterConfig (all records)", () => {
      getRLSRule.mockReturnValue(null);
      req.dbUser.role = "dispatcher";

      enforceRLS(req, res, next);

      expect(req.rlsContext.filterConfig).toBeNull();
      expect(next).toHaveBeenCalled();
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

  describe("validateRLSApplied(req, result)", () => {
    beforeEach(() => {
      req.rlsContext = {
        resource: "customers",
        filterConfig: "user_id",
        userId: 1,
        role: "customer",
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

    test("should pass when RLS filterConfig is null (no filtering required)", () => {
      req.rlsContext.filterConfig = null;
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
    test("should apply different filter configs for customer vs dispatcher", () => {
      // Customer gets filter by user_id
      getRLSRule.mockReturnValue("user_id");
      req.dbUser = { role: "customer", id: 1 };
      req.entityMetadata = { rlsResource: "customers" };

      enforceRLS(req, res, next);
      expect(req.rlsContext.filterConfig).toBe("user_id");

      // Dispatcher gets null (all records)
      jest.clearAllMocks();
      getRLSRule.mockReturnValue(null);
      req.dbUser = { role: "dispatcher", id: 2 };

      enforceRLS(req, res, next);
      expect(req.rlsContext.filterConfig).toBeNull();
    });

    test("should handle work_orders with technician role", () => {
      getRLSRule.mockReturnValue({ field: "assigned_technician_id", value: "technicianProfileId" });
      req.dbUser = { role: "technician", id: 3, technician_profile_id: 10 };
      req.entityMetadata = { rlsResource: "work_orders" };

      enforceRLS(req, res, next);

      expect(req.rlsContext.filterConfig).toEqual({ field: "assigned_technician_id", value: "technicianProfileId" });
      expect(req.rlsContext.technicianProfileId).toBe(10);
      expect(getRLSRule).toHaveBeenCalledWith("technician", "work_orders");
    });

    test("should handle contracts with technician role (false = deny)", () => {
      getRLSRule.mockReturnValue(false);
      req.dbUser = { role: "technician", id: 3 };
      req.entityMetadata = { rlsResource: "contracts" };

      enforceRLS(req, res, next);

      expect(req.rlsContext.filterConfig).toBe(false);
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
