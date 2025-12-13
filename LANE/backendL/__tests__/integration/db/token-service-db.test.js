/**
 * TokenService Integration Tests
 * Tests with REAL PostgreSQL database
 *
 * These tests verify:
 * - SQL queries execute correctly
 * - Database constraints work (foreign keys, NOT NULL, etc.)
 * - Bcrypt hashes are stored correctly
 * - Token expiration logic works with real timestamps
 * - Concurrent operations don't cause race conditions
 *
 * Note: No uuid mock needed - utils/uuid.js handles test compatibility automatically
 */

const TokenService = require("../../../services/token-service");
const {
  getTestPool,
  cleanupTestDatabase,
  createTestUser,
} = require("../../helpers/test-db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

describe("TokenService - Integration Tests (Real DB)", () => {
  let testUser;

  // STANDARD PATTERN: Clean data between tests
  beforeEach(async () => {
    // Clean database before each test
    await cleanupTestDatabase();

    // Create a test user (createTestUser returns {user, token})
    const { user } = await createTestUser({
      email: "token-test@test.com",
      role: "technician",
    });
    testUser = user;
  });

  describe("generateTokenPair()", () => {
    test("should store refresh token in REAL database", async () => {
      const result = await TokenService.generateTokenPair(
        testUser,
        "127.0.0.1",
        "test-agent",
      );

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");

      // Verify token was stored in database
      const pool = getTestPool();
      const dbResult = await pool.query(
        "SELECT * FROM refresh_tokens WHERE user_id = $1",
        [testUser.id],
      );

      expect(dbResult.rows).toHaveLength(1);

      const storedToken = dbResult.rows[0];
      expect(storedToken.user_id).toBe(testUser.id);
      expect(storedToken.token_id).toBeDefined();
      expect(storedToken.token_hash).toBeDefined();
      expect(storedToken.ip_address).toBe("127.0.0.1");
      expect(storedToken.user_agent).toBe("test-agent");

      // Verify hash (not raw token) is stored
      const isValidHash = await bcrypt.compare(
        result.refreshToken,
        storedToken.token_hash,
      );
      expect(isValidHash).toBe(true);
    });

    test("should enforce foreign key constraint on user_id", async () => {
      const fakeUser = { id: 99999, email: "fake@test.com", role: "admin" };

      // This should fail because user_id 99999 doesn't exist
      await expect(TokenService.generateTokenPair(fakeUser)).rejects.toThrow();
    });

    test("should set correct expiration timestamp in database", async () => {
      await TokenService.generateTokenPair(testUser);

      const pool = getTestPool();
      const result = await pool.query(
        "SELECT expires_at, created_at FROM refresh_tokens WHERE user_id = $1",
        [testUser.id],
      );

      const token = result.rows[0];
      const expiresAt = new Date(token.expires_at);
      const createdAt = new Date(token.created_at);

      // Should expire in ~7 days (604800 seconds)
      // Allow for timing differences and clock skew
      const diffSeconds = (expiresAt - createdAt) / 1000;
      expect(diffSeconds).toBeGreaterThan(550000); // At least 6.4 days
      expect(diffSeconds).toBeLessThan(650000); // Less than 7.5 days
    });

    test("should create unique token_id for each token", async () => {
      // Generate 3 tokens for same user
      await TokenService.generateTokenPair(testUser);
      await TokenService.generateTokenPair(testUser);
      await TokenService.generateTokenPair(testUser);

      const pool = getTestPool();
      const result = await pool.query(
        "SELECT token_id FROM refresh_tokens WHERE user_id = $1",
        [testUser.id],
      );

      expect(result.rows).toHaveLength(3);

      // All token_ids should be unique
      const tokenIds = result.rows.map((r) => r.token_id);
      const uniqueIds = new Set(tokenIds);
      expect(uniqueIds.size).toBe(3);
    });

    test("should handle NULL ip_address and user_agent", async () => {
      await TokenService.generateTokenPair(testUser); // No IP/agent

      const pool = getTestPool();
      const result = await pool.query(
        "SELECT ip_address, user_agent FROM refresh_tokens WHERE user_id = $1",
        [testUser.id],
      );

      expect(result.rows[0].ip_address).toBeNull();
      expect(result.rows[0].user_agent).toBeNull();
    });
  });

  describe("refreshAccessToken()", () => {
    let validRefreshToken;
    let tokenId;

    beforeEach(async () => {
      // Generate a valid token pair
      const tokens = await TokenService.generateTokenPair(testUser);
      validRefreshToken = tokens.refreshToken;

      const decoded = jwt.decode(validRefreshToken);
      tokenId = decoded.tokenId;
    });

    test("should generate new token with REAL database verification", async () => {
      const result = await TokenService.refreshAccessToken(
        validRefreshToken,
        "192.168.1.1",
        "new-agent",
      );

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");

      // Verify old token was revoked
      const pool = getTestPool();
      const oldToken = await pool.query(
        "SELECT revoked_at FROM refresh_tokens WHERE token_id = $1",
        [tokenId],
      );

      expect(oldToken.rows[0].revoked_at).not.toBeNull();

      // Verify new token was created
      const newTokens = await pool.query(
        "SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL",
        [testUser.id],
      );

      expect(parseInt(newTokens.rows[0].count)).toBe(1);
    });

    test("should update last_used_at timestamp", async () => {
      const pool = getTestPool();

      // Get original last_used_at
      const before = await pool.query(
        "SELECT last_used_at FROM refresh_tokens WHERE token_id = $1",
        [tokenId],
      );

      expect(before.rows[0].last_used_at).toBeNull();

      // Use the token
      await TokenService.refreshAccessToken(validRefreshToken);

      // Check last_used_at was updated
      const after = await pool.query(
        "SELECT last_used_at FROM refresh_tokens WHERE token_id = $1",
        [tokenId],
      );

      expect(after.rows[0].last_used_at).not.toBeNull();
      expect(new Date(after.rows[0].last_used_at)).toBeInstanceOf(Date);
    });

    test("should reject expired token (database-level check)", async () => {
      const pool = getTestPool();

      // Manually set expiration to past
      await pool.query(
        `UPDATE refresh_tokens 
         SET expires_at = NOW() - INTERVAL '1 hour'
         WHERE token_id = $1`,
        [tokenId],
      );

      // Should fail because WHERE clause filters out expired tokens
      await expect(
        TokenService.refreshAccessToken(validRefreshToken),
      ).rejects.toThrow("Invalid refresh token");
    });

    test("should reject revoked token (database-level check)", async () => {
      const pool = getTestPool();

      // Manually revoke the token
      await pool.query(
        `UPDATE refresh_tokens 
         SET revoked_at = NOW()
         WHERE token_id = $1`,
        [tokenId],
      );

      // Should fail because WHERE clause filters out revoked tokens
      await expect(
        TokenService.refreshAccessToken(validRefreshToken),
      ).rejects.toThrow("Invalid refresh token");
    });

    test("should reject if token hash does not match", async () => {
      const pool = getTestPool();

      // Change the hash in database (simulate tampering)
      const fakeHash = await bcrypt.hash("different-token", 10);
      await pool.query(
        "UPDATE refresh_tokens SET token_hash = $1 WHERE token_id = $2",
        [fakeHash, tokenId],
      );

      await expect(
        TokenService.refreshAccessToken(validRefreshToken),
      ).rejects.toThrow("Invalid refresh token");
    });
  });

  describe("revokeToken()", () => {
    test("should set revoked_at timestamp in database", async () => {
      const { refreshToken } = await TokenService.generateTokenPair(testUser);
      const decoded = jwt.decode(refreshToken);

      await TokenService.revokeToken(decoded.tokenId, "user_logout");

      const pool = getTestPool();
      const result = await pool.query(
        "SELECT revoked_at FROM refresh_tokens WHERE token_id = $1",
        [decoded.tokenId],
      );

      expect(result.rows[0].revoked_at).not.toBeNull();
      expect(new Date(result.rows[0].revoked_at)).toBeInstanceOf(Date);
    });

    test("should handle non-existent token gracefully", async () => {
      // Should return false for non-existent token (not throw)
      // Use a valid UUID v4 format that doesn't exist in database
      const fakeUuid = "550e8400-e29b-41d4-a716-446655440000"; // Valid v4 UUID that doesn't exist
      const result = await TokenService.revokeToken(fakeUuid);
      expect(result).toBe(false);
    });
  });

  describe("revokeAllUserTokens()", () => {
    test("should revoke multiple tokens for a user", async () => {
      // Create 3 tokens
      await TokenService.generateTokenPair(testUser);
      await TokenService.generateTokenPair(testUser);
      await TokenService.generateTokenPair(testUser);

      const count = await TokenService.revokeAllUserTokens(
        testUser.id,
        "security_breach",
      );

      expect(count).toBe(3);

      // Verify all are revoked
      const pool = getTestPool();
      const result = await pool.query(
        "SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL",
        [testUser.id],
      );

      expect(parseInt(result.rows[0].count)).toBe(0);
    });

    test("should return 0 for user with no tokens", async () => {
      const count = await TokenService.revokeAllUserTokens(testUser.id);
      expect(count).toBe(0);
    });
  });

  describe("cleanupExpiredTokens()", () => {
    test("should delete expired tokens from database", async () => {
      const pool = getTestPool();

      // Create a token and manually expire it
      const { refreshToken } = await TokenService.generateTokenPair(testUser);
      const decoded = jwt.decode(refreshToken);

      await pool.query(
        `UPDATE refresh_tokens 
         SET expires_at = NOW() - INTERVAL '31 days'
         WHERE token_id = $1`,
        [decoded.tokenId],
      );

      // Run cleanup
      const deleted = await TokenService.cleanupExpiredTokens();

      expect(deleted).toBeGreaterThanOrEqual(1);

      // Verify token was deleted
      const result = await pool.query(
        "SELECT * FROM refresh_tokens WHERE token_id = $1",
        [decoded.tokenId],
      );

      expect(result.rows).toHaveLength(0);
    });

    test("should not delete unexpired tokens", async () => {
      await TokenService.generateTokenPair(testUser);

      const deleted = await TokenService.cleanupExpiredTokens();

      // Should not delete the fresh token
      const pool = getTestPool();
      const result = await pool.query(
        "SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = $1",
        [testUser.id],
      );

      expect(parseInt(result.rows[0].count)).toBe(1);
    });
  });

  describe("getUserTokens()", () => {
    test("should return all tokens for a user from database", async () => {
      // Create 2 tokens
      await TokenService.generateTokenPair(testUser, "127.0.0.1", "agent-1");
      await TokenService.generateTokenPair(testUser, "192.168.1.1", "agent-2");

      const tokens = await TokenService.getUserTokens(testUser.id);

      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toHaveProperty("token_id");
      expect(tokens[0]).toHaveProperty("created_at");
      expect(tokens[0]).toHaveProperty("expires_at");
      expect(tokens[0]).toHaveProperty("ip_address");
      expect(tokens[0]).toHaveProperty("user_agent");
    });

    test("should return empty array for user with no tokens", async () => {
      const tokens = await TokenService.getUserTokens(testUser.id);
      expect(tokens).toEqual([]);
    });
  });

  describe("Concurrent Operations", () => {
    test("should handle concurrent token generation without conflicts", async () => {
      // Generate 5 tokens concurrently
      const promises = Array.from({ length: 5 }, () =>
        TokenService.generateTokenPair(testUser),
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveProperty("accessToken");
        expect(result).toHaveProperty("refreshToken");
      });

      // Verify database has 5 tokens
      const pool = getTestPool();
      const dbResult = await pool.query(
        "SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = $1",
        [testUser.id],
      );

      expect(parseInt(dbResult.rows[0].count)).toBe(5);
    });
  });
});
