/**
 * Unit Tests: invoices routes - CRUD Operations
 * Uses unified test infrastructure for consistency
 */

// HOISTED MOCKS (Must be before imports)
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
  authenticateToken: jest.fn((req, res, next) => {
    req.dbUser = { id: 1, role: 'dispatcher' };
    req.user = { userId: 1 };
    next();
  }),
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
  validateInvoiceCreate: (req, res, next) => next(),
  validateInvoiceUpdate: (req, res, next) => next(),
}));

const request = require('supertest');
const express = require('express');
const invoicesRouter = require('../../../routes/invoices');
const Invoice = require('../../../db/models/Invoice');
const auditService = require('../../../services/audit-service');
const { getClientIp, getUserAgent } = require('../../../utils/request-helpers');
const { authenticateToken, requirePermission } = require('../../../middleware/auth');
const { enforceRLS } = require('../../../middleware/row-level-security');
const { HTTP_STATUS } = require('../../../config/constants');

const app = express();
app.use(express.json());
app.use('/api/invoices', invoicesRouter);

describe('Invoices Routes - CRUD', () => {
  beforeEach(() => {
    // CRITICAL: Reset ALL mocks to prevent contamination
    jest.clearAllMocks();
    
    // Reset middleware to fresh implementations
    authenticateToken.mockImplementation((req, res, next) => {
      req.dbUser = { id: 1, role: 'dispatcher' };
      req.user = { userId: 1 };
      next();
    });
    requirePermission.mockImplementation(() => (req, res, next) => next());
    enforceRLS.mockImplementation(() => (req, res, next) => {
      req.rlsPolicy = 'all_records';
      req.rlsUserId = 1;
      next();
    });
    
    // Reset request helpers
    getClientIp.mockReturnValue('127.0.0.1');
    getUserAgent.mockReturnValue('Jest Test Agent');
    
    // Reset audit service
    auditService.log.mockResolvedValue(true);
  });

  it('should get all invoices', async () => {
    Invoice.findAll.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 },
      appliedFilters: {},
      rlsApplied: true,
    });

    const response = await request(app).get('/api/invoices');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should get invoice by ID', async () => {
    Invoice.findById.mockResolvedValue({ id: 1, invoice_number: 'INV-001', customer_id: 10 });
    
    const response = await request(app).get('/api/invoices/1');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should create invoice', async () => {
    auditService.log.mockResolvedValue(true);
    Invoice.create.mockResolvedValue({
      id: 1,
      invoice_number: 'INV-001',
      customer_id: 10,
      amount: 100,
      total: 110,
    });

    const response = await request(app).post('/api/invoices').send({
      invoice_number: 'INV-001',
      customer_id: 10,
      amount: 100,
      total: 110,
    });

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should update invoice', async () => {
    auditService.log.mockResolvedValue(true);
    Invoice.findById.mockResolvedValue({ id: 1, invoice_number: 'INV-001', status: 'draft' });
    Invoice.update.mockResolvedValue({ id: 1, status: 'sent' });

    const response = await request(app).patch('/api/invoices/1').send({ status: 'sent' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should delete invoice', async () => {
    auditService.log.mockResolvedValue(true);
    Invoice.findById.mockResolvedValue({ id: 1, invoice_number: 'INV-001' });
    Invoice.delete.mockResolvedValue({ id: 1, is_active: false });

    const response = await request(app).delete('/api/invoices/1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
