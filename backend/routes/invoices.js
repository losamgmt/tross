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
// Invoice model removed - using GenericEntityService (strangler-fig Phase 4)
const { buildRlsContext, buildAuditContext } = require('../utils/request-context');
const { logger } = require('../config/logger');
const invoiceMetadata = require('../config/models/invoice-metadata');
const ResponseFormatter = require('../utils/response-formatter');
const GenericEntityService = require('../services/generic-entity-service');
const { filterDataByRole } = require('../utils/response-transform');
const { handleDbError, buildDbErrorConfig } = require('../utils/db-error-handler');

const router = express.Router();

// Build DB error config from metadata (single source of truth)
const DB_ERROR_CONFIG = buildDbErrorConfig(invoiceMetadata);

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
      const rlsContext = buildRlsContext(req);

      const result = await GenericEntityService.findAll('invoice', {
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
      }, rlsContext);

      const sanitizedData = filterDataByRole(result.data, invoiceMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.list(res, {
        data: sanitizedData,
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

      // Build RLS context from middleware
      const rlsContext = req.rlsPolicy ? { policy: req.rlsPolicy, userId: req.rlsUserId } : null;

      const invoice = await GenericEntityService.findById('invoice', invoiceId, rlsContext);

      if (!invoice) {
        return ResponseFormatter.notFound(res, 'Invoice not found');
      }

      // Apply metadata-driven field-level filtering
      const sanitizedData = filterDataByRole(invoice, invoiceMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.get(res, sanitizedData);
    } catch (error) {
      logger.error('Error retrieving invoice', {
        error: error.message,
        invoiceId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
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
      const { invoice_number, customer_id, work_order_id, amount, tax, total, status, due_date } = req.body;
      const auditContext = buildAuditContext(req);

      const newInvoice = await GenericEntityService.create('invoice', {
        invoice_number,
        customer_id,
        work_order_id,
        amount,
        tax,
        total,
        status,
        due_date,
      }, { auditContext });

      if (!newInvoice) {
        throw new Error('Invoice creation failed unexpectedly');
      }

      return ResponseFormatter.created(res, newInvoice, 'Invoice created successfully');
    } catch (error) {
      logger.error('Error creating invoice', { error: error.message, code: error.code });

      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
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
      const rlsContext = buildRlsContext(req);
      const auditContext = buildAuditContext(req);

      const oldInvoice = await GenericEntityService.findById('invoice', invoiceId, rlsContext);
      if (!oldInvoice) {
        return ResponseFormatter.notFound(res, 'Invoice not found');
      }

      const updatedInvoice = await GenericEntityService.update('invoice', invoiceId, req.body, { auditContext });

      if (!updatedInvoice) {
        return ResponseFormatter.notFound(res, 'Invoice not found');
      }

      return ResponseFormatter.updated(res, updatedInvoice, 'Invoice updated successfully');
    } catch (error) {
      logger.error('Error updating invoice', {
        error: error.message,
        invoiceId: req.params.id,
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
      const auditContext = buildAuditContext(req);

      const deleted = await GenericEntityService.delete('invoice', invoiceId, { auditContext });

      if (!deleted) {
        return ResponseFormatter.notFound(res, 'Invoice not found');
      }

      return ResponseFormatter.deleted(res, 'Invoice deleted successfully');
    } catch (error) {
      logger.error('Error deleting invoice', {
        error: error.message,
        invoiceId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
