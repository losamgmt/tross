/**
 * Coverage Standards - SINGLE SOURCE OF TRUTH
 *
 * All coverage thresholds and configuration for the backend.
 * This is imported by jest configs and the check-coverage script.
 *
 * Standard: 80% across all metrics (statements, branches, functions, lines)
 */

const COVERAGE_THRESHOLD = 80;

/**
 * Jest-compatible coverage threshold object
 */
const coverageThreshold = {
  global: {
    branches: COVERAGE_THRESHOLD,
    functions: COVERAGE_THRESHOLD,
    lines: COVERAGE_THRESHOLD,
    statements: COVERAGE_THRESHOLD,
  },
};

/**
 * Files to collect coverage from (included in coverage reports)
 */
const collectCoverageFrom = [
  'config/**/*.js',
  'db/**/*.js',
  'middleware/**/*.js',
  'routes/**/*.js',
  'services/**/*.js',
  'utils/**/*.js',
  'validators/**/*.js',
  // Exclusions
  '!**/node_modules/**',
  '!**/__tests__/**',
  '!**/coverage/**',
  '!**/coverage-unit/**',
  '!**/coverage-integration/**',
  '!**/scripts/**',
  '!**/migrations/**',
  '!**/seeds/**',
  '!jest.config*.js',
  '!**/*-old.js',
  '!**/*-backup.js',
  '!**/auth0-setup.json',
  // Infrastructure files (not testable in unit/integration context)
  '!server.js',
  '!db/connection.js',
  // Config files that are environment-specific
  '!config/auth0.js',
  '!config/swagger.js',
  '!config/test-logger.js',
  '!config/timeouts.js',
  '!config/app-config.js',
  '!config/coverage-standards.js',
  // Auth strategies (require real Auth0/env setup)
  '!services/auth/DevAuthStrategy.js',
  '!services/auth/AuthStrategy.js',
  '!services/auth/index.js',
  // Routes that require external services (Auth0 callback, dev-only)
  '!routes/auth0.js',
  '!routes/dev-auth.js',
  // Middleware that's hard to unit test
  '!middleware/rate-limit.js',
  '!middleware/dev-auth.js',
  // Infrastructure that requires real database transactions
  '!db/helpers/transaction-helper.js',
  // Dev tools that aren't runtime code
  '!utils/validation-sync-checker.js',
  '!utils/permission-check.js',
];

/**
 * Paths to ignore when collecting coverage
 */
const coveragePathIgnorePatterns = [
  '/node_modules/',
  '/coverage/',
  '/coverage-unit/',
  '/coverage-integration/',
  '/scripts/',
  '/__tests__/',
];

module.exports = {
  COVERAGE_THRESHOLD,
  coverageThreshold,
  collectCoverageFrom,
  coveragePathIgnorePatterns,
};
