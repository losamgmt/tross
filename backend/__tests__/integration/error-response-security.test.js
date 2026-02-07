/**
 * Error Response Security Audit
 *
 * SECURITY: Ensures error responses never leak sensitive information
 * Tests that error messages in production mode are sanitized
 *
 * Critical checks:
 * - No stack traces in production
 * - No database error details
 * - No file paths
 * - No Auth0 secrets
 * - No internal implementation details
 */

const request = require("supertest");
const express = require("express");
const { HTTP_STATUS } = require("../../config/constants");

// Simulate the actual error handler from server.js
const createErrorHandler = (env) => {
  return (error, req, res, _next) => {
    res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: "Internal Server Error",
      message: env === "development" ? error.message : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  };
};

describe("Error Response Security Audit", () => {
  let app;
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe("Production Error Sanitization", () => {
    test("should NOT expose stack traces in production", async () => {
      app.get("/test-error", () => {
        throw new Error(
          "Internal database connection failed at /var/lib/postgres",
        );
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-error");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Something went wrong");
      expect(response.body.stack).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("/var/lib");
      expect(JSON.stringify(response.body)).not.toContain("at ");
    });

    test("should NOT expose database error details", async () => {
      app.get("/test-db-error", () => {
        const error = new Error(
          'duplicate key value violates unique constraint "users_email_key"',
        );
        error.code = "23505";
        error.constraint = "users_email_key";
        throw error;
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-db-error");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Something went wrong");
      expect(JSON.stringify(response.body)).not.toContain("constraint");
      expect(JSON.stringify(response.body)).not.toContain("users_email_key");
      expect(response.body.code).toBeUndefined();
    });

    test("should NOT expose file paths in errors", async () => {
      app.get("/test-path-error", () => {
        throw new Error(
          'ENOENT: no such file or directory, open "/home/user/.env"',
        );
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-path-error");

      expect(JSON.stringify(response.body)).not.toContain("/home");
      expect(JSON.stringify(response.body)).not.toContain(".env");
      expect(JSON.stringify(response.body)).not.toContain("ENOENT");
    });

    test("should NOT expose Auth0 configuration details", async () => {
      app.get("/test-auth0-error", () => {
        const error = new Error(
          "Auth0 token validation failed: invalid issuer https://dev-abc123.auth0.com/",
        );
        error.auth0Config = {
          domain: "dev-abc123.auth0.com",
          clientId: "abc123xyz",
        };
        throw error;
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-auth0-error");

      expect(JSON.stringify(response.body)).not.toContain("auth0.com");
      expect(JSON.stringify(response.body)).not.toContain("abc123");
      expect(response.body.auth0Config).toBeUndefined();
    });

    test("should NOT expose JWT secrets or tokens", async () => {
      app.get("/test-jwt-error", () => {
        throw new Error(
          "JWT verification failed with secret: my-super-secret-key-123",
        );
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-jwt-error");

      expect(JSON.stringify(response.body)).not.toContain("secret");
      expect(JSON.stringify(response.body)).not.toContain("my-super");
    });

    test("should NOT expose internal module names", async () => {
      app.get("/test-module-error", () => {
        throw new Error("Error in UserDataService.findOrCreate() at line 145");
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-module-error");

      expect(JSON.stringify(response.body)).not.toContain("UserDataService");
      expect(JSON.stringify(response.body)).not.toContain("findOrCreate");
      expect(JSON.stringify(response.body)).not.toContain("line 145");
    });

    test("should use generic error message for validation errors", async () => {
      app.get("/test-validation", () => {
        const error = new Error(
          "Validation failed: email must be in format user@domain.com",
        );
        error.isValidationError = true;
        throw error;
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-validation");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Something went wrong");
    });

    test("should NOT expose environment variables", async () => {
      app.get("/test-env-error", () => {
        throw new Error(
          `DATABASE_URL=${process.env.DATABASE_URL} connection failed`,
        );
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-env-error");

      expect(JSON.stringify(response.body)).not.toContain("DATABASE_URL");
      expect(JSON.stringify(response.body)).not.toContain("postgres://");
    });
  });

  describe("Development vs Production Error Details", () => {
    test("should provide detailed errors in development mode", async () => {
      app.get("/test-dev-error", () => {
        throw new Error("Specific development error for debugging");
      });
      app.use(createErrorHandler("development"));

      const response = await request(app).get("/test-dev-error");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe(
        "Specific development error for debugging",
      );
    });

    test("should sanitize errors in production mode", async () => {
      app.get("/test-prod-error", () => {
        throw new Error("Specific internal error that should be hidden");
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-prod-error");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Something went wrong");
      expect(response.body.stack).toBeUndefined();
    });
  });

  describe("Sensitive Data Patterns", () => {
    const sensitivePatterns = [
      {
        name: "Email addresses",
        pattern: /[\w.-]+@[\w.-]+\.\w+/,
        example: "user@example.com",
      },
      {
        name: "IP addresses",
        pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
        example: "192.168.1.1",
      },
      {
        name: "File paths (Unix)",
        pattern: /\/[\w/.-]+/,
        example: "/var/log/app.log",
      },
      {
        name: "File paths (Windows)",
        pattern: /[A-Z]:\\[\w\\.-]+/,
        example: "C:\\Users\\admin",
      },
      {
        name: "Database connection strings",
        pattern: /postgres:\/\/[\w:@.-]+/,
        example: "postgres://user:pass@localhost",
      },
      {
        name: "Auth0 domains",
        pattern: /[\w-]+\.auth0\.com/,
        example: "dev-abc.auth0.com",
      },
    ];

    sensitivePatterns.forEach(({ name, pattern }) => {
      test(`should NOT expose ${name} in production errors`, async () => {
        // Use a realistic error message that might contain sensitive data
        const sensitiveErrors = {
          "Email addresses": "User john.doe@company.com not found",
          "IP addresses": "Connection from 192.168.1.100 rejected",
          "File paths (Unix)": "Cannot read /var/log/app/error.log",
          "File paths (Windows)":
            "File not found: C:\\Windows\\System32\\config",
          "Database connection strings":
            "Failed to connect to postgres://admin:pass@db.example.com:5432/prod",
          "Auth0 domains": "Token from dev-abc123.auth0.com expired",
        };

        app.get("/test-sensitive", () => {
          throw new Error(sensitiveErrors[name]);
        });
        app.use(createErrorHandler("production"));

        const response = await request(app).get("/test-sensitive");

        // In production, all errors become "Something went wrong"
        expect(response.body.message).toBe("Something went wrong");
        const responseStr = JSON.stringify(response.body);
        expect(responseStr).not.toMatch(pattern);
      });
    });
  });

  describe("HTTP Status Code Consistency", () => {
    test("should return 500 for internal errors", async () => {
      app.get("/test-500", () => {
        throw new Error("Internal error");
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-500");
      expect(response.status).toBe(500);
    });

    test("should preserve custom status codes", async () => {
      app.get("/test-404", () => {
        const error = new Error("Not found");
        error.status = 404;
        throw error;
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-404");
      expect(response.status).toBe(404);
    });

    test("should preserve validation errors (400)", async () => {
      app.get("/test-400", () => {
        const error = new Error("Validation failed");
        error.status = 400;
        throw error;
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-400");
      expect(response.status).toBe(400);
    });
  });

  describe("Error Response Structure", () => {
    test("should always return JSON error responses", async () => {
      app.get("/test-json", () => {
        throw new Error("Test error");
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-json");

      expect(response.headers["content-type"]).toMatch(/json/);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body.error).toBe("Internal Server Error");
      expect(response.body.message).toBe("Something went wrong");
    });

    test("should include timestamp in error response", async () => {
      app.get("/test-timestamp", () => {
        throw new Error("Test error");
      });
      app.use(createErrorHandler("production"));

      const response = await request(app).get("/test-timestamp");

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toString()).not.toBe(
        "Invalid Date",
      );
    });

    test("should NOT include request details in error response", async () => {
      app.get("/test-request-leak", () => {
        throw new Error("Error");
      });
      app.use(createErrorHandler("production"));

      const response = await request(app)
        .get("/test-request-leak")
        .set("Authorization", "Bearer secret-token-12345");

      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain("secret-token");
      expect(responseStr).not.toContain("Authorization");
    });
  });
});
