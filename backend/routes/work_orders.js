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
const { HTTP_STATUS } = require('../config/constants');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const workOrderMetadata = require('../config/models/work-order-metadata');

const router = express.Router();

/**
 * @openapi
 * /api/work_orders:
 *   get:
 *     tags: [Work Orders]
 *     summary: Get all work orders
 *     description: Retrieve a paginated list of work orders. Row-level security applies based on role.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: DESC
 *     responses:
 *       200:
 *         description: Work orders retrieved successfully
 *       403:
 *         description: Forbidden
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

      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving work orders', { error: error.message });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve work orders',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/work_orders/{id}:
 *   get:
 *     tags: [Work Orders]
 *     summary: Get work order by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Work order retrieved successfully
 *       404:
 *         description: Work order not found
 *       403:
 *         description: Forbidden
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
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Work order not found',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: workOrder,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving work order', {
        error: error.message,
        workOrderId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve work order',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/work_orders:
 *   post:
 *     tags: [Work Orders]
 *     summary: Create new work order
 *     description: Customers can create their own work orders (self-service). Dispatchers can create for any customer.
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
 *               description:
 *                 type: string
 *               customer_id:
 *                 type: integer
 *               assigned_technician_id:
 *                 type: integer
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *     responses:
 *       201:
 *         description: Work order created successfully
 *       400:
 *         description: Bad Request
 *       403:
 *         description: Forbidden
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
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            error: 'Forbidden',
            message: 'Customers can only create work orders for their own account.',
            timestamp: new Date().toISOString(),
          });
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

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: newWorkOrder,
        message: 'Work order created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating work order', { error: error.message });

      if (error.code === '23505') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: 'Work order with this identifier already exists',
          timestamp: new Date().toISOString(),
        });
      }

      if (error.code === '23514') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad Request',
          message: 'Invalid field value - check status, priority and other enum fields',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to create work order',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/work_orders/{id}:
 *   patch:
 *     tags: [Work Orders]
 *     summary: Update work order
 *     description: Customers can update/cancel their own work orders. Technicians can update assigned work orders. Dispatchers can update any.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Work order updated successfully
 *       400:
 *         description: Bad Request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Work order not found
 */
router.patch(
  '/:id',
  authenticateToken,
  requirePermission('work_orders', 'update'),
  validateIdParam(),
  validateWorkOrderUpdate,
  async (req, res) => {
    try {
      const workOrderId = req.validated.id;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const workOrder = await WorkOrder.findById(workOrderId);
      if (!workOrder) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Work order not found',
          timestamp: new Date().toISOString(),
        });
      }

      // Row-level security: Ensure user has access to update this work order
      // Customer role: can only update their own work orders
      if (req.dbUser && req.dbUser.role === 'customer') {
        if (workOrder.customer_id !== req.dbUser.id) {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            error: 'Forbidden',
            message: 'You can only update your own work orders.',
            timestamp: new Date().toISOString(),
          });
        }
      }
      // Technician role: can only update assigned work orders
      if (req.dbUser && req.dbUser.role === 'technician') {
        if (workOrder.assigned_technician_id !== req.dbUser.id) {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            error: 'Forbidden',
            message: 'You can only update work orders assigned to you.',
            timestamp: new Date().toISOString(),
          });
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

      res.json({
        success: true,
        data: updatedWorkOrder,
        message: 'Work order updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating work order', {
        error: error.message,
        workOrderId: req.params.id,
      });

      if (error.code === '23505') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: 'Work order with this identifier already exists',
          timestamp: new Date().toISOString(),
        });
      }

      if (error.code === '23514') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad Request',
          message: 'Invalid field value - check status, priority and other enum fields',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to update work order',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/work_orders/{id}:
 *   delete:
 *     tags: [Work Orders]
 *     summary: Delete work order (manager+ only)
 *     description: Hard delete a work order. Customers can only cancel (status change), not delete.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
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
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Work order not found',
          timestamp: new Date().toISOString(),
        });
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

      res.json({
        success: true,
        message: 'Work order deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting work order', {
        error: error.message,
        workOrderId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to delete work order',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

module.exports = router;
