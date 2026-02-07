/**
 * Health Check Routes
 *
 * Production-grade health monitoring endpoints following Kubernetes probe patterns:
 * - GET /health - Liveness probe (public, cached)
 * - GET /health/ready - Readiness probe (public, uncached)
 * - GET /health/databases - Detailed DB health (admin only)
 *
 * FEATURES:
 * - Response caching (10s TTL) to prevent DB hammering
 * - Status classification (healthy/degraded/critical)
 * - Auth0 connectivity check in readiness probe
 * - Connection pool monitoring
 * - Memory threshold alerts
 *
 * ARCHITECTURE:
 * - Constants from config/constants.js (HEALTH thresholds)
 * - Timeouts from config/timeouts.js (SERVICES.HEALTH_CHECK_MS)
 * - ResponseFormatter for consistent responses
 * - Logger for structured logging
 */

const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../db/connection");
const { authenticateToken, requireMinimumRole } = require("../middleware/auth");
const { logger } = require("../config/logger");
const { HEALTH } = require("../config/constants");
const { TIMEOUTS } = require("../config/timeouts");
const auth0Config = require("../config/auth0");
const ResponseFormatter = require("../utils/response-formatter");
const { asyncHandler } = require("../middleware/utils");
const { storageService } = require("../services/storage-service");
// ServiceUnavailableError available if needed: const { ServiceUnavailableError } = require('../utils/errors');

// ============================================================================
// CACHE LAYER (SRP: Simple in-memory cache for health responses)
// ============================================================================

/**
 * In-memory cache for health check responses
 * Prevents DB hammering from aggressive health checks
 * TTL: 10 seconds (from HEALTH.CACHE_TTL_MS)
 */
const healthCache = {
  liveness: null,
  livenessTimestamp: 0,
};

/**
 * Check if cached response is still valid
 * @param {number} timestamp - Cache timestamp
 * @returns {boolean} True if cache is still valid
 */
function isCacheValid(timestamp) {
  return Date.now() - timestamp < HEALTH.CACHE_TTL_MS;
}

/**
 * Clear the health cache (for testing purposes)
 * Exported so tests can reset state between test cases
 */
function clearCache() {
  healthCache.liveness = null;
  healthCache.livenessTimestamp = 0;
}

/**
 * Sanitize error message for external exposure
 * Prevents leaking internal details (DB connection strings, paths, etc.)
 * @param {Error} error - The error object
 * @returns {string} Safe error message
 */
function sanitizeErrorMessage(error) {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    // In dev/test, show full error for debugging
    return error.message;
  }

  // In production, only expose safe categories
  const msg = error.message?.toLowerCase() || "";
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "Connection timeout";
  }
  if (msg.includes("connection") || msg.includes("connect")) {
    return "Connection failed";
  }
  if (msg.includes("authentication") || msg.includes("auth")) {
    return "Authentication error";
  }
  // Generic fallback - never expose raw error
  return "Service unavailable";
}

// ============================================================================
// HEALTH CHECK HELPERS (SRP: Pure functions for health determination)
// ============================================================================

/**
 * Check database connectivity and measure response time
 * @returns {Promise<Object>} Database health status
 */
async function checkDatabase() {
  const start = Date.now();
  try {
    await Promise.race([
      db.query("SELECT 1"),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Database timeout")),
          TIMEOUTS.SERVICES.HEALTH_CHECK_MS,
        ),
      ),
    ]);

    const responseTime = Date.now() - start;
    const poolStats = db.pool;
    const connectionCount = poolStats?.totalCount || 0;
    const maxConnections = poolStats?.options?.max || 10;
    const poolUsage = connectionCount / maxConnections;

    // Determine status based on thresholds
    let status = HEALTH.STATUS.HEALTHY;
    let message = null;

    if (responseTime > HEALTH.THRESHOLDS.DB_CRITICAL_MS) {
      status = HEALTH.STATUS.CRITICAL;
      message = `Slow response: ${responseTime}ms`;
    } else if (responseTime > HEALTH.THRESHOLDS.DB_DEGRADED_MS) {
      status = HEALTH.STATUS.DEGRADED;
      message = `Elevated response: ${responseTime}ms`;
    }

    if (poolUsage > HEALTH.THRESHOLDS.POOL_CRITICAL_PERCENT) {
      status = HEALTH.STATUS.CRITICAL;
      message = message
        ? `${message}; Pool exhaustion: ${Math.round(poolUsage * 100)}%`
        : `Pool exhaustion: ${Math.round(poolUsage * 100)}%`;
    } else if (poolUsage > HEALTH.THRESHOLDS.POOL_DEGRADED_PERCENT) {
      if (status !== HEALTH.STATUS.CRITICAL) {
        status = HEALTH.STATUS.DEGRADED;
      }
      message = message
        ? `${message}; High pool usage: ${Math.round(poolUsage * 100)}%`
        : `High pool usage: ${Math.round(poolUsage * 100)}%`;
    }

    return {
      connected: true,
      status,
      responseTime,
      connectionCount,
      maxConnections,
      message,
    };
  } catch (error) {
    return {
      connected: false,
      status: HEALTH.STATUS.CRITICAL,
      responseTime: Date.now() - start,
      connectionCount: 0,
      maxConnections: 0,
      message: sanitizeErrorMessage(error),
    };
  }
}

