/**
 * Unit Tests for routes/users.js - Role Relationships
 *
 * Tests role assignment and relationship management endpoints.
 *
 * Tests are split for maintainability:
 * - users.crud.test.js - Core CRUD operations
 * - users.validation.test.js - Input validation & error handling
 * - users.relationships.test.js (this file) - Role assignment endpoints
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
  validateRoleAssignment: jest.fn((req, res, next) => next()),
  validateUserCreate: jest.fn((req, res, next) => next()),
  validateProfileUpdate: jest.fn((req, res, next) => next()),
}));

const request = require("supertest");
const usersRouter = require("../../../routes/users");
const User = require("../../../db/models/User");
const Role = require("../../../db/models/Role");
const auditService = require("../../../services/audit-service");
const { getClientIp, getUserAgent } = require("../../../utils/request-helpers");
const { authenticateToken, requirePermission } = require("../../../middleware/auth");
const {
  validateRoleAssignment,
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

describe("Users Routes - Role Relationships", () => {
  beforeEach(() => {
    setupRouteMocks({
      getClientIp,
      getUserAgent,
      authenticateToken,
      requirePermission,
      validateIdParam,
      validateRoleAssignment,
    });
  });

  afterEach(() => {
    teardownRouteMocks();
  });

  describe("PUT /api/users/:id/role", () => {
    it("should assign role successfully", async () => {
      // Arrange
      const userId = 2;
      const roleId = 3;
      const mockRole = { id: roleId, name: "manager" };
      const mockUpdatedUser = { id: userId, email: "user@test.com", role_id: roleId, role: "manager" };

      Role.findById.mockResolvedValue(mockRole);
      User.setRole.mockResolvedValue(true);
      User.findById.mockResolvedValue(mockUpdatedUser); // Mock findById after setRole
      auditService.log.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}/role`)
        .send({ role_id: roleId });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Role 'manager' assigned successfully",
      );
      expect(response.body.timestamp).toBeDefined();

      expect(Role.findById).toHaveBeenCalledWith(roleId);
      expect(User.setRole).toHaveBeenCalledWith(userId, roleId);
      expect(User.findById).toHaveBeenCalledWith(userId); // Verify findById called after setRole
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 1,
        action: "role_assign",
        resourceType: "user",
        resourceId: userId,
        newValues: { role_id: roleId, role_name: "manager" },
        ipAddress: "192.168.1.1",
        userAgent: "jest-test-agent",
      });
    });

    it("should handle string role_id by converting to number", async () => {
      // Arrange
      const userId = 2;
      const roleId = "3"; // String instead of number
      const mockRole = { id: 3, name: "manager" };
      const mockUpdatedUser = { id: userId, role_id: 3, role: "manager" };

      Role.findById.mockResolvedValue(mockRole);
      User.setRole.mockResolvedValue(true);
      User.findById.mockResolvedValue(mockUpdatedUser); // Mock findById after setRole
      auditService.log.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}/role`)
        .send({ role_id: roleId });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(Role.findById).toHaveBeenCalledWith(3); // Converted to number
    });

    it("should return 400 for invalid role_id format", async () => {
      // Arrange
      const userId = 2;

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}/role`)
        .send({ role_id: "invalid" });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Bad Request");
      expect(response.body.message).toBe("role_id must be a number");
      expect(response.body.timestamp).toBeDefined();
      expect(Role.findById).not.toHaveBeenCalled();
    });

    it("should return 404 when role not found", async () => {
      // Arrange
      const userId = 2;
      const roleId = 999;
      Role.findById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}/role`)
        .send({ role_id: roleId });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Role Not Found");
      expect(response.body.message).toBe(`Role with ID ${roleId} not found`);
      expect(response.body.timestamp).toBeDefined();
      expect(User.setRole).not.toHaveBeenCalled();
    });

    it("should handle database errors during role assignment", async () => {
      // Arrange
      const userId = 2;
      const roleId = 3;
      const mockRole = { id: roleId, name: "manager" };

      Role.findById.mockResolvedValue(mockRole);
      User.setRole.mockRejectedValue(new Error("Database error"));

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}/role`)
        .send({ role_id: roleId });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to assign role");
    });
  });
});
