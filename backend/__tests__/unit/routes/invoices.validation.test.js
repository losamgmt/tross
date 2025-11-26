/**
 * Unit Tests: invoices routes - Validation & Error Handling
 *
 * Tests validation logic, constraint violations, and error scenarios.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Input validation, conflict handling, constraint errors
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
  filterableFields: ['id', 'invoice_number', 'customer_id', 'status'],
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
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID parameter' });
    }
    if (!req.validated) req.validated = {};
    req.validated.id = id;
    next();
  }),
  validateInvoiceCreate: jest.fn((req, res, next) => next()),
  validateInvoiceUpdate: jest.fn((req, res, next) => next()),
}));

// ============================================================================
// TEST APP SETUP (After mocks are hoisted)
// ============================================================================

const invoicesRouter = require('../../../routes/invoices');
const { validateInvoiceCreate, validateInvoiceUpdate, validateIdParam } = require('../../../validators');
const app = createRouteTestApp(invoicesRouter, '/api/invoices');

// ============================================================================
// TEST SUITE
// ============================================================================

describe('routes/invoices.js - Validation & Error Handling', () => {
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
  // GET /api/invoices/:id - Validation
  // ===========================
  describe('GET /api/invoices/:id - Validation', () => {
    test('should return 400 for invalid ID (non-numeric)', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID parameter' });
      });

      const response = await request(app).get('/api/invoices/abc');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid ID (zero or negative)', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'ID must be positive' });
      });

      const response = await request(app).get('/api/invoices/0');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // POST /api/invoices - Validation
  // ===========================
  describe('POST /api/invoices - Validation', () => {
    test('should return 400 when required fields are missing', async () => {
      validateInvoiceCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Customer ID is required' });
      });

      const response = await request(app).post('/api/invoices').send({});
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(Invoice.create).not.toHaveBeenCalled();
    });

    test('should return 400 when amount is negative', async () => {
      validateInvoiceCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Amount must be positive' });
      });

      const response = await request(app).post('/api/invoices').send({ amount: -100 });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 409 when invoice_number already exists', async () => {
      validateInvoiceCreate.mockImplementation((req, res, next) => next());
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      Invoice.create.mockRejectedValue(duplicateError);

      const response = await request(app).post('/api/invoices').send({ invoice_number: 'INV-001' });
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    });
  });

  // ===========================
  // PATCH /api/invoices/:id - Validation
  // ===========================
  describe('PATCH /api/invoices/:id - Validation', () => {
    test('should return 400 when status value is invalid', async () => {
      validateInvoiceUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid status value' });
      });

      const response = await request(app).patch('/api/invoices/1').send({ status: 'bogus_status' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(Invoice.update).not.toHaveBeenCalled();
    });

    test('should return 400 when due_date format is invalid', async () => {
      validateInvoiceUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid date format' });
      });

      const response = await request(app).patch('/api/invoices/1').send({ due_date: 'not-a-date' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // DELETE /api/invoices/:id - Validation
  // ===========================
  describe('DELETE /api/invoices/:id - Validation', () => {
    test('should return 400 for invalid ID parameter', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID' });
      });

      const response = await request(app).delete('/api/invoices/invalid');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(Invoice.delete).not.toHaveBeenCalled();
    });
  });
});
