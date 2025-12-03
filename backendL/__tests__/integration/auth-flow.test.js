/**
 * Integration Test - Authentication Flow
 * End-to-end testing of our authentication system
 */

const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const { AuthProvider } = require("../../services/auth");
const { HTTP_STATUS, USER_ROLES } = require("../../config/constants");
const {
  generateTestToken,
  createAuthHeader,
  setTestEnv,
} = require("../helpers/test-helpers");

// Mock the user data service
jest.mock("../../services/user-data", () => ({
  findOrCreateUser: jest.fn().mockResolvedValue({
    id: 1,
    auth0_id: "auth0|test123",
    email: "test@trossapp.com",
    first_name: "Test",
    last_name: "User",
    role: "technician",
  }),
}));

// Mock JWT verification
jest.mock("jsonwebtoken", () => ({
  sign: jest.requireActual("jsonwebtoken").sign,
  verify: jest.fn(),
}));

describe("Authentication Flow Integration", () => {
  let app;

  beforeEach(() => {
    setTestEnv({ AUTH_MODE: "development" });

    // Reset mocks
    jest.clearAllMocks();

    // Mock JWT verification for valid tokens
    jwt.verify.mockImplementation((token, secret) => {
      // Simple mock - return payload for test tokens
      try {
        const decoded =
          jwt.sign === jest.fn()
            ? {
                // Mock payload
                sub: "auth0|test123",
                email: "test@trossapp.com",
                role: "technician",
                provider: "development",
              }
            : jest.requireActual("jsonwebtoken").verify(token, secret);
        return decoded;
      } catch (error) {
        throw new Error("Invalid token");
      }
    });

    // Create test app with auth endpoints
    app = express();
    app.use(express.json());

    // Mock auth middleware for testing
    const mockAuthMiddleware = (req, res, next) => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

      if (!token) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: "Unauthorized",
          message: "Access token required",
          timestamp: new Date().toISOString(),
        });
      }

      try {
        const decoded = jwt.verify(token, "test-secret-key");
        req.user = decoded;
        req.dbUser = { id: 1, role: decoded.role };
        next();
      } catch (error) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: "Forbidden",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Test routes
    app.get("/public", (req, res) => {
      res.json({ message: "Public endpoint", public: true });
    });

    app.get("/protected", mockAuthMiddleware, (req, res) => {
      res.json({
        message: "Protected endpoint accessed",
        user: req.user,
        protected: true,
      });
    });

    app.get("/admin-only", mockAuthMiddleware, (req, res, next) => {
      if (req.user.role !== USER_ROLES.ADMIN) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: "Forbidden",
          message: "Admin role required",
          timestamp: new Date().toISOString(),
        });
      }
      res.json({ message: "Admin endpoint accessed", admin: true });
    });

    // Health check
    app.get("/health", (req, res) => {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });
  });

  afterEach(() => {
    // Reset auth provider
    AuthProvider._instance = null;
  });

  describe("Public Endpoints", () => {
    test("should access public endpoint without authentication", async () => {
      const response = await request(app).get("/public").expect(HTTP_STATUS.OK);

      expect(response.body).toMatchObject({
        message: "Public endpoint",
        public: true,
      });
    });

    test("should access health endpoint", async () => {
      const response = await request(app).get("/health").expect(HTTP_STATUS.OK);

      expect(response.body).toHaveProperty("status", "healthy");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("Protected Endpoints", () => {
    test("should reject access without token", async () => {
      const response = await request(app)
        .get("/protected")
        .expect(HTTP_STATUS.UNAUTHORIZED);

      global.testUtils.expectErrorResponse(
        response,
        HTTP_STATUS.UNAUTHORIZED,
        "Access token required",
      );
    });

    test("should reject invalid token format", async () => {
      const response = await request(app)
        .get("/protected")
        .set("authorization", "invalid-format")
        .expect(HTTP_STATUS.UNAUTHORIZED);

      global.testUtils.expectErrorResponse(response, HTTP_STATUS.UNAUTHORIZED);
    });

    test("should allow access with valid token", async () => {
      const token = generateTestToken("technician");

      const response = await request(app)
        .get("/protected")
        .set(createAuthHeader(token))
        .expect(HTTP_STATUS.OK);

      expect(response.body).toMatchObject({
        message: "Protected endpoint accessed",
        protected: true,
      });

      expect(response.body.user).toHaveProperty("role");
      expect(response.body.user).toHaveProperty("email");
    });
  });

  describe("Role-Based Access Control", () => {
    test("should allow admin access to admin endpoint", async () => {
      // Mock admin token verification
      jwt.verify.mockImplementationOnce(() => ({
        sub: "auth0|admin123",
        email: "admin@trossapp.com",
        role: USER_ROLES.ADMIN,
        provider: "development",
      }));

      const adminToken = generateTestToken("admin");

      const response = await request(app)
        .get("/admin-only")
        .set(createAuthHeader(adminToken))
        .expect(HTTP_STATUS.OK);

      expect(response.body).toMatchObject({
        message: "Admin endpoint accessed",
        admin: true,
      });
    });

    test("should deny non-admin access to admin endpoint", async () => {
      // Mock technician token verification
      jwt.verify.mockImplementationOnce(() => ({
        sub: "auth0|tech123",
        email: "tech@trossapp.com",
        role: USER_ROLES.TECHNICIAN,
        provider: "development",
      }));

      const techToken = generateTestToken("technician");

      const response = await request(app)
        .get("/admin-only")
        .set(createAuthHeader(techToken))
        .expect(HTTP_STATUS.FORBIDDEN);

      expect(response.body).toHaveProperty("error", "Forbidden");
      expect(response.body).toHaveProperty("message", "Admin role required");
    });
  });

  describe("Authentication Provider Integration", () => {
    test("should use development authentication in test environment", () => {
      const authProvider = AuthProvider.getInstance();
      expect(authProvider.constructor.name).toBe("DevAuthStrategy");
      expect(authProvider.getProviderName()).toBe("development");
    });

    test("should switch auth providers based on environment", () => {
      // Test development provider
      setTestEnv({ AUTH_MODE: "development" });
      AuthProvider._instance = null;
      const devProvider = AuthProvider.getInstance();
      expect(devProvider.constructor.name).toBe("DevAuthStrategy");

      // Test Auth0 provider
      setTestEnv({ AUTH_MODE: "auth0" });
      AuthProvider._instance = null;
      const auth0Provider = AuthProvider.getInstance();
      expect(auth0Provider.constructor.name).toBe("Auth0Strategy");
    });
  });

  describe("Token Validation", () => {
    test("should validate token expiration", async () => {
      // Mock expired token verification to throw error
      jwt.verify.mockImplementationOnce(() => {
        throw new Error("Token expired");
      });

      const expiredToken = "expired.jwt.token";

      const response = await request(app)
        .get("/protected")
        .set(createAuthHeader(expiredToken))
        .expect(HTTP_STATUS.FORBIDDEN);

      global.testUtils.expectErrorResponse(response, HTTP_STATUS.FORBIDDEN);
    });

    test("should validate different user roles", async () => {
      const roles = ["admin", "manager", "dispatcher", "technician", "client"];

      for (const role of roles) {
        // Mock token verification for each role
        jwt.verify.mockImplementationOnce(() => ({
          sub: `auth0|${role}123`,
          email: `${role}@trossapp.com`,
          role: USER_ROLES[role.toUpperCase()],
          provider: "development",
        }));

        const token = generateTestToken(role);

        const response = await request(app)
          .get("/protected")
          .set(createAuthHeader(token))
          .expect(HTTP_STATUS.OK);

        expect(response.body.user.role).toBe(USER_ROLES[role.toUpperCase()]);
      }
    });
  });

  describe("Error Handling", () => {
    test("should handle malformed JWT gracefully", async () => {
      const response = await request(app)
        .get("/protected")
        .set("authorization", "Bearer malformed.jwt.token")
        .expect(HTTP_STATUS.FORBIDDEN);

      global.testUtils.expectErrorResponse(response, HTTP_STATUS.FORBIDDEN);
    });

    test("should include timestamps in all error responses", async () => {
      const response = await request(app)
        .get("/protected")
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body).toHaveProperty("timestamp");
      global.testUtils.expectValidTimestamp(response.body.timestamp);
    });
  });
});
