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

/**
 * Get current ISO timestamp
 *
 * Centralized timestamp generation for consistent formatting.
 * Use instead of `new Date().toISOString()` throughout codebase.
 *
 * @returns {string} ISO 8601 formatted timestamp
 */
function getISOTimestamp() {
  return new Date().toISOString();
}

/**
 * Validate ISO 8601 date string
 *
 * Checks if string is a valid ISO date that can be parsed.
 * Does NOT validate business rules (e.g., date ranges).
 *
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid ISO date
 */
function isValidISODate(dateString) {
  if (typeof dateString !== 'string') {return false;}
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.includes('T');
}

/**
 * Deep clone an object
 *
 * Creates a deep copy without reference sharing.
 * Uses structuredClone if available, falls back to JSON.
 *
 * @param {Object} obj - Object to clone
 * @returns {Object} Deep cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {return obj;}

  // Use native structuredClone if available (Node 17+)
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }

  // Fallback to JSON (works for most cases)
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  getClientIp,
  getUserAgent,
  getAuditMetadata,
  getISOTimestamp,
  isValidISODate,
  deepClone,
};
