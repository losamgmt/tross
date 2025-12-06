/**
 * Unit Tests: Role Routes - Relationships
 *
 * Tests GET /api/roles/:id/users endpoint BEHAVIOR:
 * - Returns list of users belonging to a role
 * - Handles empty results gracefully
 * - Returns proper error responses
 * - Supports pagination
 *
 * NOTE: Tests focus on BEHAVIOR not implementation details.
 * We don't test exact parameters passed to internal services.
 */

const request = require("supertest");
const express = require("express");

// Mock dependencies before requiring the router
jest.mock("../../../services/generic-entity-service");
jest.mock("../../../db/models/Role");
jest.mock("../../../middleware/auth", () => ({
  authenticateToken: (req, res, next) => {
    req.user = { sub: "auth0|admin", userId: 1 };
    req.dbUser = { id: 1, role_id: 1, role: "admin" };
    next();
  },
  requirePermission: () => (req, res, next) => next(),
}));
jest.mock("../../../middleware/row-level-security", () => ({
  enforceRLS: () => (req, res, next) => next(),
}));
jest.mock("../../../services/audit-service");
jest.mock("../../../config/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const GenericEntityService = require("../../../services/generic-entity-service");
const rolesRouter = require("../../../routes/roles");

const app = express();
app.use(express.json());
app.use("/api/roles", rolesRouter);

describe("routes/roles.js - GET /api/roles/:id/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Success Scenarios", () => {
    test("should return users belonging to the role", async () => {
      // Arrange - mock returns users
      GenericEntityService.findAll.mockResolvedValue({
        data: [
          { id: 1, email: "user1@test.com", first_name: "User", last_name: "One" },
          { id: 2, email: "user2@test.com", first_name: "User", last_name: "Two" },
        ],
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
      });

      // Act
      const response = await request(app)
        .get("/api/roles/1/users")
        .set("Authorization", "Bearer test-token");

      // Assert BEHAVIOR: returns success with user data
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty("email");
      expect(response.body.pagination).toBeDefined();
    });

    test("should return empty array when no users have the role", async () => {
      // Arrange
      GenericEntityService.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      // Act
      const response = await request(app)
        .get("/api/roles/999/users")
        .set("Authorization", "Bearer test-token");

      // Assert BEHAVIOR: returns success with empty data
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    test("should support pagination query parameters", async () => {
      // Arrange
      GenericEntityService.findAll.mockResolvedValue({
        data: [{ id: 5, email: "user5@test.com" }],
        pagination: { page: 2, limit: 5, total: 10, totalPages: 2 },
      });

      // Act
      const response = await request(app)
        .get("/api/roles/1/users?page=2&limit=5")
        .set("Authorization", "Bearer test-token");

      // Assert BEHAVIOR: pagination is reflected in response
      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe("Error Scenarios", () => {
    test("should return 500 when database error occurs", async () => {
      // Arrange
      GenericEntityService.findAll.mockRejectedValue(new Error("Database error"));

      // Act
      const response = await request(app)
        .get("/api/roles/1/users")
        .set("Authorization", "Bearer test-token");

      // Assert BEHAVIOR: returns error status
      expect(response.status).toBe(500);
    });

    test("should return 400 for non-numeric role ID", async () => {
      // Act
      const response = await request(app)
        .get("/api/roles/abc/users")
        .set("Authorization", "Bearer test-token");

      // Assert BEHAVIOR: rejects invalid input
      expect(response.status).toBe(400);
    });
  });
});
