/**
 * Inventory Management Routes
 * RESTful API for inventory CRUD operations
 * Uses permission-based authorization (see config/permissions.json)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const ResponseFormatter = require('../utils/response-formatter');
const {
  validateInventoryCreate,
  validateInventoryUpdate,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
const Inventory = require('../db/models/Inventory');
const auditService = require('../services/audit-service');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const inventoryMetadata = require('../config/models/inventory-metadata');

const router = express.Router();

/**
 * @openapi
 * /api/inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: Get all inventory items with search, filters, and sorting
 *     description: Technicians and above can view all inventory. No row-level security.
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
 *         description: Search across name, sku, and description (case-insensitive)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in_stock, low_stock, out_of_stock, discontinued]
 *         description: Filter by inventory status
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, name, sku, status, quantity, unit_cost, created_at, updated_at]
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

      return ResponseFormatter.list(res, {
        data: result.data,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    } catch (error) {
      logger.error('Error retrieving inventory', { error: error.message });
      return ResponseFormatter.internalError(res, 'Failed to retrieve inventory');
    }
  },
);

/**
 * @openapi
 * /api/inventory/{id}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory item by ID
 *     description: Retrieve a single inventory item. Technician+ access required.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Inventory item ID
 *     responses:
 *       200:
 *         description: Inventory item retrieved successfully
 *       403:
 *         description: Forbidden - Technician+ access required
 *       404:
 *         description: Inventory item not found
 */
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
        return ResponseFormatter.notFound(res, 'Inventory item not found');
      }

      return ResponseFormatter.get(res, inventory);
    } catch (error) {
      logger.error('Error retrieving inventory item', {
        error: error.message,
        inventoryId: req.params.id,
      });
      return ResponseFormatter.internalError(res, 'Failed to retrieve inventory item');
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

      return ResponseFormatter.created(res, newInventory, 'Inventory item created successfully');
    } catch (error) {
      logger.error('Error creating inventory item', { error: error.message, code: error.code });

      // Handle unique constraint violation (duplicate SKU)
      if (error.code === '23505') {
        return ResponseFormatter.conflict(res, 'SKU already exists');
      }

      if (error.code === '23514') {
        return ResponseFormatter.badRequest(res, 'Invalid field value - check status and other enum fields');
      }

      return ResponseFormatter.internalError(res, 'Failed to create inventory item');
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
  enforceRLS('inventory'),
  validateIdParam(),
  validateInventoryUpdate,
  async (req, res) => {
    try {
      const inventoryId = req.validated.id;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const inventory = await Inventory.findById(inventoryId);
      if (!inventory) {
        return ResponseFormatter.notFound(res, 'Inventory item not found');
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

      return ResponseFormatter.updated(res, updatedInventory, 'Inventory item updated successfully');
    } catch (error) {
      logger.error('Error updating inventory item', {
        error: error.message,
        inventoryId: req.params.id,
      });

      if (error.code === '23505') {
        return ResponseFormatter.conflict(res, 'SKU already exists');
      }

      if (error.code === '23514') {
        return ResponseFormatter.badRequest(res, 'Invalid field value - check status and other enum fields');
      }

      return ResponseFormatter.internalError(res, 'Failed to update inventory item');
    }
  },
);

/**
 * @openapi
 * /api/inventory/{id}:
 *   delete:
 *     tags: [Inventory]
 *     summary: Delete inventory item (manager+ only)
 *     description: |
 *       Permanently delete an inventory item.
 *       To deactivate instead, use PATCH with is_active=false.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
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
        return ResponseFormatter.notFound(res, 'Inventory item not found');
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

      return ResponseFormatter.deleted(res, 'Inventory item deleted successfully');
    } catch (error) {
      logger.error('Error deleting inventory item', {
        error: error.message,
        inventoryId: req.params.id,
      });
      return ResponseFormatter.internalError(res, 'Failed to delete inventory item');
    }
  },
);

module.exports = router;
