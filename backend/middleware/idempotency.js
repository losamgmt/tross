/**
 * Idempotency Middleware
 *
 * SRP LITERALISM: ONLY handles idempotency key checking and caching
 *
 * PHILOSOPHY:
 * - OPTIONAL: No header = proceed normally (non-breaking)
 * - STRICT: Payload mismatch = 422 error (surface client bugs)
 * - TRANSPARENT: Cached responses match original (indistinguishable)
 * - COMPOSABLE: Uses IdempotencyService for storage; routes control save timing
 *
 * INTEGRATION:
 *   router.post('/', authenticateToken, checkIdempotency, ...)
 *   // At end of handler: await saveIdempotencyResponse(req, statusCode, responseBody)
 */

const IdempotencyService = require('../services/idempotency-service');
const { API_OPERATIONS } = require('../config/api-operations');
const ResponseFormatter = require('../utils/response-formatter');
const { logger } = require('../config/logger');

const { IDEMPOTENCY } = API_OPERATIONS;

/**
 * Check for existing idempotency response
 *
 * If key exists with same payload hash → return cached response
 * If key exists with different hash → 422 error (strict mode)
 * If no key or not found → proceed, attach context to req
 *
 * @returns {Function} Express middleware
 */
function checkIdempotency(req, res, next) {
  // Early exit: Only applies to mutations
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Extract idempotency key from header
  const key = req.get(IDEMPOTENCY.HEADER_NAME);

  // No key provided = proceed without idempotency
  if (!key) {
    return next();
  }

  // Validate key format
  try {
    IdempotencyService.validateKey(key);
  } catch (error) {
    return ResponseFormatter.badRequest(res, error.message, [
      { field: IDEMPOTENCY.HEADER_NAME, message: error.message },
    ]);
  }

  // Build context for storage (computed once, used if key not found)
  const userId = req.dbUser?.id || req.user?.userId;

  // Guard: idempotency requires authenticated user
  if (!userId) {
    return ResponseFormatter.badRequest(
      res,
      'Idempotency-Key requires authenticated user',
      [{ field: IDEMPOTENCY.HEADER_NAME, message: 'User ID not available' }],
    );
  }

  const bodyHash = IdempotencyService.hashBody(req.body);

  // Async lookup
  IdempotencyService.find(key, userId)
    .then((existing) => {
      if (!existing) {
        // Key not found - attach context for later storage
        req.idempotencyContext = {
          key,
          userId,
          method: req.method,
          path: req.originalUrl,
          bodyHash,
        };
        return next();
      }

      // Key found - check payload match
      if (
        IDEMPOTENCY.STRICT_PAYLOAD_MATCH &&
        existing.request_body_hash !== bodyHash
      ) {
        logger.warn('[Idempotency] Payload mismatch', {
          key,
          userId,
          expectedHash: existing.request_body_hash,
          receivedHash: bodyHash,
        });

        // 422 Unprocessable Entity - same key, different payload
        // Shape matches ResponseFormatter pattern for consistency
        return res.status(IDEMPOTENCY.STATUS_CONFLICT).json({
          success: false,
          error: 'Unprocessable Entity',
          message: 'Idempotency key already used with different request body',
          code: 'IDEMPOTENCY_MISMATCH',
          timestamp: new Date().toISOString(),
        });
      }

      // Key found, payload matches - return cached response
      logger.debug('[Idempotency] Returning cached response', {
        key,
        userId,
        cachedStatus: existing.response_status,
      });

      return res.status(existing.response_status).json(existing.response_body);
    })
    .catch(next);
}

/**
 * Save response for future idempotency lookups
 *
 * Call this at the END of mutation handlers, BEFORE sending response.
 * Only saves if idempotency key was provided in request.
 *
 * @param {Object} req - Express request (with idempotencyContext)
 * @param {number} statusCode - HTTP status code to cache
 * @param {Object} responseBody - Response body to cache
 * @returns {Promise<void>}
 *
 * @example
 *   const result = await GenericEntityService.create(...);
 *   await saveIdempotencyResponse(req, 201, { success: true, data: result });
 *   return ResponseFormatter.created(res, result);
 */
async function saveIdempotencyResponse(req, statusCode, responseBody) {
  const context = req.idempotencyContext;

  // No idempotency key was provided - nothing to save
  if (!context) {
    return;
  }

  try {
    await IdempotencyService.store({
      key: context.key,
      userId: context.userId,
      method: context.method,
      path: context.path,
      bodyHash: context.bodyHash,
      statusCode,
      responseBody,
    });
  } catch (error) {
    // Log but don't fail the request - idempotency storage is best-effort
    logger.error('[Idempotency] Failed to store response', {
      key: context.key,
      userId: context.userId,
      error: error.message,
    });
  }
}

module.exports = {
  checkIdempotency,
  saveIdempotencyResponse,
};
