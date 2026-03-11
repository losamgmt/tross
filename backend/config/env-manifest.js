/**
 * Environment Variable Manifest
 *
 * SINGLE SOURCE OF TRUTH for all environment variable configuration.
 * Documents which variables have defaults, in which environments, and why.
 *
 * SECURITY ARCHITECTURE:
 * - SECURITY_CRITICAL: Never have defaults, fail-fast if missing
 * - OPERATIONAL: May have defaults in dev/test, required in production
 * - OPTIONAL: Always have defaults, non-critical
 *
 * Usage:
 *   const { getEnvValue, ENV_MANIFEST } = require('./env-manifest');
 *   const port = getEnvValue('PORT'); // Returns value or throws
 */

const { DATABASE, REDIS } = require('./constants');
const { ENVIRONMENTS, getEnvironment } = require('./environment');

/**
 * Environment Variable Categories
 */
const CATEGORY = Object.freeze({
  SECURITY_CRITICAL: 'security_critical', // Never defaults, fail-fast
  OPERATIONAL: 'operational', // Defaults in dev/test only
  OPTIONAL: 'optional', // Always has defaults
});

/**
 * Environment Variable Manifest
 *
 * Each entry defines:
 * - category: Security classification
 * - description: What this variable controls
 * - defaultValue: The default (only used if allowDefaultIn includes current env)
 * - allowDefaultIn: Array of environments where default is allowed
 * - skipValidationIn: Array of environments to skip validation (e.g., test mocks Auth0)
 * - validator: Optional validation function
 * - sensitive: If true, value is never logged
 */
