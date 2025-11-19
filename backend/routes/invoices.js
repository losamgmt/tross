/**
 * Invoice Management Routes
 * RESTful API for invoice CRUD operations
 * Uses permission-based authorization (see config/permissions.json)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const {
  validateInvoiceCreate,
  validateInvoiceUpdate,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
const Invoice = require('../db/models/Invoice');
const auditService = require('../services/audit-service');
const { HTTP_STATUS } = require('../config/constants');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const invoiceMetadata = require('../config/models/invoice-metadata');

const router = express.Router();

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     tags: [Invoices]
 *     summary: Get all invoices
 *     description: Customers see their own invoices only. Dispatchers+ see all. Technicians have no access.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
 *       403:
 *         description: Forbidden
 */
router.get(
  '/',
  authenticateToken,
  requirePermission('invoices', 'read'),
  enforceRLS('invoices'),
  validatePagination({ maxLimit: 200 }),
  validateQuery(invoiceMetadata),
  async (req, res) => {
    try {
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;

      const result = await Invoice.findAll({
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
      logger.error('Error retrieving invoices', { error: error.message });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve invoices',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.get(
  '/:id',
  authenticateToken,
  requirePermission('invoices', 'read'),
  enforceRLS('invoices'),
  validateIdParam(),
  async (req, res) => {
    try {
      const invoiceId = req.validated.id;
      const invoice = await Invoice.findById(invoiceId, req);

      if (!invoice) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Invoice not found',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: invoice,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving invoice', {
        error: error.message,
        invoiceId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve invoice',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/invoices:
 *   post:
 *     tags: [Invoices]
 *     summary: Create new invoice (dispatcher+ only)
 *     description: Create an invoice for a customer and optionally link to a work order. Row-level security applies.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoice_number
 *               - customer_id
 *               - amount
 *               - total
 *             properties:
 *               invoice_number:
 *                 type: string
 *                 maxLength: 100
 *               customer_id:
 *                 type: integer
 *                 minimum: 1
 *               work_order_id:
 *                 type: integer
 *                 minimum: 1
 *               amount:
 *                 type: number
 *                 format: decimal
 *               tax:
 *                 type: number
 *                 format: decimal
 *               total:
 *                 type: number
 *                 format: decimal
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Bad Request - Invalid data or duplicate invoice number
 *       403:
 *         description: Forbidden - Dispatcher+ access required
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('invoices', 'create'),
  validateInvoiceCreate,
  async (req, res) => {
    try {
      const { invoice_number, customer_id, work_order_id, amount, tax, total, status } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const newInvoice = await Invoice.create({
        invoice_number,
        customer_id,
        work_order_id,
        amount,
        tax,
        total,
        status,
      });

      await auditService.log({
        userId: req.user.userId,
        action: 'create',
        resourceType: 'invoice',
        resourceId: newInvoice.id,
        newValues: { invoice_number, customer_id, amount, total },
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: newInvoice,
        message: 'Invoice created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating invoice', { error: error.message });

      if (error.code === '23505') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: 'Invoice number already exists',
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
        message: 'Failed to create invoice',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/invoices/{id}:
 *   patch:
 *     tags: [Invoices]
 *     summary: Update invoice (dispatcher+ only)
 *     description: Update invoice details. Row-level security applies.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoice_number:
 *                 type: string
 *               amount:
 *                 type: number
 *               tax:
 *                 type: number
 *               total:
 *                 type: number
 *               status:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *       400:
 *         description: Bad Request - At least one field required
 *       403:
 *         description: Forbidden - Dispatcher+ access required
 *       404:
 *         description: Invoice not found
 */
router.patch(
  '/:id',
  authenticateToken,
  requirePermission('invoices', 'update'),
  validateIdParam(),
  validateInvoiceUpdate,
  async (req, res) => {
    try {
      const invoiceId = req.validated.id;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Invoice not found',
          timestamp: new Date().toISOString(),
        });
      }

      await Invoice.update(invoiceId, req.body);
      const updatedInvoice = await Invoice.findById(invoiceId);

      await auditService.log({
        userId: req.user.userId,
        action: 'update',
        resourceType: 'invoice',
        resourceId: invoiceId,
        oldValues: invoice,
        newValues: updatedInvoice,
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.json({
        success: true,
        data: updatedInvoice,
        message: 'Invoice updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating invoice', {
        error: error.message,
        invoiceId: req.params.id,
      });

      if (error.code === '23505') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: 'Invoice number already exists',
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
        message: 'Failed to update invoice',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/invoices/{id}:
 *   delete:
 *     tags: [Invoices]
 *     summary: Delete invoice (manager+ only)
 *     description: Soft delete an invoice (sets is_active=false). Manager+ access required.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice deleted successfully
 *       403:
 *         description: Forbidden - Manager+ access required
 *       404:
 *         description: Invoice not found
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('invoices', 'delete'),
  validateIdParam(),
  async (req, res) => {
    try {
      const invoiceId = req.validated.id;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Invoice not found',
          timestamp: new Date().toISOString(),
        });
      }

      await Invoice.delete(invoiceId);

      await auditService.log({
        userId: req.user.userId,
        action: 'delete',
        resourceType: 'invoice',
        resourceId: invoiceId,
        oldValues: invoice,
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.json({
        success: true,
        message: 'Invoice deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting invoice', {
        error: error.message,
        invoiceId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to delete invoice',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

module.exports = router;
