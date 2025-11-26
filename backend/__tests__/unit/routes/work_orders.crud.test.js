/**
 * Unit Tests: work_orders routes - CRUD Operations
 *
 * Tests core CRUD operations for work order routes with mocked dependencies.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: GET, POST, PATCH, DELETE /api/work_orders and /api/work_orders/:id
 */

// ============================================================================
// MOCK CONFIGURATION (Hoisted by Jest)
// ============================================================================

jest.mock('../../../db/models/WorkOrder');
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

// Mock validators (direct validators must be plain functions, not jest.fn())
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
  validateWorkOrderCreate: (req, res, next) => next(),
  validateWorkOrderUpdate: (req, res, next) => next(),
}));

const request = require('supertest');
const WorkOrder = require('../../../db/models/WorkOrder');
const auditService = require('../../../services/audit-service');
const { getClientIp, getUserAgent } = require('../../../utils/request-helpers');
const { authenticateToken, requirePermission } = require('../../../middleware/auth');
const { enforceRLS } = require('../../../middleware/row-level-security');
const { HTTP_STATUS } = require('../../../config/constants');
const {
  createRouteTestApp,
  setupRouteMocks,
  teardownRouteMocks,
} = require('../../helpers/route-test-setup');

// ============================================================================
// TEST APP SETUP (After mocks are hoisted)
// ============================================================================

const workOrdersRouter = require('../../../routes/work_orders');
const app = createRouteTestApp(workOrdersRouter, '/api/work_orders');

describe('routes/work_orders.js - CRUD Operations', () => {
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

  describe('GET /api/work_orders', () => {
    test('should return all work orders successfully', async () => {
      const mockWorkOrders = [
        { id: 1, title: 'Repair AC', status: 'pending', customer_id: 10 },
        { id: 2, title: 'Install Heater', status: 'in_progress', customer_id: 11 },
      ];

      WorkOrder.findAll.mockResolvedValue({
        data: mockWorkOrders,
        pagination: { page: 1, limit: 50, totalRecords: 2, totalPages: 1 },
        appliedFilters: {},
        rlsApplied: true,
      });

      const response = await request(app).get('/api/work_orders');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockWorkOrders);
      expect(response.body.count).toBe(2);
      expect(WorkOrder.findAll).toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      WorkOrder.findAll.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/work_orders');

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('GET /api/work_orders/:id', () => {
    test('should return work order by ID', async () => {
      const mockWorkOrder = { id: 1, title: 'Repair AC', status: 'pending', customer_id: 10 };
      WorkOrder.findById.mockResolvedValue(mockWorkOrder);

      const response = await request(app).get('/api/work_orders/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(WorkOrder.findById).toHaveBeenCalledWith(1, expect.any(Object));
    });

    test('should return 404 for non-existent work order', async () => {
      WorkOrder.findById.mockResolvedValue(null);

      const response = await request(app).get('/api/work_orders/999');

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('should handle database errors', async () => {
      WorkOrder.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/work_orders/1');

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('POST /api/work_orders', () => {
    test('should create a new work order successfully', async () => {
      const newWorkOrderData = { title: 'Fix Plumbing', customer_id: 10, priority: 'high' };
      const createdWorkOrder = { id: 3, ...newWorkOrderData, status: 'pending', created_at: new Date().toISOString() };

      WorkOrder.create.mockResolvedValue(createdWorkOrder);
      auditService.log.mockResolvedValue(true);

      const response = await request(app).post('/api/work_orders').send(newWorkOrderData);

      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(WorkOrder.create).toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      WorkOrder.create.mockRejectedValue(new Error('Creation failed'));

      const response = await request(app)
        .post('/api/work_orders')
        .send({ title: 'Test', customer_id: 10 });

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('PATCH /api/work_orders/:id', () => {
    test('should update a work order successfully', async () => {
      const updateData = { status: 'completed' };
      const existingWorkOrder = { id: 1, title: 'Repair AC', status: 'in_progress', customer_id: 10 };
      const updatedWorkOrder = { ...existingWorkOrder, status: 'completed' };

      WorkOrder.findById.mockResolvedValueOnce(existingWorkOrder);
      WorkOrder.update.mockResolvedValue(updatedWorkOrder);
      WorkOrder.findById.mockResolvedValueOnce(updatedWorkOrder);
      auditService.log.mockResolvedValue(true);

      const response = await request(app).patch('/api/work_orders/1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should return 404 for non-existent work order', async () => {
      WorkOrder.findById.mockResolvedValue(null);

      const response = await request(app).patch('/api/work_orders/999').send({ status: 'completed' });

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE /api/work_orders/:id', () => {
    test('should soft delete a work order successfully', async () => {
      const existingWorkOrder = {
        id: 1,
        title: 'Repair AC',
        is_active: true,
      };
      const deletedWorkOrder = {
        ...existingWorkOrder,
        is_active: false,
      };

      WorkOrder.findById.mockResolvedValue(existingWorkOrder);
      WorkOrder.delete.mockResolvedValue(deletedWorkOrder);
      auditService.log.mockResolvedValue(true);

      const response = await request(app).delete('/api/work_orders/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 404 for non-existent work order', async () => {
      WorkOrder.findById.mockResolvedValue(null);

      const response = await request(app).delete('/api/work_orders/999');

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('should handle database errors', async () => {
      // Arrange
      WorkOrder.findById.mockResolvedValue({ id: 1, title: 'Repair AC' });
      WorkOrder.delete.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app).delete('/api/work_orders/1');

      // Assert
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBeDefined();
    });
  });
});
