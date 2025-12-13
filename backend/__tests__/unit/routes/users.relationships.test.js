/**
 * User Relationships Route Tests
 *
 * Tests PUT /api/users/:id/role endpoint BEHAVIOR:
 * - Assigns a role to a user successfully
 * - Returns proper error for invalid inputs
 * - Handles missing roles gracefully
 *
 * NOTE: Tests focus on BEHAVIOR not implementation details.
 * We test HTTP status codes and response structure, not internal method calls.
 * 
 * PHASE 4 UPDATE: Route now uses GenericEntityService for all operations
 */

const request = require("supertest");
const express = require("express");

// Mock dependencies before requiring the router
jest.mock("../../../services/generic-entity-service");
jest.mock("../../../middleware/auth", () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.dbUser = { id: 1, email: "admin@example.com", role: "admin" };
    req.user = { userId: 1 };
    next();
  }),
  requirePermission: jest.fn(() => (req, res, next) => next()),
}));
jest.mock("../../../validators", () => ({
  validateIdParam: jest.fn(() => (req, res, next) => {
    req.validatedId = parseInt(req.params.id);
    if (!req.validated) req.validated = {};
    req.validated.id = req.validatedId;
    next();
  }),
  validateUserCreate: jest.fn((req, res, next) => next()),
  validateProfileUpdate: jest.fn((req, res, next) => next()),
  validateUpdateUser: jest.fn((req, res, next) => next()),
  validateRoleAssignment: jest.fn((req, res, next) => next()),
  validatePagination: jest.fn(() => (req, res, next) => {
    if (!req.validated) req.validated = {};
    req.validated.pagination = { page: 1, limit: 50 };
    next();
  }),
  validateQuery: jest.fn(() => (req, res, next) => {
    if (!req.validated) req.validated = {};
    req.validated.query = { search: null, filters: {}, sortBy: 'created_at', sortOrder: 'DESC' };
    next();
  }),
}));

const GenericEntityService = require("../../../services/generic-entity-service");
const { authenticateToken, requirePermission } = require("../../../middleware/auth");
const { validateIdParam, validateRoleAssignment } = require("../../../validators");
const usersRouter = require("../../../routes/users");

describe("PUT /api/users/:id/role", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset GenericEntityService mocks
    GenericEntityService.findById = jest.fn();
    GenericEntityService.update = jest.fn();

    // Reset validators
    validateRoleAssignment.mockImplementation((req, res, next) => next());
    validateIdParam.mockImplementation(() => (req, res, next) => {
      const id = parseInt(req.params.id);
      if (!req.validated) req.validated = {};
      req.validated.id = id;
      req.validatedId = id;
      next();
    });

    // Create fresh Express app
    app = express();
    app.use(express.json());
    app.use("/api/users", usersRouter);

    // Reset middleware
    authenticateToken.mockImplementation((req, res, next) => {
      req.dbUser = { id: 1, email: "admin@example.com", role: "admin" };
      req.user = { userId: 1 };
      next();
    });
    requirePermission.mockImplementation(() => (req, res, next) => next());
  });

  describe("Success Scenarios", () => {
    test("should assign role and return success message", async () => {
      // Arrange
      const mockRole = { id: 3, name: "manager" };
      const mockUpdatedUser = { id: 2, email: "user@test.com", role_id: 3, role: "manager" };

      // findById is called twice: once for role lookup, once would be for user but now update returns user
      GenericEntityService.findById.mockResolvedValue(mockRole);
      GenericEntityService.update.mockResolvedValue(mockUpdatedUser);

      // Act
      const response = await request(app)
        .put("/api/users/2/role")
        .send({ role_id: 3 });

      // Assert BEHAVIOR: success response with role name
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("manager");
    });

    test("should handle string role_id by converting to number", async () => {
      // Arrange
      const mockRole = { id: 3, name: "manager" };
      const mockUpdatedUser = { id: 2, role_id: 3, role: "manager" };

      GenericEntityService.findById.mockResolvedValue(mockRole);
      GenericEntityService.update.mockResolvedValue(mockUpdatedUser);

      // Act
      const response = await request(app)
        .put("/api/users/2/role")
        .send({ role_id: "3" }); // String

      // Assert BEHAVIOR: still succeeds
      expect(response.status).toBe(200);
    });
  });

  describe("Validation Errors", () => {
    test("should return 400 for invalid role_id format", async () => {
      // Act
      const response = await request(app)
        .put("/api/users/2/role")
        .send({ role_id: "invalid" });

      // Assert BEHAVIOR: bad request response
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test("should return 404 when role not found", async () => {
      // Arrange
      GenericEntityService.findById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .put("/api/users/2/role")
        .send({ role_id: 999 });

      // Assert BEHAVIOR: not found response
      expect(response.status).toBe(404);
    });
  });

  describe("Error Handling", () => {
    test("should return 500 on database error", async () => {
      // Arrange
      const mockRole = { id: 3, name: "manager" };
      GenericEntityService.findById.mockResolvedValue(mockRole);
      GenericEntityService.update.mockRejectedValue(new Error("Database error"));

      // Act
      const response = await request(app)
        .put("/api/users/2/role")
        .send({ role_id: 3 });

      // Assert BEHAVIOR: server error response
      expect(response.status).toBe(500);
    });
  });
});
