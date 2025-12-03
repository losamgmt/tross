/**
 * Validator Middleware - Unit Tests
 *
 * Tests Express middleware validators that protect route parameters
 * - validateIdParam - Single ID parameter validation
 * - validateIdParams - Multiple ID parameters
 * - validatePagination - Query string pagination
 * - validateSlugParam - Slug validation
 *
 * Focus: Ensure middleware sets req.validated and returns 400 on errors
 */

const {
  validateIdParam,
  validateIdParams,
  validateSlugParam,
  validatePagination,
} = require("../../../validators");

describe("Validator Middleware - Route Protection", () => {
  // Mock Express req, res, next
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      validated: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  // ============================================================================
  // validateIdParam - Single ID validation
  // ============================================================================

  describe("validateIdParam()", () => {
    describe("✅ Valid IDs", () => {
      test("validates numeric ID and calls next()", () => {
        req.params.id = "123";

        validateIdParam()(req, res, next);

        expect(req.validated.id).toBe(123);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      test("validates string numeric ID", () => {
        req.params.id = "456";

        validateIdParam()(req, res, next);

        expect(req.validated.id).toBe(456);
        expect(next).toHaveBeenCalled();
      });

      test("handles ID value of 1 (minimum)", () => {
        req.params.id = "1";

        validateIdParam()(req, res, next);

        expect(req.validated.id).toBe(1);
        expect(next).toHaveBeenCalled();
      });
    });

    describe("❌ Invalid IDs", () => {
      test("rejects missing ID with 400", () => {
        validateIdParam()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.any(String),
            message: expect.stringContaining("id is required"),
          }),
        );
        expect(next).not.toHaveBeenCalled();
      });

      test("rejects non-numeric ID", () => {
        req.params.id = "abc";

        validateIdParam()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("valid integer"),
          }),
        );
        expect(next).not.toHaveBeenCalled();
      });

      test("rejects negative ID", () => {
        req.params.id = "-1";

        validateIdParam()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("at least 1"),
          }),
        );
      });

      test("rejects zero ID", () => {
        req.params.id = "0";

        validateIdParam()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });

      test("includes timestamp in error response", () => {
        req.params.id = "invalid";

        validateIdParam()(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            timestamp: expect.any(String),
          }),
        );
      });
    });
  });

  // ============================================================================
  // validateIdParams - Multiple ID validation
  // ============================================================================

  describe("validateIdParams()", () => {
    test("validates multiple ID params", () => {
      req.params.userId = "123";
      req.params.roleId = "456";

      const middleware = validateIdParams(["userId", "roleId"]);
      middleware(req, res, next);

      expect(req.validated.userId).toBe(123);
      expect(req.validated.roleId).toBe(456);
      expect(next).toHaveBeenCalled();
    });

    test("rejects if any param is invalid", () => {
      req.params.userId = "123";
      req.params.roleId = "invalid";

      const middleware = validateIdParams(["userId", "roleId"]);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test("validates single param in array", () => {
      req.params.id = "789";

      const middleware = validateIdParams(["id"]);
      middleware(req, res, next);

      expect(req.validated.id).toBe(789);
      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // validatePagination - Query string validation
  // ============================================================================

  describe("validatePagination()", () => {
    describe("✅ Valid pagination", () => {
      test("uses defaults when no query params", () => {
        validatePagination()(req, res, next);

        expect(req.validated.pagination).toEqual({
          page: 1,
          limit: 50,
          offset: 0,
        });
        expect(next).toHaveBeenCalled();
      });

      test("validates custom page and limit", () => {
        req.query.page = "2";
        req.query.limit = "25";

        validatePagination()(req, res, next);

        expect(req.validated.pagination).toEqual({
          page: 2,
          limit: 25,
          offset: 25,
        });
        expect(next).toHaveBeenCalled();
      });

      test("accepts page 1 with custom limit", () => {
        req.query.page = "1";
        req.query.limit = "100";

        validatePagination()(req, res, next);

        expect(req.validated.pagination.page).toBe(1);
        expect(req.validated.pagination.limit).toBe(100);
        expect(req.validated.pagination.offset).toBe(0);
      });

      test("respects maxLimit of 200", () => {
        req.query.limit = "200";

        validatePagination()(req, res, next);

        expect(req.validated.pagination.limit).toBe(200);
        expect(next).toHaveBeenCalled();
      });
    });

    describe("❌ Invalid pagination", () => {
      test("rejects negative page", () => {
        req.query.page = "-1";

        validatePagination()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("page"),
          }),
        );
        expect(next).not.toHaveBeenCalled();
      });

      test("rejects zero page", () => {
        req.query.page = "0";

        validatePagination()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });

      test("rejects non-numeric page", () => {
        req.query.page = "abc";

        validatePagination()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("valid integer"),
          }),
        );
      });

      test("rejects limit above 200", () => {
        req.query.limit = "999";

        validatePagination()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("at most 200"),
          }),
        );
      });

      test("rejects zero limit", () => {
        req.query.limit = "0";

        validatePagination()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      test("rejects negative limit", () => {
        req.query.limit = "-10";

        validatePagination()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      test("includes error details in response", () => {
        req.query.page = "invalid";

        validatePagination()(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: "Validation Error",
            timestamp: expect.any(String),
          }),
        );
      });
    });
  });

  // ============================================================================
  // validateSlugParam - Slug validation
  // ============================================================================

  describe("validateSlugParam()", () => {
    describe("✅ Valid slugs", () => {
      test("validates lowercase slug", () => {
        req.params.slug = "my-slug";

        validateSlugParam()(req, res, next);

        expect(req.validated.slug).toBe("my-slug");
        expect(next).toHaveBeenCalled();
      });

      test("validates slug with numbers", () => {
        req.params.slug = "slug-123";

        validateSlugParam()(req, res, next);

        expect(req.validated.slug).toBe("slug-123");
        expect(next).toHaveBeenCalled();
      });

      test("validates single word slug", () => {
        req.params.slug = "slug";

        validateSlugParam()(req, res, next);

        expect(req.validated.slug).toBe("slug");
        expect(next).toHaveBeenCalled();
      });
    });

    describe("❌ Invalid slugs", () => {
      test("rejects slug with uppercase", () => {
        req.params.slug = "My-Slug";

        validateSlugParam()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });

      test("rejects slug with spaces", () => {
        req.params.slug = "my slug";

        validateSlugParam()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      test("rejects slug with special characters", () => {
        req.params.slug = "my@slug";

        validateSlugParam()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      test("rejects empty slug", () => {
        req.params.slug = "";

        validateSlugParam()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
      });
    });
  });

  // ============================================================================
  // Integration - req.validated object
  // ============================================================================

  describe("req.validated object", () => {
    test("validateIdParam sets req.validated.id", () => {
      req.params.id = "123";

      validateIdParam()(req, res, next);

      expect(req.validated).toHaveProperty("id", 123);
    });

    test("validatePagination sets req.validated.pagination", () => {
      req.query.page = "2";
      req.query.limit = "10";

      validatePagination()(req, res, next);

      expect(req.validated).toHaveProperty("pagination");
      expect(req.validated.pagination).toHaveProperty("page", 2);
      expect(req.validated.pagination).toHaveProperty("limit", 10);
      expect(req.validated.pagination).toHaveProperty("offset", 10);
    });
  });
});
