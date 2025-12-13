/**
 * Unit Tests for utils/env-validator.js
 *
 * Tests environment variable validation at startup.
 * PURE TESTS: Input → Output, no string matching on messages.
 */

// Mock logger before requiring the module
jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Store original env to restore after tests
const originalEnv = { ...process.env };

describe('utils/env-validator.js', () => {
  let validateEnvironment;
  let getEnvironmentSummary;
  let REQUIRED_ENV_VARS;

  beforeEach(() => {
    // Reset modules to clear cached env values
    jest.resetModules();
    
    // Reset to clean env state
    process.env = { ...originalEnv };
    
    // Set minimum required env vars for tests
    process.env.NODE_ENV = 'test';
    process.env.DB_HOST = 'localhost';
    process.env.DB_NAME = 'testdb';
    process.env.DB_USER = 'testuser';
    process.env.DB_PASSWORD = 'testpassword';
    process.env.AUTH0_DOMAIN = 'test.auth0.com';
    process.env.AUTH0_CLIENT_ID = 'test_client_id_12345678901234567890';
    process.env.AUTH0_CLIENT_SECRET = 'test_client_secret_12345678901234567890';
    process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-long-enough';
    
    // Re-require module with fresh env
    const envValidator = require('../../../utils/env-validator');
    validateEnvironment = envValidator.validateEnvironment;
    getEnvironmentSummary = envValidator.getEnvironmentSummary;
    REQUIRED_ENV_VARS = envValidator.REQUIRED_ENV_VARS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment()', () => {
    describe('valid environment', () => {
      test('should return valid:true when all required vars are set', () => {
        // Act
        const result = validateEnvironment({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should accept valid NODE_ENV values', () => {
        // Test each valid value
        ['development', 'test', 'production'].forEach((env) => {
          process.env.NODE_ENV = env;
          
          // Production needs stronger JWT
          if (env === 'production') {
            process.env.JWT_SECRET = 'Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!';
            process.env.DB_HOST = 'prod-db.example.com';
          }
          
          jest.resetModules();
          const { validateEnvironment: validate } = require('../../../utils/env-validator');
          const result = validate({ exitOnError: false });
          
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('missing required variables', () => {
      test('should return valid:false when DB_PASSWORD is missing', () => {
        // Arrange
        delete process.env.DB_PASSWORD;
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('should return valid:false when AUTH0_DOMAIN is missing', () => {
        // Arrange
        delete process.env.AUTH0_DOMAIN;
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('should return valid:false when JWT_SECRET is missing', () => {
        // Arrange
        delete process.env.JWT_SECRET;
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('should use defaults for optional vars with defaults', () => {
        // Arrange - DB_PORT has a default
        delete process.env.DB_PORT;
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert - should still be valid, default applied
        expect(result.valid).toBe(true);
      });
    });

    describe('invalid variable formats', () => {
      test('should reject invalid NODE_ENV value', () => {
        // Arrange
        process.env.NODE_ENV = 'invalid-env';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });

      test('should reject invalid PORT value (non-numeric)', () => {
        // Arrange
        process.env.PORT = 'not-a-port';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });

      test('should reject PORT value out of range', () => {
        // Arrange
        process.env.PORT = '99999';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });

      test('should reject AUTH0_DOMAIN without .auth0.com', () => {
        // Arrange
        process.env.AUTH0_DOMAIN = 'invalid-domain.com';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });

      test('should reject placeholder AUTH0 values', () => {
        // Arrange
        process.env.AUTH0_DOMAIN = 'YOUR_AUTH0_DOMAIN.auth0.com';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });

      test('should reject short AUTH0_CLIENT_ID', () => {
        // Arrange
        process.env.AUTH0_CLIENT_ID = 'short';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });

      test('should reject weak JWT_SECRET', () => {
        // Arrange
        process.env.JWT_SECRET = 'short';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });

      test('should reject default JWT_SECRET values', () => {
        // Arrange
        process.env.JWT_SECRET = 'your-secret-key';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });
    });

    describe('production-specific checks', () => {
      test('should reject weak JWT_SECRET in production', () => {
        // Arrange
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'valid-but-weak-for-production-1234567890';
        process.env.DB_HOST = 'prod-db.example.com';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });

      test('should reject localhost DB_HOST in production', () => {
        // Arrange
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!';
        process.env.DB_HOST = 'localhost';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });

      test('should reject 127.0.0.1 DB_HOST in production', () => {
        // Arrange
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!';
        process.env.DB_HOST = '127.0.0.1';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(false);
      });

      test('should accept valid production config', () => {
        // Arrange
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!';
        process.env.DB_HOST = 'prod-db.example.com';
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');

        // Act
        const result = validate({ exitOnError: false });

        // Assert
        expect(result.valid).toBe(true);
      });
    });

    describe('exitOnError option', () => {
      test('should not exit when exitOnError is false', () => {
        // Arrange
        delete process.env.DB_PASSWORD;
        jest.resetModules();
        const { validateEnvironment: validate } = require('../../../utils/env-validator');
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

        // Act
        validate({ exitOnError: false });

        // Assert
        expect(mockExit).not.toHaveBeenCalled();
        mockExit.mockRestore();
      });
    });
  });

  describe('getEnvironmentSummary()', () => {
    test('should return safe summary without sensitive values', () => {
      // Act
      const summary = getEnvironmentSummary();

      // Assert
      expect(summary).toHaveProperty('NODE_ENV');
      expect(summary).toHaveProperty('PORT');
      expect(summary).toHaveProperty('HAS_JWT_SECRET');
      expect(summary).toHaveProperty('HAS_AUTH0_CLIENT_SECRET');
      
      // Should NOT include actual secret values
      expect(summary.HAS_JWT_SECRET).toBe(true);
      expect(summary.HAS_AUTH0_CLIENT_SECRET).toBe(true);
    });

    test('should indicate missing secrets correctly', () => {
      // Arrange
      delete process.env.JWT_SECRET;
      delete process.env.AUTH0_CLIENT_SECRET;
      jest.resetModules();
      const { getEnvironmentSummary: getSummary } = require('../../../utils/env-validator');

      // Act
      const summary = getSummary();

      // Assert
      expect(summary.HAS_JWT_SECRET).toBe(false);
      expect(summary.HAS_AUTH0_CLIENT_SECRET).toBe(false);
    });
  });

  describe('REQUIRED_ENV_VARS config', () => {
    test('should export REQUIRED_ENV_VARS object', () => {
      // Assert
      expect(REQUIRED_ENV_VARS).toBeDefined();
      expect(typeof REQUIRED_ENV_VARS).toBe('object');
    });

    test('should have validators for all required vars', () => {
      // Assert - each entry should have required and validator
      for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
        expect(config).toHaveProperty('required');
        if (config.required) {
          expect(config).toHaveProperty('validator');
          expect(typeof config.validator).toBe('function');
        }
      }
    });
  });
});
