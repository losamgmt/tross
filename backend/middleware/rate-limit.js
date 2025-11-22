/**
 * Rate Limiting Middleware
 *
 * Protects against brute force, DoS, and API abuse.
 * Uses express-rate-limit with different limits for different endpoint types.
 *
 * KISS Principle: Simple, focused rate limiting per endpoint type.
 *
 * NOTE: Rate limiting is DISABLED when NODE_ENV is undefined, 'test', or 'development'
 * to allow rapid test execution and local development without limits.
 * Only enabled when NODE_ENV === 'production'.
 */
const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');

/**
 * Get rate limit configuration from environment variables
 * Defaults: 1000 requests per 15 minutes (professional standard)
 */
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '900000',
  10,
); // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || '1000',
  10,
); // 1000 req/15min

/**
 * Bypass middleware for test environment
 * Returns a no-op middleware that just calls next()
 */
const bypassLimiter = (req, res, next) => next();

/**
 * General API rate limit
 * Configurable via RATE_LIMIT_MAX_REQUESTS and RATE_LIMIT_WINDOW_MS
 * Default: 1000 requests per 15 minutes (professional standard)
 * Protects against general API abuse and DoS attacks
 */
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('⚠️ API rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });

    res.status(429).json({
      error: 'Too many requests',
      message:
        'You have exceeded the rate limit. Please try again after 15 minutes.',
      retryAfter: 900, // seconds
    });
  },
});

/**
 * Strict authentication endpoint limits
 * 5 failed attempts per 15 minutes (brute force protection)
 * Only counts failed attempts (skipSuccessfulRequests = true)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'Too many login attempts',
    message:
      'Too many failed login attempts. Please try again after 15 minutes.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('🚨 Auth rate limit exceeded - possible brute force attack', {
      ip: req.ip,
      path: req.path,
      email: req.body?.email || 'unknown',
      userAgent: req.get('User-Agent'),
    });

    res.status(429).json({
      error: 'Too many login attempts',
      message:
        'Too many failed login attempts from this IP address. Please try again after 15 minutes.',
      retryAfter: 900, // seconds
    });
  },
});

/**
 * Token refresh limit
 * 10 refreshes per hour per IP
 * Prevents refresh token spam/abuse
 */
const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 refreshes per hour
  message: {
    error: 'Too many refresh requests',
    message: 'Too many token refresh requests. Please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('⚠️ Refresh rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(429).json({
      error: 'Too many refresh requests',
      message:
        'Too many token refresh requests. Please try again after 1 hour.',
      retryAfter: 3600, // seconds
    });
  },
});

/**
 * Password reset limit
 * 3 requests per hour per IP
 * Prevents email spam and abuse
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 attempts per hour
  message: {
    error: 'Too many password reset requests',
    message: 'Too many password reset requests. Please try again after 1 hour.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('⚠️ Password reset rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email || 'unknown',
      userAgent: req.get('User-Agent'),
    });

    res.status(429).json({
      error: 'Too many password reset requests',
      message:
        'Too many password reset requests. Please try again after 1 hour.',
      retryAfter: 3600, // seconds
    });
  },
});

const isTestOrDevEnvironment =
  !process.env.NODE_ENV ||
  ['test', 'development'].includes(process.env.NODE_ENV);

module.exports = {
  apiLimiter: isTestOrDevEnvironment ? bypassLimiter : apiLimiter,
  authLimiter: isTestOrDevEnvironment ? bypassLimiter : authLimiter,
  refreshLimiter: isTestOrDevEnvironment ? bypassLimiter : refreshLimiter,
  passwordResetLimiter: isTestOrDevEnvironment
    ? bypassLimiter
    : passwordResetLimiter,
};
