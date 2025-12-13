/**
 * Unit Tests: invoices routes - Validation & Error Handling
 *
 * Tests validation logic, constraint violations, and error scenarios.
 * Uses GenericEntityService (strangler-fig migration pattern).
 */

const request = require('supertest');
const GenericEntityService = require('../../../services/generic-entity-service');
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
// MOCK CONFIGURATION
// ============================================================================

jest.mock('../../../services/generic-entity-service');
jest.mock('../../../utils/request-helpers');

jest.mock('../../../config/models/invoice-metadata', () => ({
  tableName: 'invoices',
  primaryKey: 'id',
  searchableFields: ['invoice_number', 'notes'],
  filterableFields: ['id', 'invoice_number', 'customer_id', 'status'],
  sortableFields: ['id', 'invoice_number', 'invoice_date', 'created_at'],
  defaultSort: { field: 'invoice_date', order: 'DESC' },
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
    req.validated.query.sortBy = req.query.sortBy || 'invoice_date';
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
// TEST APP SETUP
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
    jest.clearAllMocks();
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
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invoice number is required' });
      });

      const response = await request(app).post('/api/invoices').send({});
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(GenericEntityService.create).not.toHaveBeenCalled();
    });

    test('should return 400 when customer_id is invalid', async () => {
      validateInvoiceCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Valid customer_id is required' });
      });

      const response = await request(app).post('/api/invoices').send({ invoice_number: 'INV-001', customer_id: 'invalid' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 409 when invoice number already exists', async () => {
      validateInvoiceCreate.mockImplementation((req, res, next) => next());
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      GenericEntityService.create.mockRejectedValue(duplicateError);

      const response = await request(app).post('/api/invoices').send({ invoice_number: 'INV-001', customer_id: 1 });
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    });

    test('should return 400 when foreign key constraint fails', async () => {
      validateInvoiceCreate.mockImplementation((req, res, next) => next());
      const fkError = new Error('insert or update on table "invoices" violates foreign key constraint');
      fkError.code = '23503';
      GenericEntityService.create.mockRejectedValue(fkError);

      const response = await request(app).post('/api/invoices').send({ invoice_number: 'INV-002', customer_id: 9999 });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // PATCH /api/invoices/:id - Validation
  // ===========================
  describe('PATCH /api/invoices/:id - Validation', () => {
    test('should return 400 when status is invalid', async () => {
      validateInvoiceUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid status value' });
      });

      const response = await request(app).patch('/api/invoices/1').send({ status: 'invalid_status' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(GenericEntityService.update).not.toHaveBeenCalled();
    });

    test('should return 400 when total_amount is negative', async () => {
      validateInvoiceUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Total amount cannot be negative' });
      });

      const response = await request(app).patch('/api/invoices/1').send({ total_amount: -100 });
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
      expect(GenericEntityService.delete).not.toHaveBeenCalled();
    });
  });
});
