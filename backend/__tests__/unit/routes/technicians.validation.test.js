/**
 * Unit Tests: technicians routes - Validation & Error Handling
 *
 * Tests validation logic, constraint violations, and error scenarios.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Input validation, conflict handling, constraint errors
 * 
 * NOTE: Now uses GenericEntityService instead of Technician model (Phase 4 strangler-fig)
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
  validateTechnicianCreate: jest.fn((req, res, next) => next()),
  validateTechnicianUpdate: jest.fn((req, res, next) => next()),
}));

const {
  validateIdParam,
  validateTechnicianCreate,
  validateTechnicianUpdate,
} = require('../../../validators');

// ============================================================================
// TEST APP SETUP (After mocks are hoisted)
// ============================================================================

const techniciansRouter = require('../../../routes/technicians');
const app = createRouteTestApp(techniciansRouter, '/api/technicians');

// ============================================================================
// TEST SUITE
// ============================================================================

describe('routes/technicians.js - Validation & Error Handling', () => {
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
    validateTechnicianCreate.mockImplementation((req, res, next) => next());
    validateTechnicianUpdate.mockImplementation((req, res, next) => next());
  });

  afterEach(() => {
    teardownRouteMocks();
  });

  // ===========================
  // GET /api/technicians/:id - Validation
  // ===========================
  describe('GET /api/technicians/:id - Validation', () => {
    test('should return 400 when id is not a valid number', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'ID must be a positive integer' });
      });

      const response = await request(app).get('/api/technicians/invalid');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // POST /api/technicians - Validation
  // ===========================
  describe('POST /api/technicians - Validation', () => {
    test('should return 400 when required fields are missing', async () => {
      validateTechnicianCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Required fields missing' });
      });

      const response = await request(app).post('/api/technicians').send({});
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(GenericEntityService.create).not.toHaveBeenCalled();
    });

    test('should return 400 when hourly_rate is negative', async () => {
      validateTechnicianCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Hourly rate must be positive' });
      });

      const response = await request(app).post('/api/technicians').send({ hourly_rate: -50 });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 409 when license_number already exists', async () => {
      validateTechnicianCreate.mockImplementation((req, res, next) => next());
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      GenericEntityService.create.mockRejectedValue(duplicateError);

      const response = await request(app).post('/api/technicians').send({ license_number: 'TECH-001' });
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    });
  });

  // ===========================
  // PATCH /api/technicians/:id - Validation
  // ===========================
  describe('PATCH /api/technicians/:id - Validation', () => {
    test('should return 400 when update data is invalid', async () => {
      validateTechnicianUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid status value' });
      });

      const response = await request(app).patch('/api/technicians/1').send({ status: 'invalid_status' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(GenericEntityService.update).not.toHaveBeenCalled();
    });

    test('should return 404 when technician does not exist', async () => {
      GenericEntityService.findById.mockResolvedValue(null);

      const response = await request(app).patch('/api/technicians/999').send({ status: 'active' });
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  // ===========================
  // DELETE /api/technicians/:id - Validation
  // ===========================
  describe('DELETE /api/technicians/:id - Validation', () => {
    test('should return 404 when technician does not exist', async () => {
      GenericEntityService.findById.mockResolvedValue(null);

      const response = await request(app).delete('/api/technicians/999');
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });
});
