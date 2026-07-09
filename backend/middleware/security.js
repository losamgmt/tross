/**
 * Security Middleware - Essential security hardening
 * KISS principle: Only what we need, nothing more
 *
 * NOTE: Rate limiting has been moved to ./rate-limit.js to follow DRY.
 * This file focuses on: headers, input sanitization, and general security.
 */

const helmet = require('helmet');
const { SECURITY } = require('../config/constants');

/**
 * Input sanitization middleware
 * Using a more targeted approach to avoid express-mongo-sanitize issues
 */
const sanitizeInput = () => {
  return (req, res, next) => {
    // Fields that should NOT be sanitized (contain dots by design)
    const EXCLUDED_FIELDS = ['id_token', 'access_token', 'refresh_token'];

    // Manual sanitization to avoid the read-only property issue
    const sanitizeObject = (obj, _parentKey = '') => {
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach((key) => {
          // Skip sanitization for JWT tokens and email fields
          if (EXCLUDED_FIELDS.includes(key) || key === 'email') {
            return; // Don't sanitize JWT tokens or emails!
          }

          if (typeof obj[key] === 'string') {
            // Remove MongoDB operators (we use PostgreSQL but this prevents injection attempts)
            // Only replace leading $ signs, not dots in general text
            obj[key] = obj[key].replace(/^\$/, '_');
          } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key], key);
          }
        });
      }
    };

    // Sanitize body and params (avoid query for now)
    if (req.body) {
      sanitizeObject(req.body);
    }
    if (req.params) {
      sanitizeObject(req.params);
    }

    next();
  };
};

/**
 * Build the Content-Security-Policy directives object.
 *
 * Development relaxes several directives for Flutter tooling (inline styles for hot reload,
 * arbitrary image + connect sources). Production locks these down. The `connectSrc` dev
 * relaxation uses an allow-all `'*'` wildcard that MUST NEVER reach production — the startup
 * validator asserts this via `cspHasAllowAllWildcard`.
 *
 * @param {boolean} isDevelopment
 * @param {Object} [env] - Overrides for testability
 * @param {string} [env.cdnDomain=process.env.CDN_DOMAIN]
 * @param {string} [env.apiDomain=process.env.API_DOMAIN]
 * @returns {Object} CSP directives
 */
function buildCspDirectives(
  isDevelopment,
  { cdnDomain = process.env.CDN_DOMAIN, apiDomain = process.env.API_DOMAIN } = {},
) {
  // Production sources (undefined domains filtered out).
  const prodImgSrc = [SECURITY.HEADERS.CSP_SELF, 'data:', cdnDomain].filter(Boolean);
  const prodConnectSrc = [
    SECURITY.HEADERS.CSP_SELF,
    apiDomain,
    'https://*.auth0.com',
  ].filter(Boolean);

  return {
    defaultSrc: [SECURITY.HEADERS.CSP_SELF],
    // Strict in production; allow unsafe-inline for Flutter in development.
    styleSrc: isDevelopment
      ? [SECURITY.HEADERS.CSP_SELF, SECURITY.HEADERS.CSP_UNSAFE_INLINE]
      : [SECURITY.HEADERS.CSP_SELF],
    scriptSrc: [SECURITY.HEADERS.CSP_SELF],
    // All HTTPS images in dev (Flutter hot reload); restrict to CDN in production.
    imgSrc: isDevelopment
      ? [SECURITY.HEADERS.CSP_SELF, 'data:', 'https:']
      : prodImgSrc,
    // Allow-all connections in dev; restrict to the API domain in production.
    connectSrc: isDevelopment
      ? [SECURITY.HEADERS.CSP_SELF, '*']
      : prodConnectSrc,
    fontSrc: [SECURITY.HEADERS.CSP_SELF],
    objectSrc: [SECURITY.HEADERS.CSP_NONE],
    mediaSrc: [SECURITY.HEADERS.CSP_SELF],
    frameSrc: [SECURITY.HEADERS.CSP_NONE],
  };
}

/**
 * True if any directive contains the allow-all `'*'` wildcard (as opposed to a scoped host
 * wildcard like `https://*.auth0.com`). This is the development-only relaxation that must
 * never reach production.
 *
 * @param {Object} directives - CSP directives (from buildCspDirectives)
 * @returns {boolean}
 */
function cspHasAllowAllWildcard(directives) {
  return Object.values(directives || {}).some(
    (sources) => Array.isArray(sources) && sources.includes('*'),
  );
}

/**
 * Security headers configuration
 * Environment-aware: Stricter policies in production, relaxed for Flutter development
 */
const securityHeaders = () => {
  const { isProduction } = require('../config/app-mode');
  const isDevelopment = !isProduction();

  return helmet({
    contentSecurityPolicy: {
      directives: buildCspDirectives(isDevelopment),
    },
    // Enable HSTS in production only
    strictTransportSecurity: !isDevelopment && {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: false, // Disable for Flutter compatibility
  });
};

module.exports = {
  securityHeaders,
  sanitizeInput,
  buildCspDirectives,
  cspHasAllowAllWildcard,
};
