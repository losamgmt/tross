/**
 * Request Helper Utilities
 *
 * Utility functions for extracting and processing common request data.
 * Follows SRP - each function has a single, well-defined responsibility.
 */

/**
 * Extract client IP address from request
 *
 * Checks multiple sources in order of preference:
 * 1. req.ip (set by Express when trust proxy is enabled)
 * 2. req.connection.remoteAddress (direct socket connection)
 * 3. 'unknown' fallback (should never happen, but defensive)
 *
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Extract user agent string from request headers
 *
 * @param {Object} req - Express request object
 * @returns {string|undefined} User agent string, or undefined if not present
 */
function getUserAgent(req) {
  return req.headers['user-agent'];
}

/**
 * Extract common audit metadata from request
 *
 * Convenience function that combines IP and user agent extraction
 * for audit logging purposes.
 *
 * @param {Object} req - Express request object
 * @returns {Object} Object containing { ip, userAgent }
 */
function getAuditMetadata(req) {
  return {
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  };
}

module.exports = {
  getClientIp,
  getUserAgent,
  getAuditMetadata,
};
