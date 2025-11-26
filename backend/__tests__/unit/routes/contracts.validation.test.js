/**
 * Unit Tests: contracts routes - Validation & Error Handling
 *
 * Tests validation logic, constraint violations, and error scenarios.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Input validation, conflict handling, constraint errors
 */

const request = require('supertest');
const Contract = require('../../../db/models/Contract');
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

jest.mock('../../../db/models/Contract');
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
  validateContractCreate: jest.fn((req, res, next) => next()),
  validateContractUpdate: jest.fn((req, res, next) => next()),
}));

// ============================================================================
// TEST APP SETUP (After mocks are hoisted)
// ============================================================================

const contractsRouter = require('../../../routes/contracts');
const { validateContractCreate, validateContractUpdate, validateIdParam } = require('../../../validators');
const app = createRouteTestApp(contractsRouter, '/api/contracts');

// ============================================================================
// TEST SUITE
// ============================================================================

describe('routes/contracts.js - Validation & Error Handling', () => {
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
  // GET /api/contracts/:id - Validation
  // ===========================
  describe('GET /api/contracts/:id - Validation', () => {
    test('should return 400 for invalid ID (non-numeric)', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID parameter' });
      });

      const response = await request(app).get('/api/contracts/abc');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid ID (zero or negative)', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'ID must be positive' });
      });

      const response = await request(app).get('/api/contracts/-5');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // POST /api/contracts - Validation
  // ===========================
  describe('POST /api/contracts - Validation', () => {
    test('should return 400 when required fields are missing', async () => {
      validateContractCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Customer ID is required' });
      });

      const response = await request(app).post('/api/contracts').send({});
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(Contract.create).not.toHaveBeenCalled();
    });

    test('should return 400 when end_date is before start_date', async () => {
      validateContractCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'End date must be after start date' });
      });

      const response = await request(app).post('/api/contracts').send({ 
        start_date: '2025-12-31', 
        end_date: '2025-01-01' 
      });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 409 when contract_number already exists', async () => {
      validateContractCreate.mockImplementation((req, res, next) => next());
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      Contract.create.mockRejectedValue(duplicateError);

      const response = await request(app).post('/api/contracts').send({ contract_number: 'CON-001' });
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    });
  });

  // ===========================
  // PATCH /api/contracts/:id - Validation
  // ===========================
  describe('PATCH /api/contracts/:id - Validation', () => {
    test('should return 400 when status value is invalid', async () => {
      validateContractUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid status value' });
      });

      const response = await request(app).patch('/api/contracts/1').send({ status: 'bogus_status' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(Contract.update).not.toHaveBeenCalled();
    });

    test('should return 400 when date format is invalid', async () => {
      validateContractUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid date format' });
      });

      const response = await request(app).patch('/api/contracts/1').send({ end_date: 'not-a-date' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // DELETE /api/contracts/:id - Validation
  // ===========================
  describe('DELETE /api/contracts/:id - Validation', () => {
    test('should return 400 for invalid ID parameter', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID' });
      });

      const response = await request(app).delete('/api/contracts/invalid');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(Contract.delete).not.toHaveBeenCalled();
    });
  });
});
