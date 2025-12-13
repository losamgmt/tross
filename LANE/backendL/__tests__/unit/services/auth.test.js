/**
 * Authentication Service Factory Unit Tests
 * Testing our clean composition-based authentication factory
 */

const { AuthProvider } = require("../../../services/auth");
const { AUTH } = require("../../../config/constants");
const { setTestEnv } = require("../../helpers/test-helpers");

// Note: No mocks needed - we test the actual Strategy Pattern implementation

describe("Authentication Factory Service", () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear the factory cache
    AuthProvider._instance = null;

    // Clear module cache to ensure fresh imports
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    AuthProvider._instance = null;
  });

  describe("Factory Pattern Implementation", () => {
    test("should be a singleton", () => {
      setTestEnv({ AUTH_MODE: "development" });

      const instance1 = AuthProvider.getInstance();
      const instance2 = AuthProvider.getInstance();

      expect(instance1).toBe(instance2);
    });

    test("should return DevAuthStrategy for development mode", () => {
      setTestEnv({ AUTH_MODE: "development" });

      const authProvider = AuthProvider.getInstance();

      // Check that it's the development implementation
      expect(authProvider.constructor.name).toBe("DevAuthStrategy");
    });

    test("should return Auth0Strategy for auth0 mode", () => {
      setTestEnv({ AUTH_MODE: "auth0" });

      const authProvider = AuthProvider.getInstance();

      // Check that it's the Auth0 implementation
      expect(authProvider.constructor.name).toBe("Auth0Strategy");
    });

    test("should default to development mode when AUTH_MODE is not set", () => {
      delete process.env.AUTH_MODE;

      const authProvider = AuthProvider.getInstance();

      expect(authProvider.constructor.name).toBe("DevAuthStrategy");
    });

    test("should handle invalid AUTH_MODE by defaulting to development", () => {
      setTestEnv({ AUTH_MODE: "invalid-mode" });

      const authProvider = AuthProvider.getInstance();

      expect(authProvider.constructor.name).toBe("DevAuthStrategy");
    });
  });

  describe("Provider Interface Consistency", () => {
    test("DevAuth should implement required methods", () => {
      setTestEnv({ AUTH_MODE: "development" });
      const devAuth = AuthProvider.getInstance();

      // Test that all required methods exist
      expect(typeof devAuth.authenticate).toBe("function");
      expect(typeof devAuth.verifyToken).toBe("function");
      expect(typeof devAuth.getUserProfile).toBe("function");
      expect(typeof devAuth.getProviderName).toBe("function");
    });

    test("Auth0Auth should implement required methods", () => {
      setTestEnv({ AUTH_MODE: "auth0" });
      const auth0Auth = AuthProvider.getInstance();

      // Test that all required methods exist
      expect(typeof auth0Auth.authenticate).toBe("function");
      expect(typeof auth0Auth.verifyToken).toBe("function");
      expect(typeof auth0Auth.getUserProfile).toBe("function");
      expect(typeof auth0Auth.getProviderName).toBe("function");
      expect(typeof auth0Auth.refreshToken).toBe("function");
      expect(typeof auth0Auth.logout).toBe("function");
    });
  });

  describe("Environment-based Configuration", () => {
    test("should use constants for provider identification", () => {
      setTestEnv({ AUTH_MODE: AUTH.AUTH_MODES.DEVELOPMENT });
      const devAuth = AuthProvider.getInstance();

      setTestEnv({ AUTH_MODE: AUTH.AUTH_MODES.AUTH0 });
      // Clear instance to force new creation
      AuthProvider._instance = null;
      const auth0Auth = AuthProvider.getInstance();

      expect(devAuth.constructor.name).toBe("DevAuthStrategy");
      expect(auth0Auth.constructor.name).toBe("Auth0Strategy");
    });

    test("should handle environment transitions correctly", () => {
      // Start with development
      setTestEnv({ AUTH_MODE: "development" });
      const devAuth = AuthProvider.getInstance();
      expect(devAuth.constructor.name).toBe("DevAuthStrategy");

      // Switch to auth0 (requires clearing instance)
      setTestEnv({ AUTH_MODE: "auth0" });
      AuthProvider._instance = null;
      const auth0Auth = AuthProvider.getInstance();
      expect(auth0Auth.constructor.name).toBe("Auth0Strategy");
    });
  });

  describe("Error Handling", () => {
    test("should not throw when creating instances", () => {
      expect(() => {
        setTestEnv({ AUTH_MODE: "development" });
        AuthProvider.getInstance();
      }).not.toThrow();

      expect(() => {
        setTestEnv({ AUTH_MODE: "auth0" });
        AuthProvider._instance = null;
        AuthProvider.getInstance();
      }).not.toThrow();
    });

    test("should handle missing environment gracefully", () => {
      // Remove all auth-related environment variables
      delete process.env.AUTH_MODE;
      delete process.env.NODE_ENV;

      expect(() => {
        const provider = AuthProvider.getInstance();
        expect(provider).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("Factory Reset", () => {
    test("should return same strategy instance when mode unchanged", () => {
      setTestEnv({ AUTH_MODE: "development" });
      const instance1 = AuthProvider.getInstance();

      // Reset AuthProvider reference (but factory cache remains)
      AuthProvider._instance = null;

      const instance2 = AuthProvider.getInstance();

      // Should be same type AND same instance (factory caches strategies)
      expect(instance1.constructor.name).toBe(instance2.constructor.name);
      expect(instance1).toBe(instance2); // Same object from factory cache
    });
  });

  describe("Production Readiness", () => {
    test("should support production configuration", () => {
      setTestEnv({
        AUTH_MODE: "auth0",
        NODE_ENV: "production",
      });

      const authProvider = AuthProvider.getInstance();

      expect(authProvider.constructor.name).toBe("Auth0Strategy");
    });

    test("should maintain singleton pattern across different calls", () => {
      setTestEnv({ AUTH_MODE: "auth0" });

      const calls = Array.from({ length: 10 }, () =>
        AuthProvider.getInstance(),
      );

      // All calls should return the same instance
      calls.forEach((instance) => {
        expect(instance).toBe(calls[0]);
      });
    });
  });
});
