/**
 * Centralized Application Configuration
 * Single source of truth for environment, features, and app settings
 *
 * CRITICAL: This module controls security features including dev authentication.
 * Changes here affect authentication, authorization, and API behavior.
 */

const { ENVIRONMENTS, DATABASE, REDIS } = require('./constants');

/**
 * Get current environment from NODE_ENV
 * @returns {string} Current environment
 */
function getEnvironment() {
  return process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;
}

/**
 * Check if running in development mode
 * @returns {boolean} True if development environment
 */
function isDevelopment() {
  return getEnvironment() === ENVIRONMENTS.DEVELOPMENT;
}

/**
 * Check if running in production mode
 * @returns {boolean} True if production environment
 */
function isProduction() {
  return getEnvironment() === ENVIRONMENTS.PRODUCTION;
}

/**
 * Check if running in test mode
 * @returns {boolean} True if test environment
 */
function isTest() {
  return getEnvironment() === ENVIRONMENTS.TEST;
}

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
  // ============================================================================
  auth0: {
    domain: process.env.AUTH0_DOMAIN || 'dev-mglpuahc3cwf66wq.us.auth0.com',
    clientId: process.env.AUTH0_CLIENT_ID || 'WxWdn4aInQlttryLO0TYdvheBka8yXX4',
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE || 'https://api.tross.dev',
  },

  // ============================================================================
  // JWT CONFIGURATION
  // ============================================================================
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
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
   * Throws if critical config is missing
   *
   * @throws {Error} If required configuration is missing
   */
  validate() {
    const errors = [];

    if (this.isProduction) {
      // Production-specific validation
      if (
        !process.env.JWT_SECRET ||
        process.env.JWT_SECRET === 'your-secret-key-change-in-production'
      ) {
        errors.push('JWT_SECRET must be set in production');
      }

      if (!this.auth0.clientSecret) {
        errors.push('AUTH0_CLIENT_SECRET must be set in production');
      }

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
    console.error('Configuration Error:', error.message);
    if (isProduction()) {
      // In production, fail fast if configuration is invalid
      process.exit(1);
    }
  }
}

module.exports = AppConfig;
