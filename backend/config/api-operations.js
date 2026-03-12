/**
 * API Operations Configuration
 * Single Source of Truth for bulk/batch/idempotency settings
 *
 * ARCHITECTURE:
 * Layer 1: Idempotency - Retry-safe mutations
 * Layer 2: Batch Operations - Bulk CRUD
 *
 * RATIONALE:
 * - Both concern "operation semantics" beyond simple CRUD
 * - Distinct from rate-limiting (resource protection)
 * - Distinct from timeouts (response timing)
 * - Related to each other: batch operations need idempotency
 *
 * BEST PRACTICES:
 * - Idempotency TTL should exceed longest expected retry window (24h standard)
 * - Batch limits balance throughput vs. timeout risk
 * - Max operations × avg operation time < TIMEOUTS.REQUEST.LONG_RUNNING_MS
 */

const API_OPERATIONS = Object.freeze({
  /**
   * IDEMPOTENCY CONFIGURATION
   * Prevents duplicate mutations from network retries or double-submits
   */
  IDEMPOTENCY: Object.freeze({
    // Header name (RFC convention: X-Idempotency-Key or Idempotency-Key)
    HEADER_NAME: 'Idempotency-Key',

    // Maximum key length (prevents abuse, sufficient for UUIDs)
    MAX_KEY_LENGTH: 255,

    // Time-to-live for stored keys (milliseconds)
    // Industry standard: 24 hours (Stripe, AWS, etc.)
    TTL_MS: 24 * 60 * 60 * 1000,

    // Key format requirements (alphanumeric, hyphens, underscores)
    // Note: Length validated separately via MAX_KEY_LENGTH (SSOT)
    KEY_PATTERN: /^[\w-]+$/,

    // Behavior on payload mismatch (same key, different body)
    // true = strict (422 error), false = return cached (permissive)
    STRICT_PAYLOAD_MATCH: true,

    // HTTP status for idempotency violations
    STATUS_CONFLICT: 422,
  }),

  /**
   * BATCH OPERATIONS CONFIGURATION
   * Controls bulk create/update/delete operations
   */
  BATCH: Object.freeze({
    // Maximum operations in single batch request
    // Balance: More = faster bulk imports, but longer transaction time
    // Formula: MAX_OPERATIONS × avg_op_time < 90s (LONG_RUNNING timeout)
    MAX_OPERATIONS: 100,

    // Whether to allow mixed operations (create + update + delete in one batch)
    // true = flexible, false = must be same operation type
    ALLOW_MIXED_OPERATIONS: true,

    // Default atomicity mode
    // false = all-or-nothing (transactional)
    // true = partial success (continue after errors)
    DEFAULT_CONTINUE_ON_ERROR: false,

    // Valid operation types
    OPERATIONS: Object.freeze(['create', 'update', 'delete']),

    // HTTP status codes
    STATUS_SUCCESS: 200, // All operations succeeded
    STATUS_MULTI_STATUS: 207, // Partial success (continueOnError=true)
    STATUS_BAD_REQUEST: 400, // Invalid batch structure
  }),

  /**
   * BACKGROUND TASKS CONFIGURATION
   * In-process scheduled maintenance tasks
   */
  BACKGROUND_TASKS: Object.freeze({
    // Whether to run background tasks (disabled in test mode)
    ENABLED: process.env.NODE_ENV !== 'test',

    // Cleanup intervals (milliseconds)
    INTERVALS: Object.freeze({
      // Idempotency key cleanup - run every hour
      // Keys have 24h TTL, hourly cleanup keeps table size bounded
      IDEMPOTENCY_CLEANUP_MS: 60 * 60 * 1000, // 1 hour

      // Expired refresh token cleanup - run every 6 hours
      // Tokens expire individually, periodic cleanup prevents table bloat
      TOKEN_CLEANUP_MS: 6 * 60 * 60 * 1000, // 6 hours
    }),
  }),
});

module.exports = { API_OPERATIONS };
