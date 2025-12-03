/**
 * Unit Tests: users routes - CRUD Operations
 * Tests GET /api/users, GET /api/users/:id, POST /api/users, PUT /api/users/:id, DELETE /api/users/:id
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
const express = require("express");
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

// Create test Express app
const app = express();
app.use(express.json());
app.use("/api/users", usersRouter);

describe("Users Routes - CRUD Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getClientIp.mockReturnValue("127.0.0.1");
    getUserAgent.mockReturnValue("Jest Test Agent");
    authenticateToken.mockImplementation((req, res, next) => {
      req.dbUser = { id: 1, email: "admin@example.com", role: "admin" };
      next();
    });
    requirePermission.mockImplementation(() => (req, res, next) => next());
    validateIdParam.mockImplementation((req, res, next) => {
      req.validatedId = parseInt(req.params.id);
      next();
    });
    validateUserCreate.mockImplementation((req, res, next) => next());
    validateProfileUpdate.mockImplementation((req, res, next) => next());
  });

  afterEach(() => jest.resetAllMocks());

  describe("GET /api/users", () => {
    it("should return all users successfully", async () => {
      const mockUsers = [
        {
          id: 1,
          email: "admin@example.com",
          role_name: "admin",
          is_active: true,
        },
        {
          id: 2,
          email: "user@example.com",
          role_name: "client",
          is_active: true,
        },
      ];
      // Mock findAll() to return paginated response
      User.findAll.mockResolvedValue({
        data: mockUsers,
        pagination: {
          page: 1,
          limit: 50,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const response = await request(app).get("/api/users");

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsers);
      expect(response.body.count).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
      expect(User.findAll).toHaveBeenCalledTimes(1);
    });

    it("should handle database errors gracefully", async () => {
      User.findAll.mockRejectedValue(new Error("Database connection failed"));

      const response = await request(app).get("/api/users");

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe("Internal Server Error");
    });

    it("should return empty array when no users exist", async () => {
      User.findAll.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const response = await request(app).get("/api/users");

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return user by id successfully", async () => {
      const userId = 2;
      const mockUser = {
        id: userId,
        email: "user@example.com",
        first_name: "John",
        last_name: "Doe",
        role_name: "client",
        is_active: true,
      };
      User.findById.mockResolvedValue(mockUser);

      const response = await request(app).get(`/api/users/${userId}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data).toEqual(mockUser);
      expect(User.findById).toHaveBeenCalledWith(userId);
    });

    it("should return 404 when user not found", async () => {
      User.findById.mockResolvedValue(null);

      const response = await request(app).get("/api/users/999");

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.message).toBe("User not found");
    });

    it("should handle database errors gracefully", async () => {
      User.findById.mockRejectedValue(new Error("Database connection failed"));

      const response = await request(app).get("/api/users/2");

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    it("should use validatedId from validateIdParam middleware", async () => {
      const mockUser = { id: 5, email: "test@example.com" };
      User.findById.mockResolvedValue(mockUser);

      await request(app).get("/api/users/5");

      expect(User.findById).toHaveBeenCalledWith(5);
    });
  });

  describe("POST /api/users", () => {
    it("should create a new user successfully", async () => {
      const newUserData = {
        email: "newuser@example.com",
        first_name: "New",
        last_name: "User",
        role_id: 2,
      };
      const createdUser = { id: 3, ...newUserData, is_active: true };

      User.create.mockResolvedValue(createdUser);
      auditService.log.mockResolvedValue(true);

      const response = await request(app).post("/api/users").send(newUserData);

      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(response.body.data).toEqual(createdUser);
      expect(User.create).toHaveBeenCalledWith(newUserData);
    });

    it("should create user without role_id (defaults to client)", async () => {
      const newUserData = {
        email: "newuser@example.com",
        first_name: "New",
        last_name: "User",
      };
      const createdUser = {
        id: 3,
        ...newUserData,
        role_id: 2,
        is_active: true,
      };

      User.create.mockResolvedValue(createdUser);
      auditService.log.mockResolvedValue(true);

      const response = await request(app).post("/api/users").send(newUserData);

      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(User.create).toHaveBeenCalledWith(newUserData);
    });

    it("should return 409 for duplicate email", async () => {
      User.create.mockRejectedValue(new Error("Email already exists"));

      const response = await request(app)
        .post("/api/users")
        .send({ email: "existing@example.com" });

      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
      expect(response.body.message).toBe("Email already exists");
    });

    it("should handle database errors during creation", async () => {
      User.create.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .post("/api/users")
        .send({ email: "user@example.com" });

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    it("should handle audit logging failure gracefully", async () => {
      User.create.mockResolvedValue({ id: 3, email: "user@example.com" });
      auditService.log.mockRejectedValue(new Error("Audit failed"));

      const response = await request(app)
        .post("/api/users")
        .send({ email: "user@example.com" });

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe("PUT /api/users/:id", () => {
    it("should update user successfully", async () => {
      const userId = 2;
      const updateData = {
        email: "updated@example.com",
        first_name: "Updated",
        last_name: "Name",
        is_active: true,
      };
      const existingUser = { id: userId, email: "old@example.com" };
      const updatedUser = { id: userId, ...updateData };

      User.findById.mockResolvedValue(existingUser);
      User.update.mockResolvedValue(updatedUser);
      auditService.log.mockResolvedValue(true);

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send(updateData);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data).toEqual(updatedUser);
      expect(User.update).toHaveBeenCalledWith(userId, updateData);
    });

    it("should return 404 when user not found", async () => {
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .put("/api/users/999")
        .send({ email: "updated@example.com" });

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(User.update).not.toHaveBeenCalled();
    });

    it("should return 400 for no valid fields to update", async () => {
      User.findById.mockResolvedValue({ id: 2 });
      User.update.mockRejectedValue(new Error("No valid fields to update"));

      const response = await request(app).put("/api/users/2").send({});

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it("should handle database errors during update", async () => {
      User.findById.mockResolvedValue({ id: 2 });
      User.update.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .put("/api/users/2")
        .send({ email: "updated@example.com" });

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    it("should update only provided fields", async () => {
      const partialUpdate = { first_name: "NewFirst" };
      const existingUser = { id: 2, email: "user@example.com" };
      const updatedUser = { ...existingUser, ...partialUpdate };

      User.findById.mockResolvedValue(existingUser);
      User.update.mockResolvedValue(updatedUser);
      auditService.log.mockResolvedValue(true);

      const response = await request(app)
        .put("/api/users/2")
        .send(partialUpdate);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(User.update).toHaveBeenCalledWith(2, partialUpdate);
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete user successfully", async () => {
      const mockUser = { id: 2, email: "user@example.com", is_active: true };

      User.findById.mockResolvedValue(mockUser);
      User.delete.mockResolvedValue(mockUser);
      auditService.log.mockResolvedValue(true);

      const response = await request(app).delete("/api/users/2");

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(User.delete).toHaveBeenCalledWith(2); // DELETE = permanent removal
    });

    it("should prevent self-deletion", async () => {
      const response = await request(app).delete("/api/users/1");

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toBe("Cannot delete your own account");
      expect(User.findById).not.toHaveBeenCalled();
    });

    it("should return 404 when user not found", async () => {
      User.findById.mockResolvedValue(null);

      const response = await request(app).delete("/api/users/999");

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(User.delete).not.toHaveBeenCalled();
    });

    it("should handle database errors during deletion", async () => {
      User.findById.mockResolvedValue({ id: 2 });
      User.delete.mockRejectedValue(new Error("Database error"));

      const response = await request(app).delete("/api/users/2");

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });
});
