/**
 * Constants Service Unit Tests
 * Testing our centralized constants to ensure consistency
 */

const {
  ENVIRONMENTS,
  AUTH,
  USER_ROLES,
  HTTP_STATUS,
  API_ENDPOINTS,
} = require("../../../config/constants");

describe("Constants Service", () => {
  describe("ENVIRONMENTS", () => {
    test("should have all required environment constants", () => {
      expect(ENVIRONMENTS).toHaveProperty("DEVELOPMENT", "development");
      expect(ENVIRONMENTS).toHaveProperty("STAGING", "staging");
      expect(ENVIRONMENTS).toHaveProperty("PRODUCTION", "production");
      expect(ENVIRONMENTS).toHaveProperty("TEST", "test");
    });

    test("should have string values for all environments", () => {
      Object.values(ENVIRONMENTS).forEach((env) => {
        expect(typeof env).toBe("string");
        expect(env.length).toBeGreaterThan(0);
      });
    });
  });

  describe("AUTH", () => {
    test("should have AUTH_MODES with correct values", () => {
      expect(AUTH.AUTH_MODES).toHaveProperty("DEVELOPMENT", "development");
      expect(AUTH.AUTH_MODES).toHaveProperty("AUTH0", "auth0");
    });

    test("should have PROVIDERS with correct values", () => {
      expect(AUTH.PROVIDERS).toHaveProperty("DEVELOPMENT_JWT", "development");
      expect(AUTH.PROVIDERS).toHaveProperty("AUTH0", "auth0");
    });

    test("should have JWT config with required properties", () => {
      expect(AUTH.JWT).toHaveProperty("ALGORITHM", "HS256");
      expect(AUTH.JWT).toHaveProperty("DEFAULT_EXPIRY", "24h");
      expect(AUTH.JWT).toHaveProperty("BEARER_PREFIX", "Bearer ");
    });

    test("should ensure AUTH_MODES and PROVIDERS have matching values", () => {
      expect(AUTH.AUTH_MODES.DEVELOPMENT).toBe(AUTH.PROVIDERS.DEVELOPMENT_JWT);
      expect(AUTH.AUTH_MODES.AUTH0).toBe(AUTH.PROVIDERS.AUTH0);
    });
  });

  describe("USER_ROLES", () => {
    test("should have all required user roles", () => {
      const expectedRoles = [
        "ADMIN",
        "MANAGER",
        "DISPATCHER",
        "TECHNICIAN",
        "CLIENT",
      ];
      expectedRoles.forEach((role) => {
        expect(USER_ROLES).toHaveProperty(role);
        expect(typeof USER_ROLES[role]).toBe("string");
      });
    });

    test("should have consistent role naming (lowercase values)", () => {
      Object.entries(USER_ROLES).forEach(([key, value]) => {
        expect(value).toBe(value.toLowerCase());
        expect(key).toBe(key.toUpperCase());
      });
    });

    test("should have unique role values", () => {
      const values = Object.values(USER_ROLES);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });

    test("should contain expected role hierarchy", () => {
      // Test that we have the roles we expect for our business logic
      expect(USER_ROLES.ADMIN).toBe("admin");
      expect(USER_ROLES.MANAGER).toBe("manager");
      expect(USER_ROLES.DISPATCHER).toBe("dispatcher");
      expect(USER_ROLES.TECHNICIAN).toBe("technician");
      expect(USER_ROLES.CLIENT).toBe("client");
    });
  });

  describe("HTTP_STATUS", () => {
    test("should have all required HTTP status codes", () => {
      const expectedStatuses = {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500,
        NOT_IMPLEMENTED: 501,
        SERVICE_UNAVAILABLE: 503,
      };

      Object.entries(expectedStatuses).forEach(([key, expectedValue]) => {
        expect(HTTP_STATUS).toHaveProperty(key, expectedValue);
      });
    });

    test("should have numeric values for all status codes", () => {
      Object.values(HTTP_STATUS).forEach((status) => {
        expect(typeof status).toBe("number");
        expect(status).toBeGreaterThan(99);
        expect(status).toBeLessThan(600);
      });
    });

    test("should follow HTTP status code standards", () => {
      // 2xx Success
      expect(HTTP_STATUS.OK).toBeGreaterThanOrEqual(200);
      expect(HTTP_STATUS.OK).toBeLessThan(300);
      expect(HTTP_STATUS.CREATED).toBeGreaterThanOrEqual(200);
      expect(HTTP_STATUS.CREATED).toBeLessThan(300);

      // 4xx Client Errors
      expect(HTTP_STATUS.BAD_REQUEST).toBeGreaterThanOrEqual(400);
      expect(HTTP_STATUS.BAD_REQUEST).toBeLessThan(500);
      expect(HTTP_STATUS.UNAUTHORIZED).toBeGreaterThanOrEqual(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBeLessThan(500);

      // 5xx Server Errors
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBeGreaterThanOrEqual(500);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBeLessThan(600);
    });
  });

  describe("API_ENDPOINTS", () => {
    test("should have all required API endpoints", () => {
      const expectedEndpoints = ["HEALTH", "AUTH", "AUTH0", "DEV", "ROLES"];
      expectedEndpoints.forEach((endpoint) => {
        expect(API_ENDPOINTS).toHaveProperty(endpoint);
        expect(typeof API_ENDPOINTS[endpoint]).toBe("string");
      });
    });

    test("should have valid endpoint paths", () => {
      Object.values(API_ENDPOINTS).forEach((endpoint) => {
        expect(endpoint).toMatch(/^\/api\//);
        expect(endpoint.length).toBeGreaterThan(4); // Minimum '/api/'
      });
    });

    test("should have consistent endpoint structure", () => {
      expect(API_ENDPOINTS.HEALTH).toBe("/api/health");
      expect(API_ENDPOINTS.AUTH).toBe("/api/auth");
      expect(API_ENDPOINTS.AUTH0).toBe("/api/auth0");
      expect(API_ENDPOINTS.DEV).toBe("/api/dev");
      expect(API_ENDPOINTS.ROLES).toBe("/api/roles");
    });
  });

  describe("Constants Integration", () => {
    test("should export all main constant groups", () => {
      const constants = require("../../../config/constants");

      expect(constants).toHaveProperty("ENVIRONMENTS");
      expect(constants).toHaveProperty("AUTH");
      expect(constants).toHaveProperty("USER_ROLES");
      expect(constants).toHaveProperty("HTTP_STATUS");
      expect(constants).toHaveProperty("API_ENDPOINTS");
    });

    test("should ensure no undefined or null values", () => {
      const allConstants = {
        ENVIRONMENTS,
        AUTH,
        USER_ROLES,
        HTTP_STATUS,
        API_ENDPOINTS,
      };

      function checkForUndefined(obj, path = "") {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;

          if (value === null || value === undefined) {
            throw new Error(`Undefined/null constant at ${currentPath}`);
          }

          if (typeof value === "object" && !Array.isArray(value)) {
            checkForUndefined(value, currentPath);
          }
        });
      }

      expect(() => checkForUndefined(allConstants)).not.toThrow();
    });

    test("should maintain constant immutability", () => {
      // Test that our constants can't be accidentally modified
      const originalAdminRole = USER_ROLES.ADMIN;

      // Object.freeze prevents modification in strict mode or throws in non-strict mode
      // In Jest, this might not throw, so let's test if the value remains unchanged
      try {
        USER_ROLES.ADMIN = "modified";
      } catch (error) {
        // Expected in strict mode
      }

      // Value should remain unchanged regardless
      expect(USER_ROLES.ADMIN).toBe(originalAdminRole);

      // Test that the object is actually frozen
      expect(Object.isFrozen(USER_ROLES)).toBe(true);
      expect(Object.isFrozen(AUTH)).toBe(true);
      expect(Object.isFrozen(HTTP_STATUS)).toBe(true);
    });
  });
});
