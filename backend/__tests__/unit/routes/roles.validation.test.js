/**
 * Unit Tests for routes/roles.js - Validation & Error Handling
 *
 * Tests validation logic, protected role constraints, error scenarios,
 * and middleware integration for role routes.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Error handling, constraints, middleware integration
 * 
 * PHASE 4 UPDATE:
 * Routes now use GenericEntityService instead of Role model.
 * Tests mock GenericEntityService via centralized route-test-setup.js.
 */

const request = require("supertest");
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
  createGenericEntityServiceMock,
  setupRouteMocks,
  setupGenericEntityServiceMock,
  teardownRouteMocks,
} = require("../../helpers/route-test-setup");

// Mock GenericEntityService (Phase 4: replaces Role model)
jest.mock("../../../services/generic-entity-service", () => 
  require("../../helpers/route-test-setup").createGenericEntityServiceMock()
);
const GenericEntityService = require("../../../services/generic-entity-service");

// Mock other dependencies
jest.mock("../../../services/audit-service");
jest.mock("../../../db/helpers/default-value-helper", () => ({
  getNextOrdinalValue: jest.fn().mockResolvedValue(50),
}));
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
  // CRITICAL: Direct middleware CANNOT be jest.fn() wrapped - breaks Express chain
  validateRoleCreate: (req, res, next) => next(),
  validateRoleUpdate: (req, res, next) => next(),
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
    
    // Setup GenericEntityService mocks with sensible defaults
    setupGenericEntityServiceMock(GenericEntityService, 'role', {
      defaultRecord: { id: 1, name: 'admin', priority: 100, created_at: new Date().toISOString() },
      defaultList: [
        { id: 1, name: 'admin', priority: 100 },
        { id: 2, name: 'manager', priority: 80 },
      ],
      defaultCount: 2,
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
      GenericEntityService.findAll.mockRejectedValue(dbError);

      // Act
      const response = await request(app).get("/api/roles");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  // ===========================
  // GET /api/roles/:id - Error Handling
  // ===========================
  describe("GET /api/roles/:id - Error Handling", () => {
    test("should return 404 when role not found", async () => {
      // Arrange
      GenericEntityService.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).get("/api/roles/999");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test("should return 500 when database error occurs", async () => {
      // Arrange
      const dbError = new Error("Database query failed");
      GenericEntityService.findById.mockRejectedValue(dbError);

      // Act
      const response = await request(app).get("/api/roles/1");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
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
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(GenericEntityService.create).not.toHaveBeenCalled();
    });

    test("should return 400 when name is null", async () => {
      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: null });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toBeDefined();
    });

    test("should return 409 when role name already exists", async () => {
      // Arrange - GenericEntityService.create throws on duplicate
      const duplicateError = new Error("Role name already exists");
      duplicateError.code = '23505'; // PostgreSQL unique violation
      GenericEntityService.create.mockRejectedValue(duplicateError);

      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: "admin" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test("should return 500 when database error occurs during creation", async () => {
      // Arrange
      const dbError = new Error("Database insertion failed");
      GenericEntityService.create.mockRejectedValue(dbError);

      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: "supervisor" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test("should handle audit logging failure gracefully", async () => {
      // Arrange
      const mockCreatedRole = {
        id: 5,
        name: "analyst",
        created_at: new Date(),
      };
      GenericEntityService.create.mockResolvedValue(mockCreatedRole);
      auditService.log.mockRejectedValue(new Error("Audit service down"));

      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: "analyst" });

      // Assert - Route should still succeed even if audit fails (non-blocking)
      expect(response.status).toBe(HTTP_STATUS.CREATED);
    });

    test("should handle GenericEntityService.create returning undefined", async () => {
      // Arrange
      GenericEntityService.create.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post("/api/roles")
        .send({ name: "test" });

      // Assert - Should throw error trying to access .id on undefined
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  // ===========================
  // PATCH /api/roles/:id - Validation
  // ===========================
  describe("PATCH /api/roles/:id - Validation", () => {
    test("should return 404 when role not found before update", async () => {
      // Arrange
      GenericEntityService.findById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .patch("/api/roles/999")
        .send({ name: "newname" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(GenericEntityService.update).not.toHaveBeenCalled();
    });

    test("should return 400 when attempting to modify protected role name", async () => {
      // Arrange - findById returns admin role, update throws protected error
      const adminRole = { id: 1, name: "admin", created_at: new Date() };
      GenericEntityService.findById.mockResolvedValue(adminRole);
      GenericEntityService.update.mockRejectedValue(
        new Error("Cannot modify name on system role: admin")
      );

      // Act
      const response = await request(app)
        .patch("/api/roles/1")
        .send({ name: "superadmin" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test("should return 409 when new name already exists", async () => {
      // Arrange
      const oldRole = { id: 3, name: "manager", created_at: new Date() };
      GenericEntityService.findById.mockResolvedValue(oldRole);
      const duplicateError = new Error("Role name already exists");
      duplicateError.code = '23505';
      GenericEntityService.update.mockRejectedValue(duplicateError);

      // Act
      const response = await request(app)
        .patch("/api/roles/3")
        .send({ name: "admin" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test("should return 404 when role deleted during update (race condition)", async () => {
      // Arrange
      const oldRole = { id: 3, name: "manager", created_at: new Date() };
      GenericEntityService.findById.mockResolvedValue(oldRole);
      GenericEntityService.update.mockResolvedValue(null); // Returns null if not found

      // Act
      const response = await request(app)
        .patch("/api/roles/3")
        .send({ name: "supervisor" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test("should return 500 when unexpected database error occurs", async () => {
      // Arrange
      const oldRole = { id: 3, name: "manager", created_at: new Date() };
      GenericEntityService.findById.mockResolvedValue(oldRole);
      GenericEntityService.update.mockRejectedValue(new Error("Connection timeout"));

      // Act
      const response = await request(app)
        .patch("/api/roles/3")
        .send({ name: "supervisor" });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test("should handle GenericEntityService.update returning undefined", async () => {
      // Arrange
      const oldRole = { id: 3, name: "manager" };
      GenericEntityService.findById.mockResolvedValue(oldRole);
      GenericEntityService.update.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .patch("/api/roles/3")
        .send({ name: "supervisor" });

      // Assert - Will try to log audit with undefined
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  // ===========================
  // DELETE /api/roles/:id - Validation
  // ===========================
  describe("DELETE /api/roles/:id - Validation", () => {
    test("should return 400 when attempting to delete protected role", async () => {
      // Arrange
      GenericEntityService.delete.mockRejectedValue(
        new Error("Cannot delete system role: admin")
      );

      // Act
      const response = await request(app).delete("/api/roles/1");

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test("should return 400 when role has assigned users", async () => {
      // Arrange - GenericEntityService throws with user count in message
      GenericEntityService.delete.mockRejectedValue(
        new Error("Cannot delete role: 3 user(s) are assigned to this role"),
      );

      // Act
      const response = await request(app).delete("/api/roles/3");

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("user(s) are assigned");
    });

    test("should return 404 when role not found", async () => {
      // Arrange - GenericEntityService.delete returns null for not-found (doesn't throw)
      GenericEntityService.delete.mockResolvedValue(null);

      // Act
      const response = await request(app).delete("/api/roles/999");

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test("should return 500 when unexpected database error occurs", async () => {
      // Arrange
      GenericEntityService.delete.mockRejectedValue(new Error("Connection pool exhausted"));

      // Act
      const response = await request(app).delete("/api/roles/5");

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
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

    // Note: Validator behavior testing is covered in validator unit tests
    // Direct validators are plain functions (not jest.fn()) and cannot be mocked in route tests

    test("PATCH /api/roles/:id should validate ID param", async () => {
      // Act - validateIdParam mock now validates properly
      const response = await request(app)
        .patch("/api/roles/invalid")
        .send({ name: "test" });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
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
