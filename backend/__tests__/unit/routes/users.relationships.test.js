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
const express = require("express");
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

let app; // Declare app variable to create fresh in beforeEach

describe("Users Routes - Role Relationships", () => {
  beforeEach(() => {
    // CRITICAL: Reset ALL mocks to prevent contamination
    jest.clearAllMocks();
    
    // Reset middleware to fresh implementations
    authenticateToken.mockImplementation((req, res, next) => {
      req.dbUser = { id: 1, role: 'admin' };
      req.user = { userId: 1, user_id: 1, email: 'admin@example.com' };
      next();
    });
    requirePermission.mockImplementation(() => (req, res, next) => next());
    
    // Reset validators
    validateRoleAssignment.mockImplementation((req, res, next) => next());
    validateIdParam.mockImplementation((req, res, next) => {
      const id = parseInt(req.params.id);
      if (!req.validated) req.validated = {};
      req.validated.id = id;
      req.validatedId = id;
      next();
    });
    
    // Reset audit and request helpers
    getClientIp.mockReturnValue('127.0.0.1');
    getUserAgent.mockReturnValue('Jest Test Agent');
    auditService.log.mockResolvedValue(true);
    
    // Create fresh Express app for each test to avoid state pollution
    app = express();
    app.use(express.json());
    app.use("/api/users", usersRouter);
    
    // Reset middleware to fresh implementations
    authenticateToken.mockImplementation((req, res, next) => {
      req.dbUser = { id: 1, email: "admin@example.com", role: "admin" };
      req.user = { userId: 1 };
      next();
    });
    requirePermission.mockImplementation(() => (req, res, next) => next());
    validateIdParam.mockImplementation((req, res, next) => {
      req.validatedId = parseInt(req.params.id);
      if (!req.validated) req.validated = {};
      req.validated.id = req.validatedId;
      next();
    });
    
    // Reset request helpers
    getClientIp.mockReturnValue("127.0.0.1");
    getUserAgent.mockReturnValue("Jest Test Agent");
  });

  describe("PUT /api/users/:id/role", () => {
    test("should assign role successfully", async () => {
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

      expect(Role.findById).toHaveBeenCalledWith(roleId, expect.any(Object));
      expect(User.setRole).toHaveBeenCalledWith(userId, roleId);
      expect(User.findById).toHaveBeenCalledWith(userId, expect.any(Object)); // Verify findById called after setRole
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: "role_assign",
          resourceType: "user",
          resourceId: userId,
          newValues: { role_id: roleId, role_name: "manager" },
        })
      );
    });

    test("should handle string role_id by converting to number", async () => {
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
      expect(Role.findById).toHaveBeenCalledWith(3, expect.any(Object)); // Converted to number
    });

    test("should return 400 for invalid role_id format", async () => {
      // Arrange
      const userId = 2;

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}/role`)
        .send({ role_id: "invalid" });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(Role.findById).not.toHaveBeenCalled();
    });

    test("should return 404 when role not found", async () => {
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
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(User.setRole).not.toHaveBeenCalled();
    });

    test("should handle database errors during role assignment", async () => {
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
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });
  });
});
