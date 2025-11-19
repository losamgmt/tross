/**
 * Inventory Management Routes
 * RESTful API for inventory CRUD operations
 * Uses permission-based authorization (see config/permissions.json)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const {
  validateInventoryCreate,
  validateInventoryUpdate,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
const Inventory = require('../db/models/Inventory');
const auditService = require('../services/audit-service');
const { HTTP_STATUS } = require('../config/constants');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const inventoryMetadata = require('../config/models/inventory-metadata');

const router = express.Router();

/**
 * @openapi
 * /api/inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: Get all inventory items
 *     description: Technicians and above can view all inventory. No row-level security.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
 *       403:
 *         description: Forbidden - Technician+ access required
 */
router.get(
  '/',
  authenticateToken,
  requirePermission('inventory', 'read'),
  enforceRLS('inventory'),
  validatePagination({ maxLimit: 200 }),
  validateQuery(inventoryMetadata),
  async (req, res) => {
    try {
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;

      const result = await Inventory.findAll({
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
      logger.error('Error retrieving inventory', { error: error.message });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve inventory',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.get(
  '/:id',
  authenticateToken,
  requirePermission('inventory', 'read'),
  enforceRLS('inventory'),
  validateIdParam(),
  async (req, res) => {
    try {
      const inventoryId = req.validated.id;
      const inventory = await Inventory.findById(inventoryId, req);

      if (!inventory) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Inventory item not found',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: inventory,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving inventory item', {
        error: error.message,
        inventoryId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve inventory item',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/inventory:
 *   post:
 *     tags: [Inventory]
 *     summary: Create new inventory item (dispatcher+ only)
 *     description: Add a new item to inventory. Dispatcher+ access required.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sku
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               sku:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inventory item created successfully
 *       400:
 *         description: Bad Request - Invalid data or duplicate SKU
 *       403:
 *         description: Forbidden - Dispatcher+ access required
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('inventory', 'create'),
  validateInventoryCreate,
  async (req, res) => {
    try {
      const { name, sku, description, quantity, status } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const newInventory = await Inventory.create({
        name,
        sku,
        description,
        quantity,
        status,
      });

      await auditService.log({
        userId: req.user.userId,
        action: 'create',
        resourceType: 'inventory',
        resourceId: newInventory.id,
        newValues: { name, sku, quantity },
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: newInventory,
        message: 'Inventory item created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating inventory item', { error: error.message });

      if (error.code === '23505') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: 'SKU already exists',
          timestamp: new Date().toISOString(),
        });
      }

      if (error.code === '23514') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad Request',
          message: 'Invalid field value - check status and other enum fields',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to create inventory item',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/inventory/{id}:
 *   patch:
 *     tags: [Inventory]
 *     summary: Update inventory item (dispatcher+ only)
 *     description: Update inventory item details. Dispatcher+ access required.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Inventory item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               description:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               status:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *       400:
 *         description: Bad Request - At least one field required
 *       403:
 *         description: Forbidden - Dispatcher+ access required
 *       404:
 *         description: Inventory item not found
 */
router.patch(
  '/:id',
  authenticateToken,
  requirePermission('inventory', 'update'),
  validateIdParam(),
  validateInventoryUpdate,
  async (req, res) => {
    try {
      const inventoryId = req.validated.id;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const inventory = await Inventory.findById(inventoryId);
      if (!inventory) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Inventory item not found',
          timestamp: new Date().toISOString(),
        });
      }

      await Inventory.update(inventoryId, req.body);
      const updatedInventory = await Inventory.findById(inventoryId);

      await auditService.log({
        userId: req.user.userId,
        action: 'update',
        resourceType: 'inventory',
        resourceId: inventoryId,
        oldValues: inventory,
        newValues: updatedInventory,
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.json({
        success: true,
        data: updatedInventory,
        message: 'Inventory item updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating inventory item', {
        error: error.message,
        inventoryId: req.params.id,
      });

      if (error.code === '23505') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: 'SKU already exists',
          timestamp: new Date().toISOString(),
        });
      }

      if (error.code === '23514') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad Request',
          message: 'Invalid field value - check status and other enum fields',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to update inventory item',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/inventory/{id}:
 *   delete:
 *     tags: [Inventory]
 *     summary: Delete inventory item (manager+ only)
 *     description: Soft delete an inventory item (sets is_active=false). Manager+ access required.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Inventory item ID
 *     responses:
 *       200:
 *         description: Inventory item deleted successfully
 *       403:
 *         description: Forbidden - Manager+ access required
 *       404:
 *         description: Inventory item not found
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('inventory', 'delete'),
  validateIdParam(),
  async (req, res) => {
    try {
      const inventoryId = req.validated.id;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const inventory = await Inventory.findById(inventoryId);
      if (!inventory) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Inventory item not found',
          timestamp: new Date().toISOString(),
        });
      }

      await Inventory.delete(inventoryId);

      await auditService.log({
        userId: req.user.userId,
        action: 'delete',
        resourceType: 'inventory',
        resourceId: inventoryId,
        oldValues: inventory,
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.json({
        success: true,
        message: 'Inventory item deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting inventory item', {
        error: error.message,
        inventoryId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to delete inventory item',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

module.exports = router;
