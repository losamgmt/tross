/**
 * Unit Tests for routes/roles.js - Validation & Error Handling
 *
 * Tests validation logic, protected role constraints, error scenarios,
 * and middleware integration for role routes.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Error handling, constraints, middleware integration
 */

const request = require("supertest");
const Role = require("../../../db/models/Role");
const auditService = require("../../../services/audit-service");
const { authenticateToken, requirePermission } = require("../../../middleware/auth");
const {
  validateRoleCreate,
  validateRoleUpdate,
  validateIdParam,
} = require("../../../validators");
const { HTTP_STATUS } = require("../../../config/constants");
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
      return res.status(400).json({ error: "Invalid ID" });
    }
    req.validated = req.validated || {};
    req.validated.id = id;
    req.validatedId = id;
    next();
  }),
  validateRoleCreate: jest.fn((req, res, next) => next()),
  validateRoleUpdate: jest.fn((req, res, next) => next()),
}));

// Create test app with roles router - require AFTER mocks are set up
const rolesRouter = require("../../../routes/roles");
const app = createRouteTestApp(rolesRouter, "/api/roles");

describe("routes/roles.js - Validation & Error Handling", () => {
  beforeEach(() => {
    setupRouteMocks({
      getClientIp,
      getUserAgent,
      authenticateToken,
      requirePermission,
      validateIdParam,
      validateRoleCreate,
      validateRoleUpdate,
    });
  });

  afterEach(() => {
    teardownRouteMocks();
  });

  // ===========================
  // GET /api/roles - Error Handling
  // ===========================
  describe("GET /api/roles - Error Handling", () => {
    test("should return 500 when database error occurs", async () => {
      // Arrange
      const dbError = new Error("Database connection failed");
      Role.findAll.mockRejectedValue(dbError);

      // Act
      const response = await request(app).get("/api/roles");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Failed to fetch roles");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  // ===========================
  // GET /api/roles/:id - Error Handling
  // ===========================
  describe("GET /api/roles/:id - Error Handling", () => {
    test("should return 404 when role not found", async () => {
      // Arrange
      Role.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).get("/api/roles/999");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Role not found");
      expect(response.body.timestamp).toBeDefined();
    });

    test("should return 500 when database error occurs", async () => {
      // Arrange
      const dbError = new Error("Database query failed");
      Role.findById.mockRejectedValue(dbError);

      // Act
      const response = await request(app).get("/api/roles/1");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Failed to fetch role");
    });
  });

  // ===========================
  // POST /api/roles - Validation
  // ===========================
  describe("POST /api/roles - Validation", () => {
    test("should return 400 when name is missing", async () => {
      // Act
      const response = await request(app).post("/api/roles").send({});

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Bad Request");
      expect(response.body.message).toBe("Role name is required");
      expect(Role.create).not.toHaveBeenCalled();
    });

    test("should return 400 when name is null", async () => {
      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: null });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toBe("Role name is required");
    });

    test("should return 409 when role name already exists", async () => {
      // Arrange
      const duplicateError = new Error("Role name already exists");
      Role.create.mockRejectedValue(duplicateError);

      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: "admin" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Conflict");
      expect(response.body.message).toBe("Role name already exists");
    });

    test("should return 500 when database error occurs during creation", async () => {
      // Arrange
      const dbError = new Error("Database insertion failed");
      Role.create.mockRejectedValue(dbError);

      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: "supervisor" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to create role");
    });

    test("should handle audit logging failure gracefully", async () => {
      // Arrange
      const mockCreatedRole = {
        id: 5,
        name: "analyst",
        created_at: new Date(),
      };
      Role.create.mockResolvedValue(mockCreatedRole);
      auditService.log.mockRejectedValue(new Error("Audit service down"));

      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: "analyst" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    test("should handle Role.create returning undefined", async () => {
      // Arrange
      Role.create.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: "test" });

      // Assert - Should throw error trying to access .id on undefined
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  // ===========================
  // PUT /api/roles/:id - Validation
  // ===========================
  describe("PUT /api/roles/:id - Validation", () => {
    test("should return 404 when role not found before update", async () => {
      // Arrange
      Role.findById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .put("/api/roles/999")
        .send({ name: "newname" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Role not found");
      expect(response.body.message).toBe("Role not found");
      expect(Role.update).not.toHaveBeenCalled();
    });

    test("should return 400 when attempting to modify protected role", async () => {
      // Arrange
      const adminRole = { id: 1, name: "admin", created_at: new Date() };
      Role.findById.mockResolvedValue(adminRole);
      Role.update.mockRejectedValue(new Error("Cannot modify protected role"));

      // Act
      const response = await request(app)
        .put("/api/roles/1")
        .send({ name: "superadmin" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Bad Request");
      expect(response.body.message).toBe("Cannot modify protected role");
    });

    test("should return 409 when new name already exists", async () => {
      // Arrange
      const oldRole = { id: 3, name: "manager", created_at: new Date() };
      Role.findById.mockResolvedValue(oldRole);
      Role.update.mockRejectedValue(new Error("Role name already exists"));

      // Act
      const response = await request(app)
        .put("/api/roles/3")
        .send({ name: "admin" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Conflict");
      expect(response.body.message).toBe("Role name already exists");
    });

    test("should return 404 when role deleted during update (race condition)", async () => {
      // Arrange
      const oldRole = { id: 3, name: "manager", created_at: new Date() };
      Role.findById.mockResolvedValue(oldRole);
      Role.update.mockRejectedValue(new Error("Role not found"));

      // Act
      const response = await request(app)
        .put("/api/roles/3")
        .send({ name: "supervisor" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.error).toBe("Role not found");
      expect(response.body.message).toBe("Role not found");
    });

    test("should return 500 when unexpected database error occurs", async () => {
      // Arrange
      const oldRole = { id: 3, name: "manager", created_at: new Date() };
      Role.findById.mockResolvedValue(oldRole);
      Role.update.mockRejectedValue(new Error("Connection timeout"));

      // Act
      const response = await request(app)
        .put("/api/roles/3")
        .send({ name: "supervisor" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to update role");
    });

    test("should handle Role.update returning undefined", async () => {
      // Arrange
      const oldRole = { id: 3, name: "manager" };
      Role.findById.mockResolvedValue(oldRole);
      Role.update.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .put("/api/roles/3")
        .send({ name: "supervisor" });

      // Assert - Will try to log audit with undefined
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  // ===========================
  // DELETE /api/roles/:id - Validation
  // ===========================
  describe("DELETE /api/roles/:id - Validation", () => {
    test("should return 400 when attempting to delete protected role", async () => {
      // Arrange
      Role.delete.mockRejectedValue(new Error("Cannot delete protected role"));

      // Act
      const response = await request(app).delete("/api/roles/1");

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Bad Request");
      expect(response.body.message).toBe("Cannot delete protected role");
    });

    test("should return 400 when role has assigned users", async () => {
      // Arrange
      Role.delete.mockRejectedValue(
        new Error("Cannot delete role: users are assigned to this role"),
      );

      // Act
      const response = await request(app).delete("/api/roles/3");

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Cannot delete role: users are assigned to this role",
      );
    });

    test("should return 404 when role not found", async () => {
      // Arrange
      Role.delete.mockRejectedValue(new Error("Role not found"));

      // Act
      const response = await request(app).delete("/api/roles/999");

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Role not found");
      expect(response.body.message).toBe("Role not found");
    });

    test("should return 500 when unexpected database error occurs", async () => {
      // Arrange
      Role.delete.mockRejectedValue(new Error("Database error"));

      // Act
      const response = await request(app).delete("/api/roles/5");

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to delete role");
    });

    test("should handle NaN ID gracefully", async () => {
      // Act - validator returns 400 for invalid ID format
      const response = await request(app).delete("/api/roles/abc");

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");
    });
  });

  // ===========================
  // Middleware Integration Tests
  // ===========================
  describe("Middleware Integration", () => {
    test("POST /api/roles should require authentication", async () => {
      // Arrange
      authenticateToken.mockImplementation((req, res) => {
        res.status(401).json({ error: "Unauthorized" });
      });

      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: "test" });

      // Assert
      expect(response.status).toBe(401);
      expect(authenticateToken).toHaveBeenCalled();
    });

    // Note: Permission authorization testing is covered in permissions.test.js (67 tests)
    // Testing middleware behavior after router loads is not possible with current architecture

    test("POST /api/roles should validate role creation", async () => {
      // Arrange
      validateRoleCreate.mockImplementation((req, res) => {
        res.status(400).json({ error: "Validation failed" });
      });

      // Act
      const response = await request(app).post("/api/roles").send({ name: "" });

      // Assert
      expect(response.status).toBe(400);
      expect(validateRoleCreate).toHaveBeenCalled();
    });

    test("PUT /api/roles/:id should validate ID param", async () => {
      // Act - validateIdParam mock now validates properly
      const response = await request(app)
        .put("/api/roles/invalid")
        .send({ name: "test" });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    test("PUT /api/roles/:id should validate role update", async () => {
      // Arrange
      validateRoleUpdate.mockImplementation((req, res) => {
        res.status(400).json({ error: "Validation failed" });
      });

      // Act
      const response = await request(app)
        .put("/api/roles/1")
        .send({ name: "" });

      // Assert
      expect(response.status).toBe(400);
      expect(validateRoleUpdate).toHaveBeenCalled();
    });

    test("DELETE /api/roles/:id should require authentication", async () => {
      // Arrange
      authenticateToken.mockImplementation((req, res) => {
        res.status(401).json({ error: "Unauthorized" });
      });

      // Act
      const response = await request(app).delete("/api/roles/1");

      // Assert
      expect(response.status).toBe(401);
      expect(authenticateToken).toHaveBeenCalled();
    });
  });
});
