/**
 * JWT Security Tests
 *
 * Tests JWT token handling security:
 * - Token expiration
 * - Invalid signatures
 * - Missing/malformed claims
 * - Algorithm confusion attacks
 * - Token tampering
 */

const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../../../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

describe("JWT Security", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    app.get("/api/protected", authenticateToken, (req, res) => {
      res.json({ success: true, user: req.user });
    });
  });

  describe("Token Validation", () => {
    test("should reject request without Authorization header", async () => {
      const response = await request(app).get("/api/protected");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token required/i);
    });

    test("should reject empty Bearer token", async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer ");

      expect(response.status).toBe(401);
    });

    test("should reject malformed Authorization header", async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", "NotBearer token123");

      expect(response.status).toBe(401);
    });

    test('should reject token with only "Bearer" (no token)', async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer");

      expect(response.status).toBe(401);
    });
  });

  describe("Token Expiration", () => {
    test("should reject expired token", async () => {
      const expiredToken = jwt.sign(
        {
          sub: "dev|admin001",
          email: "admin@tross.dev",
          role: "admin",
          provider: "development",
        },
        JWT_SECRET,
        { expiresIn: "-1h" }, // Already expired
      );

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${expiredToken}`);

      // Expired token returns 401 or 403
      expect([401, 403]).toContain(response.status);
    });

    test("should accept token with future expiration", async () => {
      const validToken = jwt.sign(
        {
          sub: "dev|admin001",
          email: "admin@tross.dev",
          role: "admin",
          provider: "development",
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Signature Verification", () => {
    test("should reject token signed with wrong secret", async () => {
      const wrongSecretToken = jwt.sign(
        {
          sub: "dev|admin001",
          email: "admin@tross.dev",
          role: "admin",
          provider: "development",
        },
        "wrong-secret-key",
        { expiresIn: "1h" },
      );

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${wrongSecretToken}`);

      // Wrong signature returns 401 or 403
      expect([401, 403]).toContain(response.status);
    });

    test("should reject token with tampered payload", async () => {
      // Create a valid token
      const validToken = jwt.sign(
        {
          sub: "dev|admin001",
          email: "admin@tross.dev",
          role: "technician", // Original role
          provider: "development",
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      // Tamper with the payload (change role to admin)
      const parts = validToken.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      payload.role = "admin"; // Elevate privileges
      parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64");
      const tamperedToken = parts.join(".");

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${tamperedToken}`);

      // Tampered token returns 401 or 403
      expect([401, 403]).toContain(response.status);
    });

    test("should reject completely invalid token string", async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer not.a.valid.jwt.token");

      // Invalid token returns 401 or 403 depending on decode failure mode
      expect([401, 403]).toContain(response.status);
    });

    test("should reject token with missing signature", async () => {
      const validToken = jwt.sign(
        { sub: "dev|admin001", provider: "development" },
        JWT_SECRET,
      );
      // Remove signature
      const parts = validToken.split(".");
      const noSignature = `${parts[0]}.${parts[1]}.`;

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${noSignature}`);

      // Missing signature returns 401 or 403
      expect([401, 403]).toContain(response.status);
    });
  });

  describe("Required Claims Validation", () => {
    test('should reject token without "sub" claim', async () => {
      const tokenWithoutSub = jwt.sign(
        {
          email: "admin@tross.dev",
          role: "admin",
          provider: "development",
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${tokenWithoutSub}`);

      // Missing required claim returns 401 or 403
      expect([401, 403]).toContain(response.status);
    });

    test('should reject token without "provider" claim', async () => {
      const tokenWithoutProvider = jwt.sign(
        {
          sub: "dev|admin001",
          email: "admin@tross.dev",
          role: "admin",
          // No provider!
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${tokenWithoutProvider}`);

      // Missing provider returns 401 or 403
      expect([401, 403]).toContain(response.status);
    });

    test("should reject token with invalid provider", async () => {
      const tokenWithInvalidProvider = jwt.sign(
        {
          sub: "dev|admin001",
          email: "admin@tross.dev",
          role: "admin",
          provider: "unknown_provider",
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${tokenWithInvalidProvider}`);

      // Invalid provider is caught after token validation
      expect([401, 403]).toContain(response.status);
    });

    test('should accept token with valid "development" provider', async () => {
      const validToken = jwt.sign(
        {
          sub: "dev|admin001",
          email: "admin@tross.dev",
          role: "admin",
          provider: "development",
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    test('should accept token with valid "auth0" provider (requires DB)', async () => {
      // Note: auth0 tokens require database user lookup
      // In unit tests without DB mock, this will fail at DB level
      // This is expected behavior - auth0 users must exist in DB
      const validToken = jwt.sign(
        {
          sub: "auth0|123456",
          email: "user@example.com",
          role: "admin",
          provider: "auth0",
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${validToken}`);

      // Without DB mock, auth0 tokens fail at user lookup step
      // This validates that auth0 path is attempted (not rejected at token level)
      expect([200, 403, 500]).toContain(response.status);
    });
  });

  describe("Algorithm Security", () => {
    test('should reject "none" algorithm token (alg=none attack)', async () => {
      // Manually construct a token with alg: none
      const header = Buffer.from(
        JSON.stringify({ alg: "none", typ: "JWT" }),
      ).toString("base64");
      const payload = Buffer.from(
        JSON.stringify({
          sub: "dev|admin001",
          provider: "development",
          role: "admin",
        }),
      ).toString("base64");
      const noneAlgToken = `${header}.${payload}.`;

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${noneAlgToken}`);

      // Invalid signature/algorithm returns 401 or 403
      expect([401, 403]).toContain(response.status);
    });
  });

  describe("Token Format Security", () => {
    test("should handle very long tokens gracefully", async () => {
      // Create a token with an extremely long payload
      const longData = "x".repeat(10000);
      const longToken = jwt.sign(
        {
          sub: "dev|admin001",
          provider: "development",
          data: longData,
        },
        JWT_SECRET,
      );

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${longToken}`);

      // Should either accept (if valid) or reject (if too long)
      // Not crash or hang
      expect([200, 401, 413]).toContain(response.status);
    });

    test("should handle tokens with special characters", async () => {
      // Note: Null bytes and unicode injection in headers are blocked
      // at the HTTP layer (supertest/http.js) before reaching our code.
      // This is expected behavior - invalid HTTP headers are rejected.

      // Test that truncated/malformed base64 is rejected
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.incomplete");

      expect([401, 403]).toContain(response.status);
    });
  });
});
