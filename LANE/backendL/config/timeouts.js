/**
 * Timeout Configuration
 * Multi-layer timeout strategy for robust request handling
 *
 * ARCHITECTURE:
 * Layer 1: Server Timeout (outermost) - 120s
 * Layer 2: Request Timeout (middleware) - 30s
 * Layer 3: Database Query Timeout - 20s
 * Layer 4: Health Check Timeout - 5s
 *
 * RATIONALE:
 * - Each layer provides a safety net for the layer below
 * - Graceful degradation: inner timeouts complete before outer timeouts
 * - Fast failure: prevent hung requests from consuming resources
 * - Monitoring: track timeout occurrences for performance optimization
 *
 * BEST PRACTICES:
 * - Inner timeout < Outer timeout (5s < 20s < 30s < 120s)
 * - Database timeouts prevent connection pool exhaustion
 * - Request timeouts prevent client hang
 * - Server timeouts prevent server resource exhaustion
 */

const TIMEOUTS = Object.freeze({
  /**
   * SERVER LEVEL (Layer 1)
   * Node.js HTTP server timeout - outermost protection
   * Kills connections that exceed this limit
   */
  SERVER: Object.freeze({
    // Maximum request processing time before socket termination
    REQUEST_TIMEOUT_MS: 120000, // 2 minutes - outermost safety net

    // Keep-alive timeout (must be > REQUEST_TIMEOUT_MS)
    // Prevents premature connection closure during legitimate long requests
    KEEP_ALIVE_TIMEOUT_MS: 125000, // 2m 5s

    // Headers timeout (must be > KEEP_ALIVE_TIMEOUT_MS)
    // Time allowed to receive complete request headers
    HEADERS_TIMEOUT_MS: 130000, // 2m 10s
  }),

  /**
   * MIDDLEWARE LEVEL (Layer 2)
   * Request-level timeout for API endpoints
   * Provides graceful error responses before server timeout
   */
  REQUEST: Object.freeze({
    // Default API request timeout
    DEFAULT_MS: 30000, // 30 seconds - standard API timeout

    // Long-running operation timeout (exports, reports, batch operations)
    LONG_RUNNING_MS: 90000, // 90 seconds

    // Quick operation timeout (health checks, simple queries)
    QUICK_MS: 5000, // 5 seconds
  }),

  /**
   * DATABASE LEVEL (Layer 3)
   * PostgreSQL query execution timeout
   * Prevents long-running queries from blocking connection pool
   */
  DATABASE: Object.freeze({
    // Statement timeout: maximum query execution time
    STATEMENT_TIMEOUT_MS: 20000, // 20 seconds - database query limit

    // Query timeout: client-side query timeout (pg driver)
    QUERY_TIMEOUT_MS: 20000, // 20 seconds - must match statement_timeout

    // Connection timeout: time to establish database connection
    CONNECTION_TIMEOUT_MS: 5000, // 5 seconds

    // Idle connection timeout: time before idle connection is closed
    IDLE_TIMEOUT_MS: 30000, // 30 seconds

    // Test environment timeouts (faster for quick test runs)
    TEST: Object.freeze({
      STATEMENT_TIMEOUT_MS: 10000, // 10 seconds
      QUERY_TIMEOUT_MS: 10000, // 10 seconds
      CONNECTION_TIMEOUT_MS: 3000, // 3 seconds
      IDLE_TIMEOUT_MS: 1000, // 1 second
    }),
  }),

  /**
   * SERVICE LEVEL (Layer 4)
   * Individual service timeouts for specific operations
   */
  SERVICES: Object.freeze({
    // Health check service timeout
    HEALTH_CHECK_MS: 5000, // 5 seconds

    // External API timeout (Auth0, payment gateways, etc.)
    EXTERNAL_API_MS: 10000, // 10 seconds

    // File upload processing timeout
    FILE_PROCESSING_MS: 60000, // 60 seconds

    // Email delivery timeout
    EMAIL_DELIVERY_MS: 15000, // 15 seconds
  }),

  /**
   * MONITORING & METRICS
   * Thresholds for performance monitoring and alerting
   */
  MONITORING: Object.freeze({
    // Slow request threshold (log warning)
    SLOW_REQUEST_MS: 3000, // 3 seconds

    // Very slow request threshold (log error)
    VERY_SLOW_REQUEST_MS: 10000, // 10 seconds

    // Database slow query threshold
    SLOW_QUERY_MS: 1000, // 1 second
  }),
});

/**
 * Get timeout configuration for current environment
 * @param {string} environment - NODE_ENV value
 * @returns {Object} Environment-specific timeout configuration
 */
function getTimeoutConfig(environment = process.env.NODE_ENV) {
  const isTest = environment === 'test';

  return {
    server: TIMEOUTS.SERVER,
    request: TIMEOUTS.REQUEST,
    database: isTest ? TIMEOUTS.DATABASE.TEST : {
      statementTimeoutMs: TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS,
      queryTimeoutMs: TIMEOUTS.DATABASE.QUERY_TIMEOUT_MS,
      connectionTimeoutMs: TIMEOUTS.DATABASE.CONNECTION_TIMEOUT_MS,
      idleTimeoutMs: TIMEOUTS.DATABASE.IDLE_TIMEOUT_MS,
    },
    services: TIMEOUTS.SERVICES,
    monitoring: TIMEOUTS.MONITORING,
  };
}

/**
 * Validate timeout hierarchy
 * Ensures inner timeouts are less than outer timeouts
 * @throws {Error} If timeout hierarchy is invalid
 */
function validateTimeoutHierarchy() {
  const errors = [];

  // Database < Request < Server
  if (TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS >= TIMEOUTS.REQUEST.DEFAULT_MS) {
    errors.push('Database timeout must be less than request timeout');
  }

  if (TIMEOUTS.REQUEST.DEFAULT_MS >= TIMEOUTS.SERVER.REQUEST_TIMEOUT_MS) {
    errors.push('Request timeout must be less than server timeout');
  }

  // Keep-alive > Request
  if (TIMEOUTS.SERVER.KEEP_ALIVE_TIMEOUT_MS <= TIMEOUTS.SERVER.REQUEST_TIMEOUT_MS) {
    errors.push('Keep-alive timeout must be greater than server request timeout');
  }

  // Headers > Keep-alive
  if (TIMEOUTS.SERVER.HEADERS_TIMEOUT_MS <= TIMEOUTS.SERVER.KEEP_ALIVE_TIMEOUT_MS) {
    errors.push('Headers timeout must be greater than keep-alive timeout');
  }

  // Health check < Request
  if (TIMEOUTS.SERVICES.HEALTH_CHECK_MS >= TIMEOUTS.REQUEST.DEFAULT_MS) {
    errors.push('Health check timeout must be less than request timeout');
  }

  if (errors.length > 0) {
    throw new Error(`Timeout hierarchy validation failed:\n${errors.join('\n')}`);
  }
}

// Validate on module load
validateTimeoutHierarchy();

module.exports = Object.freeze({
  TIMEOUTS,
  getTimeoutConfig,
  validateTimeoutHierarchy,
});
