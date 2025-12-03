/**
 * Unit Tests for routes/auth.js - Session Management
 *
 * Tests session and token management endpoints.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: /refresh, /logout, /logout-all, /sessions
 */

const request = require("supertest");
const authRoutes = require("../../../routes/auth");
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

describe("routes/auth.js - Session Management", () => {
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
  // POST /api/auth/refresh - Token Refresh
  // ===========================
  describe("POST /api/auth/refresh", () => {
    test("should refresh token successfully", async () => {
      // Arrange
      const refreshToken = "valid-refresh-token";
      const newTokens = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      tokenService.refreshAccessToken.mockResolvedValue(newTokens);
      jwt.decode.mockReturnValue({ userId: 1 });
      auditService.log.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(newTokens);
      expect(tokenService.refreshAccessToken).toHaveBeenCalledWith(
        refreshToken,
        "192.168.1.1",
        "jest-test-agent",
      );
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 1,
        action: "token_refresh",
        resourceType: "auth",
        ipAddress: "192.168.1.1",
        userAgent: "jest-test-agent",
      });
    });

    test("should use request helpers for IP and user agent", async () => {
      // Arrange
      tokenService.refreshAccessToken.mockResolvedValue({
        accessToken: "token",
        refreshToken: "token",
      });
      jwt.decode.mockReturnValue({ userId: 1 });
      auditService.log.mockResolvedValue(true);

      // Act
      await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "token" });

      // Assert
      expect(getClientIp).toHaveBeenCalled();
      expect(getUserAgent).toHaveBeenCalled();
    });
  });

  // ===========================
  // POST /api/auth/logout - Single Session Logout
  // ===========================
  describe("POST /api/auth/logout", () => {
    test("should logout successfully with refresh token", async () => {
      // Arrange
      const refreshToken = "valid-refresh-token";
      jwt.decode.mockReturnValue({ tokenId: "token-123", userId: 1 });
      tokenService.revokeToken.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged out successfully");
      expect(tokenService.revokeToken).toHaveBeenCalledWith(
        "token-123",
        "logout",
      );
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 1,
        action: "logout",
        resourceType: "auth",
        ipAddress: "192.168.1.1",
        userAgent: "jest-test-agent",
      });
    });

    test("should logout successfully without refresh token", async () => {
      // Arrange
      auditService.log.mockResolvedValue(true);

      // Act
      const response = await request(app).post("/api/auth/logout").send({});

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged out successfully");
      expect(tokenService.revokeToken).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });

    test("should use request helpers for IP and user agent", async () => {
      // Arrange
      auditService.log.mockResolvedValue(true);

      // Act
      await request(app).post("/api/auth/logout").send({});

      // Assert
      expect(getClientIp).toHaveBeenCalled();
      expect(getUserAgent).toHaveBeenCalled();
    });
  });

  // ===========================
  // POST /api/auth/logout-all - All Sessions Logout
  // ===========================
  describe("POST /api/auth/logout-all", () => {
    test("should logout from all devices successfully", async () => {
      // Arrange
      tokenService.revokeAllUserTokens.mockResolvedValue(3);
      auditService.log.mockResolvedValue(true);

      // Act
      const response = await request(app).post("/api/auth/logout-all");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged out from 3 device(s)");
      expect(response.body.data.tokensRevoked).toBe(3);
      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith(
        1,
        "logout_all",
      );
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 1,
        action: "logout_all_devices",
        resourceType: "auth",
        newValues: { tokensRevoked: 3 },
        ipAddress: "192.168.1.1",
        userAgent: "jest-test-agent",
        result: "success",
      });
    });

    test("should handle zero tokens revoked", async () => {
      // Arrange
      tokenService.revokeAllUserTokens.mockResolvedValue(0);
      auditService.log.mockResolvedValue(true);

      // Act
      const response = await request(app).post("/api/auth/logout-all");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Logged out from 0 device(s)");
      expect(response.body.data.tokensRevoked).toBe(0);
    });

    test("should use request helpers for IP and user agent", async () => {
      // Arrange
      tokenService.revokeAllUserTokens.mockResolvedValue(1);
      auditService.log.mockResolvedValue(true);

      // Act
      await request(app).post("/api/auth/logout-all");

      // Assert
      expect(getClientIp).toHaveBeenCalled();
      expect(getUserAgent).toHaveBeenCalled();
    });
  });

  // ===========================
  // GET /api/auth/sessions - Active Sessions
  // ===========================
  describe("GET /api/auth/sessions", () => {
    test("should return active sessions successfully", async () => {
      // Arrange
      const mockTokens = [
        {
          token_id: "token-1",
          created_at: "2025-01-01T00:00:00Z",
          last_used_at: "2025-01-01T01:00:00Z",
          expires_at: "2025-01-08T00:00:00Z",
          ip_address: "127.0.0.1",
          user_agent: "Mozilla/5.0",
        },
        {
          token_id: "token-2",
          created_at: "2025-01-02T00:00:00Z",
          last_used_at: "2025-01-02T01:00:00Z",
          expires_at: "2025-01-09T00:00:00Z",
          ip_address: "192.168.1.1",
          user_agent: "Chrome/90.0",
        },
      ];

      tokenService.getUserTokens.mockResolvedValue(mockTokens);

      // Act
      const response = await request(app).get("/api/auth/sessions");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        id: "token-1",
        createdAt: "2025-01-01T00:00:00Z",
        lastUsedAt: "2025-01-01T01:00:00Z",
        expiresAt: "2025-01-08T00:00:00Z",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        isCurrent: false,
      });
      expect(tokenService.getUserTokens).toHaveBeenCalledWith(1);
    });

    test("should return empty array when no sessions", async () => {
      // Arrange
      tokenService.getUserTokens.mockResolvedValue([]);

      // Act
      const response = await request(app).get("/api/auth/sessions");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test("should hide sensitive token data in response", async () => {
      // Arrange
      const mockTokens = [
        {
          token_id: "token-1",
          token_hash: "sensitive-hash",
          refresh_token: "sensitive-token",
          created_at: "2025-01-01T00:00:00Z",
          last_used_at: "2025-01-01T01:00:00Z",
          expires_at: "2025-01-08T00:00:00Z",
          ip_address: "127.0.0.1",
          user_agent: "Mozilla/5.0",
        },
      ];

      tokenService.getUserTokens.mockResolvedValue(mockTokens);

      // Act
      const response = await request(app).get("/api/auth/sessions");

      // Assert
      expect(response.body.data[0].token_hash).toBeUndefined();
      expect(response.body.data[0].refresh_token).toBeUndefined();
      expect(response.body.data[0].id).toBe("token-1");
    });
  });
});
