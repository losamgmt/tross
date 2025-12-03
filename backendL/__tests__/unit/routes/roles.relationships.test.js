/**
 * Unit Tests for routes/roles.js - Relationships
 *
 * Tests relationship endpoints and role-user associations.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: GET /api/roles/:id/users
 */

const request = require("supertest");
const Role = require("../../../db/models/Role");
const { authenticateToken, requirePermission } = require("../../../middleware/auth");
const {
  validateRoleCreate,
  validateRoleUpdate,
  validateIdParam,
} = require("../../../validators");
const { getClientIp, getUserAgent } = require("../../../utils/request-helpers");
const {
  createRouteTestApp,
  setupRouteMocks,
  teardownRouteMocks,
} = require("../../helpers/route-test-setup");

// Mock dependencies
jest.mock("../../../db/models/Role");
jest.mock("../../../services/audit-service");
jest.mock("../../../middleware/auth", () => ({
  authenticateToken: jest.fn((req, res, next) => next()),
  requirePermission: jest.fn(() => (req, res, next) => next()),
  requireMinimumRole: jest.fn(() => (req, res, next) => next()),
}));
jest.mock("../../../utils/request-helpers");

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
  validateIdParam: jest.fn(() => (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid ID parameter",
        timestamp: new Date().toISOString(),
      });
    }
    req.validated = req.validated || {};
    req.validated.id = id;
    next();
  }),
  validateRoleCreate: jest.fn((req, res, next) => next()),
  validateRoleUpdate: jest.fn((req, res, next) => next()),
}));

// Create test app with roles router
const rolesRouter = require("../../../routes/roles");
const app = createRouteTestApp(rolesRouter, "/api/roles");

describe("routes/roles.js - Relationships", () => {
  beforeEach(() => {
    setupRouteMocks({
      getClientIp,
      getUserAgent,
      authenticateToken,
      requirePermission,
    });
  });

  afterEach(() => {
    teardownRouteMocks();
  });

  // ===========================
  // GET /api/roles/:id/users - Get Users by Role (with pagination)
  // ===========================
  describe("GET /api/roles/:id/users", () => {
    test("should return users for given role with pagination", async () => {
      // Arrange
      const mockUsers = [
        {
          id: 1,
          email: "user1@test.com",
          first_name: "John",
          last_name: "Doe",
        },
        {
          id: 2,
          email: "user2@test.com",
          first_name: "Jane",
          last_name: "Smith",
        },
      ];
      Role.getUsersByRole.mockResolvedValue({
        users: mockUsers,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });

      // Act
      const response = await request(app).get("/api/roles/1/users");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsers);
      expect(response.body.count).toBe(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(response.body.timestamp).toBeDefined();
      expect(Role.getUsersByRole).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 50,
      });
    });

    test("should return empty array when no users have the role", async () => {
      // Arrange
      Role.getUsersByRole.mockResolvedValue({
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      // Act
      const response = await request(app).get("/api/roles/3/users");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
      expect(response.body.pagination.total).toBe(0);
    });

    test("should return 500 when database error occurs", async () => {
      // Arrange
      const dbError = new Error("Query execution failed");
      Role.getUsersByRole.mockRejectedValue(dbError);

      // Act
      const response = await request(app).get("/api/roles/1/users");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Failed to fetch users by role");
    });

    test("should handle role with many users efficiently", async () => {
      // Arrange
      const manyUsers = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        email: `user${i}@test.com`,
        first_name: `User`,
        last_name: `${i}`,
      }));
      Role.getUsersByRole.mockResolvedValue({
        users: manyUsers,
        pagination: { page: 1, limit: 100, total: 100, totalPages: 1 },
      });

      // Act
      const response = await request(app).get("/api/roles/2/users");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(100);
      expect(response.body.data).toHaveLength(100);
      expect(response.body.pagination.total).toBe(100);
    });

    test("should handle non-numeric role ID gracefully", async () => {
      // Arrange
      // No need to mock since middleware will reject

      // Act
      const response = await request(app).get("/api/roles/abc/users");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation Error");
      expect(Role.getUsersByRole).not.toHaveBeenCalled();
    });

    test("should handle role ID that does not exist", async () => {
      // Arrange
      Role.getUsersByRole.mockResolvedValue({
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      // Act
      const response = await request(app).get("/api/roles/999/users");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
      expect(response.body.pagination.total).toBe(0);
    });
  });
});
