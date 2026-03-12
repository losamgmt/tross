/**
 * Idempotency Service
 *
 * SRP LITERALISM: ONLY manages idempotency key storage and lookup
 *
 * PHILOSOPHY:
 * - SCOPED: Keys are per-user (prevents cross-user collision)
 * - STRICT: Payload mismatch = explicit error (configurable)
 * - TRANSPARENT: Cached responses are indistinguishable from fresh
 * - COMPOSABLE: Pure CRUD on idempotency_keys table; middleware handles HTTP
 *
 * USAGE:
 *   const existing = await IdempotencyService.find(key, userId);
 *   if (existing) return existing.response_body;
 *
 *   // ... execute operation ...
 *
 *   await IdempotencyService.store({ key, userId, ... });
 */

const db = require('../db/connection');
const { logger } = require('../config/logger');
const { API_OPERATIONS } = require('../config/api-operations');
const AppError = require('../utils/app-error');
const crypto = require('crypto');

const { IDEMPOTENCY } = API_OPERATIONS;

/**
 * Calculate TTL cutoff timestamp for queries
 * SRP: ONLY computes the cutoff time
 * @private
 */
function getTtlCutoff() {
  return new Date(Date.now() - IDEMPOTENCY.TTL_MS);
}

class IdempotencyService {
  /**
   * Hash request body for comparison
   * SRP: ONLY produces deterministic hash of request body
   *
   * @param {Object} body - Request body
   * @returns {string} SHA-256 hash (hex)
   */
  static hashBody(body) {
    const normalized = JSON.stringify(body || {});
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Validate idempotency key format
   * SRP: ONLY validates key format
   *
   * @param {string} key - Idempotency key
   * @throws {AppError} If key format is invalid
   */
  static validateKey(key) {
    if (!key || typeof key !== 'string') {
      throw new AppError(
        'Idempotency key must be a non-empty string',
        400,
        'BAD_REQUEST',
      );
    }

    if (key.length > IDEMPOTENCY.MAX_KEY_LENGTH) {
      throw new AppError(
        `Idempotency key exceeds maximum length of ${IDEMPOTENCY.MAX_KEY_LENGTH}`,
        400,
        'BAD_REQUEST',
      );
    }

    if (!IDEMPOTENCY.KEY_PATTERN.test(key)) {
      throw new AppError(
        'Idempotency key must contain only alphanumeric characters, hyphens, and underscores',
        400,
        'BAD_REQUEST',
      );
    }
  }

  /**
   * Find existing idempotency record
   * SRP: ONLY retrieves stored record by key + user
   *
   * @param {string} key - Idempotency key
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Stored record or null
   */
  static async find(key, userId) {
    const query = `
      SELECT 
        idempotency_key,
        request_body_hash,
        response_status,
        response_body,
        created_at
      FROM idempotency_keys
      WHERE idempotency_key = $1 
        AND user_id = $2
        AND created_at > $3
    `;

    const result = await db.query(query, [key, userId, getTtlCutoff()]);
    return result.rows[0] || null;
  }

  /**
   * Store idempotency record
   * SRP: ONLY persists new record
   *
   * @param {Object} params - Storage parameters
   * @param {string} params.key - Idempotency key
   * @param {number} params.userId - User ID
   * @param {string} params.method - HTTP method
   * @param {string} params.path - Request path
   * @param {string} params.bodyHash - Hash of request body
   * @param {number} params.statusCode - Response status code
   * @param {Object} params.responseBody - Response body to cache
   * @returns {Promise<void>}
   */
  static async store({
    key,
    userId,
    method,
    path,
    bodyHash,
    statusCode,
    responseBody,
  }) {
    const query = `
      INSERT INTO idempotency_keys (
        idempotency_key, user_id, request_method, request_path,
        request_body_hash, response_status, response_body
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (idempotency_key, user_id) DO NOTHING
    `;

    await db.query(query, [
      key,
      userId,
      method,
      path,
      bodyHash,
      statusCode,
      responseBody,
    ]);

    logger.debug('[IdempotencyService.store] Stored idempotency record', {
      key,
      userId,
      method,
      path,
      statusCode,
    });
  }

  /**
   * Cleanup expired keys
   * SRP: ONLY removes expired records
   * Called by scheduled job or manually during maintenance
   *
   * @returns {Promise<number>} Number of records deleted
   */
  static async cleanup() {
    const query = `
      DELETE FROM idempotency_keys
      WHERE created_at < $1
    `;

    const result = await db.query(query, [getTtlCutoff()]);
    const deleted = result.rowCount;

    if (deleted > 0) {
      logger.info('[IdempotencyService.cleanup] Removed expired keys', {
        deleted,
      });
    }

    return deleted;
  }
}

module.exports = IdempotencyService;
