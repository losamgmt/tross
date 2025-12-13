/**
 * Work Order Management Routes
 * RESTful API for work order CRUD operations
 * Uses permission-based authorization (see config/permissions.json)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const {
  validateWorkOrderCreate,
  validateWorkOrderUpdate,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
// WorkOrder model removed - using GenericEntityService (strangler-fig Phase 4)
const { buildRlsContext, buildAuditContext } = require('../utils/request-context');
const { logger } = require('../config/logger');
const workOrderMetadata = require('../config/models/work-order-metadata');
const ResponseFormatter = require('../utils/response-formatter');
const GenericEntityService = require('../services/generic-entity-service');
const { filterDataByRole } = require('../utils/response-transform');
const { handleDbError, buildDbErrorConfig } = require('../utils/db-error-handler');

const router = express.Router();

// Build DB error config from metadata (single source of truth)
const DB_ERROR_CONFIG = buildDbErrorConfig(workOrderMetadata);

/**
 * @openapi
 * /api/work_orders:
 *   get:
 *     tags: [Work Orders]
 *     summary: Get all work orders with search, filters, and sorting
 *     description: |
 *       Retrieve a paginated list of work orders. Row-level security applies.
 *       Customers see their own. Technicians see assigned. Dispatchers+ see all.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 255
 *         description: Search across title and description (case-insensitive)
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: assigned_technician_id
 *         schema:
 *           type: integer
 *         description: Filter by assigned technician ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, in_progress, completed, cancelled]
 *         description: Filter by work order status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, title, priority, status, scheduled_start, scheduled_end, completed_at, created_at, updated_at]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Work orders retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/',
  authenticateToken,
  requirePermission('work_orders', 'read'),
  enforceRLS('work_orders'),
  validatePagination({ maxLimit: 200 }),
  validateQuery(workOrderMetadata),
  async (req, res) => {
    try {
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;
      const rlsContext = buildRlsContext(req);

      const result = await GenericEntityService.findAll('workOrder', {
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
      }, rlsContext);

      const sanitizedData = filterDataByRole(result.data, workOrderMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.list(res, {
        data: sanitizedData,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    } catch (error) {
      logger.error('Error retrieving work orders', { error: error.message });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/work_orders/{id}:
 *   get:
 *     tags: [Work Orders]
 *     summary: Get work order by ID
 *     description: Retrieve a single work order. Row-level security applies.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Work order ID
 *     responses:
 *       200:
 *         description: Work order retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Work order not found
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission('work_orders', 'read'),
  enforceRLS('work_orders'),
  validateIdParam(),
  async (req, res) => {
    try {
      const workOrderId = req.validated.id;
      const rlsContext = buildRlsContext(req);

      const workOrder = await GenericEntityService.findById('workOrder', workOrderId, rlsContext);

      if (!workOrder) {
        return ResponseFormatter.notFound(res, 'Work order not found');
      }

      const sanitizedData = filterDataByRole(workOrder, workOrderMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.get(res, sanitizedData);
    } catch (error) {
      logger.error('Error retrieving work order', {
        error: error.message,
        workOrderId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/work_orders:
 *   post:
 *     tags: [Work Orders]
 *     summary: Create new work order
 *     description: |
 *       Customers can create their own work orders (self-service).
 *       Dispatchers+ can create for any customer.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - customer_id
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               customer_id:
 *                 type: integer
 *                 minimum: 1
 *               assigned_technician_id:
 *                 type: integer
 *                 minimum: 1
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *               status:
 *                 type: string
 *                 enum: [pending, assigned, in_progress, completed, cancelled]
 *                 default: pending
 *     responses:
 *       201:
 *         description: Work order created successfully
 *       400:
 *         description: Bad Request - Invalid data
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('work_orders', 'create'),
  validateWorkOrderCreate,
  async (req, res) => {
    try {
      const { title, description, customer_id, assigned_technician_id, priority, status } = req.body;
      const auditContext = buildAuditContext(req);

      // Customers can only create work orders for themselves
      if (req.dbUser && req.dbUser.role === 'customer') {
        if (customer_id && customer_id !== req.dbUser.id) {
          return ResponseFormatter.forbidden(res, 'Customers can only create work orders for their own account.');
        }
      }

      const newWorkOrder = await GenericEntityService.create('workOrder', {
        title,
        description,
        customer_id,
        assigned_technician_id,
        priority,
        status,
      }, { auditContext });

      if (!newWorkOrder) {
        throw new Error('Work order creation failed unexpectedly');
      }

      return ResponseFormatter.created(res, newWorkOrder, 'Work order created successfully');
    } catch (error) {
      logger.error('Error creating work order', { error: error.message, code: error.code });

      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/work_orders/{id}:
 *   patch:
 *     tags: [Work Orders]
 *     summary: Update work order
 *     description: |
 *       Customers can update/cancel their own work orders.
 *       Technicians can update assigned work orders.
 *       Dispatchers+ can update any.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Work order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               assigned_technician_id:
 *                 type: integer
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *               status:
 *                 type: string
 *                 enum: [pending, assigned, in_progress, completed, cancelled]
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Work order updated successfully
 *       400:
 *         description: Bad Request - Invalid data
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Work order not found
 */
