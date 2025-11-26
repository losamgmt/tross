/**
 * Unit Tests: work_orders routes - Validation & Error Handling
 *
 * Tests validation logic, constraint violations, and error scenarios.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Input validation, conflict handling, constraint errors
 */

const request = require('supertest');
const WorkOrder = require('../../../db/models/WorkOrder');
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

jest.mock('../../../db/models/WorkOrder');
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
  validateWorkOrderCreate: jest.fn((req, res, next) => next()),
  validateWorkOrderUpdate: jest.fn((req, res, next) => next()),
}));

// ============================================================================
// TEST APP SETUP (After mocks are hoisted)
// ============================================================================

const workOrdersRouter = require('../../../routes/work_orders');
const { validateWorkOrderCreate, validateWorkOrderUpdate, validateIdParam } = require('../../../validators');
const app = createRouteTestApp(workOrdersRouter, '/api/work_orders');

// ============================================================================
// TEST SUITE
// ============================================================================

describe('routes/work_orders.js - Validation & Error Handling', () => {
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
  // GET /api/work_orders/:id - Validation
  // ===========================
  describe('GET /api/work_orders/:id - Validation', () => {
    test('should return 400 for invalid ID (non-numeric)', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID parameter' });
      });

      const response = await request(app).get('/api/work_orders/abc');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid ID (zero or negative)', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'ID must be positive' });
      });

      const response = await request(app).get('/api/work_orders/0');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // POST /api/work_orders - Validation
  // ===========================
  describe('POST /api/work_orders - Validation', () => {
    test('should return 400 when required fields are missing', async () => {
      validateWorkOrderCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Customer ID is required' });
      });

      const response = await request(app).post('/api/work_orders').send({});
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(WorkOrder.create).not.toHaveBeenCalled();
    });

    test('should return 400 when priority is invalid', async () => {
      validateWorkOrderCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Priority must be low, medium, high, or urgent' });
      });

      const response = await request(app).post('/api/work_orders').send({ priority: 'super_high' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 400 when scheduled_date is in invalid format', async () => {
      validateWorkOrderCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid date format' });
      });

      const response = await request(app).post('/api/work_orders').send({ scheduled_date: 'not-a-date' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // PATCH /api/work_orders/:id - Validation
  // ===========================
  describe('PATCH /api/work_orders/:id - Validation', () => {
    test('should return 400 when status transition is invalid', async () => {
      validateWorkOrderUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid status value' });
      });

      const response = await request(app).patch('/api/work_orders/1').send({ status: 'invalid_status' });
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(WorkOrder.update).not.toHaveBeenCalled();
    });
  });

  // ===========================
  // DELETE /api/work_orders/:id - Validation
  // ===========================
  describe('DELETE /api/work_orders/:id - Validation', () => {
    test('should return 400 for invalid ID parameter', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID' });
      });

      const response = await request(app).delete('/api/work_orders/invalid');
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(WorkOrder.delete).not.toHaveBeenCalled();
    });
  });
});
