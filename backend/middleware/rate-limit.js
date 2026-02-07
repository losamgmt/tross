/**
 * Rate Limiting Middleware
 *
 * Protects against brute force, DoS, and API abuse.
 * Uses express-rate-limit with different limits for different endpoint types.
 *
 * KISS Principle: Simple, focused rate limiting per endpoint type.
 * Uses a factory pattern to eliminate duplication across limiter configurations.
 *
 * NOTE: Rate limiting is DISABLED when NODE_ENV is undefined, 'test', or 'development'
 * to allow rapid test execution and local development without limits.
 * Only enabled when NODE_ENV === 'production'.
 */
const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');
const { HTTP_STATUS } = require('../config/constants');

// ─────────────────────────────────────────────────────────────
// Environment Detection
// ─────────────────────────────────────────────────────────────

const isTestOrDevEnvironment =
  !process.env.NODE_ENV ||
  ['test', 'development'].includes(process.env.NODE_ENV);

/**
 * Bypass middleware for test/dev environment
 * Returns a no-op middleware that just calls next()
 */
const bypassLimiter = (req, res, next) => next();

// ─────────────────────────────────────────────────────────────
// Rate Limit Factory
// ─────────────────────────────────────────────────────────────

/**
 * Rate limiter configuration options
 * @typedef {Object} RateLimitConfig
 * @property {string} name - Limiter name for logging (e.g., 'API', 'Auth')
 * @property {string} logEmoji - Emoji for log messages
 * @property {number} windowMs - Time window in milliseconds
 * @property {number} max - Maximum requests per window
 * @property {string} errorType - Error message type (e.g., 'Too many requests')
 * @property {string} errorMessage - Full error message for response
 * @property {string} retryAfterLabel - Human-readable retry time (e.g., '15 minutes')
 * @property {number} retryAfterSeconds - Retry time in seconds for response
 * @property {boolean} [skipSuccessfulRequests] - Don't count successful requests
 * @property {string[]} [logFields] - Additional request fields to log (e.g., ['email'])
 */

/**
 * Creates a rate limiter middleware with the given configuration
 * @param {RateLimitConfig} config - Rate limiter configuration
 * @returns {Function} Express middleware (rate limiter or bypass)
 */
function createRateLimiter(config) {
  const {
    name,
    logEmoji,
    windowMs,
    max,
    errorType,
    errorMessage,
    retryAfterLabel,
    retryAfterSeconds,
    skipSuccessfulRequests = false,
    logFields = [],
  } = config;

  const limiter = rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    message: {
      error: errorType,
      message: errorMessage,
      retryAfter: retryAfterLabel,
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (req, res) => {
      // Build log context with standard fields
      const logContext = {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
      };

      // Add optional fields from config
      if (logFields.includes('method')) {
        logContext.method = req.method;
      }
      if (logFields.includes('email')) {
        logContext.email = req.body?.email || 'unknown';
      }

      logger.warn(`${logEmoji} ${name} rate limit exceeded`, logContext);

      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        error: errorType,
        message: errorMessage,
        retryAfter: retryAfterSeconds,
      });
    },
  });

  // Return bypass in test/dev, real limiter in production
  return isTestOrDevEnvironment ? bypassLimiter : limiter;
}

// ─────────────────────────────────────────────────────────────
// Rate Limiter Configurations
// ─────────────────────────────────────────────────────────────

/**
 * Get rate limit configuration from environment variables
 * All limits are configurable for different deployment scenarios
 */

// General API limits (default: 1000 req/15 min - professional standard)
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '900000',
  10,
); // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || '1000',
  10,
);

// Auth limits (default: 5 failed attempts/15 min - brute force protection)
const AUTH_RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000',
  10,
); // 15 minutes
const AUTH_RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5',
  10,
);

// Refresh token limits (default: 10 req/hour - prevents token spam)
const REFRESH_RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.REFRESH_RATE_LIMIT_WINDOW_MS || '3600000',
  10,
); // 1 hour
const REFRESH_RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.REFRESH_RATE_LIMIT_MAX_REQUESTS || '10',
  10,
);

/**
 * General API rate limit
 * Configurable via RATE_LIMIT_MAX_REQUESTS and RATE_LIMIT_WINDOW_MS
 * Default: 1000 requests per 15 minutes (professional standard)
 * Protects against general API abuse and DoS attacks
 */
const apiLimiter = createRateLimiter({
  name: 'API',
  logEmoji: '⚠️',
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  errorType: 'Too many requests',
  errorMessage:
    'You have exceeded the rate limit. Please try again after 15 minutes.',
  retryAfterLabel: '15 minutes',
  retryAfterSeconds: 900,
  logFields: ['method'],
});

/**
 * Strict authentication endpoint limits
 * Configurable via AUTH_RATE_LIMIT_* env vars
 * Default: 5 failed attempts per 15 minutes (brute force protection)
 * Only counts failed attempts (skipSuccessfulRequests = true)
 */
const authLimiter = createRateLimiter({
  name: 'Auth',
  logEmoji: '🚨',
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX_REQUESTS,
  errorType: 'Too many login attempts',
  errorMessage:
    'Too many failed login attempts from this IP address. Please try again later.',
  retryAfterLabel: `${Math.round(AUTH_RATE_LIMIT_WINDOW_MS / 60000)} minutes`,
  retryAfterSeconds: Math.round(AUTH_RATE_LIMIT_WINDOW_MS / 1000),
  skipSuccessfulRequests: true, // Don't count successful logins
  logFields: ['email'],
});

/**
 * Token refresh limit
 * Configurable via REFRESH_RATE_LIMIT_* env vars
 * Default: 10 refreshes per hour per IP
 * Prevents refresh token spam/abuse
 */
const refreshLimiter = createRateLimiter({
  name: 'Refresh',
  logEmoji: '⚠️',
  windowMs: REFRESH_RATE_LIMIT_WINDOW_MS,
  max: REFRESH_RATE_LIMIT_MAX_REQUESTS,
  errorType: 'Too many refresh requests',
  errorMessage: 'Too many token refresh requests. Please try again later.',
  retryAfterLabel: `${Math.round(REFRESH_RATE_LIMIT_WINDOW_MS / 60000)} minutes`,
  retryAfterSeconds: Math.round(REFRESH_RATE_LIMIT_WINDOW_MS / 1000),
});

// NOTE: passwordResetLimiter removed - Auth0 handles all password operations

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

module.exports = {
  // Rate limiters (already handle test/dev bypass)
  apiLimiter,
  authLimiter,
  refreshLimiter,

  // Factory for custom rate limiters (allows extending with new limiters)
  createRateLimiter,

  // Exported for testing - verify defaults are professional standards
  _config: {
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS,
    AUTH_RATE_LIMIT_WINDOW_MS,
    AUTH_RATE_LIMIT_MAX_REQUESTS,
    REFRESH_RATE_LIMIT_WINDOW_MS,
    REFRESH_RATE_LIMIT_MAX_REQUESTS,
  },
};
