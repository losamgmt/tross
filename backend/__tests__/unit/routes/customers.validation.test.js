/**
 * Unit Tests: customers routes - Validation & Error Handling
 *
 * Tests validation logic, constraint violations, and error scenarios.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Input validation, conflict handling, constraint errors
 * 
 * NOTE: Now uses GenericEntityService instead of Customer model (Phase 4 strangler-fig)
 */

const request = require('supertest');
const GenericEntityService = require('../../../services/generic-entity-service');
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

jest.mock('../../../services/generic-entity-service');
jest.mock('../../../services/audit-service');
jest.mock('../../../utils/request-helpers');

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
  validateCustomerCreate: jest.fn((req, res, next) => next()),
  validateCustomerUpdate: jest.fn((req, res, next) => next()),
}));

const {
  validateIdParam,
  validateCustomerCreate,
  validateCustomerUpdate,
} = require('../../../validators');

// ============================================================================
// TEST APP SETUP (After mocks are hoisted)
// ============================================================================

const customersRouter = require('../../../routes/customers');
const app = createRouteTestApp(customersRouter, '/api/customers');

// ============================================================================
// TEST SUITE
// ============================================================================

describe('routes/customers.js - Validation & Error Handling', () => {
  beforeEach(() => {
    setupRouteMocks({
      getClientIp,
      getUserAgent,
      authenticateToken,
      requirePermission,
      enforceRLS,
    });
    auditService.log.mockResolvedValue(true);
    
    // Reset GenericEntityService mocks
    GenericEntityService.findAll = jest.fn();
    GenericEntityService.findById = jest.fn();
    GenericEntityService.create = jest.fn();
    GenericEntityService.update = jest.fn();
    GenericEntityService.delete = jest.fn();

    // Reset validator mocks
    validateCustomerCreate.mockImplementation((req, res, next) => next());
    validateCustomerUpdate.mockImplementation((req, res, next) => next());
  });

  afterEach(() => {
    teardownRouteMocks();
  });

  // ===========================
  // GET /api/customers/:id - Validation
  // ===========================
  describe('GET /api/customers/:id - Validation', () => {
    test('should return 400 when id is not a valid number', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'ID must be a positive integer' });
      });

      const response = await request(app).get('/api/customers/invalid');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // POST /api/customers - Validation
  // ===========================
  describe('POST /api/customers - Validation', () => {
    test('should return 400 when required fields are missing', async () => {
      validateCustomerCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Required fields missing' });
      });

      const response = await request(app).post('/api/customers').send({});
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(GenericEntityService.create).not.toHaveBeenCalled();
    });

    test('should return 409 when email already exists', async () => {
      validateCustomerCreate.mockImplementation((req, res, next) => next());
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      GenericEntityService.create.mockRejectedValue(duplicateError);

      const response = await request(app).post('/api/customers').send({ email: 'existing@example.com' });
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    });
  });

  // ===========================
  // PATCH /api/customers/:id - Validation
  // ===========================
  describe('PATCH /api/customers/:id - Validation', () => {
    test('should return 400 when update data is invalid', async () => {
      validateCustomerUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid email format' });
      });

      const response = await request(app).patch('/api/customers/1').send({ email: 'bad-email' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(GenericEntityService.update).not.toHaveBeenCalled();
    });

    test('should return 404 when customer does not exist', async () => {
      GenericEntityService.findById.mockResolvedValue(null);

      const response = await request(app).patch('/api/customers/999').send({ first_name: 'New' });
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  // ===========================
  // DELETE /api/customers/:id - Validation
  // ===========================
  describe('DELETE /api/customers/:id - Validation', () => {
    test('should return 404 when customer does not exist', async () => {
      GenericEntityService.findById.mockResolvedValue(null);

      const response = await request(app).delete('/api/customers/999');
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });
});
