/**
 * Unit Tests: invoices routes - CRUD Operations
 *
 * Tests core CRUD operations for invoice routes with mocked dependencies.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: GET, POST, PATCH, DELETE /api/invoices and /api/invoices/:id
 */

const request = require('supertest');
const Invoice = require('../../../db/models/Invoice');
const auditService = require('../../../services/audit-service');
const { authenticateToken, requirePermission } = require('../../../middleware/auth');
const { enforceRLS } = require('../../../middleware/row-level-security');
const { getClientIp, getUserAgent } = require('../../../utils/request-helpers');
const { HTTP_STATUS } = require('../../../config/constants');
const {
  createRouteTestApp,
  setupRouteMocks,
  teardownRouteMocks,
} = require('../../helpers/route-test-setup');

// ============================================================================
// MOCK CONFIGURATION (Hoisted by Jest)
// ============================================================================

jest.mock('../../../db/models/Invoice');
jest.mock('../../../services/audit-service');
jest.mock('../../../utils/request-helpers');

jest.mock('../../../config/models/invoice-metadata', () => ({
  tableName: 'invoices',
  primaryKey: 'id',
  searchableFields: ['invoice_number'],
  filterableFields: ['id', 'invoice_number', 'customer_id', 'work_order_id', 'is_active', 'status'],
  sortableFields: ['id', 'invoice_number', 'created_at'],
  defaultSort: { field: 'created_at', order: 'DESC' },
}));

jest.mock('../../../middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => next()),
  requirePermission: jest.fn(() => (req, res, next) => next()),
}));

jest.mock('../../../middleware/row-level-security', () => ({
  enforceRLS: jest.fn(() => (req, res, next) => {
    req.rlsPolicy = 'all_records';
    req.rlsUserId = 1;
    next();
  }),
}));

jest.mock('../../../validators', () => ({
  validatePagination: jest.fn(() => (req, res, next) => {
    if (!req.validated) req.validated = {};
    req.validated.pagination = { page: 1, limit: 50, offset: 0 };
    next();
  }),
  validateQuery: jest.fn(() => (req, res, next) => {
    if (!req.validated) req.validated = {};
    if (!req.validated.query) req.validated.query = {};
    req.validated.query.search = req.query.search;
    req.validated.query.filters = req.query.filters || {};
    req.validated.query.sortBy = req.query.sortBy || 'created_at';
    req.validated.query.sortOrder = req.query.sortOrder || 'DESC';
    next();
  }),
  validateIdParam: jest.fn(() => (req, res, next) => {
    const id = parseInt(req.params.id);
    if (!req.validated) req.validated = {};
    req.validated.id = id;
    next();
  }),
  // CRITICAL: Direct middleware CANNOT be jest.fn() wrapped
  validateInvoiceCreate: (req, res, next) => next(),
  validateInvoiceUpdate: (req, res, next) => next(),
}));

// ============================================================================
// TEST APP SETUP (After mocks are hoisted)
// ============================================================================

const invoicesRouter = require('../../../routes/invoices');
const app = createRouteTestApp(invoicesRouter, '/api/invoices');

// ============================================================================
// TEST SUITE
// ============================================================================

