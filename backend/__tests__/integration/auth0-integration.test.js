/**
 * Auth0 Integration Tests
 *
 * P0 CRITICAL: Tests actual Auth0 authentication strategy
 * Coverage target: Increase Auth0Strategy from 16% to >80%
 *
 * Test Strategy:
 * - Mock Auth0 SDK responses (not the strategy itself)
 * - Test real strategy logic with mocked external calls
 * - Verify token validation, user creation, error handling
 */

// Set test Auth0 config BEFORE requiring any modules that depend on it
process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "test-domain.auth0.com";
process.env.AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || "test-client-id";
process.env.AUTH0_CLIENT_SECRET =
  process.env.AUTH0_CLIENT_SECRET || "test-client-secret";
process.env.AUTH0_AUDIENCE =
  process.env.AUTH0_AUDIENCE || "https://test-api.com";
process.env.AUTH0_CALLBACK_URL =
  process.env.AUTH0_CALLBACK_URL || "http://localhost:3001/callback";

const Auth0Strategy = require("../../services/auth/Auth0Strategy");
const UserDataService = require("../../services/user-data");
const auth0Config = require("../../config/auth0");
const jwt = require("jsonwebtoken");

// Mock Auth0 SDK clients
jest.mock("auth0", () => ({
  AuthenticationClient: jest.fn().mockImplementation(() => ({
    users: {
      getInfo: jest.fn(),
    },
    oauth: {
      refreshToken: jest.fn(),
    },
  })),
  ManagementClient: jest.fn().mockImplementation(() => ({
    createUser: jest.fn(),
    updateUser: jest.fn(),
  })),
}));

// Mock jwks-rsa for token verification
jest.mock("jwks-rsa", () =>
  jest.fn(() => ({
    getSigningKey: jest.fn(),
  })),
);

// Mock axios for token exchange
jest.mock("axios");
const axios = require("axios");

// Mock UserDataService
jest.mock("../../services/user-data");

