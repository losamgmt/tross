/**
 * Tests for AppConfig - Centralized application configuration
 */

const AppConfig = require("../../config/app-config");

describe("AppConfig", () => {
  // Save original environment
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  describe("App Identity", () => {
    test('should have app name set to "Tross"', () => {
      expect(AppConfig.appName).toBe("Tross");
    });

    test("should have version defined", () => {
      expect(AppConfig.appVersion).toBeDefined();
      expect(AppConfig.appVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test("should have description defined", () => {
      expect(AppConfig.appDescription).toBeDefined();
      expect(AppConfig.appDescription.length).toBeGreaterThan(0);
    });
  });

  describe("Environment Detection", () => {
    test("should detect current environment", () => {
      expect(AppConfig.environment).toBeDefined();
      expect(["development", "production", "test"]).toContain(
        AppConfig.environment,
      );
    });

    test("should have boolean environment flags", () => {
      expect(typeof AppConfig.isDevelopment).toBe("boolean");
      expect(typeof AppConfig.isProduction).toBe("boolean");
      expect(typeof AppConfig.isTest).toBe("boolean");
    });

    test("should only have one environment flag true", () => {
      const trueFlags = [
        AppConfig.isDevelopment,
        AppConfig.isProduction,
        AppConfig.isTest,
      ].filter((flag) => flag);

      expect(trueFlags.length).toBe(1);
    });

    test("isDevelopment and isProduction should be opposites when not test", () => {
      if (!AppConfig.isTest) {
        expect(AppConfig.isDevelopment).not.toBe(AppConfig.isProduction);
      }
    });
  });

  describe("Feature Flags", () => {
    test("devAuthEnabled should be true in test/dev, false in prod", () => {
      if (AppConfig.isProduction) {
        expect(AppConfig.devAuthEnabled).toBe(false);
      } else {
        expect(AppConfig.devAuthEnabled).toBe(true);
      }
    });

    test("healthMonitoringEnabled should be true", () => {
      expect(AppConfig.healthMonitoringEnabled).toBe(true);
    });

    test("verboseLogging should be true in test/dev", () => {
      if (AppConfig.isProduction) {
        expect(AppConfig.verboseLogging).toBe(false);
      } else {
        expect(AppConfig.verboseLogging).toBe(true);
      }
    });

    test("swaggerEnabled should be true only in development", () => {
      if (AppConfig.isDevelopment) {
        expect(AppConfig.swaggerEnabled).toBe(true);
      } else {
        expect(AppConfig.swaggerEnabled).toBe(false);
      }
    });
  });

  describe("Server Configuration", () => {
    test("should have valid port number", () => {
      expect(AppConfig.port).toBeGreaterThan(0);
      expect(AppConfig.port).toBeLessThan(65536);
    });

    test("should have host defined", () => {
      expect(AppConfig.host).toBeDefined();
      expect(typeof AppConfig.host).toBe("string");
    });

    test("should have CORS configuration", () => {
      expect(AppConfig.cors).toBeDefined();
      expect(AppConfig.cors.origin).toBeDefined();
      expect(AppConfig.cors.credentials).toBe(true);
    });

    test("CORS origin should be array", () => {
      expect(Array.isArray(AppConfig.cors.origin)).toBe(true);
      expect(AppConfig.cors.origin.length).toBeGreaterThan(0);
    });
  });

  describe("Database Configuration", () => {
    test("should have database config", () => {
      expect(AppConfig.database).toBeDefined();
      expect(AppConfig.database.host).toBeDefined();
      expect(AppConfig.database.port).toBeGreaterThan(0);
      expect(AppConfig.database.name).toBeDefined();
    });

    test("should have connection pool settings", () => {
      expect(AppConfig.database.pool).toBeDefined();
      expect(AppConfig.database.pool.min).toBeGreaterThan(0);
      expect(AppConfig.database.pool.max).toBeGreaterThan(
        AppConfig.database.pool.min,
      );
    });
  });

  describe("Redis Configuration", () => {
    test("should have redis config", () => {
      expect(AppConfig.redis).toBeDefined();
      expect(AppConfig.redis.host).toBeDefined();
      expect(AppConfig.redis.port).toBeGreaterThan(0);
    });

    test("redis db should be valid number", () => {
      expect(AppConfig.redis.db).toBeGreaterThanOrEqual(0);
      expect(AppConfig.redis.db).toBeLessThan(16); // Redis has 16 databases by default
    });
  });

  describe("Auth0 Configuration", () => {
    test("should have Auth0 config", () => {
      expect(AppConfig.auth0).toBeDefined();
      expect(AppConfig.auth0.domain).toBeDefined();
      expect(AppConfig.auth0.clientId).toBeDefined();
    });

    test("Auth0 domain should be valid format", () => {
      expect(AppConfig.auth0.domain).toMatch(/\.auth0\.com$/);
    });

    test("Auth0 audience should be valid URL", () => {
      expect(AppConfig.auth0.audience).toMatch(/^https?:\/\//);
    });
  });

  describe("JWT Configuration", () => {
    test("should have JWT config", () => {
      expect(AppConfig.jwt).toBeDefined();
      expect(AppConfig.jwt.secret).toBeDefined();
      expect(AppConfig.jwt.expiresIn).toBeDefined();
      expect(AppConfig.jwt.algorithm).toBe("HS256");
    });

    test("JWT expiry should be valid format", () => {
      expect(AppConfig.jwt.expiresIn).toMatch(/^\d+[hdms]$/);
    });
  });

  describe("Health Check Configuration", () => {
    test("should have health check config", () => {
      expect(AppConfig.health).toBeDefined();
      expect(AppConfig.health.checkInterval).toBeGreaterThan(0);
      expect(AppConfig.health.timeout).toBeGreaterThan(0);
    });

    test("timeout should be less than check interval", () => {
      expect(AppConfig.health.timeout).toBeLessThan(
        AppConfig.health.checkInterval,
      );
    });
  });

  describe("Rate Limiting Configuration", () => {
    test("should have rate limit config", () => {
      expect(AppConfig.rateLimit).toBeDefined();
      expect(AppConfig.rateLimit.windowMs).toBeGreaterThan(0);
      expect(AppConfig.rateLimit.max).toBeGreaterThan(0);
    });
  });

  describe("Security Helpers", () => {
    describe("validateDevAuth", () => {
      test("should not throw when devAuthEnabled is true", () => {
        if (AppConfig.devAuthEnabled) {
          expect(() => AppConfig.validateDevAuth()).not.toThrow();
        }
      });

      test("should throw when devAuthEnabled is false", () => {
        if (!AppConfig.devAuthEnabled) {
          expect(() => AppConfig.validateDevAuth()).toThrow();
          expect(() => AppConfig.validateDevAuth()).toThrow(/production mode/);
        }
      });

      test("error message should mention security", () => {
        if (!AppConfig.devAuthEnabled) {
          try {
            AppConfig.validateDevAuth();
            fail("Should have thrown error");
          } catch (error) {
            expect(error.message).toMatch(/security/i);
            expect(error.message).toMatch(/Auth0/i);
          }
        }
      });
    });

    describe("getSafeConfig", () => {
      test("should return configuration object", () => {
        const safeConfig = AppConfig.getSafeConfig();
        expect(safeConfig).toBeDefined();
        expect(typeof safeConfig).toBe("object");
      });

      test("should not include sensitive data", () => {
        const safeConfig = AppConfig.getSafeConfig();
        expect(safeConfig.jwt).toBeUndefined();
        expect(safeConfig.auth0).toBeUndefined();
        expect(safeConfig.database).toBeUndefined();
      });

      test("should include app identity", () => {
        const safeConfig = AppConfig.getSafeConfig();
        expect(safeConfig.appName).toBe("Tross");
        expect(safeConfig.appVersion).toBeDefined();
        expect(safeConfig.environment).toBeDefined();
      });

      test("should include feature flags", () => {
        const safeConfig = AppConfig.getSafeConfig();
        expect(typeof safeConfig.devAuthEnabled).toBe("boolean");
        expect(typeof safeConfig.healthMonitoringEnabled).toBe("boolean");
      });
    });

    describe("validate", () => {
      test("should not throw in test environment", () => {
        expect(() => AppConfig.validate()).not.toThrow();
      });

      test("should have validate method", () => {
        expect(typeof AppConfig.validate).toBe("function");
      });
    });
  });

  describe("Integration", () => {
    test("configuration should be internally consistent", () => {
      // If dev auth is enabled, should not be production
      if (AppConfig.devAuthEnabled) {
        expect(AppConfig.isProduction).toBe(false);
      }

      // If production, dev auth should be disabled
      if (AppConfig.isProduction) {
        expect(AppConfig.devAuthEnabled).toBe(false);
      }
    });

    test("app identity should be consistent", () => {
      const safeConfig = AppConfig.getSafeConfig();
      expect(safeConfig.appName).toBe(AppConfig.appName);
      expect(safeConfig.appVersion).toBe(AppConfig.appVersion);
    });

    test("all required top-level properties exist", () => {
      const requiredProps = [
        "appName",
        "environment",
        "devAuthEnabled",
        "port",
        "database",
        "redis",
        "auth0",
        "jwt",
      ];

      requiredProps.forEach((prop) => {
        expect(AppConfig[prop]).toBeDefined();
      });
    });
  });
});