/**
 * Check Auth0 connectivity (for readiness probe)
 * Verifies Auth0 domain is reachable via JWKS endpoint
 * @returns {Promise<Object>} Auth0 health status
 */
async function checkAuth0() {
  // Skip if Auth0 not configured (dev mode)
  if (!auth0Config.domain) {
    return {
      configured: false,
      status: HEALTH.STATUS.HEALTHY,
      message: "Auth0 not configured (development mode)",
    };
  }

  const start = Date.now();
  try {
    const jwksUrl = `https://${auth0Config.domain}/.well-known/jwks.json`;
    await axios.get(jwksUrl, {
      timeout: TIMEOUTS.SERVICES.HEALTH_CHECK_MS,
    });

    return {
      configured: true,
      reachable: true,
      status: HEALTH.STATUS.HEALTHY,
      responseTime: Date.now() - start,
    };
  } catch (error) {
    logger.warn("Auth0 health check failed", {
      domain: auth0Config.domain,
      error: error.message,
    });

    return {
      configured: true,
      reachable: false,
      status: HEALTH.STATUS.CRITICAL,
      responseTime: Date.now() - start,
      message: sanitizeErrorMessage(error),
    };
  }
}

/**
 * Get memory usage metrics with status
 * @returns {Object} Memory metrics with status
 */
function getMemoryMetrics() {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

  let status = HEALTH.STATUS.HEALTHY;
  if (heapUsedMB > HEALTH.THRESHOLDS.MEMORY_CRITICAL_MB) {
    status = HEALTH.STATUS.CRITICAL;
  } else if (heapUsedMB > HEALTH.THRESHOLDS.MEMORY_DEGRADED_MB) {
    status = HEALTH.STATUS.DEGRADED;
  }

  return {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapUsed: heapUsedMB,
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    status,
  };
}

/**
 * Get storage configuration status (no network call)
 * Used in readiness probe to verify storage is configured
 * @returns {Object} Storage configuration status
 */
function getStorageConfiguration() {
  const config = storageService.getConfigurationInfo();
  return {
    configured: config.configured,
    provider: config.provider,
    status: config.configured ? HEALTH.STATUS.HEALTHY : HEALTH.STATUS.DEGRADED,
  };
}

/**
 * Deep storage health check (makes network call to R2)
 * Used in /health/storage admin endpoint
 * @returns {Promise<Object>} Storage health status with connectivity info
 */
async function checkStorage() {
  const result = await storageService.healthCheck(
    TIMEOUTS.SERVICES.HEALTH_CHECK_MS,
  );

  // Map storage status to HEALTH.STATUS constants
  let status;
  if (result.status === "healthy") {
    status = HEALTH.STATUS.HEALTHY;
  } else if (result.status === "unconfigured") {
    status = HEALTH.STATUS.DEGRADED;
  } else {
    status = HEALTH.STATUS.CRITICAL;
  }

  return {
    ...result,
    status,
  };
}
/**
 * Determine overall system status from component statuses
 * @param  {...string} statuses - Component status values
 * @returns {string} Overall status (healthy, degraded, or critical)
 */
function determineOverallStatus(...statuses) {
  if (statuses.includes(HEALTH.STATUS.CRITICAL)) {
    return HEALTH.STATUS.CRITICAL;
  }
  if (statuses.includes(HEALTH.STATUS.DEGRADED)) {
    return HEALTH.STATUS.DEGRADED;
  }
  return HEALTH.STATUS.HEALTHY;
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe (cached)
 *     description: |
 *       Public endpoint for liveness probe. Cached for 10 seconds.
 *       Use for load balancer health checks.
 *
 *       Returns: status, uptime, database connectivity, memory metrics
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // Check cache first
    if (healthCache.liveness && isCacheValid(healthCache.livenessTimestamp)) {
      return ResponseFormatter.get(res, healthCache.liveness);
    }

    // Perform health checks
    const database = await checkDatabase();
    const memory = getMemoryMetrics();
    const overallStatus = determineOverallStatus(
      database.status,
      memory.status,
    );

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      cached: false,
      database: {
        connected: database.connected,
        responseTime: database.responseTime,
        status: database.status,
      },
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        status: memory.status,
      },
      nodeVersion: process.version,
    };

    // Cache the response
    healthCache.liveness = { ...response, cached: true };
    healthCache.livenessTimestamp = Date.now();

    // Return 503 if critical (business logic, not error)
    if (overallStatus === HEALTH.STATUS.CRITICAL) {
      return ResponseFormatter.serviceUnavailable(
        res,
        "Service health critical",
        response,
      );
    }

    return ResponseFormatter.get(res, response);
  }),
);

