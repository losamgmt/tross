/**
 * Customer Management Routes
 * RESTful API for customer CRUD operations
 * Uses permission-based authorization (see config/permissions.json)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const {
  validateCustomerCreate,
  validateCustomerUpdate,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
const Customer = require('../db/models/Customer');
const auditService = require('../services/audit-service');
const { HTTP_STATUS } = require('../config/constants');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const customerMetadata = require('../config/models/customer-metadata');

const router = express.Router();

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags: [Customers]
 *     summary: Get all customers
 *     description: Retrieve a paginated list of customers with optional search, filtering, and sorting. Row-level security applies.
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
      logger.error('Error retrieving customers', { error: error.message });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customers',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer by ID
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
 *         description: Customer retrieved successfully
 *       404:
 *         description: Customer not found
 *       403:
 *         description: Forbidden
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
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Customer not found',
          timestamp: new Date().toISOString(),
        });
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
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create new customer (dispatcher+ only)
 *     description: Manually create a customer profile (dispatcher+ only). Customer signup via Auth0 → /api/auth0/callback creates user+profile automatically.
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
 *               phone:
 *                 type: string
 *               company_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Bad Request
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

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: newCustomer,
        message: 'Customer created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating customer', { error: error.message });

      if (error.code === '23505') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: 'Email already exists',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to create customer',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/customers/{id}:
 *   patch:
 *     tags: [Customers]
 *     summary: Update customer
 *     description: Customers can update their own profile, dispatcher+ can update any customer.
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
 *         description: Customer updated successfully
 *       400:
 *         description: Bad Request
 *       403:
 *         description: Forbidden
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
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Customer not found',
          timestamp: new Date().toISOString(),
        });
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

      res.json({
        success: true,
        data: updatedCustomer,
        message: 'Customer updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating customer', {
        error: error.message,
        customerId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to update customer',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Deactivate customer (manager+ only)
 *     description: Soft delete (deactivate) a customer account. Hard delete is not allowed for customers.
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
 *         description: Customer deactivated successfully
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
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Customer not found',
          timestamp: new Date().toISOString(),
        });
      }

      await Customer.deactivate(customerId);

      await auditService.log({
        userId: req.user.userId,
        action: 'deactivate',
        resourceType: 'customer',
        resourceId: customerId,
        oldValues: customer,
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.json({
        success: true,
        message: 'Customer deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deactivating customer', {
        error: error.message,
        customerId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to deactivate customer',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

module.exports = router;
