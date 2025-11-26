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
const Customer = require('../db/models/Customer');
const auditService = require('../services/audit-service');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const customerMetadata = require('../config/models/customer-metadata');

const router = express.Router();

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

      const result = await Customer.findAll({
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
        req, // Pass request for RLS filtering
      });

      return ResponseFormatter.list(res, {
        data: result.data,
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
      const customer = await Customer.findById(customerId, req);

      if (!customer) {
        return ResponseFormatter.notFound(res, 'Customer not found');
      }

      res.json({
        success: true,
        data: customer,
        timestamp: new Date().toISOString(),
      });
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
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const newCustomer = await Customer.create({
        email,
        phone,
        company_name,
      });

      await auditService.log({
        userId: req.user.userId,
        action: 'create',
        resourceType: 'customer',
        resourceId: newCustomer.id,
        newValues: { email, phone, company_name },
        ipAddress,
        userAgent,
        result: 'success',
      });

      return ResponseFormatter.created(res, newCustomer, 'Customer created successfully');
    } catch (error) {
      logger.error('Error creating customer', { error: error.message });

      if (error.code === '23505') {
        return ResponseFormatter.conflict(res, 'Email already exists');
      }

      if (error.code === '23514') {
        return ResponseFormatter.badRequest(res, 'Invalid field value - check status and other enum fields');
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
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // Check if customer exists (with RLS filtering)
      const customer = await Customer.findById(customerId, req);
      if (!customer) {
        return ResponseFormatter.notFound(res, 'Customer not found');
      }

      // RLS enforced: customer can update own record, technician+ can update any

      await Customer.update(customerId, req.body);
      const updatedCustomer = await Customer.findById(customerId);

      await auditService.log({
        userId: req.user.userId,
        action: 'update',
        resourceType: 'customer',
        resourceId: customerId,
        oldValues: customer,
        newValues: updatedCustomer,
        ipAddress,
        userAgent,
        result: 'success',
      });

      return ResponseFormatter.updated(res, updatedCustomer, 'Customer updated successfully');
    } catch (error) {
      logger.error('Error updating customer', {
        error: error.message,
        customerId: req.params.id,
      });

      if (error.code === '23505') {
        return ResponseFormatter.conflict(res, 'Email already exists');
      }

      if (error.code === '23514') {
        return ResponseFormatter.badRequest(res, 'Invalid field value - check status and other enum fields');
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
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const customer = await Customer.findById(customerId);
      if (!customer) {
        return ResponseFormatter.notFound(res, 'Customer not found');
      }

      await Customer.delete(customerId);

      await auditService.log({
        userId: req.user.userId,
        action: 'delete',
        resourceType: 'customer',
        resourceId: customerId,
        oldValues: customer,
        ipAddress,
        userAgent,
        result: 'success',
      });

      return ResponseFormatter.deleted(res, 'Customer deleted successfully');
    } catch (error) {
      logger.error('Error deleting customer', {
        error: error.message,
        customerId: req.params.id,
      });

      // Handle race condition: customer may have been deleted by another request
      if (error.message === 'Customer not found') {
        return ResponseFormatter.notFound(res, 'Customer not found');
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
