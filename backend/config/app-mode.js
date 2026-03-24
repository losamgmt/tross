/**
 * App Mode - Unified Environment Configuration
 *
 * SINGLE SOURCE OF TRUTH for environment detection and feature flags.
 *
 * This module replaces the scattered environment checks across the codebase
 * with a centralized, type-safe, and well-documented system.
 *
 * THREE MODES:
 * - TEST:       Running automated tests (unit/integration)
 * - LOCAL_DEV:  Local development with Docker
 * - PRODUCTION: Deployed to Railway/Vercel
 *
 * PHILOSOPHY:
 * - Single enum controls all behavior
 * - All flags are derived from the mode (no independent env vars)
 * - Fail-fast on invalid configurations
 * - Clear documentation for each mode
 */

const { ENVIRONMENTS } = require('./constants');

// ============================================================================
// TEST JWT SECRET - SINGLE SOURCE OF TRUTH
// ============================================================================

/**
 * JWT secret used ONLY in test mode.
 *
 * SECURITY: This value is intentionally obvious to prevent accidental use in production.
 * It's returned by AppConfig.jwt.secret when NODE_ENV=test and JWT_SECRET is not set.
 *
 * All test files should import this constant to ensure consistency.
 *
 * @constant {string}
 */
const TEST_JWT_SECRET = 'test-only-jwt-secret-do-not-use-in-production';

// ============================================================================
// APP MODE ENUM
// ============================================================================

/**
 * Application execution modes.
 *
 * @readonly
 * @enum {string}
 */
const AppMode = Object.freeze({
  /**
   * TEST: Running automated tests (unit or integration)
   *
   * Database:    tross_test @ localhost:5433 (Docker, tmpfs)
   * Auth:        Dev tokens accepted (for createTestUser)
   * Users:       From database (integration) or mocked (unit)
   * Logging:     Verbose (test-logger)
   * Swagger:     Disabled
   */
  TEST: 'test',

  /**
   * LOCAL_DEV: Local development with full stack
   *
   * Database:    tross_dev @ localhost:5432 (Docker)
   * Auth:        Dev tokens + Auth0 both accepted
   * Users:       From database (or in-memory if MOCK_USERS=true)
   * Logging:     Verbose
   * Swagger:     Enabled
   */
  LOCAL_DEV: 'local-dev',

  /**
   * PRODUCTION: Deployed to Railway/Vercel
   *
   * Database:    Railway (DATABASE_URL)
   * Auth:        Auth0 ONLY (dev tokens = 403 FORBIDDEN)
   * Users:       From database only
   * Logging:     Minimal (structured JSON)
   * Swagger:     Disabled
   */
  PRODUCTION: 'production',
});

// ============================================================================
// MODE DETECTION
// ============================================================================

/**
 * Detect the current application mode.
 *
 * Detection priority:
 * 1. NODE_ENV=test → TEST
 * 2. NODE_ENV=production OR RAILWAY_ENVIRONMENT exists → PRODUCTION
 * 3. Otherwise → LOCAL_DEV
 *
 * @returns {AppMode} Current application mode
 */
function getAppMode() {
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === ENVIRONMENTS.TEST) {
    return AppMode.TEST;
  }

  if (nodeEnv === ENVIRONMENTS.PRODUCTION || process.env.RAILWAY_ENVIRONMENT) {
    return AppMode.PRODUCTION;
  }

  return AppMode.LOCAL_DEV;
}

// ============================================================================
// MODE CHECK HELPERS (for cleaner conditionals)
// ============================================================================

/**
 * Check if running in test mode (unit or integration tests)
 * @returns {boolean}
 */
const isTestMode = () => getAppMode() === AppMode.TEST;

/**
 * Check if running in local development mode
 * @returns {boolean}
 */
const isLocalDev = () => getAppMode() === AppMode.LOCAL_DEV;

/**
 * Check if running in production mode
 * @returns {boolean}
 */
const isProduction = () => getAppMode() === AppMode.PRODUCTION;

// ============================================================================
// FEATURE FLAGS (derived from mode)
// ============================================================================

/**
 * Whether development authentication (test tokens) is allowed.
 *
 * TRUE in:  TEST, LOCAL_DEV
 * FALSE in: PRODUCTION (returns 403 FORBIDDEN for dev tokens)
 *
 * @returns {boolean}
 */
const devAuthEnabled = () => getAppMode() !== AppMode.PRODUCTION;

