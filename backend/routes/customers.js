/**
 * Customer Management Routes
 * RESTful API for customer CRUD operations
 * Uses permission-based authorization (see config/permissions.json)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const ResponseFormatter = require('../utils/response-formatter');
const {
  validateCustomerCreate,
  validateCustomerUpdate,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
// Customer model removed - using GenericEntityService (strangler-fig Phase 4)
const { buildRlsContext, buildAuditContext } = require('../utils/request-context');
const { logger } = require('../config/logger');
const customerMetadata = require('../config/models/customer-metadata');
const GenericEntityService = require('../services/generic-entity-service');
const { filterDataByRole } = require('../utils/response-transform');
const { handleDbError, buildDbErrorConfig } = require('../utils/db-error-handler');

const router = express.Router();

// Build DB error config from metadata (single source of truth)
const DB_ERROR_CONFIG = buildDbErrorConfig(customerMetadata);

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags: [Customers]
 *     summary: Get all customers with search, filters, and sorting
 *     description: |
 *       Retrieve a paginated list of customers. Row-level security applies.
 *       Customers see only their own record. Dispatchers+ see all.
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
 *         description: Search across email, phone, and company_name (case-insensitive)
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, suspended]
 *         description: Filter by customer status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, email, company_name, is_active, status, created_at, updated_at]
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
 *         description: Customers retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/',
  authenticateToken,
  requirePermission('customers', 'read'),
  enforceRLS('customers'),
  validatePagination({ maxLimit: 200 }),
  validateQuery(customerMetadata),
  async (req, res) => {
    try {
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;
      const rlsContext = buildRlsContext(req);

      const result = await GenericEntityService.findAll('customer', {
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
      }, rlsContext);

      const sanitizedData = filterDataByRole(result.data, customerMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.list(res, {
        data: sanitizedData,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    } catch (error) {
      logger.error('Error retrieving customers', { error: error.message });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer by ID
 *     description: Retrieve a single customer. Row-level security applies.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Customer not found
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission('customers', 'read'),
  enforceRLS('customers'),
  validateIdParam(),
  async (req, res) => {
    try {
      const customerId = req.validated.id;
      const rlsContext = buildRlsContext(req);

      const customer = await GenericEntityService.findById('customer', customerId, rlsContext);

      if (!customer) {
        return ResponseFormatter.notFound(res, 'Customer not found');
      }

      // Apply metadata-driven field-level filtering
      const sanitizedData = filterDataByRole(customer, customerMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.get(res, sanitizedData);
    } catch (error) {
      logger.error('Error retrieving customer', {
        error: error.message,
        customerId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create new customer (dispatcher+ only)
 *     description: |
 *       Manually create a customer profile.
 *       Customer signup via Auth0 creates user+profile automatically.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *               phone:
 *                 type: string
 *                 maxLength: 50
 *               company_name:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Bad Request - Invalid data or duplicate email
 *       403:
 *         description: Forbidden - Dispatcher+ access required
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('customers', 'create'),
  validateCustomerCreate,
  async (req, res) => {
    try {
      const { email, phone, company_name } = req.body;
      const auditContext = buildAuditContext(req);

      const newCustomer = await GenericEntityService.create('customer', {
        email,
        phone,
        company_name,
      }, { auditContext });

      if (!newCustomer) {
        throw new Error('Customer creation failed unexpectedly');
      }

      return ResponseFormatter.created(res, newCustomer, 'Customer created successfully');
    } catch (error) {
      logger.error('Error creating customer', { error: error.message, code: error.code });

      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/customers/{id}:
 *   patch:
 *     tags: [Customers]
 *     summary: Update customer
 *     description: |
 *       Customers can update their own profile.
 *       Dispatchers+ can update any customer.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 maxLength: 50
 *               company_name:
 *                 type: string
 *                 maxLength: 255
 *               is_active:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [pending, active, suspended]
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       400:
 *         description: Bad Request - Invalid data
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Customer not found
 */
router.patch(
  '/:id',
  authenticateToken,
  requirePermission('customers', 'update'),
  enforceRLS('customers'),
  validateIdParam(),
  validateCustomerUpdate,
  async (req, res) => {
    try {
      const customerId = req.validated.id;
      const rlsContext = buildRlsContext(req);
      const auditContext = buildAuditContext(req);

      const oldCustomer = await GenericEntityService.findById('customer', customerId, rlsContext);
      if (!oldCustomer) {
        return ResponseFormatter.notFound(res, 'Customer not found');
      }

      const updatedCustomer = await GenericEntityService.update('customer', customerId, req.body, { auditContext });

      if (!updatedCustomer) {
        return ResponseFormatter.notFound(res, 'Customer not found');
      }

      return ResponseFormatter.updated(res, updatedCustomer, 'Customer updated successfully');
    } catch (error) {
      logger.error('Error updating customer', {
        error: error.message,
        code: error.code,
        customerId: req.params.id,
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
 * /api/customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Delete customer (manager+ only)
 *     description: |
 *       Permanently delete a customer record.
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
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       403:
 *         description: Forbidden - Manager+ access required
 *       404:
 *         description: Customer not found
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('customers', 'delete'),
  validateIdParam(),
  async (req, res) => {
    try {
      const customerId = req.validated.id;
      const auditContext = buildAuditContext(req);

      const deleted = await GenericEntityService.delete('customer', customerId, { auditContext });

      if (!deleted) {
        return ResponseFormatter.notFound(res, 'Customer not found');
      }

      return ResponseFormatter.deleted(res, 'Customer deleted successfully');
    } catch (error) {
      logger.error('Error deleting customer', {
        error: error.message,
        customerId: req.params.id,
      });

      // Handle deletion blocked by dependents (work_orders, invoices, etc.)
      if (error.message.includes('Cannot delete') || error.message.startsWith('Cannot delete customer:')) {
        return ResponseFormatter.badRequest(res, error.message);
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
