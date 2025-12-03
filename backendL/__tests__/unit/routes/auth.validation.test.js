/**
 * Unit Tests for routes/auth.js - Validation & Error Handling
 *
 * Tests validation logic and error scenarios for auth routes.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Error handling, validation, edge cases
 */

const request = require("supertest");
const authRoutes = require("../../../routes/auth");
const User = require("../../../db/models/User");
const tokenService = require("../../../services/token-service");
const auditService = require("../../../services/audit-service");
const { authenticateToken } = require("../../../middleware/auth");
const { validateProfileUpdate } = require("../../../validators");
const { getClientIp, getUserAgent } = require("../../../utils/request-helpers");
const jwt = require("jsonwebtoken");
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
jest.mock("../../../utils/request-helpers");
jest.mock("jsonwebtoken");

// Mock validators with proper factory functions
jest.mock("../../../validators", () => ({
  validateProfileUpdate: jest.fn((req, res, next) => next()),
}));

// Create test app with auth router
const app = createRouteTestApp(authRoutes, "/api/auth");

describe("routes/auth.js - Validation & Error Handling", () => {
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
  // GET /api/auth/me - Error Handling
  // ===========================
  describe("GET /api/auth/me - Error Handling", () => {
    test("should handle errors gracefully", async () => {
      // Arrange - Mock the route handler itself failing by breaking dbUser
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { sub: "auth0|123", userId: 1 };
        req.dbUser = null; // This will cause the spread operator to fail
        next();
      });

      // Act
      const response = await request(app).get("/api/auth/me");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to get user profile");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  // ===========================
  // PUT /api/auth/me - Validation
  // ===========================
  describe("PUT /api/auth/me - Validation", () => {
    test("should return 404 when user not found", async () => {
      // Arrange
      User.findByAuth0Id.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .put("/api/auth/me")
        .send({ first_name: "Test" });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("User not found");
      expect(response.body.message).toBe("User profile not found");
      expect(User.update).not.toHaveBeenCalled();
    });

    test("should return 400 when no valid fields to update", async () => {
      // Arrange
      User.findByAuth0Id.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
      });

      // Act
      const response = await request(app).put("/api/auth/me").send({}); // Empty body - Joi requires at least one field

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation Error"); // Joi validation error
      expect(response.body.message).toContain("At least one field"); // Joi's message
      expect(User.update).not.toHaveBeenCalled();
    });

    test("should handle update errors gracefully", async () => {
      // Arrange
      User.findByAuth0Id.mockResolvedValue({
        id: 1,
        auth0_id: "auth0|123",
      });

      User.update.mockRejectedValue(new Error("Database error"));

      // Act
      const response = await request(app)
        .put("/api/auth/me")
        .send({ first_name: "Test" });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to update user profile");
    });
  });

  // ===========================
  // POST /api/auth/refresh - Validation
  // ===========================
  describe("POST /api/auth/refresh - Validation", () => {
    test("should return 400 when refresh token is missing", async () => {
      // Act
      const response = await request(app).post("/api/auth/refresh").send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation Error");
      expect(response.body.message).toContain("Refresh token is required");
      expect(tokenService.refreshAccessToken).not.toHaveBeenCalled();
    });

    test("should return 401 when token is expired", async () => {
      // Arrange
      const refreshToken = "expired-token";
      tokenService.refreshAccessToken.mockRejectedValue(
        new Error("Token expired"),
      );

      // Act
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Token Expired");
      expect(response.body.message).toBe("Token expired");
    });

    test("should return 400 for invalid token", async () => {
      // Arrange
      const refreshToken = "invalid-token";
      tokenService.refreshAccessToken.mockRejectedValue(
        new Error("Invalid token signature"),
      );

      // Act
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid Token");
      expect(response.body.message).toBe("Invalid token signature");
    });
  });

  // ===========================
  // POST /api/auth/logout - Error Handling
  // ===========================
  describe("POST /api/auth/logout - Error Handling", () => {
    test("should handle missing tokenId in decoded token", async () => {
      // Arrange
      const refreshToken = "token-without-id";
      jwt.decode.mockReturnValue({ userId: 1 }); // No tokenId
      auditService.log.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken });

      // Assert
      expect(response.status).toBe(200);
      expect(tokenService.revokeToken).not.toHaveBeenCalled();
    });

    test("should handle invalid refresh token gracefully", async () => {
      // Arrange
      const refreshToken = "invalid-token";
      jwt.decode.mockReturnValue(null);
      auditService.log.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken });

      // Assert
      expect(response.status).toBe(200);
      expect(tokenService.revokeToken).not.toHaveBeenCalled();
    });

    test("should handle errors gracefully", async () => {
      // Arrange
      auditService.log.mockRejectedValue(new Error("Audit failed"));

      // Act
      const response = await request(app).post("/api/auth/logout").send({});

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to logout");
    });
  });

  // ===========================
  // POST /api/auth/logout-all - Error Handling
  // ===========================
  describe("POST /api/auth/logout-all - Error Handling", () => {
    test("should handle errors gracefully", async () => {
      // Arrange
      tokenService.revokeAllUserTokens.mockRejectedValue(
        new Error("Database connection failed"),
      );

      // Act
      const response = await request(app).post("/api/auth/logout-all");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to logout from all devices");
    });
  });

  // ===========================
  // GET /api/auth/sessions - Error Handling
  // ===========================
  describe("GET /api/auth/sessions - Error Handling", () => {
    test("should handle errors gracefully", async () => {
      // Arrange
      tokenService.getUserTokens.mockRejectedValue(
        new Error("Database connection failed"),
      );

      // Act
      const response = await request(app).get("/api/auth/sessions");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Failed to get active sessions");
    });
  });
});
