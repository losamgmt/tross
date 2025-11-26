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
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const invoiceMetadata = require('../config/models/invoice-metadata');
const ResponseFormatter = require('../utils/response-formatter');

const router = express.Router();

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     tags: [Invoices]
 *     summary: Get all invoices with search, filters, and sorting
 *     description: |
 *       Retrieve a paginated list of invoices. Row-level security applies.
 *       Customers see their own. Dispatchers+ see all. Technicians have no access.
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
 *         description: Search by invoice_number (case-insensitive)
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: work_order_id
 *         schema:
 *           type: integer
 *         description: Filter by work order ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, paid, overdue, cancelled]
 *         description: Filter by invoice status
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, invoice_number, status, amount, total, due_date, paid_at, created_at, updated_at]
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
 *         description: Invoices retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
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

      return ResponseFormatter.list(res, {
        data: result.data,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    } catch (error) {
      logger.error('Error retrieving invoices', { error: error.message });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/invoices/{id}:
 *   get:
 *     tags: [Invoices]
 *     summary: Get invoice by ID
 *     description: Retrieve a single invoice. Row-level security applies.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Invoice not found
 */
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
        return ResponseFormatter.notFound(res, 'Invoice not found');
      }

      return ResponseFormatter.get(res, invoice);
    } catch (error) {
      logger.error('Error retrieving invoice', {
        error: error.message,
        invoiceId: req.params.id,
      });
      return ResponseFormatter.internalError(res, 'Failed to retrieve invoice');
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

      return ResponseFormatter.created(res, newInvoice, 'Invoice created successfully');
    } catch (error) {
      logger.error('Error creating invoice', { error: error.message });

      if (error.code === '23505') {
        return ResponseFormatter.conflict(res, 'Invoice number already exists');
      }

      if (error.code === '23514') {
        return ResponseFormatter.badRequest(res, 'Invalid field value - check status and other enum fields');
      }

      return ResponseFormatter.internalError(res, 'Failed to create invoice');
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
  enforceRLS('invoices'),
  validateIdParam(),
  validateInvoiceUpdate,
  async (req, res) => {
    try {
      const invoiceId = req.validated.id;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return ResponseFormatter.notFound(res, 'Invoice not found');
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

      return ResponseFormatter.updated(res, updatedInvoice, 'Invoice updated successfully');
    } catch (error) {
      logger.error('Error updating invoice', {
        error: error.message,
        invoiceId: req.params.id,
      });

      if (error.code === '23505') {
        return ResponseFormatter.conflict(res, 'Invoice number already exists');
      }

      if (error.code === '23514') {
        return ResponseFormatter.badRequest(res, 'Invalid field value - check status and other enum fields');
      }

      return ResponseFormatter.internalError(res, 'Failed to update invoice');
    }
  },
);

/**
 * @openapi
 * /api/invoices/{id}:
 *   delete:
 *     tags: [Invoices]
 *     summary: Delete invoice (manager+ only)
 *     description: |
 *       Permanently delete an invoice.
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
        return ResponseFormatter.notFound(res, 'Invoice not found');
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

      return ResponseFormatter.deleted(res, 'Invoice deleted successfully');
    } catch (error) {
      logger.error('Error deleting invoice', {
        error: error.message,
        invoiceId: req.params.id,
      });
      return ResponseFormatter.internalError(res, 'Failed to delete invoice');
    }
  },
);

module.exports = router;
