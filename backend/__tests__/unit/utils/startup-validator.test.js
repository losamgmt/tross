/**
 * Unit Tests: utils/startup-validator.js
 *
 * Tests security-critical startup validation checks.
 * SRP: Verify startup validation catches security misconfigurations.
 *
 * MOCKING STRATEGY (uses centralized mocks):
 * - config/logger: createLoggerMock() from __tests__/mocks
 * - config/app-mode: Module-specific mock (app-specific behavior)
 * - config/app-config: Module-specific mock (dynamic getters)
 * - db/helpers/rls: Module-specific mock (validation function)
 */

// ============================================================================
// CENTRALIZED MOCKS - inline require() pattern per Jest hoisting rules
// ============================================================================
jest.mock('../../../config/logger', () => ({
  logger: require('../../mocks').createLoggerMock(),
}));
jest.mock('../../../config/app-mode', () => ({
  isProduction: jest.fn(),
  isTestMode: jest.fn(),
  devAuthEnabled: jest.fn(),
}));
jest.mock('../../../config/app-config', () => ({
  jwt: {
    get secret() {
      if (process.env.__MOCK_JWT_THROWS__) {
        throw new Error('JWT_SECRET not configured');
      }
      return 'test-secret';
    },
  },
  auth0: {
    domain: process.env.__MOCK_AUTH0_DOMAIN__ || null,
    clientId: process.env.__MOCK_AUTH0_CLIENT_ID__ || null,
    clientSecret: process.env.__MOCK_AUTH0_CLIENT_SECRET__ || null,
    audience: process.env.__MOCK_AUTH0_AUDIENCE__ || null,
  },
}));
jest.mock('../../../db/helpers/rls', () => ({
  validateAllRules: jest.fn(),
}));

// ============================================================================
// IMPORTS - After mocks are set up
// ============================================================================
const { isProduction, isTestMode, devAuthEnabled } = require('../../../config/app-mode');
const { validateAllRules } = require('../../../db/helpers/rls');
const {
  validateStartup,
  validateStartupOrExit,
  assertDevAuthSafe,
} = require('../../../utils/startup-validator');

