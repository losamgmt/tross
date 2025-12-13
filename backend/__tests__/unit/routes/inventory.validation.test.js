/**
 * Unit Tests: inventory routes - Validation & Error Handling
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

jest.mock('../../../config/models/inventory-metadata', () => ({
  tableName: 'inventory',
  primaryKey: 'id',
  searchableFields: ['name', 'sku'],
  filterableFields: ['id', 'name', 'sku', 'category'],
  sortableFields: ['id', 'name', 'quantity', 'created_at'],
  defaultSort: { field: 'name', order: 'ASC' },
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
    req.validated.query.sortBy = req.query.sortBy || 'name';
    req.validated.query.sortOrder = req.query.sortOrder || 'ASC';
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
  validateInventoryCreate: jest.fn((req, res, next) => next()),
  validateInventoryUpdate: jest.fn((req, res, next) => next()),
}));

// ============================================================================
// TEST APP SETUP
// ============================================================================

const inventoryRouter = require('../../../routes/inventory');
const { validateInventoryCreate, validateInventoryUpdate, validateIdParam } = require('../../../validators');
const app = createRouteTestApp(inventoryRouter, '/api/inventory');

// ============================================================================
// TEST SUITE
// ============================================================================

describe('routes/inventory.js - Validation & Error Handling', () => {
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
  // GET /api/inventory/:id - Validation
  // ===========================
  describe('GET /api/inventory/:id - Validation', () => {
    test('should return 400 for invalid ID (non-numeric)', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID parameter' });
      });

      const response = await request(app).get('/api/inventory/abc');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid ID (zero or negative)', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'ID must be positive' });
      });

      const response = await request(app).get('/api/inventory/0');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // POST /api/inventory - Validation
  // ===========================
  describe('POST /api/inventory - Validation', () => {
    test('should return 400 when required fields are missing', async () => {
      validateInventoryCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Name is required' });
      });

      const response = await request(app).post('/api/inventory').send({});
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(GenericEntityService.create).not.toHaveBeenCalled();
    });

    test('should return 400 when quantity is negative', async () => {
      validateInventoryCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Quantity cannot be negative' });
      });

      const response = await request(app).post('/api/inventory').send({ name: 'Widget', quantity: -5 });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 409 when SKU already exists', async () => {
      validateInventoryCreate.mockImplementation((req, res, next) => next());
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      GenericEntityService.create.mockRejectedValue(duplicateError);

      const response = await request(app).post('/api/inventory').send({ name: 'Widget', sku: 'SKU-001' });
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    });
  });

  // ===========================
  // PATCH /api/inventory/:id - Validation
  // ===========================
  describe('PATCH /api/inventory/:id - Validation', () => {
    test('should return 400 when quantity is not a number', async () => {
      validateInventoryUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Quantity must be a number' });
      });

      const response = await request(app).patch('/api/inventory/1').send({ quantity: 'lots' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(GenericEntityService.update).not.toHaveBeenCalled();
    });

    test('should return 400 when unit_price is negative', async () => {
      validateInventoryUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Unit price cannot be negative' });
      });

      const response = await request(app).patch('/api/inventory/1').send({ unit_price: -10.50 });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // DELETE /api/inventory/:id - Validation
  // ===========================
  describe('DELETE /api/inventory/:id - Validation', () => {
    test('should return 400 for invalid ID parameter', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID' });
      });

      const response = await request(app).delete('/api/inventory/invalid');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(GenericEntityService.delete).not.toHaveBeenCalled();
    });
  });
});
