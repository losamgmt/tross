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
 * All endpoints require authentication and appropriate permissions.
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validateIdParam, validatePagination } = require('../validators');
const auditService = require('../services/audit-service');
const ResponseFormatter = require('../utils/response-formatter');
const { logger } = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

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
  requirePermission('audit_logs', 'read'),
  validatePagination(),
  async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 100, 500);
      const offset = parseInt(req.query.offset) || 0;
      const actionFilter = req.query.filter; // 'data' or 'auth'

      const result = await auditService.getAllRecentLogs({
        limit,
        offset,
        actionFilter,
      });

      // Format dates for frontend
      const formattedLogs = result.logs.map(log => ({
        ...log,
        created_at: log.created_at?.toISOString(),
      }));

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
    } catch (error) {
      logger.error('Error fetching all audit logs', {
        error: error.message,
      });

      return ResponseFormatter.internalError(res, error);
    }
  },
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
  requirePermission('users', 'read'),
  validateIdParam('userId'),
  validatePagination(),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'manager';

      // Non-admins can only view their own audit trail
      if (!isAdmin && parseInt(userId) !== requestingUserId) {
        return ResponseFormatter.forbidden(
          res,
          'You can only view your own activity history',
        );
      }

      const logs = await auditService.getUserAuditTrail(userId, limit);

      // Format dates for frontend
      const formattedLogs = logs.map(log => ({
        ...log,
        created_at: log.created_at?.toISOString(),
      }));

      return ResponseFormatter.success(res, formattedLogs, {
        message: `Retrieved ${formattedLogs.length} audit log entries`,
      });
    } catch (error) {
      logger.error('Error fetching user audit trail', {
        error: error.message,
        userId: req.params.userId,
      });

      if (error.message.includes('must be') || error.message.includes('invalid')) {
        return ResponseFormatter.badRequest(res, error.message);
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
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
  validateIdParam('resourceId'),
  validatePagination(),
  async (req, res) => {
    try {
      const { resourceType, resourceId } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);

      // Map resourceType to RLS resource name
      // Most entities use plural form (user -> users, work_order -> work_orders)
      const rlsResource = resourceType.endsWith('s')
        ? resourceType
        : `${resourceType}s`;

      // Check read permission for this resource type
      // This ensures users can only see audit logs for resources they can access
      const hasPermission = req.permissions?.hasPermission(rlsResource, 'read');
      if (!hasPermission) {
        return ResponseFormatter.forbidden(
          res,
          `You don't have permission to view ${resourceType} audit logs`,
        );
      }

      const logs = await auditService.getResourceAuditTrail(
        resourceType,
        resourceId,
        limit,
      );

      // Format dates for frontend
      const formattedLogs = logs.map(log => ({
        ...log,
        created_at: log.created_at?.toISOString(),
      }));

      return ResponseFormatter.success(res, formattedLogs, {
        message: `Retrieved ${formattedLogs.length} audit log entries`,
      });
    } catch (error) {
      logger.error('Error fetching resource audit trail', {
        error: error.message,
        resourceType: req.params.resourceType,
        resourceId: req.params.resourceId,
      });

      if (error.message.includes('must be') || error.message.includes('invalid')) {
        return ResponseFormatter.badRequest(res, error.message);
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
