/**
 * Unit Tests for services/auth/AuthStrategyFactory.js
 *
 * Tests the authentication strategy factory pattern.
 * Covers static utility methods for auth mode detection.
 *
 * Test Coverage: getStrategy, reset, getCurrentMode, isDevelopment, isAuth0
 */

jest.mock("../../../config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the strategy classes
jest.mock("../../../services/auth/DevAuthStrategy");
jest.mock("../../../services/auth/Auth0Strategy");

const {
  AuthStrategyFactory,
  AUTH_MODES,
} = require("../../../services/auth/AuthStrategyFactory");
const DevAuthStrategy = require("../../../services/auth/DevAuthStrategy");
const Auth0Strategy = require("../../../services/auth/Auth0Strategy");

describe("services/auth/AuthStrategyFactory.js", () => {
  const originalAuthMode = process.env.AUTH_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    AuthStrategyFactory.reset();
    // Default to development mode
    process.env.AUTH_MODE = "development";
  });

  afterEach(() => {
    // Restore original AUTH_MODE
    if (originalAuthMode !== undefined) {
      process.env.AUTH_MODE = originalAuthMode;
    } else {
      delete process.env.AUTH_MODE;
    }
    AuthStrategyFactory.reset();
  });

  describe("AUTH_MODES", () => {
    test("should export all auth mode constants", () => {
      expect(AUTH_MODES.DEVELOPMENT).toBe("development");
      expect(AUTH_MODES.AUTH0).toBe("auth0");
      expect(AUTH_MODES.PRODUCTION).toBe("production");
    });
  });

  describe("getStrategy()", () => {
    test("should return DevAuthStrategy for development mode", () => {
      process.env.AUTH_MODE = "development";
      const strategy = AuthStrategyFactory.getStrategy();
      expect(DevAuthStrategy).toHaveBeenCalled();
    });

    test("should return Auth0Strategy for auth0 mode", () => {
      process.env.AUTH_MODE = "auth0";
      const strategy = AuthStrategyFactory.getStrategy();
      expect(Auth0Strategy).toHaveBeenCalled();
    });

    test("should return Auth0Strategy for production mode", () => {
      process.env.AUTH_MODE = "production";
      const strategy = AuthStrategyFactory.getStrategy();
      expect(Auth0Strategy).toHaveBeenCalled();
    });

    test("should cache and return same strategy on repeated calls", () => {
      process.env.AUTH_MODE = "development";
      const strategy1 = AuthStrategyFactory.getStrategy();
      const strategy2 = AuthStrategyFactory.getStrategy();
      // Should only create strategy once
      expect(DevAuthStrategy).toHaveBeenCalledTimes(1);
    });

    test("should create new strategy when AUTH_MODE changes", () => {
      process.env.AUTH_MODE = "development";
      AuthStrategyFactory.getStrategy();
      expect(DevAuthStrategy).toHaveBeenCalledTimes(1);

      process.env.AUTH_MODE = "auth0";
      AuthStrategyFactory.getStrategy();
      expect(Auth0Strategy).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset()", () => {
    test("should clear cached strategy", () => {
      process.env.AUTH_MODE = "development";
      AuthStrategyFactory.getStrategy();
      expect(DevAuthStrategy).toHaveBeenCalledTimes(1);

      AuthStrategyFactory.reset();

      // Should create new strategy after reset
      AuthStrategyFactory.getStrategy();
      expect(DevAuthStrategy).toHaveBeenCalledTimes(2);
    });
  });

  describe("getCurrentMode()", () => {
    test("should return development for dev mode", () => {
      process.env.AUTH_MODE = "development";
      expect(AuthStrategyFactory.getCurrentMode()).toBe("development");
    });

    test("should return auth0 for auth0 mode", () => {
      process.env.AUTH_MODE = "auth0";
      AuthStrategyFactory.getStrategy(); // Initialize
      expect(AuthStrategyFactory.getCurrentMode()).toBe("auth0");
    });

    test("should normalize various mode strings", () => {
      process.env.AUTH_MODE = "DEV";
      expect(AuthStrategyFactory.getCurrentMode()).toBe("development");

      process.env.AUTH_MODE = "prod";
      AuthStrategyFactory.reset();
      expect(AuthStrategyFactory.getCurrentMode()).toBe("auth0");
    });
  });

  describe("isDevelopment()", () => {
    test("should return true for development mode", () => {
      process.env.AUTH_MODE = "development";
      expect(AuthStrategyFactory.isDevelopment()).toBe(true);
    });

    test("should return false for auth0 mode", () => {
      process.env.AUTH_MODE = "auth0";
      AuthStrategyFactory.getStrategy(); // Initialize
      expect(AuthStrategyFactory.isDevelopment()).toBe(false);
    });

    test("should return true when AUTH_MODE is not set", () => {
      delete process.env.AUTH_MODE;
      expect(AuthStrategyFactory.isDevelopment()).toBe(true);
    });
  });

  describe("isAuth0()", () => {
    test("should return false for development mode", () => {
      process.env.AUTH_MODE = "development";
      expect(AuthStrategyFactory.isAuth0()).toBe(false);
    });

    test("should return true for auth0 mode", () => {
      process.env.AUTH_MODE = "auth0";
      AuthStrategyFactory.getStrategy(); // Initialize
      expect(AuthStrategyFactory.isAuth0()).toBe(true);
    });

    test("should return true for production mode", () => {
      process.env.AUTH_MODE = "production";
      AuthStrategyFactory.getStrategy(); // Initialize
      expect(AuthStrategyFactory.isAuth0()).toBe(true);
    });
  });
});
