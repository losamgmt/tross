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
    test("should attach RLS policy to request when policy exists", () => {
      getRLSRule.mockReturnValue("own_record_only");

      enforceRLS(req, res, next);

      expect(req.rlsPolicy).toBe("own_record_only");
      expect(req.rlsResource).toBe("customers");
      expect(req.rlsUserId).toBe(1);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should attach null policy when no RLS defined", () => {
      getRLSRule.mockReturnValue(null);
      req.entityMetadata = { rlsResource: "inventory" };

      enforceRLS(req, res, next);

      expect(req.rlsPolicy).toBeNull();
      expect(req.rlsResource).toBe("inventory");
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should handle different RLS policies for different resources", () => {
      getRLSRule.mockReturnValue("assigned_work_orders_only");
      req.entityMetadata = { rlsResource: "work_orders" };

      enforceRLS(req, res, next);

      expect(req.rlsPolicy).toBe("assigned_work_orders_only");
      expect(req.rlsResource).toBe("work_orders");
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
      getRLSRule.mockReturnValue("own_work_orders_only");
      req.dbUser.role = "technician";
      req.entityMetadata = { rlsResource: "work_orders" };

      enforceRLS(req, res, next);

      expect(getRLSRule).toHaveBeenCalledWith("technician", "work_orders");
    });

    test("should handle null policy for roles with no access", () => {
      // Technicians have null access to contracts
      getRLSRule.mockReturnValue(null);
      req.dbUser.role = "technician";
      req.entityMetadata = { rlsResource: "contracts" };

      enforceRLS(req, res, next);

      expect(req.rlsPolicy).toBeNull();
      expect(req.rlsResource).toBe("contracts");
      expect(next).toHaveBeenCalled();
    });

    test("should preserve user ID for filtering", () => {
      getRLSRule.mockReturnValue("own_invoices_only");
      req.dbUser = { role: "customer", id: 42 };
      req.entityMetadata = { rlsResource: "invoices" };

      enforceRLS(req, res, next);

      expect(req.rlsUserId).toBe(42);
      expect(next).toHaveBeenCalled();
    });

    test("should handle dispatcher with all_records policy", () => {
      getRLSRule.mockReturnValue("all_records");
      req.dbUser.role = "dispatcher";

      enforceRLS(req, res, next);

      expect(req.rlsPolicy).toBe("all_records");
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
      req.rlsResource = "customers";
      req.rlsPolicy = "own_record_only";
      req.rlsUserId = 1;
      req.dbUser = { role: "customer" };
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
      req.rlsResource = null; // No RLS on this route
      const result = { data: [] }; // No rlsApplied flag
      expect(() => validateRLSApplied(req, result)).not.toThrow();
    });

    test("should pass when RLS policy is null (no filtering required)", () => {
      req.rlsPolicy = null;
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
        expect(error.message).toContain("own_record_only");
      }
    });
  });

  describe("Integration with Role Hierarchy", () => {
    test("should apply different policies for customer vs dispatcher", () => {
      // Customer gets own_record_only
      getRLSRule.mockReturnValue("own_record_only");
      req.dbUser = { role: "customer", id: 1 };
      req.entityMetadata = { rlsResource: "customers" };

      enforceRLS(req, res, next);
      expect(req.rlsPolicy).toBe("own_record_only");

      // Dispatcher gets all_records
      jest.clearAllMocks();
      getRLSRule.mockReturnValue("all_records");
      req.dbUser = { role: "dispatcher", id: 2 };

      enforceRLS(req, res, next);
      expect(req.rlsPolicy).toBe("all_records");
    });

    test("should handle work_orders with technician role", () => {
      getRLSRule.mockReturnValue("assigned_work_orders_only");
      req.dbUser = { role: "technician", id: 3 };
      req.entityMetadata = { rlsResource: "work_orders" };

      enforceRLS(req, res, next);

      expect(req.rlsPolicy).toBe("assigned_work_orders_only");
      expect(getRLSRule).toHaveBeenCalledWith("technician", "work_orders");
    });

    test("should handle contracts with technician role (null access)", () => {
      getRLSRule.mockReturnValue(null);
      req.dbUser = { role: "technician", id: 3 };
      req.entityMetadata = { rlsResource: "contracts" };

      enforceRLS(req, res, next);

      expect(req.rlsPolicy).toBeNull();
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
