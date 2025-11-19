/**
 * Unit Tests: contracts routes - CRUD Operations
 */

jest.mock('../../../db/models/Contract');
jest.mock('../../../services/audit-service');
jest.mock('../../../utils/request-helpers');
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.dbUser = { id: 1, role: 'dispatcher' };
    req.user = { userId: 1 };
    next();
  }),
  requirePermission: jest.fn(() => (req, res, next) => next()),
}));
jest.mock('../../../middleware/row-level-security', () => ({
  enforceRLS: jest.fn(() => (req, res, next) => next()),
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
  validateContractCreate: (req, res, next) => {
    next();
  },
  validateContractUpdate: (req, res, next) => {
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const contractsRouter = require('../../../routes/contracts');
const Contract = require('../../../db/models/Contract');
const auditService = require('../../../services/audit-service');
const { getClientIp, getUserAgent } = require('../../../utils/request-helpers');
const { authenticateToken, requirePermission } = require('../../../middleware/auth');
const { enforceRLS } = require('../../../middleware/row-level-security');
const { HTTP_STATUS } = require('../../../config/constants');

const app = express();
app.use(express.json());
app.use('/api/contracts', contractsRouter);

describe('Contracts Routes - CRUD', () => {
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
    
    // Reset validators that are jest.fn() factories
    const { validatePagination, validateQuery, validateIdParam } = require('../../../validators');
    validatePagination.mockImplementation(() => (req, res, next) => {
      if (!req.validated) req.validated = {};
      req.validated.pagination = { page: 1, limit: 50, offset: 0 };
      next();
    });
    validateQuery.mockImplementation(() => (req, res, next) => {
      if (!req.validated) req.validated = {};
      if (!req.validated.query) req.validated.query = {};
      req.validated.query.search = req.query.search;
      req.validated.query.filters = req.query.filters || {};
      req.validated.query.sortBy = req.query.sortBy || 'created_at';
      req.validated.query.sortOrder = req.query.sortOrder || 'DESC';
      next();
    });
    validateIdParam.mockImplementation(() => (req, res, next) => {
      const id = parseInt(req.params.id);
      if (!req.validated) req.validated = {};
      req.validated.id = id;
      next();
    });
    // validateContractCreate and validateContractUpdate are plain functions, don't need reset
    
    // Reset request helpers
    getClientIp.mockReturnValue('127.0.0.1');
    getUserAgent.mockReturnValue('Jest Test Agent');
    
    // Reset audit service
    auditService.log.mockResolvedValue(true);
  });

  it('should get all contracts', async () => {
    Contract.findAll.mockResolvedValue({ data: [], pagination: {}, appliedFilters: {}, rlsApplied: true });
    const response = await request(app).get('/api/contracts');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should get contract by ID', async () => {
    Contract.findById.mockResolvedValue({ id: 1, customer_id: 10 });
    const response = await request(app).get('/api/contracts/1');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should create contract', async () => {
    auditService.log.mockResolvedValue(true);
    Contract.create.mockResolvedValue({ id: 1, customer_id: 10 });
    const response = await request(app).post('/api/contracts').send({ customer_id: 10 });
    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should update contract', async () => {
    auditService.log.mockResolvedValue(true);
    Contract.findById.mockResolvedValue({ id: 1, status: 'pending' }); // Mock existing contract
    Contract.update.mockResolvedValue({ id: 1, status: 'active' });
    const response = await request(app).patch('/api/contracts/1').send({ status: 'active' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should delete contract', async () => {
    auditService.log.mockResolvedValue(true);
    Contract.findById.mockResolvedValue({ id: 1, is_active: true }); // Mock existing contract
    Contract.delete.mockResolvedValue({ id: 1, is_active: false });
    const response = await request(app).delete('/api/contracts/1');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
