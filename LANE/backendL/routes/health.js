/**
 * Health Check Routes
 *
 * Endpoints for monitoring system and database health
 */

const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireMinimumRole } = require('../middleware/auth');
const { logger } = require('../config/logger');

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Basic health check
 *     description: |
 *       Public endpoint for liveness probe. Checks database connectivity and returns server uptime.
 *       Use this for load balancer health checks and monitoring.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy]
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600.5
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 *                   description: Error message
 */
router.get('/', async (req, res) => {
  try {
    // Check database connectivity
    await db.raw('SELECT 1');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * @openapi
 * /api/health/databases:
 *   get:
 *     tags: [Health]
 *     summary: Detailed database health check (admin only)
 *     description: |
 *       Returns detailed health metrics for all database connections including:
 *       - Response time
 *       - Connection pool usage
 *       - Health status (healthy/degraded/critical)
 *
 *       Status thresholds:
 *       - Healthy: Response time < 100ms, connection usage < 80%
 *       - Degraded: Response time 100-500ms or connection usage 80-95%
 *       - Critical: Response time > 500ms or connection usage > 95%
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database health metrics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 databases:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "PostgreSQL (Main)"
 *                       status:
 *                         type: string
 *                         enum: [healthy, degraded, critical]
 *                       responseTime:
 *                         type: number
 *                         description: Query response time in milliseconds
 *                       connectionCount:
 *                         type: integer
 *                         description: Active connections
 *                       maxConnections:
 *                         type: integer
 *                         description: Maximum allowed connections
 *                       lastChecked:
 *                         type: string
 *                         format: date-time
 *                       errorMessage:
 *                         type: string
 *                         nullable: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Failed to retrieve database health
 */
router.get('/databases', authenticateToken, requireMinimumRole('admin'), async (req, res) => {
  try {
    const databases = [];

    // Main database health check
    const mainDbStart = Date.now();
    try {
      // Get connection pool stats from pg Pool
      const poolStats = db.pool;

      // Test query
      await db.query('SELECT 1');
      const responseTime = Date.now() - mainDbStart;

      // Get active connections count (pg Pool API)
      const connectionCount = poolStats.totalCount || 0;
      const maxConnections = poolStats.options?.max || 10;

      // Determine health status based on response time and connection usage
      let status = 'healthy';
      let errorMessage = null;

      if (responseTime > 500) {
        status = 'critical';
        errorMessage = `Slow response time: ${responseTime}ms`;
      } else if (responseTime > 100) {
        status = 'degraded';
        errorMessage = `Elevated response time: ${responseTime}ms`;
      }

      if (connectionCount / maxConnections > 0.8) {
        status =
          connectionCount / maxConnections > 0.95 ? 'critical' : 'degraded';
        errorMessage = errorMessage
          ? `${errorMessage}. High connection usage: ${connectionCount}/${maxConnections}`
          : `High connection usage: ${connectionCount}/${maxConnections}`;
      }

      databases.push({
        name: 'PostgreSQL (Main)',
        status,
        responseTime,
        connectionCount,
        maxConnections,
        lastChecked: new Date().toISOString(),
        errorMessage,
      });
    } catch (error) {
      logger.error('Main database health check failed:', error);
      databases.push({
        name: 'PostgreSQL (Main)',
        status: 'critical',
        responseTime: Date.now() - mainDbStart,
        connectionCount: 0,
        maxConnections: 0,
        lastChecked: new Date().toISOString(),
        errorMessage: error.message,
      });
    }

    res.json({
      databases,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve database health',
      message: error.message,
    });
  }
});

module.exports = router;