describe("Auth0Strategy Integration Tests", () => {
  let auth0Strategy;
  let mockAuthClient;
  let mockManagementClient;
  let originalEnv;

  beforeAll(() => {
    // Save original env (env vars already set at top of file)
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  beforeEach(() => {
    auth0Strategy = new Auth0Strategy();
    mockAuthClient = auth0Strategy.authClient;
    mockManagementClient = auth0Strategy.managementClient;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("Provider Identification", () => {
    test('should return "auth0" as provider name', () => {
      expect(auth0Strategy.getProviderName()).toBe("auth0");
    });

    test("should initialize with Auth0 config", () => {
      expect(auth0Strategy.config).toBeDefined();
      expect(auth0Strategy.config.domain).toBeDefined();
      expect(auth0Strategy.config.clientId).toBeDefined();
      // Accept any Auth0 domain (test or production)
      expect(auth0Strategy.config.domain).toMatch(/\.auth0\.com$/);
    });
  });

  describe("Authentication Flow", () => {
    const mockTokenResponse = {
      data: {
        access_token: "mock-access-token",
        id_token: "mock-id-token",
        refresh_token: "mock-refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
      },
    };

    const mockUserInfo = {
      sub: "auth0|12345",
      email: "test@example.com",
      given_name: "Test",
      family_name: "User",
      "https://tross.com/role": "technician",
    };

    const mockLocalUser = {
      id: 1,
      auth0_id: "auth0|12345",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "technician",
      is_active: true,
    };

    beforeEach(() => {
      // Mock token exchange
      axios.post.mockResolvedValue(mockTokenResponse);

      // Mock user info retrieval
      mockAuthClient.users.getInfo.mockResolvedValue(mockUserInfo);

      // Mock local user creation/retrieval
      UserDataService.findOrCreateUser.mockResolvedValue(mockLocalUser);

      // Mock token verification (skip for authenticate flow)
      auth0Strategy.verifyToken = jest.fn().mockResolvedValue({
        sub: "auth0|12345",
        aud: "https://test-api.com",
      });
    });

    test("should authenticate with valid authorization code", async () => {
      const credentials = {
        code: "valid-auth-code",
        redirect_uri: "http://localhost:3001/callback",
      };

      const result = await auth0Strategy.authenticate(credentials);

      // Verify token exchange was called with correct params (using actual config)
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(".auth0.com/oauth/token"),
        expect.objectContaining({
          grant_type: "authorization_code",
          code: "valid-auth-code",
          redirect_uri: "http://localhost:3001/callback",
        }),
      );

      // Verify user info was retrieved
      expect(mockAuthClient.users.getInfo).toHaveBeenCalledWith(
        "mock-access-token",
      );

      // Verify local user was created/found
      expect(UserDataService.findOrCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          auth0_id: "auth0|12345",
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
        }),
      );

      // Verify result structure
      expect(result).toMatchObject({
        token: expect.any(String),
        user: expect.objectContaining({
          id: 1,
          email: "test@example.com",
        }),
        auth0Tokens: expect.objectContaining({
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
        }),
      });
    });

    test("should throw error when authorization code is missing", async () => {
      await expect(auth0Strategy.authenticate({})).rejects.toThrow(
        "Authorization code is required",
      );
    });

    test("should handle token exchange failure", async () => {
      axios.post.mockRejectedValue(new Error("Invalid authorization code"));

      await expect(
        auth0Strategy.authenticate({ code: "invalid-code" }),
      ).rejects.toThrow("Invalid authorization code");
    });

    test("should handle user info retrieval failure", async () => {
      mockAuthClient.users.getInfo.mockRejectedValue(
        new Error("Failed to get user info"),
      );

      await expect(
        auth0Strategy.authenticate({ code: "valid-code" }),
      ).rejects.toThrow("Failed to get user info");
    });

    test("should handle local user creation failure", async () => {
      UserDataService.findOrCreateUser.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        auth0Strategy.authenticate({ code: "valid-code" }),
      ).rejects.toThrow("Database error");
    });

    test("should use default callback URL when not provided", async () => {
      await auth0Strategy.authenticate({ code: "valid-code" });

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          redirect_uri: auth0Config.callbackUrl,
        }),
      );
    });
  });

  describe("Token Verification", () => {
    const validToken = "valid.jwt.token";
    const mockDecodedToken = {
      sub: "auth0|12345",
      aud: "https://test-api.com",
      iss: "https://test-domain.auth0.com/",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    beforeEach(() => {
      // Reset to use actual verifyToken (not mocked)
      auth0Strategy = new Auth0Strategy();

      // Mock jwks client getSigningKey
      auth0Strategy.jwksClient.getSigningKey = jest.fn((kid, callback) => {
        callback(null, {
          publicKey: "mock-public-key",
          rsaPublicKey: "mock-rsa-public-key",
        });
      });
    });

    test("should verify valid Auth0 token", async () => {
      // Mock jwt.verify to return decoded payload
      jest
        .spyOn(jwt, "verify")
        .mockImplementation((token, getKey, options, callback) => {
          callback(null, mockDecodedToken);
        });

      const decoded = await auth0Strategy.verifyToken(validToken);

      expect(decoded).toMatchObject({
        sub: "auth0|12345",
        aud: "https://test-api.com",
      });
    });

    test("should reject expired token", async () => {
      jest
        .spyOn(jwt, "verify")
        .mockImplementation((token, getKey, options, callback) => {
          callback(new Error("jwt expired"), null);
        });

      await expect(auth0Strategy.verifyToken(validToken)).rejects.toThrow(
        "jwt expired",
      );
    });

    test("should reject token with invalid signature", async () => {
      jest
        .spyOn(jwt, "verify")
        .mockImplementation((token, getKey, options, callback) => {
          callback(new Error("invalid signature"), null);
        });

      await expect(auth0Strategy.verifyToken(validToken)).rejects.toThrow(
        "invalid signature",
      );
    });

    test("should reject token with wrong audience", async () => {
      jest
        .spyOn(jwt, "verify")
        .mockImplementation((token, getKey, options, callback) => {
          callback(new Error("jwt audience invalid"), null);
        });

      await expect(auth0Strategy.verifyToken(validToken)).rejects.toThrow(
        "jwt audience invalid",
      );
    });
  });

  describe("User Profile Mapping", () => {
    test("should map Auth0 user profile to local format", async () => {
      const auth0Profile = {
        sub: "auth0|12345",
        email: "user@example.com",
        given_name: "John",
        family_name: "Doe",
        email_verified: true,
      };

      const mapped = auth0Strategy._mapUserProfile(auth0Profile);

      // _mapUserProfile only maps: sub, auth0_id, email, first_name, last_name, picture, email_verified, provider
      // Role extraction happens in authenticate() after profile mapping
      expect(mapped).toMatchObject({
        sub: "auth0|12345",
        auth0_id: "auth0|12345",
        email: "user@example.com",
        first_name: "John",
        last_name: "Doe",
        email_verified: true,
        provider: "auth0",
      });
    });

    test("should handle missing optional fields", async () => {
      const auth0Profile = {
        sub: "auth0|12345",
        email: "user@example.com",
        // Missing given_name, family_name, role
      };

      const mapped = auth0Strategy._mapUserProfile(auth0Profile);

      expect(mapped).toMatchObject({
        auth0_id: "auth0|12345",
        email: "user@example.com",
      });
      // toSafeString with allowNull: true returns null (not undefined) for missing fields
      expect(mapped.first_name).toBeNull();
      expect(mapped.last_name).toBeNull();
    });

    test("should split name when given_name and family_name missing", async () => {
      const auth0Profile = {
        sub: "auth0|12345",
        email: "user@example.com",
        name: "John Doe Smith",
        email_verified: true,
      };

      const mapped = auth0Strategy._mapUserProfile(auth0Profile);

      // When given_name/family_name missing, split name field
      expect(mapped.first_name).toBe("John");
      expect(mapped.last_name).toBe("Doe Smith");
    });
  });

  describe("Token Refresh", () => {
    const mockRefreshResponse = {
      data: {
        access_token: "new-access-token",
        id_token: "new-id-token",
        token_type: "Bearer",
        expires_in: 3600,
      },
    };

    beforeEach(() => {
      axios.post.mockResolvedValue(mockRefreshResponse);
    });

    test("should refresh access token with refresh token", async () => {
      const refreshToken = "valid-refresh-token";

      const result = await auth0Strategy.refreshToken(refreshToken);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(".auth0.com/oauth/token"),
        expect.objectContaining({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      );

      expect(result).toMatchObject({
        token: "new-access-token",
        expires_in: 3600,
      });
    });

    test("should throw error when refresh token is invalid", async () => {
      axios.post.mockRejectedValue(new Error("Invalid refresh token"));

      await expect(
        auth0Strategy.refreshToken("invalid-refresh-token"),
      ).rejects.toThrow("Invalid refresh token");
    });
  });

  describe("Logout", () => {
    test("should generate logout URL", async () => {
      process.env.AUTH0_LOGOUT_URL = "http://localhost:3000";

      const result = await auth0Strategy.logout("mock-token");

      expect(result.logoutUrl).toContain(".auth0.com/v2/logout");
      expect(result.logoutUrl).toContain("localhost%3A3000");
      expect(result.success).toBe(true);
    });

    test("should use default return URL when not provided", async () => {
      delete process.env.AUTH0_LOGOUT_URL;

      const result = await auth0Strategy.logout("mock-token");

      expect(result.logoutUrl).toContain(".auth0.com/v2/logout");
      expect(result.logoutUrl).toContain("localhost%3A8080"); // default
    });
  });

  describe("User Profile Retrieval", () => {
    test("should get user profile with access token", async () => {
      const mockUserInfo = {
        sub: "auth0|12345",
        email: "user@example.com",
        given_name: "John",
        family_name: "Doe",
      };

      mockAuthClient.users.getInfo.mockResolvedValue(mockUserInfo);

      const profile = await auth0Strategy.getUserProfile("access-token");

      expect(profile).toMatchObject({
        auth0_id: "auth0|12345",
        email: "user@example.com",
        first_name: "John",
        last_name: "Doe",
      });
      expect(mockAuthClient.users.getInfo).toHaveBeenCalledWith("access-token");
    });
  });

  describe("Error Handling & Edge Cases", () => {
    test("should handle network errors gracefully", async () => {
      axios.post.mockRejectedValue(new Error("Network error"));

      await expect(
        auth0Strategy.authenticate({ code: "valid-code" }),
      ).rejects.toThrow("Network error");
    });

    test("should handle malformed Auth0 responses", async () => {
      axios.post.mockResolvedValue({ data: null });

      await expect(
        auth0Strategy.authenticate({ code: "valid-code" }),
      ).rejects.toThrow();
    });

    test("should reject invalid email format from Auth0", async () => {
      const invalidUserInfo = {
        sub: "auth0|12345",
        email: "not-an-email",
        given_name: "Test",
      };

      mockAuthClient.users.getInfo.mockResolvedValue(invalidUserInfo);
      axios.post.mockResolvedValue({
        data: {
          access_token: "token",
          id_token: "id",
          refresh_token: "refresh",
        },
      });
      auth0Strategy.verifyToken = jest
        .fn()
        .mockResolvedValue({ sub: "auth0|12345" });

      // Should reject due to email validation in _mapUserProfile
      await expect(
        auth0Strategy.authenticate({ code: "valid-code" }),
      ).rejects.toThrow("email");
    });
  });
});