describe('utils/startup-validator.js', () => {
  let originalEnv;
  let mockExit;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
    delete process.env.__MOCK_JWT_THROWS__;
    delete process.env.__MOCK_AUTH0_DOMAIN__;
    delete process.env.__MOCK_AUTH0_CLIENT_ID__;
    delete process.env.__MOCK_AUTH0_CLIENT_SECRET__;
    delete process.env.__MOCK_AUTH0_AUDIENCE__;
    delete process.env.AUTH_MODE;
    delete process.env.DB_PASSWORD;

    // Default to non-production, test mode
    isProduction.mockReturnValue(false);
    isTestMode.mockReturnValue(true);
    devAuthEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
    if (mockExit) {
      mockExit.mockRestore();
      mockExit = null;
    }
  });

  // =============================================================================
  // validateStartup()
  // =============================================================================
  describe('validateStartup()', () => {
    describe('Dev Auth Check', () => {
      test('should fail if dev auth enabled in production', () => {
        isProduction.mockReturnValue(true);
        devAuthEnabled.mockReturnValue(true);
        isTestMode.mockReturnValue(false);
        process.env.DB_PASSWORD = 'VeryStrongProductionPassword123!'; // Avoid password error

        const result = validateStartup();

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('SECURITY VIOLATION'))).toBe(true);
        expect(result.errors.some(e => e.includes('Development authentication is enabled in production'))).toBe(true);
      });

      test('should pass if dev auth disabled in production', () => {
        isProduction.mockReturnValue(true);
        devAuthEnabled.mockReturnValue(false);
        isTestMode.mockReturnValue(false);
        process.env.DB_PASSWORD = 'VeryStrongProductionPassword123!'; // Strong password

        const result = validateStartup();

        expect(result.valid).toBe(true);
        expect(result.errors.filter(e => e.includes('SECURITY VIOLATION'))).toHaveLength(0);
      });

      test('should warn if dev auth enabled in development (non-test)', () => {
        isProduction.mockReturnValue(false);
        devAuthEnabled.mockReturnValue(true);
        isTestMode.mockReturnValue(false);

        const result = validateStartup();

        expect(result.valid).toBe(true); // Warning, not error
        expect(result.warnings.some(w => w.includes('Development authentication is enabled'))).toBe(true);
      });

      test('should not warn if dev auth enabled in test mode', () => {
        isProduction.mockReturnValue(false);
        devAuthEnabled.mockReturnValue(true);
        isTestMode.mockReturnValue(true);

        const result = validateStartup();

        expect(result.warnings.filter(w => w.includes('Development authentication'))).toHaveLength(0);
      });
    });

    describe('RLS Rules Validation', () => {
      test('should validate RLS rules when metadata provided', () => {
        validateAllRules.mockImplementation(() => {});
        const mockMetadata = { users: {}, customers: {} };

        const result = validateStartup({ allMetadata: mockMetadata });

        expect(validateAllRules).toHaveBeenCalledWith(mockMetadata);
        expect(result.valid).toBe(true);
      });

      test('should fail if RLS validation throws', () => {
        validateAllRules.mockImplementation(() => {
          throw new Error('Invalid RLS rule: missing field');
        });

        const result = validateStartup({ allMetadata: {} });

        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('RLS validation failed');
        expect(result.errors[0]).toContain('Invalid RLS rule');
      });

      test('should warn when metadata not provided', () => {
        const result = validateStartup({});

        expect(result.warnings).toContain('RLS validation skipped: allMetadata not provided');
      });
    });

    describe('JWT Secret Check', () => {
      test('should fail if JWT secret not configured (non-test)', () => {
        isTestMode.mockReturnValue(false);
        process.env.__MOCK_JWT_THROWS__ = 'true';

        // Need to clear module cache to pick up new mock
        jest.resetModules();
        const freshModule = require('../../../utils/startup-validator');

        const result = freshModule.validateStartup();

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('JWT configuration error'))).toBe(true);
      });

      test('should skip JWT check in test mode', () => {
        isTestMode.mockReturnValue(true);

        const result = validateStartup();

        expect(result.valid).toBe(true);
        // JWT errors should not appear even if throws
      });
    });

    describe('Database Password Check', () => {
      test('should fail if weak password in production', () => {
        isProduction.mockReturnValue(true);
        isTestMode.mockReturnValue(false);
        process.env.DB_PASSWORD = 'tross123'; // Dev password

        const result = validateStartup();

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('DB_PASSWORD is weak'))).toBe(true);
      });

      test('should fail if password too short in production', () => {
        isProduction.mockReturnValue(true);
        isTestMode.mockReturnValue(false);
        process.env.DB_PASSWORD = 'short'; // Less than 16 chars

        const result = validateStartup();

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('DB_PASSWORD is weak'))).toBe(true);
      });

      test('should pass with strong password in production', () => {
        isProduction.mockReturnValue(true);
        isTestMode.mockReturnValue(false);
        process.env.DB_PASSWORD = 'ThisIsAVeryStrongPassword123!';

        const result = validateStartup();

        expect(result.valid).toBe(true);
      });

      test('should not check password in development', () => {
        isProduction.mockReturnValue(false);
        process.env.DB_PASSWORD = 'weak';

        const result = validateStartup();

        expect(result.errors.filter(e => e.includes('DB_PASSWORD'))).toHaveLength(0);
      });
    });

    describe('Return Structure', () => {
      test('should always return valid, errors, and warnings', () => {
        const result = validateStartup();

        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(typeof result.valid).toBe('boolean');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      });
    });
  });

  // =============================================================================
  // validateStartupOrExit()
  // =============================================================================
  describe('validateStartupOrExit()', () => {
    test('should return validation result when valid', () => {
      const result = validateStartupOrExit();

      expect(result.valid).toBe(true);
    });

    test('should call process.exit(1) on failure in production', () => {
      isProduction.mockReturnValue(true);
      devAuthEnabled.mockReturnValue(true);

      // Mock process.exit to prevent actual exit
      mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      validateStartupOrExit();

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should not exit on failure in development', () => {
      isProduction.mockReturnValue(false);
      devAuthEnabled.mockReturnValue(true);
      isTestMode.mockReturnValue(false);
      validateAllRules.mockImplementation(() => {
        throw new Error('RLS error');
      });

      mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      const result = validateStartupOrExit({ allMetadata: {} });

      expect(mockExit).not.toHaveBeenCalled();
      expect(result.valid).toBe(false); // Returns result even in dev
    });
  });

  // =============================================================================
  // assertDevAuthSafe()
  // =============================================================================
  describe('assertDevAuthSafe()', () => {
    test('should throw if dev auth enabled in production', () => {
      isProduction.mockReturnValue(true);
      devAuthEnabled.mockReturnValue(true);

      expect(() => assertDevAuthSafe()).toThrow('SECURITY VIOLATION');
    });

    test('should not throw if dev auth disabled in production', () => {
      isProduction.mockReturnValue(true);
      devAuthEnabled.mockReturnValue(false);

      expect(() => assertDevAuthSafe()).not.toThrow();
    });

    test('should not throw in development even with dev auth enabled', () => {
      isProduction.mockReturnValue(false);
      devAuthEnabled.mockReturnValue(true);

      expect(() => assertDevAuthSafe()).not.toThrow();
    });
  });
});
