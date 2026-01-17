/**
 * Stats Routes
 *
 * Aggregation endpoints for dashboard and reporting:
 * - GET /stats/:entity - Count records
 * - GET /stats/:entity/grouped/:field - Count grouped by field
 * - GET /stats/:entity/sum/:field - Sum a numeric field
 *
 * FEATURES:
 * - RLS enforcement (users only see stats for records they can access)
 * - Permission checking (requires read access to entity)
 * - Metadata validation (only allowed fields for grouping/summing)
 *
 * ARCHITECTURE:
 * - Uses StatsService for all aggregation logic
 * - Uses unified middleware (requirePermission/enforceRLS read from req.entityMetadata)
 * - ResponseFormatter for consistent responses
 */

const express = require('express');
const router = express.Router();
const StatsService = require('../services/stats-service');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const { extractEntity } = require('../middleware/generic-entity');
const ResponseFormatter = require('../utils/response-formatter');
const { logger } = require('../config/logger');

// ============================================================================
// MIDDLEWARE CHAIN (unified pattern)
// ============================================================================

/**
 * Common middleware for all stats routes:
 * 1. Authenticate user
 * 2. Extract entity name from URL (sets req.entityMetadata)
 * 3. Check read permission (reads from req.entityMetadata.rlsResource)
 * 4. Setup RLS context (reads from req.entityMetadata.rlsResource)
 */
const statsMiddleware = [
  authenticateToken,
  extractEntity,
  requirePermission('read'),
  enforceRLS,
];

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /stats/:entity
 *
 * Count records for an entity, respecting RLS.
 *
 * Query params:
 *   - Any filterable field (e.g., ?status=pending)
 *
 * @example GET /api/stats/work_order?status=pending
 * @returns { success: true, data: { count: 42 } }
 */
router.get('/:entity', statsMiddleware, async (req, res, next) => {
  try {
    const entityName = req.entityName;
    const filters = req.query || {};

    // Remove pagination params if present (not used for stats)
    delete filters.page;
    delete filters.limit;
    delete filters.sort;
    delete filters.order;
    delete filters.search;

    const count = await StatsService.count(entityName, req, filters);

    return ResponseFormatter.get(res, { count });
  } catch (error) {
    logger.error('[Stats] Count failed', { entity: req.params.entity, error: error.message });
    next(error);
  }
});

/**
 * GET /stats/:entity/grouped/:field
 *
 * Count records grouped by a field.
 *
 * @example GET /api/stats/work_order/grouped/status
 * @returns { success: true, data: [{ value: 'pending', count: 5 }, ...] }
 */
router.get('/:entity/grouped/:field', statsMiddleware, async (req, res, next) => {
  try {
    const entityName = req.entityName;
    const groupByField = req.params.field;
    const filters = req.query || {};

    // Remove non-filter params
    delete filters.page;
    delete filters.limit;
    delete filters.sort;
    delete filters.order;
    delete filters.search;

    const grouped = await StatsService.countGrouped(entityName, req, groupByField, filters);

    return ResponseFormatter.get(res, grouped);
  } catch (error) {
    logger.error('[Stats] Grouped count failed', {
      entity: req.params.entity,
      field: req.params.field,
      error: error.message,
    });

    // Handle validation errors nicely
    if (error.message.includes('not a filterable field')) {
      return ResponseFormatter.badRequest(res, error.message);
    }
    next(error);
  }
});

/**
 * GET /stats/:entity/sum/:field
 *
 * Sum a numeric field.
 *
 * @example GET /api/stats/invoice/sum/total?status=paid
 * @returns { success: true, data: { sum: 12500.50 } }
 */
router.get('/:entity/sum/:field', statsMiddleware, async (req, res, next) => {
  try {
    const entityName = req.entityName;
    const sumField = req.params.field;
    const filters = req.query || {};

    // Remove non-filter params
    delete filters.page;
    delete filters.limit;
    delete filters.sort;
    delete filters.order;
    delete filters.search;

    const sum = await StatsService.sum(entityName, req, sumField, filters);

    return ResponseFormatter.get(res, { sum });
  } catch (error) {
    logger.error('[Stats] Sum failed', {
      entity: req.params.entity,
      field: req.params.field,
      error: error.message,
    });
    next(error);
  }
});

module.exports = router;
