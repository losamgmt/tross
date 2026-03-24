/**
 * Centralized Application Configuration
 * Single source of truth for environment, features, and app settings
 *
 * CRITICAL: This module controls security features including dev authentication.
 * Changes here affect authentication, authorization, and API behavior.
 *
 * NOTE: Environment variable defaults are documented in env-manifest.js
 * That file is the SINGLE SOURCE OF TRUTH for what defaults exist and when.
 */

const { DATABASE, REDIS } = require('./constants');
const {
  isTestMode,
  isLocalDev,
  isProduction,
  TEST_JWT_SECRET,
} = require('./app-mode');
const { getEnvironment } = require('./environment');
const { logger } = require('./logger');

// Backwards compatibility aliases
const isDevelopment = isLocalDev;
const isTest = isTestMode;

/**
 * AppConfig - Centralized configuration service
 */
const AppConfig = {
  // ============================================================================
  // APP IDENTITY - Change "Tross" here to update everywhere!
  // ============================================================================
  appName: 'Tross',
  appVersion: '1.0.0',
  appDescription: 'Professional Maintenance Management',

  // ============================================================================
  // ENVIRONMENT
  // ============================================================================
  environment: getEnvironment(),
  isDevelopment: isDevelopment(),
  isProduction: isProduction(),
  isTest: isTest(),

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================

  /**
   * Enable development authentication (test tokens)
   * SECURITY CRITICAL: Must be false in production!
   *
   * When true: Both Auth0 and dev tokens are accepted
   * When false: Only Auth0 tokens are accepted
   */
  devAuthEnabled: isDevelopment() || isTest(),

  /**
   * Enable health monitoring endpoints
   */
  healthMonitoringEnabled: true,

  /**
   * Enable verbose logging
   */
  verboseLogging: isDevelopment() || isTest(),

  /**
   * Enable Swagger API documentation
   */
  swaggerEnabled: isDevelopment(),

  // ============================================================================
  // SERVER CONFIGURATION
  // ============================================================================
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || 'localhost',

  // CORS Configuration
  cors: {
    origin: isDevelopment()
      ? ['http://localhost:3000', 'http://localhost:3001']
      : [process.env.FRONTEND_URL || 'https://tross.com'],
    credentials: true,
  },

  // ============================================================================
  // DATABASE CONFIGURATION
  // ============================================================================
  // Uses constants.js for single source of truth
  database: {
    host: process.env.DB_HOST || DATABASE.DEV.HOST,
    port: parseInt(process.env.DB_PORT || DATABASE.DEV.PORT.toString(), 10),
    name: process.env.DB_NAME || DATABASE.DEV.NAME,
    user: process.env.DB_USER || DATABASE.DEV.USER,
    password: process.env.DB_PASSWORD || DATABASE.DEV.PASSWORD,

    // Connection pool settings
    pool: {
      min: parseInt(
        process.env.DB_POOL_MIN || DATABASE.DEV.POOL.MIN.toString(),
        10,
      ),
      max: parseInt(
        process.env.DB_POOL_MAX || DATABASE.DEV.POOL.MAX.toString(),
        10,
      ),
      idleTimeoutMillis: parseInt(
        process.env.DB_IDLE_TIMEOUT ||
          DATABASE.DEV.POOL.IDLE_TIMEOUT_MS.toString(),
        10,
      ),
    },
  },

  // ============================================================================
  // REDIS CONFIGURATION
  // ============================================================================
  // Uses constants.js for single source of truth
  redis: {
    host: process.env.REDIS_HOST || REDIS.DEV.HOST,
    port: parseInt(process.env.REDIS_PORT || REDIS.DEV.PORT.toString(), 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || REDIS.DEV.DB.toString(), 10),
  },

  // ============================================================================
  // AUTH0 CONFIGURATION
  // SECURITY: No fallbacks - must be explicitly configured via environment
  // ============================================================================
  auth0: {
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
  },

  // ============================================================================
  // JWT CONFIGURATION
  // SECURITY: No fallbacks - must be explicitly configured via environment
  // PATTERN: Getter throws if secret not set (except in test mode)
  // ============================================================================
  jwt: {
    /**
     * Get JWT secret - FAIL-FAST if not configured
     *
     * SECURITY: This getter ensures no module can use an undefined secret.
     * In test mode, returns a test-only secret for unit tests that don't set env vars.
     * In dev/production, throws immediately if JWT_SECRET is not set.
     *
     * @returns {string} The JWT secret
     * @throws {Error} If JWT_SECRET is not set (except in test mode)
     */
    get secret() {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        // In test mode, allow tests to run without explicit JWT_SECRET
        if (isTest()) {
          return TEST_JWT_SECRET;
        }
        // In dev/production, fail immediately
        throw new Error(
          'SECURITY ERROR: JWT_SECRET environment variable is not set. ' +
          'Cannot proceed without a valid JWT secret. ' +
          'Set JWT_SECRET in your environment variables.',
        );
      }
      return secret;
    },
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256',
  },

  // ============================================================================
  // HEALTH CHECK CONFIGURATION
  // ============================================================================
  health: {
    checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
  },

  // ============================================================================
  // RATE LIMITING
  // ============================================================================
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // ============================================================================
  // SECURITY HELPERS
  // ============================================================================

  /**
   * Validates if dev authentication should be allowed
   * Throws Error if dev auth is attempted in production
   *
   * @throws {Error} If dev auth is not enabled
   */
  validateDevAuth() {
    if (!this.devAuthEnabled) {
      throw new Error(
        `Development authentication is not available in ${this.environment} mode. ` +
          'This is a security restriction. Only Auth0 authentication is permitted.',
      );
    }
  },

  /**
   * Gets a safe configuration object for logging (no secrets)
   * @returns {Object} Configuration without sensitive data
   */
  getSafeConfig() {
    return {
      appName: this.appName,
      appVersion: this.appVersion,
      environment: this.environment,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      devAuthEnabled: this.devAuthEnabled,
      healthMonitoringEnabled: this.healthMonitoringEnabled,
      port: this.port,
      host: this.host,
    };
  },

  /**
   * Validates required configuration
   * Uses env-manifest.js for comprehensive validation
   *
   * @throws {Error} If required configuration is missing
   */
  validate() {
    // Import manifest here to avoid circular dependency at module load
    const { validateManifest } = require('./env-manifest');
    const manifestResult = validateManifest();
    const errors = [];

    // Add manifest errors
    errors.push(...manifestResult.errors);

    // Log warnings from manifest (defaults being used)
    if (manifestResult.warnings.length > 0 && !isTest()) {
      logger.info('📋 Environment defaults applied:');
      manifestResult.warnings.forEach((warning) => {
        logger.info(`   ${warning}`);
      });
    }

    if (this.isProduction) {
      // Production-specific validation (manifest handles JWT_SECRET and AUTH0_* vars)
      if (this.devAuthEnabled) {
        errors.push(
          'Development authentication must be disabled in production',
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  },
};

// Validate configuration on module load
if (!isTest()) {
  try {
    AppConfig.validate();
  } catch (error) {
    // Logger handles all output consistently
    logger.error('Configuration Error:', { error: error.message });
    if (isProduction()) {
      // In production, fail fast if configuration is invalid
      process.exit(1);
    }
  }
}

module.exports = AppConfig;
