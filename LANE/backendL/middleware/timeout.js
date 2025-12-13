/**
 * Request Timeout Middleware
 * Provides graceful request timeout handling with monitoring
 *
 * FEATURES:
 * - Configurable timeout per route
 * - Graceful error responses before server timeout
 * - Request duration tracking and logging
 * - Slow request detection and alerting
 * - Integration with existing logger
 *
 * USAGE:
 *   const { requestTimeout, timeoutHandler } = require('./middleware/timeout');
 *
 *   // Default 30s timeout
 *   app.use(requestTimeout());
 *
 *   // Custom timeout for specific route
 *   router.get('/long-operation', requestTimeout(90000), handler);
 *
 *   // Quick operations
 *   router.get('/health', requestTimeout(5000), handler);
 *
 *   // Must add timeout handler BEFORE error handler
 *   app.use(timeoutHandler);
 */

const { logger } = require('../config/logger');
const { HTTP_STATUS } = require('../config/constants');
const { TIMEOUTS } = require('../config/timeouts');

/**
 * Request timeout middleware
 * Attaches timeout tracking to request and triggers timeout if exceeded
 *
 * @param {number} timeoutMs - Timeout duration in milliseconds
 * @param {Object} options - Configuration options
 * @param {boolean} options.logSlowRequests - Log slow requests (default: true)
 * @param {Function} options.onTimeout - Custom timeout handler
 * @returns {Function} Express middleware
 */
function requestTimeout(timeoutMs = TIMEOUTS.REQUEST.DEFAULT_MS, options = {}) {
  const {
    logSlowRequests = true,
    onTimeout = null,
  } = options;

  return (req, res, next) => {
    // Skip if already timed out
    if (req.timedout) {
      return next();
    }

    // Track request start time for duration measurement
    req.startTime = Date.now();
    req.timeoutMs = timeoutMs;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      // Mark request as timed out
      req.timedout = true;

      // Calculate actual duration
      const duration = Date.now() - req.startTime;

      // Log timeout with context
      logger.warn('Request timeout', {
        method: req.method,
        path: req.path,
        url: req.originalUrl,
        timeoutMs,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id || null,
      });

      // Call custom timeout handler if provided
      if (onTimeout && typeof onTimeout === 'function') {
        try {
          onTimeout(req, res);
        } catch (error) {
          logger.error('Custom timeout handler error', { error: error.message });
        }
      }

      // Don't send response if headers already sent
      if (res.headersSent) {
        return;
      }

      // Send timeout response
      res.status(HTTP_STATUS.REQUEST_TIMEOUT).json({
        error: 'Request Timeout',
        message: `Request exceeded ${timeoutMs / 1000} second timeout`,
        timeout: timeoutMs,
        duration,
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timeoutId);

      // Log slow requests
      if (logSlowRequests && !req.timedout) {
        const duration = Date.now() - req.startTime;

        if (duration >= TIMEOUTS.MONITORING.VERY_SLOW_REQUEST_MS) {
          logger.error('Very slow request detected', {
            method: req.method,
            path: req.path,
            url: req.originalUrl,
            duration,
            threshold: TIMEOUTS.MONITORING.VERY_SLOW_REQUEST_MS,
            userId: req.user?.id || null,
          });
        } else if (duration >= TIMEOUTS.MONITORING.SLOW_REQUEST_MS) {
          logger.warn('Slow request detected', {
            method: req.method,
            path: req.path,
            url: req.originalUrl,
            duration,
            threshold: TIMEOUTS.MONITORING.SLOW_REQUEST_MS,
            userId: req.user?.id || null,
          });
        }
      }
    });

    // Clear timeout on connection close
    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
}

/**
 * Timeout handler middleware
 * Catches timed out requests and prevents further processing
 * Must be placed BEFORE the global error handler
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function timeoutHandler(req, res, next) {
  if (!req.timedout) {
    return next();
  }

  // Request already timed out, skip all subsequent middleware
  // Response should have been sent by requestTimeout middleware
  if (!res.headersSent) {
    const duration = Date.now() - (req.startTime || Date.now());
    res.status(HTTP_STATUS.REQUEST_TIMEOUT).json({
      error: 'Request Timeout',
      message: 'Request processing was terminated due to timeout',
      timeout: req.timeoutMs || TIMEOUTS.REQUEST.DEFAULT_MS,
      duration,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Quick operation timeout (5s)
 * For health checks, simple queries, status endpoints
 */
function quickTimeout() {
  return requestTimeout(TIMEOUTS.REQUEST.QUICK_MS, {
    logSlowRequests: true,
  });
}

/**
 * Long operation timeout (90s)
 * For reports, exports, batch operations
 */
function longTimeout() {
  return requestTimeout(TIMEOUTS.REQUEST.LONG_RUNNING_MS, {
    logSlowRequests: true,
  });
}

/**
 * Get request duration in milliseconds
 * @param {Object} req - Express request
 * @returns {number} Duration in milliseconds
 */
function getRequestDuration(req) {
  if (!req.startTime) {
    return 0;
  }
  return Date.now() - req.startTime;
}

/**
 * Check if request is approaching timeout
 * Useful for long-running operations to bail out early
 *
 * @param {Object} req - Express request
 * @param {number} bufferMs - Buffer time in milliseconds (default: 1000ms)
 * @returns {boolean} True if timeout is imminent
 */
function isTimeoutImminent(req, bufferMs = 1000) {
  if (!req.startTime || !req.timeoutMs) {
    return false;
  }
  const elapsed = Date.now() - req.startTime;
  return elapsed >= (req.timeoutMs - bufferMs);
}

/**
 * Get remaining time before timeout
 * @param {Object} req - Express request
 * @returns {number} Remaining milliseconds (0 if no timeout set or already exceeded)
 */
function getRemainingTime(req) {
  if (!req.startTime || !req.timeoutMs) {
    return Infinity;
  }
  const elapsed = Date.now() - req.startTime;
  const remaining = req.timeoutMs - elapsed;
  return Math.max(0, remaining);
}

module.exports = {
  requestTimeout,
  timeoutHandler,
  quickTimeout,
  longTimeout,
  getRequestDuration,
  isTimeoutImminent,
  getRemainingTime,
};
