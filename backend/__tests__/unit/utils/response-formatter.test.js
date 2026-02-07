/**
 * Unit Tests: ResponseFormatter Utility
 *
 * Tests ALL response formatter methods including Phase 8/9 additions:
 * - serviceUnavailable() - CRITICAL NEW (Phase 8)
 * - conflict() - CRITICAL NEW (Phase 8)
 * - All existing methods (list, get, created, updated, deleted, errors)
 *
 * Goal: 100% coverage, validate consistent response structure
 */

const ResponseFormatter = require("../../../utils/response-formatter");
const { ERROR_CODES } = require("../../../utils/response-formatter");
const { HTTP_STATUS } = require("../../../config/constants");

describe("ResponseFormatter", () => {
  let res;

  beforeEach(() => {
    // Mock Express response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================
  // Success Responses
  // ===========================
  describe("list()", () => {
    test("should format paginated list response", () => {
      const mockData = {
        data: [
          { id: 1, name: "Test" },
          { id: 2, name: "Test2" },
        ],
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
        appliedFilters: { status: "active" },
        rlsApplied: true,
      };

      ResponseFormatter.list(res, mockData);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockData.data,
          count: 2,
          pagination: mockData.pagination,
          appliedFilters: mockData.appliedFilters,
          rlsApplied: true,
          timestamp: expect.any(String),
        }),
      );
    });

    test("should default to empty filters and rlsApplied=false", () => {
      const mockData = {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      };

      ResponseFormatter.list(res, mockData);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedFilters: {},
          rlsApplied: false,
        }),
      );
    });
  });

  describe("get()", () => {
    test("should format single record response", () => {
      const mockRecord = { id: 1, name: "Test Record" };

      ResponseFormatter.get(res, mockRecord);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecord,
        timestamp: expect.any(String),
      });
    });
  });

  describe("created()", () => {
    test("should format created response with default message", () => {
      const mockRecord = { id: 1, name: "New Record" };

      ResponseFormatter.created(res, mockRecord);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecord,
        message: "Resource created successfully",
        timestamp: expect.any(String),
      });
    });

    test("should format created response with custom message", () => {
      const mockRecord = { id: 1, name: "New Record" };

      ResponseFormatter.created(res, mockRecord, "User created successfully");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User created successfully",
        }),
      );
    });
  });

  describe("updated()", () => {
    test("should format updated response with default message", () => {
      const mockRecord = { id: 1, name: "Updated Record" };

      ResponseFormatter.updated(res, mockRecord);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecord,
        message: "Resource updated successfully",
        timestamp: expect.any(String),
      });
    });

    test("should format updated response with custom message", () => {
      const mockRecord = { id: 1, name: "Updated Record" };

      ResponseFormatter.updated(res, mockRecord, "Role updated successfully");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Role updated successfully",
        }),
      );
    });
  });

  describe("deleted()", () => {
    test("should format deleted response with default message", () => {
      ResponseFormatter.deleted(res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Resource deleted successfully",
        timestamp: expect.any(String),
      });
    });

    test("should format deleted response with custom message", () => {
      ResponseFormatter.deleted(res, "Customer deleted successfully");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Customer deleted successfully",
        }),
      );
    });
  });

  // ===========================
  // Error Responses
  // ===========================
  describe("error()", () => {
    test("should format error response from Error object", () => {
      const error = new Error("Something went wrong");

      ResponseFormatter.error(res, error);

      expect(res.status).toHaveBeenCalledWith(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Error",
        message: "Something went wrong",
        timestamp: expect.any(String),
      });
    });

    test("should use error.name if provided", () => {
      const error = new Error("Database connection failed");
      error.name = "DatabaseError";

      ResponseFormatter.error(res, error);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "DatabaseError",
          message: "Database connection failed",
        }),
      );
    });

    test("should use fallback message if error.message is missing", () => {
      const error = new Error();
      error.message = "";

      ResponseFormatter.error(res, error, "Custom fallback");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Custom fallback",
        }),
      );
    });

    test("should determine correct status code based on error message", () => {
      const notFoundError = new Error("User not found");
      ResponseFormatter.error(res, notFoundError);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);

      jest.clearAllMocks();

      const forbiddenError = new Error("Access Forbidden"); // Capital F
      ResponseFormatter.error(res, forbiddenError);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    });
  });

  describe("notFound()", () => {
    test("should format 404 response with default message", () => {
      ResponseFormatter.notFound(res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Not Found",
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        message: "Resource not found",
        timestamp: expect.any(String),
      });
    });

    test("should format 404 response with custom message", () => {
      ResponseFormatter.notFound(res, "User not found");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: "User not found",
        }),
      );
    });

    test("should format 404 response with custom error code", () => {
      ResponseFormatter.notFound(res, "User not found", "CUSTOM_NOT_FOUND");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "CUSTOM_NOT_FOUND",
          message: "User not found",
        }),
      );
    });
  });

  describe("badRequest()", () => {
    test("should format 400 response with message", () => {
      ResponseFormatter.badRequest(res, "Email is required");

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Bad Request",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Email is required",
        timestamp: expect.any(String),
      });
    });

    test("should format 400 response with validation details", () => {
      const details = [
        { field: "email", message: "Email is required" },
        { field: "password", message: "Password too short" },
      ];

      ResponseFormatter.badRequest(res, "Validation failed", details);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Bad Request",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Validation failed",
        details,
        timestamp: expect.any(String),
      });
    });

    test("should handle null details gracefully", () => {
      ResponseFormatter.badRequest(res, "Invalid input", null);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Bad Request",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input",
        timestamp: expect.any(String),
      });
    });

    test("should format 400 response with custom error code", () => {
      ResponseFormatter.badRequest(
        res,
        "Missing field",
        null,
        ERROR_CODES.VALIDATION_MISSING_FIELD,
      );

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Bad Request",
        code: ERROR_CODES.VALIDATION_MISSING_FIELD,
        message: "Missing field",
        timestamp: expect.any(String),
      });
    });
  });

  describe("forbidden()", () => {
    test("should format 403 response with default message", () => {
      ResponseFormatter.forbidden(res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Forbidden",
        code: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        message: "You do not have permission to perform this action",
        timestamp: expect.any(String),
      });
    });

    test("should format 403 response with custom message", () => {
      ResponseFormatter.forbidden(res, "Insufficient permissions");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
          message: "Insufficient permissions",
        }),
      );
    });

    test("should format 403 response with custom error code", () => {
      ResponseFormatter.forbidden(res, "Cannot access", "CUSTOM_FORBIDDEN");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "CUSTOM_FORBIDDEN",
          message: "Cannot access",
        }),
      );
    });
  });

  describe("unauthorized()", () => {
    test("should format 401 response with default message", () => {
      ResponseFormatter.unauthorized(res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Unauthorized",
        code: ERROR_CODES.AUTH_REQUIRED,
        message: "Authentication required",
        timestamp: expect.any(String),
      });
    });

    test("should format 401 response with custom message", () => {
      ResponseFormatter.unauthorized(res, "Invalid token");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.AUTH_REQUIRED,
          message: "Invalid token",
        }),
      );
    });

    test("should format 401 response with custom error code", () => {
      ResponseFormatter.unauthorized(
        res,
        "Token expired",
        ERROR_CODES.AUTH_TOKEN_EXPIRED,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.AUTH_TOKEN_EXPIRED,
          message: "Token expired",
        }),
      );
    });
  });

  describe("internalError()", () => {
    test("should format 500 response", () => {
      const error = new Error("Database query failed");

      ResponseFormatter.internalError(res, error);

      expect(res.status).toHaveBeenCalledWith(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal Server Error",
        code: ERROR_CODES.SERVER_ERROR,
        message: "An unexpected error occurred",
        timestamp: expect.any(String),
      });
    });

    test("should always return generic message for security", () => {
      const error = new Error("Sensitive database credentials exposed");

      ResponseFormatter.internalError(res, error);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.SERVER_ERROR,
          message: "An unexpected error occurred", // Generic for security
        }),
      );
    });

    test("should format 500 response with custom error code", () => {
      const error = new Error("DB connection lost");

      ResponseFormatter.internalError(
        res,
        error,
        ERROR_CODES.DB_CONNECTION_ERROR,
      );

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal Server Error",
        code: ERROR_CODES.DB_CONNECTION_ERROR,
        message: "An unexpected error occurred",
        timestamp: expect.any(String),
      });
    });
  });

  // ===========================
  // PHASE 8 NEW METHODS 🆕
  // ===========================
  describe("serviceUnavailable() - PHASE 8", () => {
    test("should format 503 response with default message", () => {
      ResponseFormatter.serviceUnavailable(res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Service Unavailable",
        code: ERROR_CODES.SERVER_UNAVAILABLE,
        message: "Service temporarily unavailable",
        timestamp: expect.any(String),
      });
    });

    test("should format 503 response with custom message", () => {
      ResponseFormatter.serviceUnavailable(res, "Database connection timeout");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.SERVER_UNAVAILABLE,
          message: "Database connection timeout",
        }),
      );
    });

    test("should include health details when provided", () => {
      const healthDetails = {
        status: "unhealthy",
        database: "down",
        cache: "up",
      };

      ResponseFormatter.serviceUnavailable(
        res,
        "Health check failed",
        healthDetails,
      );

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Service Unavailable",
        code: ERROR_CODES.SERVER_UNAVAILABLE,
        message: "Health check failed",
        status: "unhealthy",
        database: "down",
        cache: "up",
        timestamp: expect.any(String),
      });
    });

    test("should handle null details gracefully", () => {
      ResponseFormatter.serviceUnavailable(res, "Service down", null);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Service Unavailable",
        code: ERROR_CODES.SERVER_UNAVAILABLE,
        message: "Service down",
        timestamp: expect.any(String),
      });
    });

    test("should handle empty object details", () => {
      ResponseFormatter.serviceUnavailable(res, "Service down", {});

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Service Unavailable",
        code: ERROR_CODES.SERVER_UNAVAILABLE,
        message: "Service down",
        timestamp: expect.any(String),
      });
    });

    test("should format 503 response with custom error code", () => {
      ResponseFormatter.serviceUnavailable(
        res,
        "Database timeout",
        null,
        ERROR_CODES.SERVER_TIMEOUT,
      );

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Service Unavailable",
        code: ERROR_CODES.SERVER_TIMEOUT,
        message: "Database timeout",
        timestamp: expect.any(String),
      });
    });
  });

  describe("conflict() - PHASE 8", () => {
    test("should format 409 response with default message", () => {
      ResponseFormatter.conflict(res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Conflict",
        message: "Resource already exists",
        timestamp: expect.any(String),
      });
    });

    test("should format 409 response with custom message", () => {
      ResponseFormatter.conflict(res, "Email already registered");

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Conflict",
        message: "Email already registered",
        timestamp: expect.any(String),
      });
    });

    test("should format 409 response for duplicate role name", () => {
      ResponseFormatter.conflict(res, "Role name already exists");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Role name already exists",
        }),
      );
    });
  });

  // ===========================
  // Response Structure Validation
  // ===========================
  describe("Response Structure Consistency", () => {
    test("all success responses should have success=true", () => {
      const data = { id: 1, name: "Test" };
      const listData = { data: [data], pagination: {} };

      ResponseFormatter.list(res, listData);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );

      ResponseFormatter.get(res, data);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );

      ResponseFormatter.created(res, data);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );

      ResponseFormatter.updated(res, data);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );

      ResponseFormatter.deleted(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    test("all error responses should have success=false", () => {
      const error = new Error("Test error");

      ResponseFormatter.error(res, error);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );

      ResponseFormatter.notFound(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );

      ResponseFormatter.badRequest(res, "Bad request");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );

      ResponseFormatter.forbidden(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );

      ResponseFormatter.unauthorized(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );

      ResponseFormatter.internalError(res, error);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );

      ResponseFormatter.serviceUnavailable(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );

      ResponseFormatter.conflict(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    test("all responses should have timestamp", () => {
      const data = { id: 1 };
      const error = new Error("Test");

      ResponseFormatter.list(res, { data: [data], pagination: {} });
      ResponseFormatter.get(res, data);
      ResponseFormatter.created(res, data);
      ResponseFormatter.updated(res, data);
      ResponseFormatter.deleted(res);
      ResponseFormatter.error(res, error);
      ResponseFormatter.notFound(res);
      ResponseFormatter.badRequest(res, "Bad");
      ResponseFormatter.forbidden(res);
      ResponseFormatter.unauthorized(res);
      ResponseFormatter.internalError(res, error);
      ResponseFormatter.serviceUnavailable(res);
      ResponseFormatter.conflict(res);

      // All 13 calls should have timestamp
      expect(res.json).toHaveBeenCalledTimes(13);
      res.json.mock.calls.forEach((call) => {
        expect(call[0]).toHaveProperty("timestamp");
        expect(typeof call[0].timestamp).toBe("string");
      });
    });

    test("all error responses should have error field", () => {
      const error = new Error("Test error");

      ResponseFormatter.error(res, error);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
      );

      ResponseFormatter.notFound(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Not Found" }),
      );

      ResponseFormatter.badRequest(res, "Bad");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );

      ResponseFormatter.forbidden(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Forbidden" }),
      );

      ResponseFormatter.unauthorized(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Unauthorized" }),
      );

      ResponseFormatter.internalError(res, error);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Internal Server Error" }),
      );

      ResponseFormatter.serviceUnavailable(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Service Unavailable" }),
      );

      ResponseFormatter.conflict(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Conflict" }),
      );
    });
  });
});
