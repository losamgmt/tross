/**
 * Unit Tests: customers routes - Validation & Error Handling
 *
 * Tests validation logic, constraint violations, and error scenarios.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: Input validation, conflict handling, constraint errors
 */

const request = require('supertest');
const Customer = require('../../../db/models/Customer');
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

jest.mock('../../../db/models/Customer');
jest.mock('../../../services/audit-service');
jest.mock('../../../utils/request-helpers');

jest.mock('../../../config/models/customer-metadata', () => ({
  tableName: 'customers',
  primaryKey: 'id',
  searchableFields: ['email', 'company_name'],
  filterableFields: ['id', 'email', 'is_active', 'status'],
  sortableFields: ['id', 'email', 'created_at'],
  defaultSort: 'created_at DESC',
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

// Validation mocks - these can reject requests with 400 errors
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

// ============================================================================
// TEST APP SETUP (After mocks are hoisted)
// ============================================================================

const customersRouter = require('../../../routes/customers');
const { validateCustomerCreate, validateCustomerUpdate, validateIdParam } = require('../../../validators');
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
  });

  afterEach(() => {
    teardownRouteMocks();
  });

  // ===========================
  // GET /api/customers/:id - Validation
  // ===========================
  describe('GET /api/customers/:id - Validation', () => {
    test('should return 400 for invalid ID (non-numeric)', async () => {
      // Arrange - validateIdParam will reject
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID parameter' });
      });

      // Act
      const response = await request(app).get('/api/customers/abc');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid ID (zero)', async () => {
      // Arrange
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'ID must be positive' });
      });

      // Act
      const response = await request(app).get('/api/customers/0');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 400 for invalid ID (negative)', async () => {
      // Arrange
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'ID must be positive' });
      });

      // Act
      const response = await request(app).get('/api/customers/-1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ===========================
  // POST /api/customers - Validation
  // ===========================
  describe('POST /api/customers - Validation', () => {
    test('should return 400 when required fields are missing', async () => {
      // Arrange - validator rejects empty body
      validateCustomerCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ 
          success: false, 
          error: 'Validation Error', 
          message: 'Email is required' 
        });
      });

      // Act
      const response = await request(app).post('/api/customers').send({});

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(Customer.create).not.toHaveBeenCalled();
    });

    test('should return 400 when email format is invalid', async () => {
      // Arrange
      validateCustomerCreate.mockImplementation((req, res, next) => {
        return res.status(400).json({ 
          success: false, 
          error: 'Validation Error', 
          message: 'Email must be a valid email address' 
        });
      });

      // Act
      const response = await request(app)
        .post('/api/customers')
        .send({ email: 'not-an-email' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('email');
    });

    test('should return 409 when email already exists', async () => {
      // Arrange - validation passes, but DB rejects duplicate
      validateCustomerCreate.mockImplementation((req, res, next) => next());
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      Customer.create.mockRejectedValue(duplicateError);

      // Act
      const response = await request(app)
        .post('/api/customers')
        .send({ email: 'existing@example.com', company_name: 'ACME' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
      expect(response.body.success).toBe(false);
    });
  });

  // ===========================
  // PATCH /api/customers/:id - Validation
  // ===========================
  describe('PATCH /api/customers/:id - Validation', () => {
    test('should return 400 when update data is invalid', async () => {
      // Arrange
      validateCustomerUpdate.mockImplementation((req, res, next) => {
        return res.status(400).json({ 
          success: false, 
          error: 'Validation Error', 
          message: 'Invalid field value' 
        });
      });

      // Act
      const response = await request(app)
        .patch('/api/customers/1')
        .send({ email: 'invalid' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(Customer.update).not.toHaveBeenCalled();
    });

    test('should return 409 when email already exists on update', async () => {
      // Arrange - validation passes, but DB rejects duplicate
      validateIdParam.mockImplementation(() => (req, res, next) => {
        req.validated = { id: 1 };
        next();
      });
      validateCustomerUpdate.mockImplementation((req, res, next) => next());
      Customer.findById.mockResolvedValue({ id: 1, email: 'original@test.com' });
      
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      Customer.update.mockRejectedValue(duplicateError);

      // Act
      const response = await request(app)
        .patch('/api/customers/1')
        .send({ email: 'taken@example.com' });

      // Assert - route returns 409 for duplicate constraint violations
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    });
  });

  // ===========================
  // DELETE /api/customers/:id - Validation
  // ===========================
  describe('DELETE /api/customers/:id - Validation', () => {
    test('should return 400 for invalid ID parameter', async () => {
      // Arrange
      validateIdParam.mockImplementation(() => (req, res, next) => {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid ID' });
      });

      // Act
      const response = await request(app).delete('/api/customers/invalid');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(Customer.delete).not.toHaveBeenCalled();
    });
  });
});
