/**
 * Environment Variable Validator
 *
 * SECURITY: Validates all required environment variables at startup
 * FAIL-FAST: Application exits if critical variables missing/invalid
 *
 * Prevents production deployments with missing/default secrets
 */

const { logger } = require('../config/logger');

// Required environment variables with validation rules
const REQUIRED_ENV_VARS = {
  // Database (CRITICAL) - TrossApp uses individual params, not DATABASE_URL
  DB_HOST: {
    required: true,
    default: '127.0.0.1',
    validator: (val) => val.length > 0,
    error: 'DB_HOST must be set',
  },
  DB_PORT: {
    required: false,
    default: '5432',
    validator: (val) => !isNaN(val) && parseInt(val) > 0 && parseInt(val) < 65536,
    error: 'DB_PORT must be a valid port number',
  },
  DB_NAME: {
    required: true,
    default: 'trossapp_dev',
    validator: (val) => val.length > 0,
    error: 'DB_NAME must be set',
  },
  DB_USER: {
    required: true,
    default: 'postgres',
    validator: (val) => val.length > 0,
    error: 'DB_USER must be set',
  },
  DB_PASSWORD: {
    required: true,
    validator: (val) => val.length > 0,
    error: 'DB_PASSWORD must be set',
    sensitive: true,
  },

  // Auth0 (CRITICAL - cannot use defaults in production)
  AUTH0_DOMAIN: {
    required: true,
    validator: (val) => val.includes('.auth0.com') && !val.includes('YOUR_'),
    error: 'AUTH0_DOMAIN must be a valid Auth0 domain (not placeholder)',
  },
  AUTH0_CLIENT_ID: {
    required: true,
    validator: (val) => val.length > 20 && !val.includes('YOUR_'),
    error: 'AUTH0_CLIENT_ID must be set (not placeholder)',
  },
  AUTH0_CLIENT_SECRET: {
    required: true,
    validator: (val) => val.length > 20 && !val.includes('YOUR_'),
    error: 'AUTH0_CLIENT_SECRET must be set (not placeholder)',
    sensitive: true, // Don't log value
  },

  // JWT (CRITICAL)
  JWT_SECRET: {
    required: true,
    validator: (val) => val.length >= 16 && !['your-secret-key', 'change-me', 'dev-secret-key'].includes(val.toLowerCase()),
    error: 'JWT_SECRET must be at least 16 characters and not a default value (in production, use 64+ chars with mixed case, numbers, special chars)',
    sensitive: true,
  },

  // Server (REQUIRED)
  NODE_ENV: {
    required: true,
    validator: (val) => ['development', 'test', 'production'].includes(val),
    error: 'NODE_ENV must be one of: development, test, production',
  },
  PORT: {
    required: false,
    default: '8080',
    validator: (val) => !isNaN(val) && parseInt(val) > 0 && parseInt(val) < 65536,
    error: 'PORT must be a valid port number (1-65535)',
  },
};

// Production-specific requirements
const PRODUCTION_CHECKS = {
  JWT_SECRET: {
    validator: (val) => {
      // In production, require strong secrets
      const hasUpperCase = /[A-Z]/.test(val);
      const hasLowerCase = /[a-z]/.test(val);
      const hasNumber = /[0-9]/.test(val);
      const hasSpecial = /[^A-Za-z0-9]/.test(val);
      return val.length >= 64 && hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
    },
    error: 'JWT_SECRET in production must be 64+ characters with uppercase, lowercase, numbers, and special characters',
  },

  DB_HOST: {
    validator: (val) => {
      // Production should not use localhost
      return !val.includes('localhost') && val !== '127.0.0.1';
    },
    error: 'DB_HOST in production should not use localhost',
  },
};

/**
 * Validate environment variables at startup
 *
 * PURE FUNCTION: Returns validation result without side effects.
 * Caller is responsible for:
 * - Applying defaults to process.env if desired
 * - Exiting process on critical errors
 *
 * @param {Object} options - Validation options
 * @param {boolean} options.applyDefaults - Apply default values to process.env (default: true)
 * @param {boolean} options.exitOnError - Exit process if validation fails (default: false for testability)
 * @returns {Object} Validation result { valid: boolean, errors: string[], warnings: string[], defaults: Object }
 */
function validateEnvironment(options = {}) {
  const { applyDefaults = true, exitOnError = false } = options;
  const errors = [];
  const warnings = [];
  const defaults = {}; // Defaults that would be applied
  const isProduction = process.env.NODE_ENV === 'production';

  logger.info('🔍 Validating environment variables...');

  // Check required variables
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];

    // Check if required
    if (config.required && !value) {
      if (config.default) {
        warnings.push(`${key} not set, using default: ${config.default}`);
        defaults[key] = config.default;
        if (applyDefaults) {
          process.env[key] = config.default;
        }
        continue;
      }
      errors.push(`MISSING: ${key} - ${config.error}`);
      continue;
    }

    // Skip validation if optional and not set
    if (!value) {
      continue;
    }

    // Validate format
    if (config.validator && !config.validator(value)) {
      errors.push(`INVALID: ${key} - ${config.error}`);
      continue;
    }

    // Log success (hide sensitive values)
    const displayValue = config.sensitive ? '***' : value.substring(0, 30) + (value.length > 30 ? '...' : '');
    logger.info(`  ✓ ${key}: ${displayValue}`);
  }

  // Production-specific checks
  if (isProduction) {
    logger.info('🏭 Running production-specific checks...');

    for (const [key, config] of Object.entries(PRODUCTION_CHECKS)) {
      const value = process.env[key];
      if (value && !config.validator(value)) {
        errors.push(`PRODUCTION: ${key} - ${config.error}`);
      }
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    logger.warn('⚠️  Environment warnings:');
    warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }

  // Handle errors
  if (errors.length > 0) {
    logger.error('❌ Environment validation failed:');
    errors.forEach((error) => logger.error(`  - ${error}`));

    if (exitOnError) {
      logger.error('🛑 Exiting due to environment validation errors');
      process.exit(1);
    }

    return { valid: false, errors, warnings, defaults };
  }

  logger.info('✅ Environment validation passed');
  return { valid: true, errors: [], warnings, defaults };
}

/**
 * Get a safe summary of environment for logging
 * Never logs sensitive values
 */
function getEnvironmentSummary() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_HOST: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'not set',
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'not set',
    HAS_JWT_SECRET: !!process.env.JWT_SECRET,
    HAS_AUTH0_CLIENT_SECRET: !!process.env.AUTH0_CLIENT_SECRET,
  };
}

module.exports = {
  validateEnvironment,
  getEnvironmentSummary,
  REQUIRED_ENV_VARS,
};