const ENV_MANIFEST = Object.freeze({
  // =========================================================================
  // SECURITY CRITICAL - Never have defaults
  // =========================================================================
  JWT_SECRET: {
    category: CATEGORY.SECURITY_CRITICAL,
    description: 'Secret key for signing JWT tokens',
    defaultValue: null, // NEVER
    allowDefaultIn: [], // NEVER
    sensitive: true,
    validator: (val) => {
      if (!val || val.length < 16) {
        return false;
      }
      // Reject known placeholder values
      const placeholders = ['your-secret-key-change-in-production', 'changeme', 'secret'];
      return !placeholders.includes(val.toLowerCase());
    },
    errorMessage: 'JWT_SECRET must be at least 16 characters and not a placeholder value',
  },

  AUTH0_DOMAIN: {
    category: CATEGORY.SECURITY_CRITICAL,
    description: 'Auth0 tenant domain',
    defaultValue: null,
    allowDefaultIn: [],
    skipValidationIn: [ENVIRONMENTS.TEST], // Tests mock Auth0
    sensitive: false,
    validator: (val) => val && val.includes('.auth0.com'),
    errorMessage: 'AUTH0_DOMAIN must be a valid Auth0 domain',
  },

  AUTH0_CLIENT_ID: {
    category: CATEGORY.SECURITY_CRITICAL,
    description: 'Auth0 application client ID',
    defaultValue: null,
    allowDefaultIn: [],
    skipValidationIn: [ENVIRONMENTS.TEST], // Tests mock Auth0
    sensitive: false,
    validator: (val) => val && val.length > 10,
    errorMessage: 'AUTH0_CLIENT_ID must be set',
  },

  AUTH0_CLIENT_SECRET: {
    category: CATEGORY.SECURITY_CRITICAL,
    description: 'Auth0 application client secret',
    defaultValue: null,
    allowDefaultIn: [],
    skipValidationIn: [ENVIRONMENTS.TEST], // Tests mock Auth0
    sensitive: true,
    validator: (val) => val && val.length > 10,
    errorMessage: 'AUTH0_CLIENT_SECRET must be set',
  },

  // =========================================================================
  // OPERATIONAL - Defaults only in development/test
  // =========================================================================
  NODE_ENV: {
    category: CATEGORY.OPERATIONAL,
    description: 'Application environment',
    defaultValue: ENVIRONMENTS.DEVELOPMENT,
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT], // Only dev gets default
    validator: (val) => Object.values(ENVIRONMENTS).includes(val),
    errorMessage: 'NODE_ENV must be development, test, or production',
  },

  PORT: {
    category: CATEGORY.OPERATIONAL,
    description: 'HTTP server port',
    defaultValue: '3001',
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST],
    validator: (val) => {
      const port = parseInt(val, 10);
      return !isNaN(port) && port > 0 && port < 65536;
    },
    errorMessage: 'PORT must be a valid port number (1-65535)',
  },

  HOST: {
    category: CATEGORY.OPERATIONAL,
    description: 'HTTP server host binding',
    defaultValue: 'localhost',
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST],
    validator: (val) => val && val.length > 0,
    errorMessage: 'HOST must be a valid hostname',
  },

  // Database
  DB_HOST: {
    category: CATEGORY.OPERATIONAL,
    description: 'PostgreSQL server host',
    defaultValue: DATABASE.DEV.HOST,
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST],
    validator: (val) => val && val.length > 0,
    errorMessage: 'DB_HOST must be set',
  },

  DB_PORT: {
    category: CATEGORY.OPERATIONAL,
    description: 'PostgreSQL server port',
    defaultValue: DATABASE.DEV.PORT.toString(),
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST],
    validator: (val) => {
      const port = parseInt(val, 10);
      return !isNaN(port) && port > 0 && port < 65536;
    },
    errorMessage: 'DB_PORT must be a valid port number',
  },

  DB_NAME: {
    category: CATEGORY.OPERATIONAL,
    description: 'PostgreSQL database name',
    defaultValue: DATABASE.DEV.NAME,
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST],
    validator: (val) => val && val.length > 0,
    errorMessage: 'DB_NAME must be set',
  },

  DB_USER: {
    category: CATEGORY.OPERATIONAL,
    description: 'PostgreSQL username',
    defaultValue: DATABASE.DEV.USER,
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST],
    validator: (val) => val && val.length > 0,
    errorMessage: 'DB_USER must be set',
  },

  DB_PASSWORD: {
    category: CATEGORY.OPERATIONAL,
    description: 'PostgreSQL password',
    defaultValue: DATABASE.DEV.PASSWORD,
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST],
    sensitive: true,
    validator: (val) => val && val.length > 0,
    errorMessage: 'DB_PASSWORD must be set',
  },

  DB_POOL_MIN: {
    category: CATEGORY.OPERATIONAL,
    description: 'Minimum database pool connections',
    defaultValue: DATABASE.DEV.POOL.MIN.toString(),
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => !isNaN(parseInt(val, 10)),
    errorMessage: 'DB_POOL_MIN must be a number',
  },

  DB_POOL_MAX: {
    category: CATEGORY.OPERATIONAL,
    description: 'Maximum database pool connections',
    defaultValue: DATABASE.DEV.POOL.MAX.toString(),
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => !isNaN(parseInt(val, 10)),
    errorMessage: 'DB_POOL_MAX must be a number',
  },

  DB_IDLE_TIMEOUT: {
    category: CATEGORY.OPERATIONAL,
    description: 'Database idle connection timeout (ms)',
    defaultValue: DATABASE.DEV.POOL.IDLE_TIMEOUT_MS.toString(),
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => !isNaN(parseInt(val, 10)),
    errorMessage: 'DB_IDLE_TIMEOUT must be a number',
  },

  // Redis
  REDIS_HOST: {
    category: CATEGORY.OPERATIONAL,
    description: 'Redis server host',
    defaultValue: REDIS.DEV.HOST,
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST],
    validator: (val) => val && val.length > 0,
    errorMessage: 'REDIS_HOST must be set',
  },

  REDIS_PORT: {
    category: CATEGORY.OPERATIONAL,
    description: 'Redis server port',
    defaultValue: REDIS.DEV.PORT.toString(),
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST],
    validator: (val) => !isNaN(parseInt(val, 10)),
    errorMessage: 'REDIS_PORT must be a valid port number',
  },

  REDIS_DB: {
    category: CATEGORY.OPERATIONAL,
    description: 'Redis database index',
    defaultValue: REDIS.DEV.DB.toString(),
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => !isNaN(parseInt(val, 10)),
    errorMessage: 'REDIS_DB must be a number',
  },

  // =========================================================================
  // OPTIONAL - Always have defaults (non-critical operational settings)
  // =========================================================================
  LOG_LEVEL: {
    category: CATEGORY.OPTIONAL,
    description: 'Logging verbosity level',
    defaultValue: 'info',
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => ['error', 'warn', 'info', 'debug'].includes(val),
    errorMessage: 'LOG_LEVEL must be error, warn, info, or debug',
  },

  RATE_LIMIT_WINDOW_MS: {
    category: CATEGORY.OPTIONAL,
    description: 'Rate limiting window in milliseconds',
    defaultValue: '900000', // 15 minutes
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0,
    errorMessage: 'RATE_LIMIT_WINDOW_MS must be a positive number',
  },

  RATE_LIMIT_MAX_REQUESTS: {
    category: CATEGORY.OPTIONAL,
    description: 'Maximum requests per rate limit window',
    defaultValue: '1000',
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0,
    errorMessage: 'RATE_LIMIT_MAX_REQUESTS must be a positive number',
  },

  HEALTH_CHECK_INTERVAL: {
    category: CATEGORY.OPTIONAL,
    description: 'Health check interval in milliseconds',
    defaultValue: '30000',
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => !isNaN(parseInt(val, 10)),
    errorMessage: 'HEALTH_CHECK_INTERVAL must be a number',
  },

  HEALTH_CHECK_TIMEOUT: {
    category: CATEGORY.OPTIONAL,
    description: 'Health check timeout in milliseconds',
    defaultValue: '5000',
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => !isNaN(parseInt(val, 10)),
    errorMessage: 'HEALTH_CHECK_TIMEOUT must be a number',
  },

  JWT_EXPIRES_IN: {
    category: CATEGORY.OPTIONAL,
    description: 'JWT token expiration time',
    defaultValue: '24h',
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => /^\d+[smhdw]$/.test(val),
    errorMessage: 'JWT_EXPIRES_IN must be a valid time string (e.g., 24h, 7d)',
  },

  STORAGE_PROVIDER: {
    category: CATEGORY.OPTIONAL,
    description: 'File storage provider (r2, s3, local, none)',
    defaultValue: 'none',
    allowDefaultIn: [ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.TEST, ENVIRONMENTS.PRODUCTION],
    validator: (val) => ['r2', 's3', 'local', 'none'].includes(val),
    errorMessage: 'STORAGE_PROVIDER must be r2, s3, local, or none',
  },
});