/**
 * @openapi
 * /api/health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe (uncached)
 *     description: |
 *       Public endpoint for readiness probe. NOT cached - always live.
 *       Checks if service is ready to accept traffic:
 *       - Database must be connected
 *       - Auth0 must be reachable (if configured)
 *       - Storage configuration status (no network call)
 *
 *       Use for Kubernetes readiness probes.
 *     responses:
 *       200:
 *         description: Service is ready to accept traffic
 *       503:
 *         description: Service is not ready
 */
router.get(
  "/ready",
  asyncHandler(async (req, res) => {
    // Run checks in parallel (uncached - always live)
    const [database, auth0] = await Promise.all([
      checkDatabase(),
      checkAuth0(),
    ]);

    const storage = getStorageConfiguration();
    const overallStatus = determineOverallStatus(database.status, auth0.status);
    const ready =
      database.connected &&
      (auth0.status !== HEALTH.STATUS.CRITICAL || !auth0.configured);

    const response = {
      ready,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          connected: database.connected,
          status: database.status,
          responseTime: database.responseTime,
        },
        auth0: {
          configured: auth0.configured,
          reachable: auth0.reachable,
          status: auth0.status,
          responseTime: auth0.responseTime,
        },
        storage: {
          configured: storage.configured,
          provider: storage.provider,
          status: storage.status,
        },
      },
    };

    // Return 503 if not ready (business logic, not error)
    if (!ready) {
      return ResponseFormatter.serviceUnavailable(
        res,
        "Service not ready",
        response,
      );
    }

    return ResponseFormatter.get(res, response);
  }),
);

/**
 * @openapi
 * /api/health/databases:
 *   get:
 *     tags: [Health]
 *     summary: Detailed database health (admin only)
 *     description: |
 *       Returns detailed health metrics for database connections.
 *       Requires admin authentication.
 *
 *       Includes: response time, connection pool usage, status thresholds
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Database health metrics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get(
  "/databases",
  authenticateToken,
  requireMinimumRole("admin"),
  asyncHandler(async (req, res) => {
    const database = await checkDatabase();

    const databases = [
      {
        name: "PostgreSQL (Main)",
        status: database.status,
        responseTime: database.responseTime,
        connectionCount: database.connectionCount,
        maxConnections: database.maxConnections,
        poolUsage: `${Math.round((database.connectionCount / database.maxConnections) * 100)}%`,
        lastChecked: new Date().toISOString(),
        message: database.message,
        thresholds: {
          degradedMs: HEALTH.THRESHOLDS.DB_DEGRADED_MS,
          criticalMs: HEALTH.THRESHOLDS.DB_CRITICAL_MS,
          degradedPoolPercent: `${Math.round(HEALTH.THRESHOLDS.POOL_DEGRADED_PERCENT * 100)}%`,
          criticalPoolPercent: `${Math.round(HEALTH.THRESHOLDS.POOL_CRITICAL_PERCENT * 100)}%`,
        },
      },
    ];

    ResponseFormatter.get(res, { databases });
  }),
);

/**
 * @openapi
 * /api/health/storage:
 *   get:
 *     tags: [Health]
 *     summary: Deep storage health check (admin only)
 *     description: |
 *       Performs a deep health check on the R2/S3 storage backend.
 *       Actually pings the storage bucket to verify connectivity.
 *       Requires admin authentication.
 *
 *       Includes: bucket name, reachability, response time, provider info
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Storage is healthy and reachable
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       503:
 *         description: Storage is not reachable or not configured
 */
router.get(
  "/storage",
  authenticateToken,
  requireMinimumRole("admin"),
  asyncHandler(async (req, res) => {
    const storage = await checkStorage();

    const response = {
      storage: {
        configured: storage.configured,
        reachable: storage.reachable,
        bucket: storage.bucket,
        provider: process.env.STORAGE_PROVIDER || "none",
        status: storage.status,
        responseTime: storage.responseTime,
        message: storage.message,
        lastChecked: new Date().toISOString(),
      },
    };

    // Return 503 if storage not reachable (but only if configured)
    if (storage.configured && !storage.reachable) {
      return ResponseFormatter.serviceUnavailable(
        res,
        "Storage not reachable",
        response,
      );
    }

    // Return 503 if not configured (informational, not an error per se)
    if (!storage.configured) {
      return ResponseFormatter.serviceUnavailable(
        res,
        "Storage not configured",
        response,
      );
    }

    ResponseFormatter.get(res, response);
  }),
);

// Export router and helper functions
module.exports = router;

// Export helpers for testing (attached to router to maintain single export)
module.exports.clearCache = clearCache;
module.exports.checkDatabase = checkDatabase;
module.exports.checkAuth0 = checkAuth0;
module.exports.getMemoryMetrics = getMemoryMetrics;
module.exports.getStorageConfiguration = getStorageConfiguration;
module.exports.checkStorage = checkStorage;