/**
 * Whether to use in-memory TEST_USERS instead of database.
 *
 * This is an explicit opt-in for local development when you don't
 * have Docker running but want to test authentication flows.
 *
 * TRUE when:  LOCAL_DEV mode AND MOCK_USERS=true
 * FALSE when: TEST mode (integration tests use real DB)
 * FALSE when: PRODUCTION mode (always use real DB)
 *
 * @returns {boolean}
 */
const useInMemoryUsers = () => {
  return isLocalDev() && process.env.MOCK_USERS === 'true';
};

/**
 * Whether verbose logging is enabled.
 *
 * TRUE in:  TEST, LOCAL_DEV
 * FALSE in: PRODUCTION
 *
 * @returns {boolean}
 */
const verboseLogging = () => getAppMode() !== AppMode.PRODUCTION;

/**
 * Whether Swagger API documentation is enabled.
 *
 * TRUE in:  LOCAL_DEV only
 * FALSE in: TEST, PRODUCTION
 *
 * @returns {boolean}
 */
const swaggerEnabled = () => isLocalDev();

// ============================================================================
// DATABASE CONFIGURATION (derived from mode)
// ============================================================================

/**
 * Get database configuration for the current mode.
 *
 * - TEST:       tross_test @ localhost:5433
 * - LOCAL_DEV:  tross_dev @ localhost:5432
 * - PRODUCTION: Uses DATABASE_URL env var
 *
 * @returns {Object|string} Database config object or DATABASE_URL string
 */
function getDatabaseConfigForMode() {
  const { DATABASE } = require('./constants');

  const mode = getAppMode();

  if (mode === AppMode.TEST) {
    return {
      host: process.env.TEST_DB_HOST || DATABASE.TEST.HOST,
      port: parseInt(process.env.TEST_DB_PORT) || DATABASE.TEST.PORT,
      database: process.env.TEST_DB_NAME || DATABASE.TEST.NAME,
      user: process.env.TEST_DB_USER || DATABASE.TEST.USER,
      password: process.env.TEST_DB_PASSWORD || DATABASE.TEST.PASSWORD,
      pool: DATABASE.TEST.POOL,
    };
  }

  if (mode === AppMode.PRODUCTION) {
    // Production should always use DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'PRODUCTION mode requires DATABASE_URL environment variable. ' +
        'This should be set by your hosting provider (Railway, Render, etc.)',
      );
    }
    return process.env.DATABASE_URL;
  }

  // LOCAL_DEV - use dev database
  return {
    host: process.env.DB_HOST || DATABASE.DEV.HOST,
    port: parseInt(process.env.DB_PORT) || DATABASE.DEV.PORT,
    database: process.env.DB_NAME || DATABASE.DEV.NAME,
    user: process.env.DB_USER || DATABASE.DEV.USER,
    password: process.env.DB_PASSWORD || DATABASE.DEV.PASSWORD,
    pool: DATABASE.DEV.POOL,
  };
}

// ============================================================================
// BACKWARDS COMPATIBILITY EXPORTS
// ============================================================================

// Map to old environment.js function names for gradual migration
const isDevelopment = isLocalDev;
const isTest = isTestMode;

// ============================================================================
// ENVIRONMENT CONTRACT SUMMARY
// ============================================================================

/**
 * Get a summary of the current environment configuration.
 * Useful for debugging and logging at startup.
 *
 * @returns {Object} Environment summary
 */
function getEnvironmentSummary() {
  const mode = getAppMode();
  return {
    mode,
    nodeEnv: process.env.NODE_ENV,
    features: {
      devAuth: devAuthEnabled(),
      inMemoryUsers: useInMemoryUsers(),
      verboseLogging: verboseLogging(),
      swagger: swaggerEnabled(),
    },
    database: mode === AppMode.PRODUCTION ? 'DATABASE_URL' : (
      mode === AppMode.TEST ? 'tross_test:5433' : 'tross_dev:5432'
    ),
  };
}

module.exports = {
  // Enum
  AppMode,

  // Test JWT Secret (SSOT)
  TEST_JWT_SECRET,

  // Mode detection
  getAppMode,

  // Mode checks
  isTestMode,
  isLocalDev,
  isProduction,

  // Backwards compatibility
  isDevelopment,
  isTest,

  // Feature flags
  devAuthEnabled,
  useInMemoryUsers,
  verboseLogging,
  swaggerEnabled,

  // Database
  getDatabaseConfigForMode,

  // Debugging
  getEnvironmentSummary,
};
