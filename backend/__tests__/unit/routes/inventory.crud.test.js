/**
 * Unit Tests: inventory routes - CRUD Operations
 */

jest.mock('../../../db/models/Inventory');
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
  validateInventoryCreate: (req, res, next) => {
    next();
  },
  validateInventoryUpdate: (req, res, next) => {
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const inventoryRouter = require('../../../routes/inventory');
const Inventory = require('../../../db/models/Inventory');
const auditService = require('../../../services/audit-service');
const { authenticateToken, requirePermission } = require('../../../middleware/auth');
const { enforceRLS } = require('../../../middleware/row-level-security');
const { getClientIp, getUserAgent } = require('../../../utils/request-helpers');
const { HTTP_STATUS } = require('../../../config/constants');

const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRouter);

describe('Inventory Routes - CRUD', () => {
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
    // validateInventoryCreate and validateInventoryUpdate are plain functions, don't need reset
    
    // Reset request helpers
    getClientIp.mockReturnValue('127.0.0.1');
    getUserAgent.mockReturnValue('Jest Test Agent');
    
    // Reset audit service
    auditService.log.mockResolvedValue(true);
  });

  it('should get all inventory items', async () => {
    Inventory.findAll.mockResolvedValue({ data: [], pagination: {}, appliedFilters: {}, rlsApplied: false });
    const response = await request(app).get('/api/inventory');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should get inventory item by ID', async () => {
    Inventory.findById.mockResolvedValue({ id: 1, name: 'Widget', quantity: 50 });
    const response = await request(app).get('/api/inventory/1');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should create inventory item', async () => {
    auditService.log.mockResolvedValue(true);
    Inventory.create.mockResolvedValue({ id: 1, name: 'Widget', quantity: 50 });
    const response = await request(app).post('/api/inventory').send({ name: 'Widget', quantity: 50 });
    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should update inventory item', async () => {
    auditService.log.mockResolvedValue(true);
    Inventory.findById.mockResolvedValue({ id: 1, quantity: 50 }); // Mock existing inventory
    Inventory.update.mockResolvedValue({ id: 1, quantity: 45 });
    const response = await request(app).patch('/api/inventory/1').send({ quantity: 45 });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should delete inventory item', async () => {
    auditService.log.mockResolvedValue(true);
    Inventory.findById.mockResolvedValue({ id: 1, is_active: true }); // Mock existing inventory
    Inventory.delete.mockResolvedValue({ id: 1, is_active: false });
    const response = await request(app).delete('/api/inventory/1');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
