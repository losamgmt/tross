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
const WorkOrder = require('../db/models/WorkOrder');
const auditService = require('../services/audit-service');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const workOrderMetadata = require('../config/models/work-order-metadata');
const ResponseFormatter = require('../utils/response-formatter');

const router = express.Router();

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

      const result = await WorkOrder.findAll({
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
        req,
      });

      return ResponseFormatter.list(res, {
        data: result.data,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    } catch (error) {
      logger.error('Error deleting work order', { error: error.message, id });
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
      const workOrder = await WorkOrder.findById(workOrderId, req);

      if (!workOrder) {
        return ResponseFormatter.notFound(res, 'Work order not found');
      }

      return ResponseFormatter.get(res, workOrder);
    } catch (error) {
      logger.error('Error retrieving work order', {
        error: error.message,
        workOrderId: req.params.id,
      });
      return ResponseFormatter.internalError(res, 'Failed to retrieve work order', error);
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
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // Customers can only create work orders for themselves
      if (req.dbUser && req.dbUser.role === 'customer') {
        // For customers, enforce customer_id matches their user profile
        // This prevents customers from creating work orders for other customers
        if (customer_id && customer_id !== req.dbUser.id) {
          return ResponseFormatter.forbidden(res, 'Customers can only create work orders for their own account.');
        }
      }

      const newWorkOrder = await WorkOrder.create({
        title,
        description,
        customer_id,
        assigned_technician_id,
        priority,
        status,
      });

      await auditService.log({
        userId: req.user.userId,
        action: 'create',
        resourceType: 'work_order',
        resourceId: newWorkOrder.id,
        newValues: { title, customer_id, priority },
        ipAddress,
        userAgent,
        result: 'success',
      });

      return ResponseFormatter.created(res, newWorkOrder, 'Work order created successfully');
    } catch (error) {
      logger.error('Error creating work order', { error: error.message });

      if (error.code === '23505') {
        return ResponseFormatter.conflict(res, 'Work order with this identifier already exists');
      }

      if (error.code === '23514') {
        return ResponseFormatter.badRequest(res, 'Invalid field value - check status, priority and other enum fields');
      }

      return ResponseFormatter.internalError(res, 'Failed to create work order', error);
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
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const workOrder = await WorkOrder.findById(workOrderId);
      if (!workOrder) {
        return ResponseFormatter.notFound(res, 'Work order not found');
      }

      // Row-level security: Ensure user has access to update this work order
      // Customer role: can only update their own work orders
      if (req.dbUser && req.dbUser.role === 'customer') {
        if (workOrder.customer_id !== req.dbUser.id) {
          return ResponseFormatter.forbidden(res, 'You can only update your own work orders.');
        }
      }
      // Technician role: can only update assigned work orders
      if (req.dbUser && req.dbUser.role === 'technician') {
        if (workOrder.assigned_technician_id !== req.dbUser.id) {
          return ResponseFormatter.forbidden(res, 'You can only update work orders assigned to you.');
        }
      }

      await WorkOrder.update(workOrderId, req.body);
      const updatedWorkOrder = await WorkOrder.findById(workOrderId);

      await auditService.log({
        userId: req.user.userId,
        action: 'update',
        resourceType: 'work_order',
        resourceId: workOrderId,
        oldValues: workOrder,
        newValues: updatedWorkOrder,
        ipAddress,
        userAgent,
        result: 'success',
      });

      return ResponseFormatter.updated(res, updatedWorkOrder, 'Work order updated successfully');
    } catch (error) {
      logger.error('Error updating work order', {
        error: error.message,
        workOrderId: req.params.id,
      });

      if (error.code === '23505') {
        return ResponseFormatter.conflict(res, 'Work order with this identifier already exists');
      }

      if (error.code === '23514') {
        return ResponseFormatter.badRequest(res, 'Invalid field value - check status, priority and other enum fields');
      }

      return ResponseFormatter.internalError(res, 'Failed to update work order', error);
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
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const workOrder = await WorkOrder.findById(workOrderId);
      if (!workOrder) {
        return ResponseFormatter.notFound(res, 'Work order not found');
      }

      await WorkOrder.delete(workOrderId);

      await auditService.log({
        userId: req.user.userId,
        action: 'delete',
        resourceType: 'work_order',
        resourceId: workOrderId,
        oldValues: workOrder,
        ipAddress,
        userAgent,
        result: 'success',
      });

      return ResponseFormatter.deleted(res, 'Work order deleted successfully');
    } catch (error) {
      logger.error('Error deleting work order', {
        error: error.message,
        workOrderId: req.params.id,
      });
      return ResponseFormatter.internalError(res, 'Failed to delete work order', error);
    }
  },
);

module.exports = router;
