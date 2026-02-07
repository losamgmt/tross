/**
 * Unit Tests for routes/auth.js - Profile Operations
 *
 * Tests user profile CRUD operations (GET/PUT /api/auth/me).
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Profile retrieval and updates
 *
 * NOTE: PUT /api/auth/me now uses GenericEntityService.findByField and
 * GenericEntityService.update (strangler-fig Phase 4 complete)
 */

const request = require("supertest");
const authRoutes = require("../../../routes/auth");
// User model removed - using GenericEntityService (strangler-fig Phase 4)
const GenericEntityService = require("../../../services/generic-entity-service");
const { authenticateToken } = require("../../../middleware/auth");
const { validateProfileUpdate } = require("../../../validators");
const { getClientIp, getUserAgent } = require("../../../utils/request-helpers");
const {
  createRouteTestApp,
  setupRouteMocks,
  teardownRouteMocks,
} = require("../../helpers/route-test-setup");

// Mock dependencies
jest.mock("../../../services/user-data");
jest.mock("../../../services/token-service");
jest.mock("../../../services/audit-service");
jest.mock("../../../services/generic-entity-service");
jest.mock("../../../middleware/auth", () => ({
  authenticateToken: jest.fn((req, res, next) => next()),
  requirePermission: jest.fn(() => (req, res, next) => next()),
  requireMinimumRole: jest.fn(() => (req, res, next) => next()),
}));
jest.mock("../../../validators", () => {
  const ResponseFormatter = require("../../../utils/response-formatter");
  return {
    validateProfileUpdate: jest.fn(() => (req, res, next) => next()),
    validateRefreshToken: jest.fn(() => (req, res, next) => next()),
    validateIdParam: jest.fn(
      ({ paramName = "id" } = {}) =>
        (req, res, next) => {
          const value = parseInt(req.params[paramName], 10);
          if (isNaN(value) || value < 1) {
            return ResponseFormatter.badRequest(res, `Invalid ${paramName}`);
          }
          if (!req.validated) req.validated = {};
          req.validated[paramName] = value;
          next();
        },
    ),
  };
});
jest.mock("../../../utils/request-helpers");
jest.mock("jsonwebtoken");

// Create test app with auth router
const app = createRouteTestApp(authRoutes, "/api/auth");

describe("routes/auth.js - Profile Operations", () => {
  beforeEach(() => {
    setupRouteMocks(
      {
        getClientIp,
        getUserAgent,
        authenticateToken,
        validateProfileUpdate,
      },
      {
        dbUser: {
          id: 1,
          auth0_id: "auth0|123",
          email: "test@example.com",
          role: "user",
          first_name: "Test",
          last_name: "User",
          is_active: true,
        },
      },
    );

    // Additional auth-specific middleware setup
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = {
        sub: "auth0|123",
        userId: 1,
        email: "test@example.com",
        role: "user",
      };
      req.dbUser = {
        id: 1,
        auth0_id: "auth0|123",
        email: "test@example.com",
        role: "user",
        first_name: "Test",
        last_name: "User",
        is_active: true,
      };
      next();
    });

    // Reset GenericEntityService mock
    GenericEntityService.findByField = jest.fn();
    GenericEntityService.update = jest.fn();
  });

  afterEach(() => {
    teardownRouteMocks();
  });

  // ===========================
  // GET /api/auth/me - Get Profile
  // ===========================
  describe("GET /api/auth/me", () => {
    test("should return authenticated user profile", async () => {
      // Act
      const response = await request(app).get("/api/auth/me");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 1,
        email: "test@example.com",
        role: "user",
        name: "Test User",
      });
      expect(response.body.timestamp).toBeDefined();
    });

    test("should format user name correctly", async () => {
      // Act
      const response = await request(app).get("/api/auth/me");

      // Assert
      expect(response.body.data.name).toBe("Test User");
    });

    test("should handle user with no name fields", async () => {
      // Arrange
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { sub: "auth0|123", userId: 1 };
        req.dbUser = {
          id: 1,
          auth0_id: "auth0|123",
          email: "test@example.com",
          role: "user",
          first_name: null,
          last_name: null,
        };
        next();
      });

      // Act
      const response = await request(app).get("/api/auth/me");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("User");
    });
  });

  // ===========================
  // PUT /api/auth/me - Update Profile
  // ===========================
  describe("PUT /api/auth/me", () => {
    test("should update user profile successfully", async () => {
      // Arrange
      const updates = {
        first_name: "Updated",
        last_name: "Name",
      };

      // Mock GenericEntityService.findByField for finding by auth0_id
      GenericEntityService.findByField.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
        email: "test@example.com",
        role: "user",
        first_name: "Test",
        last_name: "User",
      });

      // Mock GenericEntityService.update to return updated user
      GenericEntityService.update.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
        email: "test@example.com",
        role: "user",
        first_name: "Updated",
        last_name: "Name",
      });

      // Act
      const response = await request(app).put("/api/auth/me").send(updates);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Profile updated successfully");
      expect(response.body.data.first_name).toBe("Updated");
      expect(response.body.data.last_name).toBe("Name");
      expect(GenericEntityService.findByField).toHaveBeenCalledWith(
        "user",
        "auth0_id",
        "auth0|123",
      );
      expect(GenericEntityService.update).toHaveBeenCalledWith(
        "user",
        1,
        updates,
      );
    });

    test("should update single field successfully", async () => {
      // Arrange
      const updates = { first_name: "NewName" };

      GenericEntityService.findByField.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
        first_name: "Old",
      });

      GenericEntityService.update.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
        first_name: "NewName",
      });

      // Act
      const response = await request(app).put("/api/auth/me").send(updates);

      // Assert
      expect(response.status).toBe(200);
      expect(GenericEntityService.update).toHaveBeenCalledWith("user", 1, {
        first_name: "NewName",
      });
    });

    test("should filter out disallowed fields", async () => {
      // Arrange
      GenericEntityService.findByField.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
        first_name: "Test",
      });

      GenericEntityService.update.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
        first_name: "Updated",
      });

      // Act
      const response = await request(app).put("/api/auth/me").send({
        first_name: "Updated",
        email: "hacker@evil.com", // Should be filtered
        role: "admin", // Should be filtered
      });

      // Assert
      expect(response.status).toBe(200);
      expect(GenericEntityService.update).toHaveBeenCalledWith("user", 1, {
        first_name: "Updated",
      });
    });

    test("should return 404 when user not found by auth0_id", async () => {
      // Arrange
      GenericEntityService.findByField.mockResolvedValue(null);

      // Act
      const response = await request(app).put("/api/auth/me").send({
        first_name: "Updated",
      });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test("should return 400 when no valid fields to update", async () => {
      // Arrange
      GenericEntityService.findByField.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
      });

      // Act
      const response = await request(app).put("/api/auth/me").send({
        email: "hacker@evil.com", // Not allowed field - will be stripped
        role: "admin", // Not allowed field - will be stripped
      });

      // Assert
      // Validator strips unknown fields, then min(1) validation fires
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "At least one field (first_name or last_name) must be provided",
      );
    });
  });
});
