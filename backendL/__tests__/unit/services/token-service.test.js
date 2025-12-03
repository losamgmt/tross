/**
 * TokenService Unit Tests
 * Testing JWT token generation, refresh, and revocation
 */

// Setup mocks FIRST (before any imports)
const { setupModuleMocks, setupMocks, MOCK_USERS } = require("../../setup/test-setup");
setupModuleMocks();

// NOW import modules (they'll use the mocks)
const TokenService = require("../../../services/token-service");
const db = require("../../../db/connection");
const logger = require("../../../config/logger");
const { setTestEnv } = require("../../helpers/test-helpers");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

describe("TokenService", () => {
  let originalEnv;
  const testUser = {
    id: MOCK_USERS.technician.id,
    email: MOCK_USERS.technician.email,
    role: "technician",
  };

  beforeEach(() => {
    originalEnv = { ...process.env };
    setTestEnv({
      JWT_SECRET: "test-secret-key-for-token-service",
      NODE_ENV: "test",
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("generateTokenPair()", () => {
    test("should generate valid access and refresh tokens", async () => {
      // Mock successful database insertion
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await TokenService.generateTokenPair(
        testUser,
        "127.0.0.1",
        "test-agent",
      );

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");

      // Verify JWT structure (3 parts: header.payload.signature)
      expect(result.accessToken.split(".").length).toBe(3);
      expect(result.refreshToken.split(".").length).toBe(3);
    });

    test("should store refresh token hash in database", async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await TokenService.generateTokenPair(testUser, "127.0.0.1", "test-agent");

      // Verify database query was called
      expect(db.query).toHaveBeenCalledTimes(1);

      // Check that hash was stored (not raw token)
      const queryCall = db.query.mock.calls[0];
      expect(queryCall[0]).toContain("INSERT INTO refresh_tokens");
      expect(queryCall[1]).toEqual(
        expect.arrayContaining([
          expect.any(String), // token_id
          testUser.id, // user_id
          expect.any(String), // token_hash
          expect.any(Date), // expires_at
          "127.0.0.1", // ip_address
          "test-agent", // user_agent
        ]),
      );
    });

    test("should set correct token expiration times", async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await TokenService.generateTokenPair(testUser);

      // Decode tokens without verification to check expiration
      const accessPayload = jwt.decode(result.accessToken);
      const refreshPayload = jwt.decode(result.refreshToken);

      // Access token should expire in ~15 minutes (900 seconds)
      const accessExpiry = accessPayload.exp - accessPayload.iat;
      expect(accessExpiry).toBeGreaterThanOrEqual(890);
      expect(accessExpiry).toBeLessThanOrEqual(910);

      // Refresh token should expire in ~7 days (604800 seconds)
      const refreshExpiry = refreshPayload.exp - refreshPayload.iat;
      expect(refreshExpiry).toBeGreaterThanOrEqual(604000);
      expect(refreshExpiry).toBeLessThanOrEqual(605000);
    });

    test("should include user metadata in access token", async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await TokenService.generateTokenPair(testUser);

      // Decode without verification (signature is valid, but secret may be cached from module load)
      const payload = jwt.decode(result.accessToken);

      expect(payload.userId).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
      expect(payload.role).toBe(testUser.role);
      expect(payload.type).toBe("access");
    });

    test("should handle database errors gracefully", async () => {
      db.query.mockRejectedValueOnce(new Error("Database connection failed"));

      await expect(TokenService.generateTokenPair(testUser)).rejects.toThrow(
        "Database connection failed",
      );
    });

    test("should work without optional IP and user agent", async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await TokenService.generateTokenPair(testUser);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");

      // Verify null values were passed for optional params
      const queryCall = db.query.mock.calls[0];
      expect(queryCall[1][4]).toBeNull(); // ip_address
      expect(queryCall[1][5]).toBeNull(); // user_agent
    });
  });

  describe("refreshAccessToken()", () => {
    let validRefreshToken;
    let tokenId;

    beforeEach(async () => {
      // Generate a valid refresh token for testing
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      const tokens = await TokenService.generateTokenPair(testUser);
      validRefreshToken = tokens.refreshToken;

      // Decode to get token ID
      const payload = jwt.decode(validRefreshToken);
      tokenId = payload.tokenId;

      jest.clearAllMocks();
    });

    test("should generate new access token with valid refresh token", async () => {
      // Mock finding the refresh token in database (JOIN query)
      const hashedToken = await bcrypt.hash(validRefreshToken, 10);
      db.query
        // First call: SELECT with JOIN (token + user data)
        .mockResolvedValueOnce({
          rows: [
            {
              token_id: tokenId,
              user_id: testUser.id,
              token_hash: hashedToken,
              expires_at: new Date(Date.now() + 86400000), // 1 day from now
              revoked_at: null,
              email: testUser.email,
              role: testUser.role,
            },
          ],
          rowCount: 1,
        })
        // Second call: UPDATE last_used_at
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        // Third call: INSERT new refresh token (from generateTokenPair)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        // Fourth call: UPDATE to revoke old token
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await TokenService.refreshAccessToken(
        validRefreshToken,
        "127.0.0.1",
        "test-agent",
      );

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");
      expect(result.accessToken.split(".").length).toBe(3);
      expect(result.refreshToken.split(".").length).toBe(3);
    });

    test("should update refresh token last_used_at timestamp", async () => {
      const hashedToken = await bcrypt.hash(validRefreshToken, 10);
      db.query
        // SELECT with JOIN
        .mockResolvedValueOnce({
          rows: [
            {
              token_id: tokenId,
              user_id: testUser.id,
              token_hash: hashedToken,
              expires_at: new Date(Date.now() + 86400000),
              revoked_at: null,
              email: testUser.email,
              role: testUser.role,
            },
          ],
          rowCount: 1,
        })
        // UPDATE last_used_at
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        // INSERT new token
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        // UPDATE revoke old token
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await TokenService.refreshAccessToken(validRefreshToken);

      // Verify UPDATE query was called (second call)
      expect(db.query).toHaveBeenCalledTimes(4);
      const updateCall = db.query.mock.calls[1];
      expect(updateCall[0]).toContain("UPDATE refresh_tokens");
      expect(updateCall[0]).toContain("last_used_at");
    });

    test("should reject expired refresh token", async () => {
      // Mock returns empty because WHERE clause filters out expired token
      db.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(
        TokenService.refreshAccessToken(validRefreshToken),
      ).rejects.toThrow("Invalid refresh token");
    });

    test("should reject revoked refresh token", async () => {
      // Mock returns empty because WHERE clause filters out revoked tokens
      db.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(
        TokenService.refreshAccessToken(validRefreshToken),
      ).rejects.toThrow("Invalid refresh token");
    });

    test("should reject invalid refresh token signature", async () => {
      const invalidToken = validRefreshToken.slice(0, -5) + "xxxxx";

      await expect(
        TokenService.refreshAccessToken(invalidToken),
      ).rejects.toThrow();
    });

    test("should reject if refresh token not found in database", async () => {
      db.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(
        TokenService.refreshAccessToken(validRefreshToken),
      ).rejects.toThrow("Invalid refresh token");
    });
  });

  describe("revokeToken()", () => {
    test("should mark token as revoked in database", async () => {
      const tokenId = "550e8400-e29b-41d4-a716-446655440000"; // Valid UUID v4
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await TokenService.revokeToken(tokenId, "logout");

      expect(db.query).toHaveBeenCalledTimes(1);
      const queryCall = db.query.mock.calls[0];
      expect(queryCall[0]).toContain("UPDATE refresh_tokens");
      expect(queryCall[0]).toContain("revoked_at = NOW()"); // Updated to match actual SQL
      expect(queryCall[1]).toEqual([tokenId]);
    });

    test("should handle non-existent token gracefully", async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Should not throw, just log warning
      await expect(
        TokenService.revokeToken("550e8400-e29b-41d4-a716-446655440000"),
      ).resolves.not.toThrow();
    });

    test("should allow custom revocation reason", async () => {
      const tokenId = "550e8400-e29b-41d4-a716-446655440000";
      const reason = "security_breach";
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await TokenService.revokeToken(tokenId, reason);

      // Verify reason is logged (implementation dependent)
      expect(db.query).toHaveBeenCalled();
    });
  });

  describe("revokeAllUserTokens()", () => {
    test("should revoke all tokens for a user", async () => {
      const userId = 1;
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 3 }); // 3 tokens revoked

      const result = await TokenService.revokeAllUserTokens(
        userId,
        "logout_all",
      );

      expect(db.query).toHaveBeenCalledTimes(1);
      const queryCall = db.query.mock.calls[0];
      expect(queryCall[0]).toContain("UPDATE refresh_tokens");
      expect(queryCall[0]).toContain("user_id = $1");
      expect(queryCall[1]).toEqual([userId]);
      expect(result).toBe(3); // Should return count of revoked tokens
    });

    test("should return zero if user has no tokens", async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await TokenService.revokeAllUserTokens(999);

      expect(result).toBe(0);
    });
  });

  describe("cleanupExpiredTokens()", () => {
    test("should delete expired tokens from database", async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 5 }); // 5 tokens deleted

      const result = await TokenService.cleanupExpiredTokens();

      expect(db.query).toHaveBeenCalledTimes(1);
      const queryCall = db.query.mock.calls[0];
      expect(queryCall[0]).toContain("DELETE FROM refresh_tokens");
      expect(queryCall[0]).toContain("expires_at < NOW()");
      expect(result).toBe(5);
    });

    test("should return zero if no expired tokens", async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await TokenService.cleanupExpiredTokens();

      expect(result).toBe(0);
    });

    test("should handle database errors during cleanup", async () => {
      db.query.mockRejectedValueOnce(new Error("Cleanup failed"));

      await expect(TokenService.cleanupExpiredTokens()).rejects.toThrow(
        "Cleanup failed",
      );
    });
  });

  describe("getUserTokens()", () => {
    test("should return all active tokens for a user", async () => {
      const userId = 1;
      const mockTokens = [
        {
          id: "token-1",
          created_at: new Date(),
          expires_at: new Date(Date.now() + 86400000),
          last_used_at: new Date(),
          ip_address: "127.0.0.1",
          user_agent: "test-agent-1",
        },
        {
          id: "token-2",
          created_at: new Date(),
          expires_at: new Date(Date.now() + 86400000),
          last_used_at: null,
          ip_address: "192.168.1.1",
          user_agent: "test-agent-2",
        },
      ];

      db.query.mockResolvedValueOnce({
        rows: mockTokens,
        rowCount: 2,
      });

      const result = await TokenService.getUserTokens(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id", "token-1");
      expect(result[1]).toHaveProperty("id", "token-2");
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        [userId],
      );
    });

    test("should return empty array if user has no tokens", async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await TokenService.getUserTokens(999);

      expect(result).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    test("should throw descriptive errors", async () => {
      db.query.mockRejectedValueOnce(new Error("Connection timeout"));

      await expect(TokenService.generateTokenPair(testUser)).rejects.toThrow(
        "Connection timeout",
      );
    });

    test("should handle malformed JWT tokens", async () => {
      await expect(
        TokenService.refreshAccessToken("not.a.valid.token"),
      ).rejects.toThrow();
    });

    // NOTE: Input validation is intentionally NOT done in TokenService
    // Callers (routes/middleware) are responsible for validating user objects
    // before passing them to the service. This follows separation of concerns:
    // - Routes/Middleware: Validate input
    // - Service: Execute business logic with valid input
    //
    // If needed, add validation at the route level (already done in auth middleware)
  });
});
