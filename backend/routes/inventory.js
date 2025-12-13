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
// Inventory model removed - using GenericEntityService (strangler-fig Phase 4)
const { buildRlsContext, buildAuditContext } = require('../utils/request-context');
const { logger } = require('../config/logger');
const inventoryMetadata = require('../config/models/inventory-metadata');
const GenericEntityService = require('../services/generic-entity-service');
const { filterDataByRole } = require('../utils/response-transform');
const { handleDbError, buildDbErrorConfig } = require('../utils/db-error-handler');

const router = express.Router();

// Build DB error config from metadata (single source of truth)
const DB_ERROR_CONFIG = buildDbErrorConfig(inventoryMetadata);

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
      const rlsContext = buildRlsContext(req);

      const result = await GenericEntityService.findAll('inventory', {
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
      }, rlsContext);

      const sanitizedData = filterDataByRole(result.data, inventoryMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.list(res, {
        data: sanitizedData,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    } catch (error) {
      logger.error('Error retrieving inventory', { error: error.message });
      return ResponseFormatter.internalError(res, error);
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
      const rlsContext = buildRlsContext(req);

      const inventory = await GenericEntityService.findById('inventory', inventoryId, rlsContext);

      if (!inventory) {
        return ResponseFormatter.notFound(res, 'Inventory item not found');
      }

      const sanitizedData = filterDataByRole(inventory, inventoryMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.get(res, sanitizedData);
    } catch (error) {
      logger.error('Error retrieving inventory item', {
        error: error.message,
        inventoryId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
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
      const { name, sku, description, quantity, status, reorder_level, unit_cost, location, supplier } = req.body;
      const auditContext = buildAuditContext(req);

      const newInventory = await GenericEntityService.create('inventory', {
        name,
        sku,
        description,
        quantity,
        status,
        reorder_level,
        unit_cost,
        location,
        supplier,
      }, { auditContext });

      if (!newInventory) {
        throw new Error('Inventory creation failed unexpectedly');
      }

      return ResponseFormatter.created(res, newInventory, 'Inventory item created successfully');
    } catch (error) {
      logger.error('Error creating inventory item', { error: error.message, code: error.code });

      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
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
      const rlsContext = buildRlsContext(req);
      const auditContext = buildAuditContext(req);

      const oldInventory = await GenericEntityService.findById('inventory', inventoryId, rlsContext);
      if (!oldInventory) {
        return ResponseFormatter.notFound(res, 'Inventory item not found');
      }

      const updatedInventory = await GenericEntityService.update('inventory', inventoryId, req.body, { auditContext });

      if (!updatedInventory) {
        return ResponseFormatter.notFound(res, 'Inventory item not found');
      }

      return ResponseFormatter.updated(res, updatedInventory, 'Inventory item updated successfully');
    } catch (error) {
      logger.error('Error updating inventory item', {
        error: error.message,
        code: error.code,
        inventoryId: req.params.id,
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
      const auditContext = buildAuditContext(req);

      const deleted = await GenericEntityService.delete('inventory', inventoryId, { auditContext });

      if (!deleted) {
        return ResponseFormatter.notFound(res, 'Inventory item not found');
      }

      return ResponseFormatter.deleted(res, 'Inventory item deleted successfully');
    } catch (error) {
      logger.error('Error deleting inventory item', {
        error: error.message,
        inventoryId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
