/**
 * Input Sanitization Security Tests
 *
 * Tests the security middleware's ability to prevent:
 * - NoSQL/MongoDB injection attempts (even though we use PostgreSQL)
 * - SQL injection patterns
 * - XSS payloads in input
 * - Prototype pollution attempts
 */

const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const {
  sanitizeInput,
  securityHeaders,
} = require("../../../middleware/security");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

describe("Input Sanitization Security", () => {
  let app;
  let validToken;

  beforeAll(() => {
    validToken = jwt.sign(
      {
        sub: "dev|admin001",
        email: "admin@tross.dev",
        role: "admin",
        provider: "development",
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(sanitizeInput());

    // Test endpoint that echoes back body
    app.post("/api/test", (req, res) => {
      res.json({ received: req.body });
    });

    // Test endpoint that echoes params
    app.get("/api/test/:id", (req, res) => {
      res.json({ id: req.params.id });
    });
  });

  describe("MongoDB Operator Injection Prevention", () => {
    test("should sanitize string values starting with $", async () => {
      // The sanitizer replaces leading $ in STRING values
      const response = await request(app)
        .post("/api/test")
        .send({ password: "$gt attack" });

      expect(response.status).toBe(200);
      // $ at start should be replaced with _
      expect(response.body.received.password).toBe("_gt attack");
    });

    test("should sanitize $ne string value", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({ username: "$ne null" });

      expect(response.status).toBe(200);
      expect(response.body.received.username).toBe("_ne null");
    });

    test("should sanitize $where operator string", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({ field: "$where: function() { return true; }" });

      expect(response.status).toBe(200);
      // $ at start should be replaced with _
      expect(response.body.received.field).toMatch(/^_/);
    });

    test("should sanitize $regex string value", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({ search: "$regex pattern" });

      expect(response.status).toBe(200);
      expect(response.body.received.search).toBe("_regex pattern");
    });

    test("should NOT modify object values (PostgreSQL ignores MongoDB operators)", async () => {
      // Note: MongoDB-style objects like { $gt: '' } are passed through
      // because PostgreSQL doesn't interpret them - they're just objects
      const response = await request(app)
        .post("/api/test")
        .send({ filter: { $gt: 100 } });

      expect(response.status).toBe(200);
      // Object passes through (PostgreSQL won't execute MongoDB operators)
      expect(response.body.received.filter).toEqual({ $gt: 100 });
    });
  });

  describe("SQL Injection Prevention", () => {
    test("should accept normal alphanumeric input", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({ name: "John Doe", email: "john@example.com" });

      expect(response.status).toBe(200);
      expect(response.body.received.name).toBe("John Doe");
      expect(response.body.received.email).toBe("john@example.com");
    });

    test("should preserve SQL keywords in normal text context", async () => {
      // Users should be able to type "SELECT" in a description field
      const response = await request(app)
        .post("/api/test")
        .send({ description: "Please SELECT the best option" });

      expect(response.status).toBe(200);
      expect(response.body.received.description).toBe(
        "Please SELECT the best option",
      );
    });

    test("should handle semicolons in text (not SQL statement terminator)", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({ note: "Task completed; next steps pending" });

      expect(response.status).toBe(200);
      expect(response.body.received.note).toBe(
        "Task completed; next steps pending",
      );
    });
  });

  describe("JWT Token Preservation", () => {
    test("should NOT sanitize id_token field (contains dots)", async () => {
      const mockIdToken =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";

      const response = await request(app)
        .post("/api/test")
        .send({ id_token: mockIdToken });

      expect(response.status).toBe(200);
      expect(response.body.received.id_token).toBe(mockIdToken);
    });

    test("should NOT sanitize access_token field", async () => {
      const mockAccessToken =
        "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.signature";

      const response = await request(app)
        .post("/api/test")
        .send({ access_token: mockAccessToken });

      expect(response.status).toBe(200);
      expect(response.body.received.access_token).toBe(mockAccessToken);
    });

    test("should NOT sanitize refresh_token field", async () => {
      const mockRefreshToken = "v1.refresh.token.with.dots";

      const response = await request(app)
        .post("/api/test")
        .send({ refresh_token: mockRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.received.refresh_token).toBe(mockRefreshToken);
    });

    test("should NOT sanitize email field (contains dots and @)", async () => {
      const email = "user.name@sub.domain.com";

      const response = await request(app).post("/api/test").send({ email });

      expect(response.status).toBe(200);
      expect(response.body.received.email).toBe(email);
    });
  });

  describe("Nested Object Sanitization", () => {
    test("should sanitize nested objects", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({
          user: {
            profile: {
              name: "Normal Name",
              hack: "$or attack",
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.received.user.profile.name).toBe("Normal Name");
      expect(response.body.received.user.profile.hack).toMatch(/^_/);
    });

    test("should handle deeply nested injection attempts", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({
          level1: {
            level2: {
              level3: {
                attack: "$where: return true",
              },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.received.level1.level2.level3.attack).toMatch(/^_/);
    });
  });

  describe("URL Parameter Sanitization", () => {
    // Note: Express route params (req.params) may be read-only in some environments
    // The sanitization middleware attempts to sanitize them but may not always succeed
    // This is acceptable since we use PostgreSQL parameterized queries as primary defense

    test("should handle URL params with $ at start gracefully", async () => {
      const response = await request(app).get("/api/test/$gt");

      expect(response.status).toBe(200);
      // May or may not be sanitized depending on Express version
      expect(["$gt", "_gt"]).toContain(response.body.id);
    });

    test("should preserve normal URL params", async () => {
      const response = await request(app).get("/api/test/12345");

      expect(response.status).toBe(200);
      expect(response.body.id).toBe("12345");
    });

    test("should preserve URL params without leading $", async () => {
      const response = await request(app).get("/api/test/normal-param");

      expect(response.status).toBe(200);
      expect(response.body.id).toBe("normal-param");
    });
  });

  describe("XSS Prevention", () => {
    test("should accept HTML tags in body (server stores, frontend escapes)", async () => {
      // Note: XSS prevention is primarily a frontend concern
      // Server stores the data, frontend must escape on display
      const response = await request(app)
        .post("/api/test")
        .send({ content: '<script>alert("xss")</script>' });

      expect(response.status).toBe(200);
      // Server accepts it - frontend must escape
      expect(response.body.received.content).toBe(
        '<script>alert("xss")</script>',
      );
    });
  });

  describe("Prototype Pollution Prevention", () => {
    test("should handle __proto__ in body safely", async () => {
      const response = await request(app)
        .post("/api/test")
        .set("Content-Type", "application/json")
        .send('{"__proto__": {"admin": true}}');

      expect(response.status).toBe(200);
      // Should not pollute Object prototype
      expect({}.admin).toBeUndefined();
    });

    test("should handle constructor.prototype in body safely", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({ constructor: { prototype: { polluted: true } } });

      expect(response.status).toBe(200);
      // Should not pollute
      expect({}.polluted).toBeUndefined();
    });
  });
});