/**
 * Get an environment variable value with manifest-driven defaults.
 *
 * FAIL-FAST BEHAVIOR:
 * - If variable has no default allowed in current environment, throws if missing
 * - If variable has default allowed, returns default
 * - Always validates value (even defaults)
 *
 * @param {string} varName - Environment variable name
 * @param {Object} options - Options
 * @param {boolean} options.throwOnMissing - Throw if missing and no default (default: true)
 * @returns {string|undefined} The value or default
 * @throws {Error} If required and missing, or if validation fails
 */
function getEnvValue(varName, options = {}) {
  const { throwOnMissing = true } = options;
  const manifest = ENV_MANIFEST[varName];

  if (!manifest) {
    // Variable not in manifest - return raw value or undefined
    return process.env[varName];
  }

  const currentEnv = getEnvironment();
  const value = process.env[varName];
  const allowDefault = manifest.allowDefaultIn.includes(currentEnv);

  // If value is set, validate and return
  if (value !== undefined && value !== '') {
    if (manifest.validator && !manifest.validator(value)) {
      throw new Error(`Invalid ${varName}: ${manifest.errorMessage}`);
    }
    return value;
  }

  // Value not set - check if default is allowed
  if (allowDefault && manifest.defaultValue !== null) {
    return manifest.defaultValue;
  }

  // No value and no default allowed
  if (throwOnMissing) {
    throw new Error(
      `Missing required environment variable: ${varName}. ` +
      `${manifest.description}. ` +
      (manifest.allowDefaultIn.length > 0
        ? `Defaults are only allowed in: ${manifest.allowDefaultIn.join(', ')}`
        : 'This variable has no defaults in any environment.'),
    );
  }

  return undefined;
}

/**
 * Validate all manifest variables at startup.
 * Returns validation result without side effects.
 *
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[], applied: Object }
 */
function validateManifest() {
  const currentEnv = getEnvironment();
  const errors = [];
  const warnings = [];
  const applied = {}; // Defaults that were applied

  for (const [varName, manifest] of Object.entries(ENV_MANIFEST)) {
    const value = process.env[varName];
    const allowDefault = manifest.allowDefaultIn.includes(currentEnv);
    const skipValidation = manifest.skipValidationIn?.includes(currentEnv);

    // Skip validation for certain vars in test mode (e.g., Auth0 which is mocked)
    if (skipValidation) {
      continue;
    }

    if (!value && !allowDefault && manifest.defaultValue === null) {
      // Security-critical or required without default
      if (manifest.category === CATEGORY.SECURITY_CRITICAL) {
        errors.push(`SECURITY: ${varName} - ${manifest.description} (required, no defaults)`);
      } else {
        errors.push(`MISSING: ${varName} - ${manifest.description}`);
      }
    } else if (!value && allowDefault && manifest.defaultValue !== null) {
      // Using default
      warnings.push(`${varName}: using default '${manifest.sensitive ? '***' : manifest.defaultValue}'`);
      applied[varName] = manifest.defaultValue;
    } else if (value && manifest.validator && !manifest.validator(value)) {
      // Invalid value
      errors.push(`INVALID: ${varName} - ${manifest.errorMessage}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    applied,
  };
}

/**
 * Get a summary of the manifest for documentation/debugging
 */
function getManifestSummary() {
  const summary = {
    securityCritical: [],
    operational: [],
    optional: [],
  };

  for (const [varName, manifest] of Object.entries(ENV_MANIFEST)) {
    const entry = {
      name: varName,
      description: manifest.description,
      allowDefaultIn: manifest.allowDefaultIn,
      hasDefault: manifest.defaultValue !== null,
    };

    switch (manifest.category) {
      case CATEGORY.SECURITY_CRITICAL:
        summary.securityCritical.push(entry);
        break;
      case CATEGORY.OPERATIONAL:
        summary.operational.push(entry);
        break;
      case CATEGORY.OPTIONAL:
        summary.optional.push(entry);
        break;
    }
  }

  return summary;
}

module.exports = {
  // Manifest data
  ENV_MANIFEST,
  CATEGORY,
  // Functions
  getEnvValue,
  validateManifest,
  getManifestSummary,
  // Note: For environment helpers (getEnvironment, isProduction, isTest, isDevelopment)
  // import from './environment' directly
};