describe('routes/invoices.js - CRUD Operations', () => {
  beforeEach(() => {
    setupRouteMocks({
      getClientIp,
      getUserAgent,
      authenticateToken,
      requirePermission,
      enforceRLS,
    });
    auditService.log.mockResolvedValue(true);
  });

  afterEach(() => {
    teardownRouteMocks();
  });

  // ===========================
  // GET /api/invoices - List All
  // ===========================
  describe('GET /api/invoices', () => {
    test('should return paginated invoices with count and timestamp', async () => {
      // Arrange
      const mockInvoices = [
        { id: 1, invoice_number: 'INV-001', customer_id: 10, status: 'draft', total: 150.00 },
        { id: 2, invoice_number: 'INV-002', customer_id: 20, status: 'sent', total: 250.00 },
      ];
      Invoice.findAll.mockResolvedValue({
        data: mockInvoices,
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
        appliedFilters: {},
        rlsApplied: true,
      });

      // Act
      const response = await request(app).get('/api/invoices');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockInvoices);
      expect(response.body.count).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(Invoice.findAll).toHaveBeenCalledTimes(1);
    });

    test('should return empty array when no invoices exist', async () => {
      // Arrange
      Invoice.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
        appliedFilters: {},
        rlsApplied: true,
      });

      // Act
      const response = await request(app).get('/api/invoices');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    test('should handle database errors', async () => {
      // Arrange
      Invoice.findAll.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app).get('/api/invoices');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  // ===========================
  // GET /api/invoices/:id - Get by ID
  // ===========================
  describe('GET /api/invoices/:id', () => {
    test('should return invoice by ID', async () => {
      // Arrange
      const mockInvoice = { id: 1, invoice_number: 'INV-001', customer_id: 10, status: 'draft' };
      Invoice.findById.mockResolvedValue(mockInvoice);

      // Act
      const response = await request(app).get('/api/invoices/1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockInvoice);
      expect(Invoice.findById).toHaveBeenCalledWith(1, expect.any(Object));
    });

    test('should return 404 when invoice not found', async () => {
      // Arrange
      Invoice.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).get('/api/invoices/999');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle database errors', async () => {
      // Arrange
      Invoice.findById.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app).get('/api/invoices/1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  // ===========================
  // POST /api/invoices - Create
  // ===========================
  describe('POST /api/invoices', () => {
    test('should create invoice successfully', async () => {
      // Arrange
      const newInvoice = { invoice_number: 'INV-003', customer_id: 10, amount: 100, total: 110 };
      const createdInvoice = { id: 1, ...newInvoice, status: 'draft' };
      Invoice.create.mockResolvedValue(createdInvoice);

      // Act
      const response = await request(app).post('/api/invoices').send(newInvoice);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdInvoice);
      expect(Invoice.create).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should handle database errors during creation', async () => {
      // Arrange
      Invoice.create.mockRejectedValue(new Error('Creation failed'));

      // Act
      const response = await request(app).post('/api/invoices').send({ invoice_number: 'INV-ERR' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  // ===========================
  // PATCH /api/invoices/:id - Update
  // ===========================
  describe('PATCH /api/invoices/:id', () => {
    test('should update invoice successfully', async () => {
      // Arrange
      const existingInvoice = { id: 1, invoice_number: 'INV-001', status: 'draft' };
      const updatedInvoice = { id: 1, invoice_number: 'INV-001', status: 'sent' };
      // Route calls findById twice: once to check existence, once to get updated record
      Invoice.findById
        .mockResolvedValueOnce(existingInvoice)
        .mockResolvedValueOnce(updatedInvoice);
      Invoice.update.mockResolvedValue(updatedInvoice);

      // Act
      const response = await request(app).patch('/api/invoices/1').send({ status: 'sent' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedInvoice);
      expect(Invoice.update).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should return 404 when updating non-existent invoice', async () => {
      // Arrange
      Invoice.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).patch('/api/invoices/999').send({ status: 'sent' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
    });
  });

  // ===========================
  // DELETE /api/invoices/:id - Delete
  // ===========================
  describe('DELETE /api/invoices/:id', () => {
    test('should delete invoice successfully', async () => {
      // Arrange
      const existingInvoice = { id: 1, invoice_number: 'INV-001', is_active: true };
      Invoice.findById.mockResolvedValue(existingInvoice);
      Invoice.delete.mockResolvedValue({ id: 1, is_active: false });

      // Act
      const response = await request(app).delete('/api/invoices/1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Invoice.delete).toHaveBeenCalledWith(1);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should return 404 when deleting non-existent invoice', async () => {
      // Arrange
      Invoice.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).delete('/api/invoices/999');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
    });
  });
});
