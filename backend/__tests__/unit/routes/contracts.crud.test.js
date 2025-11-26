/**
 * Unit Tests: contracts routes - CRUD Operations
 *
 * Tests core CRUD operations for contract routes with mocked dependencies.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: GET, POST, PATCH, DELETE /api/contracts and /api/contracts/:id
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
    if (!req.validated) req.validated = {};
    req.validated.id = id;
    next();
  }),
  // CRITICAL: Direct middleware CANNOT be jest.fn() wrapped
  validateContractCreate: (req, res, next) => next(),
  validateContractUpdate: (req, res, next) => next(),
}));

// ============================================================================
// TEST APP SETUP (After mocks are hoisted)
// ============================================================================

const contractsRouter = require('../../../routes/contracts');
const app = createRouteTestApp(contractsRouter, '/api/contracts');

// ============================================================================
// TEST SUITE
// ============================================================================

describe('routes/contracts.js - CRUD Operations', () => {
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
  // GET /api/contracts - List All
  // ===========================
  describe('GET /api/contracts', () => {
    test('should return paginated contracts with count and timestamp', async () => {
      // Arrange
      const mockContracts = [
        { id: 1, customer_id: 10, status: 'active', created_at: '2025-01-01T00:00:00Z' },
        { id: 2, customer_id: 20, status: 'pending', created_at: '2025-01-02T00:00:00Z' },
      ];
      Contract.findAll.mockResolvedValue({
        data: mockContracts,
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
        appliedFilters: {},
        rlsApplied: true,
      });

      // Act
      const response = await request(app).get('/api/contracts');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContracts);
      expect(response.body.count).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(Contract.findAll).toHaveBeenCalledTimes(1);
    });

    test('should return empty array when no contracts exist', async () => {
      // Arrange
      Contract.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
        appliedFilters: {},
        rlsApplied: true,
      });

      // Act
      const response = await request(app).get('/api/contracts');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    test('should handle database errors', async () => {
      // Arrange
      Contract.findAll.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app).get('/api/contracts');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBeDefined();
    });
  });

  // ===========================
  // GET /api/contracts/:id - Get by ID
  // ===========================
  describe('GET /api/contracts/:id', () => {
    test('should return contract by ID', async () => {
      // Arrange
      const mockContract = { id: 1, customer_id: 10, status: 'active' };
      Contract.findById.mockResolvedValue(mockContract);

      // Act
      const response = await request(app).get('/api/contracts/1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContract);
      expect(Contract.findById).toHaveBeenCalledWith(1, expect.any(Object));
    });

    test('should return 404 when contract not found', async () => {
      // Arrange
      Contract.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).get('/api/contracts/999');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle database errors', async () => {
      // Arrange
      Contract.findById.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app).get('/api/contracts/1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBeDefined();
    });
  });

  // ===========================
  // POST /api/contracts - Create
  // ===========================
  describe('POST /api/contracts', () => {
    test('should create contract successfully', async () => {
      // Arrange
      const newContract = { customer_id: 10, start_date: '2025-01-01', end_date: '2025-12-31' };
      const createdContract = { id: 1, ...newContract, status: 'pending' };
      Contract.create.mockResolvedValue(createdContract);

      // Act
      const response = await request(app).post('/api/contracts').send(newContract);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdContract);
      expect(Contract.create).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      // Arrange
      Contract.create.mockRejectedValue(new Error('Database constraint violation'));

      // Act
      const response = await request(app).post('/api/contracts').send({ customer_id: 10 });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBeDefined();
    });
  });

  // ===========================
  // PATCH /api/contracts/:id - Update
  // ===========================
  describe('PATCH /api/contracts/:id', () => {
    test('should update contract successfully', async () => {
      // Arrange
      const existingContract = { id: 1, customer_id: 10, status: 'pending' };
      const updatedContract = { id: 1, customer_id: 10, status: 'active' };
      // Route calls findById twice: once to check existence, once to get updated record
      Contract.findById
        .mockResolvedValueOnce(existingContract)
        .mockResolvedValueOnce(updatedContract);
      Contract.update.mockResolvedValue(updatedContract);

      // Act
      const response = await request(app).patch('/api/contracts/1').send({ status: 'active' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedContract);
      expect(Contract.update).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should return 404 when updating non-existent contract', async () => {
      // Arrange
      Contract.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).patch('/api/contracts/999').send({ status: 'active' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
    });
  });

  // ===========================
  // DELETE /api/contracts/:id - Delete
  // ===========================
  describe('DELETE /api/contracts/:id', () => {
    test('should delete contract successfully', async () => {
      // Arrange
      const existingContract = { id: 1, customer_id: 10, is_active: true };
      Contract.findById.mockResolvedValue(existingContract);
      Contract.delete.mockResolvedValue({ id: 1, is_active: false });

      // Act
      const response = await request(app).delete('/api/contracts/1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Contract.delete).toHaveBeenCalledWith(1);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should return 404 when deleting non-existent contract', async () => {
      // Arrange
      Contract.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).delete('/api/contracts/999');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
    });
  });
});
