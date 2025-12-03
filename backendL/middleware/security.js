/**
 * Security Middleware - Essential security hardening
 * KISS principle: Only what we need, nothing more
 *
 * NOTE: Rate limiting has been moved to ./rate-limit.js to follow DRY.
 * This file focuses on: headers, input sanitization, and general security.
 */

const helmet = require('helmet');
const _mongoSanitize = require('express-mongo-sanitize');
const { SECURITY } = require('../config/constants');
const { logger: _logger } = require('../config/logger');

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
 * Security headers configuration
 * Environment-aware: Stricter policies in production, relaxed for Flutter development
 */
const securityHeaders = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [SECURITY.HEADERS.CSP_SELF],
        // Strict in production, allow unsafe-inline for Flutter in development
        styleSrc: isDevelopment
          ? [SECURITY.HEADERS.CSP_SELF, SECURITY.HEADERS.CSP_UNSAFE_INLINE]
          : [SECURITY.HEADERS.CSP_SELF],
        scriptSrc: [SECURITY.HEADERS.CSP_SELF],
        // Allow all HTTPS images in dev (Flutter hot reload), restrict to CDN in production
        imgSrc: isDevelopment
          ? [SECURITY.HEADERS.CSP_SELF, 'data:', 'https:']
          : [SECURITY.HEADERS.CSP_SELF, 'data:', 'https://cdn.trossapp.com'],
        // Allow all connections in dev, restrict to API domain in production
        connectSrc: isDevelopment
          ? [SECURITY.HEADERS.CSP_SELF, '*']
          : [
            SECURITY.HEADERS.CSP_SELF,
            'https://api.trossapp.com',
            'https://*.auth0.com',
          ],
        fontSrc: [SECURITY.HEADERS.CSP_SELF],
        objectSrc: [SECURITY.HEADERS.CSP_NONE],
        mediaSrc: [SECURITY.HEADERS.CSP_SELF],
        frameSrc: [SECURITY.HEADERS.CSP_NONE],
      },
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
};
