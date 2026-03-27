/**
 * Startup Validator
 *
 * SRP LITERALISM: ONLY performs fail-fast security validation at server startup.
 *
 * PHILOSOPHY:
 * - FAIL-FAST: Catch misconfigurations before any requests processed
 * - DEFENSE-IN-DEPTH: Multiple layers of security checks
 * - PRODUCTION-STRICT: Errors in production, warnings in development
 * - NON-BLOCKING-DEV: Development can continue with warnings
 *
 * USAGE:
 *   const result = validateStartup({ allMetadata });
 *   // result: { valid: boolean, errors: string[], warnings: string[] }
 *
 *   validateStartupOrExit({ allMetadata });
 *   // Exits process in production if validation fails
 *
 * SECURITY: These checks run ONCE at server startup, not per-request.
 *
 * @module startup-validator
 */

const { isProduction, isTestMode, devAuthEnabled } = require('../config/app-mode');
const { logger } = require('../config/logger');
const { STARTUP_VALIDATION, AUTH } = require('../config/constants');
const AppConfig = require('../config/app-config');
const { validateAllRules } = require('../db/helpers/rls');

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether all checks passed
 * @property {string[]} errors - Critical errors (will cause exit in production)
 * @property {string[]} warnings - Non-critical warnings (logged but continue)
 */

/**
 * Validate security configuration at startup
 *
 * CRITICAL CHECKS (fail in production):
 * - Dev auth disabled in production
 * - RLS rules properly configured
 *
 * WARNING CHECKS (log but continue):
 * - Missing optional integrations
 *
 * @param {Object} options - Validation options
 * @param {Object} [options.allMetadata] - Entity metadata (required for RLS validation)
 * @returns {ValidationResult}
 */
function validateStartup(options = {}) {
  const errors = [];
  const warnings = [];

  logger.info('🔐 Running startup security validation...');

  // ============================================================================
  // CRITICAL CHECK: Dev Auth in Production
  // ============================================================================
  if (isProduction() && devAuthEnabled()) {
    errors.push(
      'SECURITY VIOLATION: Development authentication is enabled in production. ' +
      'This allows test tokens to authenticate as any user. ' +
      'Set NODE_ENV=production and ensure devAuthEnabled returns false.',
    );
  }

  // Even in non-production, warn if dev auth is enabled
  if (devAuthEnabled() && !isTestMode()) {
    warnings.push(
      'Development authentication is enabled. ' +
      'Test tokens can authenticate as any test user. ' +
      'Ensure this is intentional for your environment.',
    );
  }

  // ============================================================================
  // CRITICAL CHECK: RLS Rules Validation
  // ============================================================================
  if (options.allMetadata) {
    try {
      validateAllRules(options.allMetadata);
      logger.info('✅ RLS rules validated successfully');
    } catch (rlsError) {
      errors.push(`RLS validation failed: ${rlsError.message}`);
    }
  } else {
    warnings.push('RLS validation skipped: allMetadata not provided');
  }

  // ============================================================================
  // CRITICAL CHECK: JWT Secret Configured
  // ============================================================================
  if (!isTestMode()) {
    try {
      // Accessing the getter will throw if not configured
      const _secret = AppConfig.jwt.secret;
      logger.info('✅ JWT secret configured');
    } catch (jwtError) {
      errors.push(`JWT configuration error: ${jwtError.message}`);
    }
  }

  // ============================================================================
  // WARNING CHECK: Auth0 Configuration (if auth mode is auth0)
  // ============================================================================
  if (process.env.AUTH_MODE === AUTH.PROVIDERS.AUTH0) {
    const auth0Config = AppConfig.auth0;
    const missingAuth0 = [];

    if (!auth0Config.domain) {
      missingAuth0.push('AUTH0_DOMAIN');
    }
    if (!auth0Config.clientId) {
      missingAuth0.push('AUTH0_CLIENT_ID');
    }
    if (!auth0Config.clientSecret) {
      missingAuth0.push('AUTH0_CLIENT_SECRET');
    }
    if (!auth0Config.audience) {
      missingAuth0.push('AUTH0_AUDIENCE');
    }

    if (missingAuth0.length > 0) {
      if (isProduction()) {
        errors.push(`Missing Auth0 configuration in production: ${missingAuth0.join(', ')}`);
      } else {
        warnings.push(`Missing Auth0 configuration: ${missingAuth0.join(', ')}`);
      }
    } else {
      logger.info('✅ Auth0 configuration complete');
    }
  }

  // ============================================================================
  // WARNING CHECK: Database Password Strength
  // ============================================================================
  if (isProduction()) {
    const dbPassword = process.env.DB_PASSWORD || '';
    const isWeakPassword =
      STARTUP_VALIDATION.WEAK_PASSWORDS.includes(dbPassword) ||
      dbPassword.length < STARTUP_VALIDATION.MIN_PASSWORD_LENGTH;

    if (isWeakPassword) {
      errors.push(
        'DB_PASSWORD is weak or uses default value. ' +
        `Production requires a strong password (${STARTUP_VALIDATION.MIN_PASSWORD_LENGTH}+ characters).`,
      );
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  const valid = errors.length === 0;

  if (errors.length > 0) {
    logger.error('❌ Startup validation FAILED:', { errors });
  }

  if (warnings.length > 0) {
    warnings.forEach(warning => {
      logger.warn(`⚠️  ${warning}`);
    });
  }

  if (valid) {
    logger.info('✅ Startup security validation passed');
  }

  return { valid, errors, warnings };
}

/**
 * Run startup validation and exit on failure (production only)
 *
 * Convenience wrapper that calls validateStartup and handles exit logic.
 * In production: exits with code 1 on validation failure
 * In development: logs errors but continues
 *
 * @param {Object} options - Same as validateStartup options
 * @returns {ValidationResult}
 */
function validateStartupOrExit(options = {}) {
  const result = validateStartup(options);

  if (!result.valid && isProduction()) {
    logger.error('❌ FATAL: Startup validation failed in production');
    result.errors.forEach(error => {
      logger.error(`   ${error}`);
    });
    logger.error('   Refusing to start server with invalid security configuration.');
    process.exit(1);
  }

  return result;
}

/**
 * Validate dev auth configuration only
 *
 * Lightweight check for contexts where full validation isn't needed.
 * Useful for middleware or route guards.
 *
 * @throws {Error} If dev auth is enabled in production
 */
function assertDevAuthSafe() {
  if (isProduction() && devAuthEnabled()) {
    throw new Error(
      'SECURITY VIOLATION: Development authentication cannot be used in production.',
    );
  }
}

module.exports = {
  validateStartup,
  validateStartupOrExit,
  assertDevAuthSafe,
};
