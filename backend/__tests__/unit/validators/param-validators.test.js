/**
 * Param Validators - Unit Tests
 *
 * Tests URL parameter validation:
 * - ID validation and coercion
 * - Multiple ID validation
 *
 * KISS: Test behavior, minimal mocking
 */

const {
  validateIdParam,
  validateIdParams,
} = require("../../../validators/param-validators");

describe("Param Validators", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      validated: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  describe("validateIdParam", () => {
    test("should validate valid ID and attach to req.validated", () => {
      // Arrange
      req.params.id = "123";
      const middleware = validateIdParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.id).toBe(123);
      expect(next).toHaveBeenCalled();
    });

    test("should validate custom param name", () => {
      // Arrange
      req.params.userId = "456";
      const middleware = validateIdParam({ paramName: "userId" });

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.userId).toBe(456);
      expect(next).toHaveBeenCalled();
    });

    test("should reject non-numeric ID", () => {
      // Arrange
      req.params.id = "abc";
      const middleware = validateIdParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
          details: expect.arrayContaining([
            expect.objectContaining({ field: "id" }),
          ]),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should reject ID below minimum", () => {
      // Arrange
      req.params.id = "0";
      const middleware = validateIdParam({ min: 1 });

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
        }),
      );
    });

    test("should reject ID above maximum", () => {
      // Arrange
      req.params.id = "1000";
      const middleware = validateIdParam({ max: 999 });

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
        }),
      );
    });

    test("should coerce string numbers to integers", () => {
      // Arrange
      req.params.id = "42";
      const middleware = validateIdParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.id).toBe(42);
      expect(typeof req.validated.id).toBe("number");
    });

    test("should coerce floating point to integer", () => {
      // Arrange
      req.params.id = "12.5";
      const middleware = validateIdParam();

      // Act
      middleware(req, res, next);

      // Assert - toSafeInteger rounds to 12
      expect(req.validated.id).toBe(12);
      expect(next).toHaveBeenCalled();
    });

    test("should initialize req.validated if not present", () => {
      // Arrange
      delete req.validated;
      req.params.id = "123";
      const middleware = validateIdParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated).toBeDefined();
      expect(req.validated.id).toBe(123);
    });
  });

  describe("validateIdParams", () => {
    test("should validate multiple ID parameters", () => {
      // Arrange
      req.params.userId = "100";
      req.params.roleId = "200";
      const middleware = validateIdParams(["userId", "roleId"]);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.userId).toBe(100);
      expect(req.validated.roleId).toBe(200);
      expect(next).toHaveBeenCalled();
    });

    test("should reject if any parameter is invalid", () => {
      // Arrange
      req.params.userId = "100";
      req.params.roleId = "invalid";
      const middleware = validateIdParams(["userId", "roleId"]);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
          details: expect.arrayContaining([
            expect.objectContaining({ field: "params" }),
          ]),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should validate single parameter in array", () => {
      // Arrange
      req.params.userId = "300";
      const middleware = validateIdParams(["userId"]);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.userId).toBe(300);
      expect(next).toHaveBeenCalled();
    });

    test("should initialize req.validated if not present", () => {
      // Arrange
      delete req.validated;
      req.params.userId = "123";
      const middleware = validateIdParams(["userId"]);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated).toBeDefined();
      expect(req.validated.userId).toBe(123);
    });
  });
});
