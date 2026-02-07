/**
 * Deployment Adapter Unit Tests
 * Testing platform detection and configuration abstraction
 */

const {
  validateEnvironment,
  getDatabaseConfig,
  getPort,
  getHealthCheckPath,
  getAllowedOrigins,
  detectPlatform,
  getPlatformMetadata,
  isProduction,
  isTest,
  getRateLimitConfig,
  getRequestTimeout,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS,
} = require("../../../config/deployment-adapter");

describe("Deployment Adapter", () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all env vars that could affect tests
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.RENDER;
    delete process.env.FLY_APP_NAME;
    delete process.env.DYNO;
    delete process.env.DATABASE_URL;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_POOL_MIN;
    delete process.env.DB_POOL_MAX;
    delete process.env.PORT;
    delete process.env.BACKEND_PORT;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.FRONTEND_URL;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    delete process.env.REQUEST_TIMEOUT_MS;
    delete process.env.NODE_ENV;
    delete process.env.RAILWAY_REGION;
    delete process.env.FLY_REGION;
    delete process.env.RAILWAY_DEPLOYMENT_ID;
    delete process.env.RENDER_GIT_COMMIT;
    delete process.env.HEROKU_SLUG_COMMIT;

    // Set required env vars for tests that need them
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    // Restore original env vars
    process.env = { ...originalEnv };
  });

  describe("Platform Detection", () => {
    test("should detect Railway platform", () => {
      process.env.RAILWAY_ENVIRONMENT = "production";
      expect(detectPlatform()).toBe("railway");
    });

    test("should detect Render platform", () => {
      process.env.RENDER = "true";
      expect(detectPlatform()).toBe("render");
    });

    test("should detect Fly.io platform", () => {
      process.env.FLY_APP_NAME = "tross";
      expect(detectPlatform()).toBe("fly");
    });

    test("should detect Heroku platform", () => {
      process.env.DYNO = "web.1";
      expect(detectPlatform()).toBe("heroku");
    });

    test("should default to local platform", () => {
      expect(detectPlatform()).toBe("local");
    });

    test("should prioritize Railway over other platforms", () => {
      process.env.RAILWAY_ENVIRONMENT = "production";
      process.env.RENDER = "true";
      process.env.FLY_APP_NAME = "tross";
      process.env.DYNO = "web.1";
      expect(detectPlatform()).toBe("railway");
    });

    test("should prioritize Render over Fly/Heroku", () => {
      process.env.RENDER = "true";
      process.env.FLY_APP_NAME = "tross";
      process.env.DYNO = "web.1";
      expect(detectPlatform()).toBe("render");
    });

    test("should prioritize Fly over Heroku", () => {
      process.env.FLY_APP_NAME = "tross";
      process.env.DYNO = "web.1";
      expect(detectPlatform()).toBe("fly");
    });
  });

  describe("Environment Validation", () => {
    test("should throw error when required env vars are missing", () => {
      // Clear all env vars
      const backup = { ...process.env };
      process.env = {};

      expect(() => validateEnvironment()).toThrow(
        /Missing required environment variables/,
      );

      process.env = backup;
    });

    test("should specify which env vars are missing", () => {
      const backup = { ...process.env };
      process.env = { NODE_ENV: "test" }; // Only set one

      try {
        validateEnvironment();
        fail("Should have thrown error");
      } catch (error) {
        expect(error.message).toContain("JWT_SECRET");
        expect(error.message).toContain("AUTH0_DOMAIN");
        expect(error.message).toContain("AUTH0_AUDIENCE");
        expect(error.message).toContain("AUTH0_ISSUER");
      }

      process.env = backup;
    });

    test("should pass validation when all required env vars are present", () => {
      process.env.NODE_ENV = "test";
      process.env.JWT_SECRET = "test-secret";
      process.env.AUTH0_DOMAIN = "test.auth0.com";
      process.env.AUTH0_AUDIENCE = "test-audience";
      process.env.AUTH0_ISSUER = "https://test.auth0.com/";

      expect(() => validateEnvironment()).not.toThrow();
    });

    test("should have all expected required env vars", () => {
      expect(REQUIRED_ENV_VARS).toEqual([
        "NODE_ENV",
        "JWT_SECRET",
        "AUTH0_DOMAIN",
        "AUTH0_AUDIENCE",
        "AUTH0_ISSUER",
      ]);
    });
  });

  describe("Database Configuration", () => {
    test("should use DATABASE_URL when present (Railway/Heroku format)", () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";

      const config = getDatabaseConfig();
      expect(config).toBe("postgresql://user:pass@host:5432/db");
    });

    test("should use individual env vars when DATABASE_URL is not set", () => {
      process.env.DB_HOST = "testhost";
      process.env.DB_PORT = "5433";
      process.env.DB_NAME = "testdb";
      process.env.DB_USER = "testuser";
      process.env.DB_PASSWORD = "testpass";
      process.env.DB_POOL_MIN = "5";
      process.env.DB_POOL_MAX = "20";

      const config = getDatabaseConfig();
      expect(config).toEqual({
        host: "testhost",
        port: 5433,
        database: "testdb",
        user: "testuser",
        password: "testpass",
        min: 5,
        max: 20,
      });
    });

    test("should use default values when individual env vars are missing", () => {
      const config = getDatabaseConfig();

      // Test structure and types, not specific values (which are configuration decisions)
      expect(config).toHaveProperty("host", "localhost");
      expect(config).toHaveProperty("port", 5432);
      expect(config).toHaveProperty("database", "tross_dev");
      expect(config).toHaveProperty("user", "postgres");
      expect(config).toHaveProperty("password", "postgres");
      // Pool values should match OPTIONAL_ENV_VARS (source of truth)
      expect(config.min).toBe(OPTIONAL_ENV_VARS.DB_POOL_MIN);
      expect(config.max).toBe(OPTIONAL_ENV_VARS.DB_POOL_MAX);
    });

    test("should prioritize DATABASE_URL over individual env vars", () => {
      process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
      process.env.DB_HOST = "shouldbeignored";
      process.env.DB_PORT = "9999";

      const config = getDatabaseConfig();
      expect(config).toBe("postgresql://user:pass@host:5432/db");
    });

    test("should parse port numbers correctly", () => {
      process.env.DB_PORT = "5555";
      process.env.DB_POOL_MIN = "3";
      process.env.DB_POOL_MAX = "15";

      const config = getDatabaseConfig();
      expect(config.port).toBe(5555);
      expect(config.min).toBe(3);
      expect(config.max).toBe(15);
      expect(typeof config.port).toBe("number");
      expect(typeof config.min).toBe("number");
      expect(typeof config.max).toBe("number");
    });

    test("should handle pool size env vars with defaults", () => {
      const config = getDatabaseConfig();
      expect(config.min).toBe(OPTIONAL_ENV_VARS.DB_POOL_MIN);
      expect(config.max).toBe(OPTIONAL_ENV_VARS.DB_POOL_MAX);
    });
  });

  describe("Port Configuration", () => {
    test("should use PORT env var (cloud platform standard)", () => {
      process.env.PORT = "8080";
      expect(getPort()).toBe(8080);
    });

    test("should use BACKEND_PORT when PORT is not set", () => {
      process.env.BACKEND_PORT = "3000";
      expect(getPort()).toBe(3000);
    });

    test("should use default port when no env vars are set", () => {
      expect(getPort()).toBe(OPTIONAL_ENV_VARS.PORT);
    });

    test("should prioritize PORT over BACKEND_PORT", () => {
      process.env.PORT = "8080";
      process.env.BACKEND_PORT = "3000";
      expect(getPort()).toBe(8080);
    });

    test("should parse port as integer", () => {
      process.env.PORT = "5555";
      const port = getPort();
      expect(typeof port).toBe("number");
      expect(port).toBe(5555);
    });
  });

  describe("Health Check Configuration", () => {
    test("should return standard health check path", () => {
      expect(getHealthCheckPath()).toBe("/api/health");
    });
  });

  describe("CORS Configuration", () => {
    // Helper to test the CORS origin validation function
    const testOrigin = (originFn, origin) => {
      return new Promise((resolve) => {
        originFn(origin, (err, allowed) => {
          resolve({ err, allowed });
        });
      });
    };

    test("should allow configured ALLOWED_ORIGINS", async () => {
      process.env.ALLOWED_ORIGINS =
        "https://app.example.com,https://www.example.com";
      const originFn = getAllowedOrigins();

      const result1 = await testOrigin(originFn, "https://app.example.com");
      const result2 = await testOrigin(originFn, "https://www.example.com");

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    test("should use FRONTEND_URL when ALLOWED_ORIGINS is not set", async () => {
      process.env.FRONTEND_URL = "https://frontend.example.com";
      const originFn = getAllowedOrigins();

      const result = await testOrigin(originFn, "https://frontend.example.com");
      expect(result.allowed).toBe(true);
    });

    test("should trim whitespace from origins", async () => {
      process.env.ALLOWED_ORIGINS =
        " https://app.example.com , https://www.example.com ";
      const originFn = getAllowedOrigins();

      const result = await testOrigin(originFn, "https://app.example.com");
      expect(result.allowed).toBe(true);
    });

    test("should filter empty origins", async () => {
      process.env.ALLOWED_ORIGINS =
        "https://app.example.com,,https://www.example.com";
      const originFn = getAllowedOrigins();

      const result1 = await testOrigin(originFn, "https://app.example.com");
      const result2 = await testOrigin(originFn, "https://www.example.com");

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    test("should allow localhost origins in non-production", async () => {
      process.env.NODE_ENV = "development";
      const originFn = getAllowedOrigins();

      const result1 = await testOrigin(originFn, "http://localhost:8080");
      const result2 = await testOrigin(originFn, "http://localhost:3000");

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    test("should reject localhost in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "https://app.example.com";
      const originFn = getAllowedOrigins();

      const result = await testOrigin(originFn, "http://localhost:8080");
      expect(result.allowed).toBe(false);
    });

    test("should allow requests with no origin (mobile apps, curl)", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "https://app.example.com";
      const originFn = getAllowedOrigins();

      const result = await testOrigin(originFn, undefined);
      expect(result.allowed).toBe(true);
    });

    test("should allow Vercel preview deployments", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "https://trossapp.vercel.app";
      const originFn = getAllowedOrigins();

      const result = await testOrigin(
        originFn,
        "https://tross-frontend-abc123-zarika-ambers-projects.vercel.app",
      );
      expect(result.allowed).toBe(true);
    });

    test("should always allow main Vercel domain", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "https://other.example.com";
      const originFn = getAllowedOrigins();

      const result = await testOrigin(originFn, "https://trossapp.vercel.app");
      expect(result.allowed).toBe(true);
    });

    test("should reject unknown origins", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "https://app.example.com";
      const originFn = getAllowedOrigins();

      const result = await testOrigin(
        originFn,
        "https://malicious.example.com",
      );
      expect(result.allowed).toBe(false);
      expect(result.err).toBeTruthy();
    });
  });

  describe("Platform Metadata", () => {
    test("should return metadata for Railway platform", () => {
      process.env.RAILWAY_ENVIRONMENT = "production";
      process.env.RAILWAY_REGION = "us-west1";
      process.env.RAILWAY_DEPLOYMENT_ID = "deploy-123";
      process.env.NODE_ENV = "production";

      const metadata = getPlatformMetadata();

      expect(metadata.platform).toBe("railway");
      expect(metadata.environment).toBe("production");
      expect(metadata.region).toBe("us-west1");
      expect(metadata.deployment.id).toBe("deploy-123");
      expect(metadata.deployment.timestamp).toBeDefined();
    });

    test("should return metadata for Render platform", () => {
      process.env.RENDER = "true";
      process.env.RENDER_GIT_COMMIT = "abc123";
      process.env.NODE_ENV = "production";

      const metadata = getPlatformMetadata();

      expect(metadata.platform).toBe("render");
      expect(metadata.deployment.id).toBe("abc123");
    });

    test("should return metadata for Fly.io platform", () => {
      process.env.FLY_APP_NAME = "tross";
      process.env.FLY_REGION = "sjc";

      const metadata = getPlatformMetadata();

      expect(metadata.platform).toBe("fly");
      expect(metadata.region).toBe("sjc");
    });

    test("should return metadata for Heroku platform", () => {
      process.env.DYNO = "web.1";
      process.env.HEROKU_SLUG_COMMIT = "xyz789";

      const metadata = getPlatformMetadata();

      expect(metadata.platform).toBe("heroku");
      expect(metadata.deployment.id).toBe("xyz789");
    });

    test("should return metadata for local platform", () => {
      const metadata = getPlatformMetadata();

      expect(metadata.platform).toBe("local");
      expect(metadata.region).toBe("unknown");
      expect(metadata.deployment.id).toBe("local");
    });

    test("should include ISO timestamp", () => {
      const metadata = getPlatformMetadata();
      const timestamp = new Date(metadata.deployment.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(metadata.deployment.timestamp);
    });

    test("should default environment to development when NODE_ENV is not set", () => {
      delete process.env.NODE_ENV;
      const metadata = getPlatformMetadata();

      expect(metadata.environment).toBe("development");
    });
  });

  describe("Environment Checks", () => {
    test("isProduction should return true when NODE_ENV is production", () => {
      process.env.NODE_ENV = "production";
      expect(isProduction()).toBe(true);
    });

    test("isProduction should return false when NODE_ENV is not production", () => {
      process.env.NODE_ENV = "development";
      expect(isProduction()).toBe(false);

      process.env.NODE_ENV = "test";
      expect(isProduction()).toBe(false);
    });

    test("isTest should return true when NODE_ENV is test", () => {
      process.env.NODE_ENV = "test";
      expect(isTest()).toBe(true);
    });

    test("isTest should return false when NODE_ENV is not test", () => {
      process.env.NODE_ENV = "production";
      expect(isTest()).toBe(false);

      process.env.NODE_ENV = "development";
      expect(isTest()).toBe(false);
    });
  });

  describe("Rate Limit Configuration", () => {
    test("should use env vars when present", () => {
      process.env.RATE_LIMIT_WINDOW_MS = "600000";
      process.env.RATE_LIMIT_MAX_REQUESTS = "50";

      const config = getRateLimitConfig();

      expect(config.windowMs).toBe(600000);
      expect(config.max).toBe(50);
      expect(config.message).toBe(
        "Too many requests from this IP, please try again later",
      );
    });

    test("should use defaults when env vars are not set", () => {
      const config = getRateLimitConfig();

      expect(config.windowMs).toBe(OPTIONAL_ENV_VARS.RATE_LIMIT_WINDOW_MS);
      expect(config.max).toBe(OPTIONAL_ENV_VARS.RATE_LIMIT_MAX_REQUESTS);
    });

    test("should parse values as integers", () => {
      process.env.RATE_LIMIT_WINDOW_MS = "123456";
      process.env.RATE_LIMIT_MAX_REQUESTS = "789";

      const config = getRateLimitConfig();

      expect(typeof config.windowMs).toBe("number");
      expect(typeof config.max).toBe("number");
    });
  });

  describe("Request Timeout Configuration", () => {
    test("should use env var when present", () => {
      process.env.REQUEST_TIMEOUT_MS = "60000";
      expect(getRequestTimeout()).toBe(60000);
    });

    test("should use default when env var is not set", () => {
      expect(getRequestTimeout()).toBe(OPTIONAL_ENV_VARS.REQUEST_TIMEOUT_MS);
    });

    test("should parse value as integer", () => {
      process.env.REQUEST_TIMEOUT_MS = "45000";
      const timeout = getRequestTimeout();

      expect(typeof timeout).toBe("number");
      expect(timeout).toBe(45000);
    });
  });

  describe("Optional Environment Variables", () => {
    const EXPECTED_KEYS = [
      "PORT",
      "BACKEND_PORT",
      "RATE_LIMIT_WINDOW_MS",
      "RATE_LIMIT_MAX_REQUESTS",
      "REQUEST_TIMEOUT_MS",
      "DB_POOL_MIN",
      "DB_POOL_MAX",
    ];

    test("should have all expected keys", () => {
      EXPECTED_KEYS.forEach((key) => {
        expect(OPTIONAL_ENV_VARS).toHaveProperty(key);
      });
    });

    test("should not have unexpected keys", () => {
      const actualKeys = Object.keys(OPTIONAL_ENV_VARS);
      expect(actualKeys.sort()).toEqual(EXPECTED_KEYS.sort());
    });

    test("should have numeric values for all defaults", () => {
      Object.entries(OPTIONAL_ENV_VARS).forEach(([key, value]) => {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThan(0);
      });
    });

    test("should have valid pool constraints (min <= max)", () => {
      expect(OPTIONAL_ENV_VARS.DB_POOL_MIN).toBeLessThanOrEqual(
        OPTIONAL_ENV_VARS.DB_POOL_MAX,
      );
    });

    test("should have consistent port defaults", () => {
      expect(OPTIONAL_ENV_VARS.PORT).toBe(OPTIONAL_ENV_VARS.BACKEND_PORT);
    });
  });
});
