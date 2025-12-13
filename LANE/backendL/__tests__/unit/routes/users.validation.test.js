/**
 * Unit Tests for routes/users.js - Validation & Error Handling
 *
 * Tests input validation and error handling for user management endpoints.
 *
 * Tests are split for maintainability:
 * - users.crud.test.js - Core CRUD operations
 * - users.validation.test.js (this file) - Input validation & error handling
 * - users.relationships.test.js - Role assignment endpoints
 */

// Mock dependencies BEFORE requiring the router
jest.mock("../../../db/models/User");
jest.mock("../../../db/models/Role");
jest.mock("../../../services/audit-service");
jest.mock("../../../utils/request-helpers");
jest.mock("../../../middleware/auth", () => ({
  authenticateToken: jest.fn((req, res, next) => next()),
  requirePermission: jest.fn(() => (req, res, next) => next()),
  requireMinimumRole: jest.fn(() => (req, res, next) => next()),
}));

// Mock validators with proper factory functions that return middleware
jest.mock("../../../validators", () => ({
  validatePagination: jest.fn(() => (req, res, next) => {
    if (!req.validated) req.validated = {};
    req.validated.pagination = { page: 1, limit: 50, offset: 0 };
    next();
  }),
  validateQuery: jest.fn(() => (req, res, next) => {
    // Mock metadata-driven query validation
    if (!req.validated) req.validated = {};
    if (!req.validated.query) req.validated.query = {};
    req.validated.query.search = req.query.search;
    req.validated.query.filters = req.query.filters || {};
    req.validated.query.sortBy = req.query.sortBy;
    req.validated.query.sortOrder = req.query.sortOrder;
    next();
  }),
  validateIdParam: jest.fn((req, res, next) => {
    // Handle both direct use and factory call
    if (typeof req === "object" && req.params) {
      // Direct middleware use
      const id = parseInt(req.params.id);
      if (!req.validated) req.validated = {};
      req.validated.id = id;
      req.validatedId = id; // Legacy support
      next();
    } else {
      // Called as factory, return middleware
      return (req, res, next) => {
        const id = parseInt(req.params.id);
        if (!req.validated) req.validated = {};
        req.validated.id = id;
        req.validatedId = id; // Legacy support
        next();
      };
    }
  }),
  validateUserCreate: jest.fn((req, res, next) => next()),
  validateProfileUpdate: jest.fn((req, res, next) => next()),
  validateRoleAssignment: jest.fn((req, res, next) => next()),
}));

const request = require("supertest");
const usersRouter = require("../../../routes/users");
const User = require("../../../db/models/User");
const auditService = require("../../../services/audit-service");
const { getClientIp, getUserAgent } = require("../../../utils/request-helpers");
const { authenticateToken, requirePermission } = require("../../../middleware/auth");
const {
  validateUserCreate,
  validateProfileUpdate,
  validateIdParam,
} = require("../../../validators");
const { HTTP_STATUS } = require("../../../config/constants");
const {
  createRouteTestApp,
  setupRouteMocks,
  teardownRouteMocks,
} = require("../../helpers/route-test-setup");

// Create test app
const app = createRouteTestApp(usersRouter, "/api/users");

describe("Users Routes - Validation & Error Handling", () => {
  beforeEach(() => {
    setupRouteMocks({
      getClientIp,
      getUserAgent,
      authenticateToken,
      requirePermission,
      validateIdParam,
      validateUserCreate,
      validateProfileUpdate,
    });
  });

  afterEach(() => {
    teardownRouteMocks();
  });

  describe("GET /api/users - Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      // Arrange
      User.findAll.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await request(app).get("/api/users");

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to retrieve users");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("GET /api/users/:id - Validation", () => {
    it("should return 404 when user not found", async () => {
      // Arrange
      const userId = 999;
      User.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).get(`/api/users/${userId}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.error).toBe("Not Found");
      expect(response.body.message).toBe("User not found");
      expect(response.body.timestamp).toBeDefined();
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      const userId = 2;
      User.findById.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await request(app).get(`/api/users/${userId}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to retrieve user");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("POST /api/users - Validation", () => {
    it("should return 409 for duplicate email", async () => {
      // Arrange
      const userData = { email: "existing@example.com" };
      User.create.mockRejectedValue(new Error("Email already exists"));

      // Act
      const response = await request(app).post("/api/users").send(userData);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
      expect(response.body.error).toBe("Conflict");
      expect(response.body.message).toBe("Email already exists");
      expect(response.body.timestamp).toBeDefined();
    });

    it("should handle database errors during creation", async () => {
      // Arrange
      const userData = { email: "user@example.com" };
      User.create.mockRejectedValue(new Error("Database error"));

      // Act
      const response = await request(app).post("/api/users").send(userData);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to create user");
    });
  });

  describe("PUT /api/users/:id - Validation", () => {
    it("should return 404 when user not found", async () => {
      // Arrange
      const userId = 999;
      const updateData = { email: "updated@example.com" };
      User.findById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.error).toBe("Not Found");
      expect(response.body.message).toBe("User not found");
      expect(response.body.timestamp).toBeDefined();
      expect(User.update).not.toHaveBeenCalled();
    });

    it("should return 400 for no valid fields to update", async () => {
      // Arrange
      const userId = 2;
      const existingUser = { id: userId };
      User.findById.mockResolvedValue(existingUser);
      User.update.mockRejectedValue(new Error("No valid fields to update"));

      // Act
      const response = await request(app).put(`/api/users/${userId}`).send({});

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.error).toBe("Bad Request");
      expect(response.body.message).toBe("No valid fields to update");
    });

    it("should handle database errors during update", async () => {
      // Arrange
      const userId = 2;
      const updateData = { email: "updated@example.com" };
      User.findById.mockResolvedValue({ id: userId });
      User.update.mockRejectedValue(new Error("Database error"));

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to update user");
    });
  });

  describe("DELETE /api/users/:id - Validation", () => {
    it("should prevent self-deletion", async () => {
      // Arrange - Current user is id 1
      const userId = 1;

      // Act
      const response = await request(app).delete(`/api/users/${userId}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.error).toBe("Bad Request");
      expect(response.body.message).toBe("Cannot delete your own account");
      expect(response.body.timestamp).toBeDefined();
      expect(User.findById).not.toHaveBeenCalled();
      expect(User.delete).not.toHaveBeenCalled();
    });

    it("should return 404 when user not found", async () => {
      // Arrange
      const userId = 999;
      User.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).delete(`/api/users/${userId}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.error).toBe("Not Found");
      expect(response.body.message).toBe("User not found");
      expect(response.body.timestamp).toBeDefined();
      expect(User.delete).not.toHaveBeenCalled();
    });

    it("should handle database errors during deletion", async () => {
      // Arrange
      const userId = 2;
      const mockUser = { id: userId };

      User.findById.mockResolvedValue(mockUser);
      User.delete.mockRejectedValue(new Error("Database error"));

      // Act
      const response = await request(app).delete(`/api/users/${userId}`);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to delete user");
    });
  });
});
