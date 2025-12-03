/**
 * Unit Tests for routes/auth.js - Profile Operations
 *
 * Tests user profile CRUD operations (GET/PUT /api/auth/me).
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Profile retrieval and updates
 */

const request = require("supertest");
const authRoutes = require("../../../routes/auth");
const User = require("../../../db/models/User");
const { authenticateToken } = require("../../../middleware/auth");
const { validateProfileUpdate } = require("../../../validators");
const { getClientIp, getUserAgent } = require("../../../utils/request-helpers");
const {
  createRouteTestApp,
  setupRouteMocks,
  teardownRouteMocks,
} = require("../../helpers/route-test-setup");

// Mock dependencies
jest.mock("../../../db/models/User");
jest.mock("../../../db/models/Role");
jest.mock("../../../services/user-data");
jest.mock("../../../services/token-service");
jest.mock("../../../services/audit-service");
jest.mock("../../../middleware/auth");
jest.mock("../../../validators");
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
      expect(authenticateToken).toHaveBeenCalled();
    });

    test("should return formatted name when first_name and last_name are present", async () => {
      // Act
      const response = await request(app).get("/api/auth/me");

      // Assert
      expect(response.body.data.name).toBe("Test User");
    });

    test('should return "User" as default name when name fields are missing', async () => {
      // Arrange
      authenticateToken.mockImplementation((req, res, next) => {
        req.dbUser = {
          id: 1,
          auth0_id: "auth0|123",
          email: "test@example.com",
          role: "user",
          is_active: true,
        };
        next();
      });

      // Act
      const response = await request(app).get("/api/auth/me");

      // Assert
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

      User.findByAuth0Id.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
        email: "test@example.com",
        role: "user",
        first_name: "Test",
        last_name: "User",
      });

      User.update.mockResolvedValue(true);

      User.findByAuth0Id
        .mockResolvedValueOnce({
          id: 1,
          auth0_id: "auth0|123",
          email: "test@example.com",
          role: "user",
          first_name: "Test",
          last_name: "User",
        })
        .mockResolvedValueOnce({
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
      expect(User.update).toHaveBeenCalledWith(1, updates);
    });

    test("should update single field successfully", async () => {
      // Arrange
      const updates = { first_name: "NewName" };

      User.findByAuth0Id.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
        email: "test@example.com",
      });

      User.update.mockResolvedValue(true);

      User.findByAuth0Id
        .mockResolvedValueOnce({
          id: 1,
          auth0_id: "auth0|123",
          first_name: "Old",
        })
        .mockResolvedValueOnce({
          id: 1,
          auth0_id: "auth0|123",
          first_name: "NewName",
        });

      // Act
      const response = await request(app).put("/api/auth/me").send(updates);

      // Assert
      expect(response.status).toBe(200);
      expect(User.update).toHaveBeenCalledWith(1, { first_name: "NewName" });
    });

    test("should filter out disallowed fields", async () => {
      // Arrange
      User.findByAuth0Id.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
      });

      User.update.mockResolvedValue(true);

      User.findByAuth0Id
        .mockResolvedValueOnce({
          id: 1,
          auth0_id: "auth0|123",
          first_name: "Test",
        })
        .mockResolvedValueOnce({
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
      expect(User.update).toHaveBeenCalledWith(1, { first_name: "Updated" });
    });
  });
});
