/**
 * Audit Log Routes - Exposes audit trail endpoints
 *
 * SINGLE module for audit log read operations.
 * Write operations are handled internally by audit-service (no external API).
 *
 * Endpoints:
 * - GET /api/audit/all - Get all recent audit logs (admin only)
 * - GET /api/audit/user/:userId - Get audit trail for a specific user (admin only)
 * - GET /api/audit/:resourceType/:resourceId - Get audit trail for a specific resource
 *
 * ROUTE ORDER MATTERS: Specific routes (/all, /user/:id) must come BEFORE catch-all (/:type/:id)
 *
 * UNIFIED DATA FLOW:
 * - requirePermission(operation) reads resource from req.entityMetadata.rlsResource
 * - attachEntity middleware sets req.entityMetadata at factory time
 *
 * All endpoints require authentication and appropriate permissions.
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { attachEntity } = require('../middleware/generic-entity');
const { validateIdParam, validatePagination } = require('../validators');
const auditService = require('../services/audit-service');
const ResponseFormatter = require('../utils/response-formatter');
const AppError = require('../utils/app-error');
const allMetadata = require('../config/models');
const { asyncHandler } = require('../middleware/utils');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format audit log dates for frontend consumption
 * Converts Date objects to ISO strings for consistent JSON serialization
 *
 * @param {Array} logs - Array of audit log entries
 * @returns {Array} Logs with formatted dates
 */
function formatAuditLogDates(logs) {
  return logs.map(log => ({
    ...log,
    created_at: log.created_at?.toISOString(),
  }));
}

// ============================================================================
// SPECIFIC ROUTES FIRST (before catch-all patterns)
// ============================================================================

/**
 * GET /api/audit/all
 *
 * Get all recent audit logs (admin only).
 * Used for admin dashboard to view system-wide activity.
 *
 * @query {number} limit - Max records to return (default 100, max 500)
 * @query {number} offset - Offset for pagination (default 0)
 * @query {string} filter - Filter type: 'data' or 'auth' (optional)
 */
router.get(
  '/all',
  attachEntity('audit_log'),
  requirePermission('read'),
  validatePagination({ defaultLimit: 100, maxLimit: 500 }),
  asyncHandler(async (req, res) => {
    const { limit, offset } = req.validated.pagination;
    const actionFilter = req.query.filter; // 'data' or 'auth'

    const result = await auditService.getAllRecentLogs({
      limit,
      offset,
      actionFilter,
    });

    // Format dates for frontend
    const formattedLogs = formatAuditLogDates(result.logs);

    return ResponseFormatter.success(
      res,
      formattedLogs,
      {
        message: `Retrieved ${formattedLogs.length} audit log entries`,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      },
    );
  }),
);

/**
 * GET /api/audit/user/:userId
 *
 * Get audit trail for a specific user (actions they performed).
 * Admin/manager only - regular users can only see their own.
 *
 * @param {number} userId - ID of the user
 * @query {number} limit - Max records to return (default 50, max 100)
 */
router.get(
  '/user/:userId',
  attachEntity('user'),
  requirePermission('read'),
  validateIdParam({ paramName: 'userId' }),
  validatePagination(),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const requestingUserId = req.dbUser?.id;
    const isAdmin = req.dbUser?.role === 'admin' || req.dbUser?.role === 'manager';

    // Non-admins can only view their own audit trail
    if (!isAdmin && parseInt(userId) !== requestingUserId) {
      throw new AppError('You can only view your own activity history', 403, 'FORBIDDEN');
    }

    const logs = await auditService.getUserAuditTrail(userId, limit);

    // Format dates for frontend
    const formattedLogs = formatAuditLogDates(logs);

    return ResponseFormatter.success(res, formattedLogs, {
      message: `Retrieved ${formattedLogs.length} audit log entries`,
    });
  }),
);

// ============================================================================
// CATCH-ALL PATTERN LAST
// ============================================================================

/**
 * GET /api/audit/:resourceType/:resourceId
 *
 * Get audit trail for a specific resource.
 * Users can only view audit logs for resources they have read access to.
 *
 * @param {string} resourceType - Entity type (users, roles, work_orders, etc.)
 * @param {number} resourceId - ID of the resource
 * @query {number} limit - Max records to return (default 50, max 100)
 */
router.get(
  '/:resourceType/:resourceId',
  validateIdParam({ paramName: 'resourceId' }),
  validatePagination(),
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // Map resourceType to RLS resource name from metadata
    // Uses metadata.rlsResource for correct pluralization (e.g., inventory stays inventory)
    const metadata = allMetadata[resourceType];
    const rlsResource = metadata && metadata.rlsResource
      ? metadata.rlsResource
      : (resourceType.endsWith('s') ? resourceType : `${resourceType}s`);

    // Check read permission for this resource type
    // This ensures users can only see audit logs for resources they can access
    const hasPermission = req.permissions?.hasPermission(rlsResource, 'read');
    if (!hasPermission) {
      throw new AppError(`You don't have permission to view ${resourceType} audit logs`, 403, 'FORBIDDEN');
    }

    const logs = await auditService.getResourceAuditTrail(
      resourceType,
      resourceId,
      limit,
    );

    // Format dates for frontend
    const formattedLogs = formatAuditLogDates(logs);

    return ResponseFormatter.success(res, formattedLogs, {
      message: `Retrieved ${formattedLogs.length} audit log entries`,
    });
  }),
);

module.exports = router;