router.patch(
  '/:id',
  authenticateToken,
  requirePermission('work_orders', 'update'),
  enforceRLS('work_orders'),
  validateIdParam(),
  validateWorkOrderUpdate,
  async (req, res) => {
    try {
      const workOrderId = req.validated.id;
      const rlsContext = buildRlsContext(req);
      const auditContext = buildAuditContext(req);

      const oldWorkOrder = await GenericEntityService.findById('workOrder', workOrderId, rlsContext);
      if (!oldWorkOrder) {
        return ResponseFormatter.notFound(res, 'Work order not found');
      }

      // Row-level security: Ensure user has access to update this work order
      if (req.dbUser && req.dbUser.role === 'customer') {
        if (oldWorkOrder.customer_id !== req.dbUser.id) {
          return ResponseFormatter.forbidden(res, 'You can only update your own work orders.');
        }
      }
      if (req.dbUser && req.dbUser.role === 'technician') {
        if (oldWorkOrder.assigned_technician_id !== req.dbUser.id) {
          return ResponseFormatter.forbidden(res, 'You can only update work orders assigned to you.');
        }
      }

      const updatedWorkOrder = await GenericEntityService.update('workOrder', workOrderId, req.body, { auditContext });

      if (!updatedWorkOrder) {
        return ResponseFormatter.notFound(res, 'Work order not found');
      }

      return ResponseFormatter.updated(res, updatedWorkOrder, 'Work order updated successfully');
    } catch (error) {
      logger.error('Error updating work order', {
        error: error.message,
        code: error.code,
        workOrderId: req.params.id,
      });

      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/work_orders/{id}:
 *   delete:
 *     tags: [Work Orders]
 *     summary: Delete work order (manager+ only)
 *     description: |
 *       Permanently delete a work order.
 *       Customers can only cancel (status change), not delete.
 *       To deactivate instead, use PATCH with is_active=false.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Work order ID
 *     responses:
 *       200:
 *         description: Work order deleted successfully
 *       403:
 *         description: Forbidden - Manager+ access required
 *       404:
 *         description: Work order not found
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('work_orders', 'delete'),
  validateIdParam(),
  async (req, res) => {
    try {
      const workOrderId = req.validated.id;
      const rlsContext = buildRlsContext(req);
      const auditContext = buildAuditContext(req);

      const workOrder = await GenericEntityService.findById('workOrder', workOrderId, rlsContext);
      if (!workOrder) {
        return ResponseFormatter.notFound(res, 'Work order not found');
      }

      await GenericEntityService.delete('workOrder', workOrderId, { auditContext, oldValues: workOrder });

      return ResponseFormatter.deleted(res, 'Work order deleted successfully');
    } catch (error) {
      logger.error('Error deleting work order', {
        error: error.message,
        code: error.code,
        workOrderId: req.params.id,
      });

      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
