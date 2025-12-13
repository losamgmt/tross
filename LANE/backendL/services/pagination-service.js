/**
 * Pagination Service
 *
 * SINGLE RESPONSIBILITY: Handle pagination logic for database queries
 *
 * Philosophy:
 * - SRP LITERALISM: Only pagination calculations, nothing else
 * - KISS: Simple math, no magic
 * - Consistent: Same logic everywhere
 * - Testable: Pure functions, no side effects
 *
 * Note: Does NOT use toSafeInteger because pagination should gracefully
 * cap values (user-friendly) rather than throw errors (strict validation)
 */

/**
 * Safely parse and clamp an integer value
 * SRP: ONLY for pagination - gracefully caps instead of throwing
 *
 * @private
 */
function safeClamp(value, defaultValue, min, max) {
  const parsed = parseInt(value, 10);

  // Invalid input: use default
  if (isNaN(parsed)) {
    return defaultValue;
  }

  // Clamp to range (KISS: simple min/max)
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Default pagination settings
 * Can be overridden per request but enforces sane limits
 */
const DEFAULTS = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 200,
};

/**
 * Validate and normalize pagination parameters
 *
 * SRP: ONLY validates and normalizes - does NOT query database
 * Note: Gracefully caps invalid values instead of throwing errors (user-friendly)
 *
 * @param {Object} options - Raw pagination options
 * @param {number} [options.page] - Page number (default: 1)
 * @param {number} [options.limit] - Items per page (default: 50, max: 200)
 * @param {number} [options.maxLimit] - Override max limit for specific use cases
 * @returns {Object} Validated pagination params { page, limit, offset }
 */
function validateParams(options = {}) {
  const maxLimit = options.maxLimit || DEFAULTS.MAX_LIMIT;

  // Gracefully clamp values (user-friendly pagination)
  const page = safeClamp(options.page, DEFAULTS.PAGE, 1, Number.MAX_SAFE_INTEGER);
  const limit = safeClamp(options.limit, DEFAULTS.LIMIT, 1, maxLimit);

  // KISS: Simple offset calculation
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Generate pagination metadata for API response
 *
 * SRP: ONLY generates metadata object - does NOT query or validate
 *
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata { page, limit, total, totalPages, hasNext, hasPrev }
 */
function generateMetadata(page, limit, total) {
  // Gracefully clamp inputs
  const safePage = safeClamp(page, 1, 1, Number.MAX_SAFE_INTEGER);
  const safeLimit = safeClamp(limit, 1, 1, Number.MAX_SAFE_INTEGER);
  const safeTotal = Math.max(0, parseInt(total, 10) || 0);

  // KISS: Simple calculations
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));
  const hasNext = safePage < totalPages;
  const hasPrev = safePage > 1;

  return {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    totalPages,
    hasNext,
    hasPrev,
  };
}

/**
 * Build SQL LIMIT/OFFSET clause
 *
 * SRP: ONLY builds SQL string - does NOT execute query
 *
 * @param {number} limit - Items per page
 * @param {number} offset - Number of items to skip
 * @returns {string} SQL LIMIT/OFFSET clause
 */
function buildLimitClause(limit, offset) {
  return `LIMIT ${limit} OFFSET ${offset}`;
}

/**
 * Complete pagination workflow
 * Convenience method that combines validate + metadata generation
 *
 * @param {Object} options - Pagination options
 * @param {number} total - Total count from database
 * @returns {Object} { params: { page, limit, offset }, metadata: {...} }
 */
function paginate(options, total) {
  const params = validateParams(options);
  const metadata = generateMetadata(params.page, params.limit, total);

  return { params, metadata };
}

module.exports = {
  DEFAULTS,
  validateParams,
  generateMetadata,
  buildLimitClause,
  paginate,
};
