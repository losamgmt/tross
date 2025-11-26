/**
 * Unit Tests: inventory routes - CRUD Operations
 *
 * Tests core CRUD operations for inventory routes with mocked dependencies.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: GET, POST, PATCH, DELETE /api/inventory and /api/inventory/:id
 */

const request = require('supertest');
const Inventory = require('../../../db/models/Inventory');
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

jest.mock('../../../db/models/Inventory');
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
  validateInventoryCreate: (req, res, next) => next(),
  validateInventoryUpdate: (req, res, next) => next(),
}));

// ============================================================================
// TEST APP SETUP (After mocks are hoisted)
// ============================================================================

const inventoryRouter = require('../../../routes/inventory');
const app = createRouteTestApp(inventoryRouter, '/api/inventory');

// ============================================================================
// TEST SUITE
// ============================================================================

describe('routes/inventory.js - CRUD Operations', () => {
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
  // GET /api/inventory - List All
  // ===========================
  describe('GET /api/inventory', () => {
    test('should return paginated inventory items with count and timestamp', async () => {
      // Arrange
      const mockItems = [
        { id: 1, name: 'Widget A', sku: 'WGT-001', quantity: 100, unit_price: 25.00 },
        { id: 2, name: 'Widget B', sku: 'WGT-002', quantity: 50, unit_price: 35.00 },
      ];
      Inventory.findAll.mockResolvedValue({
        data: mockItems,
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
        appliedFilters: {},
        rlsApplied: false,
      });

      // Act
      const response = await request(app).get('/api/inventory');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockItems);
      expect(response.body.count).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(Inventory.findAll).toHaveBeenCalledTimes(1);
    });

    test('should return empty array when no inventory items exist', async () => {
      // Arrange
      Inventory.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
        appliedFilters: {},
        rlsApplied: false,
      });

      // Act
      const response = await request(app).get('/api/inventory');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    test('should handle database errors', async () => {
      // Arrange
      Inventory.findAll.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app).get('/api/inventory');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  // ===========================
  // GET /api/inventory/:id - Get by ID
  // ===========================
  describe('GET /api/inventory/:id', () => {
    test('should return inventory item by ID', async () => {
      // Arrange
      const mockItem = { id: 1, name: 'Widget A', sku: 'WGT-001', quantity: 100 };
      Inventory.findById.mockResolvedValue(mockItem);

      // Act
      const response = await request(app).get('/api/inventory/1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockItem);
      expect(Inventory.findById).toHaveBeenCalledWith(1, expect.any(Object));
    });

    test('should return 404 when inventory item not found', async () => {
      // Arrange
      Inventory.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).get('/api/inventory/999');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle database errors', async () => {
      // Arrange
      Inventory.findById.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app).get('/api/inventory/1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  // ===========================
  // POST /api/inventory - Create
  // ===========================
  describe('POST /api/inventory', () => {
    test('should create inventory item successfully', async () => {
      // Arrange
      const newItem = { name: 'Widget C', sku: 'WGT-003', quantity: 75, unit_price: 45.00 };
      const createdItem = { id: 3, ...newItem, is_active: true };
      Inventory.create.mockResolvedValue(createdItem);

      // Act
      const response = await request(app).post('/api/inventory').send(newItem);

      // Assert
      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdItem);
      expect(Inventory.create).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should handle database errors during creation', async () => {
      // Arrange
      Inventory.create.mockRejectedValue(new Error('SKU already exists'));

      // Act
      const response = await request(app).post('/api/inventory').send({ name: 'Duplicate', sku: 'DUP-001' });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  // ===========================
  // PATCH /api/inventory/:id - Update
  // ===========================
  describe('PATCH /api/inventory/:id', () => {
    test('should update inventory item successfully', async () => {
      // Arrange
      const existingItem = { id: 1, name: 'Widget A', quantity: 100 };
      const updatedItem = { id: 1, name: 'Widget A', quantity: 85 };
      // Route calls findById twice: once to check existence, once to get updated record
      Inventory.findById
        .mockResolvedValueOnce(existingItem)
        .mockResolvedValueOnce(updatedItem);
      Inventory.update.mockResolvedValue(updatedItem);

      // Act
      const response = await request(app).patch('/api/inventory/1').send({ quantity: 85 });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedItem);
      expect(Inventory.update).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should return 404 when updating non-existent inventory item', async () => {
      // Arrange
      Inventory.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).patch('/api/inventory/999').send({ quantity: 50 });

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
    });
  });

  // ===========================
  // DELETE /api/inventory/:id - Delete
  // ===========================
  describe('DELETE /api/inventory/:id', () => {
    test('should delete inventory item successfully', async () => {
      // Arrange
      const existingItem = { id: 1, name: 'Widget A', is_active: true };
      Inventory.findById.mockResolvedValue(existingItem);
      Inventory.delete.mockResolvedValue({ id: 1, is_active: false });

      // Act
      const response = await request(app).delete('/api/inventory/1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Inventory.delete).toHaveBeenCalledWith(1);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should return 404 when deleting non-existent inventory item', async () => {
      // Arrange
      Inventory.findById.mockResolvedValue(null);

      // Act
      const response = await request(app).delete('/api/inventory/999');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.success).toBe(false);
    });
  });
});
