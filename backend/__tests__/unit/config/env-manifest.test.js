/**
 * Environment Manifest Unit Tests
 *
 * Tests for the env-manifest.js module which provides:
 * - ENV_MANIFEST: Configuration for all environment variables
 * - Individual validators for each manifest entry
 * - getEnvValue: Get env values with manifest-driven defaults
 * - validateManifest: Validate all env vars at startup
 * - getManifestSummary: Get documentation summary
 */

const {
  ENV_MANIFEST,
  CATEGORY,
  getEnvValue,
  validateManifest,
  getManifestSummary,
} = require('../../../config/env-manifest');
const { ENVIRONMENTS } = require('../../../config/environment');

describe('Environment Manifest', () => {
  // Store original env values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset to original
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original
    process.env = originalEnv;
  });

  // ==========================================================================
  // CATEGORY CONSTANTS
  // ==========================================================================
  describe('CATEGORY', () => {
    test('should have all required categories', () => {
      expect(CATEGORY).toHaveProperty('SECURITY_CRITICAL', 'security_critical');
      expect(CATEGORY).toHaveProperty('OPERATIONAL', 'operational');
      expect(CATEGORY).toHaveProperty('OPTIONAL', 'optional');
    });

    test('should be frozen', () => {
      expect(Object.isFrozen(CATEGORY)).toBe(true);
    });
  });

  // ==========================================================================
  // ENV_MANIFEST STRUCTURE
  // ==========================================================================
  describe('ENV_MANIFEST structure', () => {
    test('should be frozen', () => {
      expect(Object.isFrozen(ENV_MANIFEST)).toBe(true);
    });

    test('should have required security-critical variables', () => {
      const securityVars = ['JWT_SECRET', 'AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET'];
      securityVars.forEach((varName) => {
        expect(ENV_MANIFEST).toHaveProperty(varName);
        expect(ENV_MANIFEST[varName].category).toBe(CATEGORY.SECURITY_CRITICAL);
      });
    });

    test('security-critical variables should have no defaults', () => {
      const securityVars = ['JWT_SECRET', 'AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET'];
      securityVars.forEach((varName) => {
        expect(ENV_MANIFEST[varName].defaultValue).toBeNull();
        expect(ENV_MANIFEST[varName].allowDefaultIn).toEqual([]);
      });
    });

    test('each manifest entry should have required fields', () => {
      for (const [varName, manifest] of Object.entries(ENV_MANIFEST)) {
        expect(manifest).toHaveProperty('category');
        expect(manifest).toHaveProperty('description');
        expect(manifest).toHaveProperty('defaultValue');
        expect(manifest).toHaveProperty('allowDefaultIn');
        expect(Array.isArray(manifest.allowDefaultIn)).toBe(true);
        // Category should be valid
        expect([CATEGORY.SECURITY_CRITICAL, CATEGORY.OPERATIONAL, CATEGORY.OPTIONAL])
          .toContain(manifest.category);
      }
    });
  });

  // ==========================================================================
  // JWT_SECRET VALIDATOR
  // ==========================================================================
  describe('JWT_SECRET validator', () => {
    const validator = ENV_MANIFEST.JWT_SECRET.validator;

    test('should reject empty/null/undefined values', () => {
      expect(validator(null)).toBe(false);
      expect(validator(undefined)).toBe(false);
      expect(validator('')).toBe(false);
    });

    test('should reject secrets shorter than 16 characters', () => {
      expect(validator('short')).toBe(false);
      expect(validator('exactly15chars!')).toBe(false);
    });

    test('should accept secrets 16+ characters', () => {
      expect(validator('exactly16charss!')).toBe(true);
      expect(validator('this-is-a-valid-long-secret-key')).toBe(true);
    });

    test('should reject known placeholder values', () => {
      expect(validator('your-secret-key-change-in-production')).toBe(false);
      expect(validator('YOUR-SECRET-KEY-CHANGE-IN-PRODUCTION')).toBe(false);
      expect(validator('changeme')).toBe(false);
      expect(validator('CHANGEME')).toBe(false);
      expect(validator('secret')).toBe(false);
    });
  });

  // ==========================================================================
  // AUTH0_DOMAIN VALIDATOR
  // ==========================================================================
  describe('AUTH0_DOMAIN validator', () => {
    const validator = ENV_MANIFEST.AUTH0_DOMAIN.validator;

    test('should reject empty/null values', () => {
      expect(validator(null)).toBeFalsy();
      expect(validator(undefined)).toBeFalsy();
      expect(validator('')).toBeFalsy();
    });

    test('should require .auth0.com in domain', () => {
      expect(validator('example.com')).toBe(false);
      expect(validator('myapp.okta.com')).toBe(false);
    });

    test('should accept valid Auth0 domains', () => {
      expect(validator('dev-tenant.us.auth0.com')).toBe(true);
      expect(validator('my-company.auth0.com')).toBe(true);
    });
  });

  // ==========================================================================
  // PORT VALIDATOR
  // ==========================================================================
  describe('PORT validator', () => {
    const validator = ENV_MANIFEST.PORT.validator;

    test('should reject invalid port numbers', () => {
      expect(validator('abc')).toBe(false);
      expect(validator('-1')).toBe(false);
      expect(validator('0')).toBe(false);
      expect(validator('70000')).toBe(false);
    });

    test('should accept valid port numbers', () => {
      expect(validator('80')).toBe(true);
      expect(validator('443')).toBe(true);
      expect(validator('3000')).toBe(true);
      expect(validator('3001')).toBe(true);
      expect(validator('65535')).toBe(true);
    });
  });

  // ==========================================================================
  // LOG_LEVEL VALIDATOR
  // ==========================================================================
  describe('LOG_LEVEL validator', () => {
    const validator = ENV_MANIFEST.LOG_LEVEL.validator;

    test('should reject invalid log levels', () => {
      expect(validator('verbose')).toBe(false);
      expect(validator('trace')).toBe(false);
      expect(validator('INFO')).toBe(false); // Case sensitive
    });

    test('should accept valid log levels', () => {
      expect(validator('error')).toBe(true);
      expect(validator('warn')).toBe(true);
      expect(validator('info')).toBe(true);
      expect(validator('debug')).toBe(true);
    });
  });

  // ==========================================================================
  // NODE_ENV VALIDATOR
  // ==========================================================================
  describe('NODE_ENV validator', () => {
    const validator = ENV_MANIFEST.NODE_ENV.validator;

    test('should reject invalid environments', () => {
      expect(validator('prod')).toBe(false);
      expect(validator('dev')).toBe(false);
      expect(validator('PRODUCTION')).toBe(false);
    });

    test('should accept valid environments', () => {
      expect(validator('development')).toBe(true);
      expect(validator('production')).toBe(true);
      expect(validator('test')).toBe(true);
      expect(validator('staging')).toBe(true);
    });
  });

  // ==========================================================================
  // JWT_EXPIRES_IN VALIDATOR
  // ==========================================================================
  describe('JWT_EXPIRES_IN validator', () => {
    const validator = ENV_MANIFEST.JWT_EXPIRES_IN.validator;

    test('should reject invalid time formats', () => {
      expect(validator('24hours')).toBe(false);
      expect(validator('1 hour')).toBe(false);
      expect(validator('1H')).toBe(false);
      expect(validator('')).toBe(false);
    });

    test('should accept valid time formats', () => {
      expect(validator('15m')).toBe(true);
      expect(validator('24h')).toBe(true);
      expect(validator('7d')).toBe(true);
      expect(validator('60s')).toBe(true);
      expect(validator('1w')).toBe(true);
    });
  });

  // ==========================================================================
  // STORAGE_PROVIDER VALIDATOR
  // ==========================================================================
  describe('STORAGE_PROVIDER validator', () => {
    const validator = ENV_MANIFEST.STORAGE_PROVIDER.validator;

    test('should reject invalid providers', () => {
      expect(validator('azure')).toBe(false);
      expect(validator('gcs')).toBe(false);
      expect(validator('')).toBe(false);
    });

    test('should accept valid providers', () => {
      expect(validator('r2')).toBe(true);
      expect(validator('s3')).toBe(true);
      expect(validator('local')).toBe(true);
      expect(validator('none')).toBe(true);
    });
  });

  // ==========================================================================
  // getEnvValue FUNCTION
  // ==========================================================================
  describe('getEnvValue', () => {
    test('should return environment value when set', () => {
      process.env.PORT = '8080';
      expect(getEnvValue('PORT')).toBe('8080');
    });

    test('should return default when allowed and value not set', () => {
      delete process.env.PORT;
      process.env.NODE_ENV = 'development';
      expect(getEnvValue('PORT')).toBe('3001');
    });

    test('should throw when required value missing with no default', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'production';
      expect(() => getEnvValue('JWT_SECRET')).toThrow();
    });

    test('should throw when value fails validation', () => {
      process.env.PORT = 'invalid';
      expect(() => getEnvValue('PORT')).toThrow('Invalid PORT');
    });

    test('should return undefined for unknown var when throwOnMissing=false', () => {
      const result = getEnvValue('UNKNOWN_VAR', { throwOnMissing: false });
      expect(result).toBeUndefined();
    });

    test('should return raw value for var not in manifest', () => {
      process.env.CUSTOM_VAR = 'custom-value';
      expect(getEnvValue('CUSTOM_VAR')).toBe('custom-value');
    });
  });

  // ==========================================================================
  // validateManifest FUNCTION
  // ==========================================================================
  describe('validateManifest', () => {
    test('should return valid=true in test mode with proper setup', () => {
      // Test mode skips Auth0 validation, and JWT_SECRET is set by jest setup
      process.env.NODE_ENV = 'test';
      const result = validateManifest();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('applied');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('should report errors for missing security-critical vars in production', () => {
      // Save/mock production env
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      const result = validateManifest();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('JWT_SECRET'))).toBe(true);

      // Restore
      process.env.NODE_ENV = originalNodeEnv;
    });

    test('should report warnings when using defaults', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.PORT;

      const result = validateManifest();

      // Should have warning about PORT using default
      expect(result.warnings.some((w) => w.includes('PORT'))).toBe(true);
      expect(result.applied).toHaveProperty('PORT', '3001');
    });

    test('should skip validation for vars with skipValidationIn matching current env', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.AUTH0_DOMAIN;

      const result = validateManifest();

      // Should NOT have error for AUTH0_DOMAIN in test mode
      expect(result.errors.some((e) => e.includes('AUTH0_DOMAIN'))).toBe(false);
    });

    test('should report invalid values', () => {
      process.env.NODE_ENV = 'development';
      process.env.PORT = 'invalid-port';

      const result = validateManifest();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('PORT'))).toBe(true);
    });
  });

  // ==========================================================================
  // getManifestSummary FUNCTION
  // ==========================================================================
  describe('getManifestSummary', () => {
    test('should return categorized summary', () => {
      const summary = getManifestSummary();

      expect(summary).toHaveProperty('securityCritical');
      expect(summary).toHaveProperty('operational');
      expect(summary).toHaveProperty('optional');

      expect(Array.isArray(summary.securityCritical)).toBe(true);
      expect(Array.isArray(summary.operational)).toBe(true);
      expect(Array.isArray(summary.optional)).toBe(true);
    });

    test('should have JWT_SECRET in securityCritical', () => {
      const summary = getManifestSummary();
      const jwtEntry = summary.securityCritical.find((e) => e.name === 'JWT_SECRET');

      expect(jwtEntry).toBeDefined();
      expect(jwtEntry.hasDefault).toBe(false);
      expect(jwtEntry.allowDefaultIn).toEqual([]);
    });

    test('should have PORT in operational', () => {
      const summary = getManifestSummary();
      const portEntry = summary.operational.find((e) => e.name === 'PORT');

      expect(portEntry).toBeDefined();
      expect(portEntry.hasDefault).toBe(true);
    });

    test('should have LOG_LEVEL in optional', () => {
      const summary = getManifestSummary();
      const logEntry = summary.optional.find((e) => e.name === 'LOG_LEVEL');

      expect(logEntry).toBeDefined();
      expect(logEntry.hasDefault).toBe(true);
    });

    test('each entry should have required documentation fields', () => {
      const summary = getManifestSummary();
      const allEntries = [
        ...summary.securityCritical,
        ...summary.operational,
        ...summary.optional,
      ];

      allEntries.forEach((entry) => {
        expect(entry).toHaveProperty('name');
        expect(entry).toHaveProperty('description');
        expect(entry).toHaveProperty('allowDefaultIn');
        expect(entry).toHaveProperty('hasDefault');
      });
    });
  });
});
