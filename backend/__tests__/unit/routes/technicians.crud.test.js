/**
 * Unit Tests: technicians routes - CRUD Operations
 *
 * Tests core CRUD operations for technician routes with mocked dependencies.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: GET, POST, PATCH, DELETE /api/technicians and /api/technicians/:id
 */

// ============================================================================
// MOCK CONFIGURATION (Hoisted by Jest)
// ============================================================================

jest.mock('../../../db/models/Technician');
jest.mock('../../../services/audit-service');
jest.mock('../../../utils/request-helpers');
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => next()),
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
  validateTechnicianCreate: (req, res, next) => next(),
  validateTechnicianUpdate: (req, res, next) => next(),
}));

const request = require('supertest');
const Technician = require('../../../db/models/Technician');
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

const techniciansRouter = require('../../../routes/technicians');
const app = createRouteTestApp(techniciansRouter, '/api/technicians');

describe('routes/technicians.js - CRUD Operations', () => {
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

  describe('GET /api/technicians', () => {
    test('should return all technicians successfully', async () => {
      const mockTechnicians = [
        { id: 1, license_number: 'TECH-001', status: 'available', is_active: true },
        { id: 2, license_number: 'TECH-002', status: 'on_job', is_active: true },
      ];

      Technician.findAll.mockResolvedValue({
        data: mockTechnicians,
        pagination: { page: 1, limit: 50, totalRecords: 2, totalPages: 1 },
        appliedFilters: {},
        rlsApplied: true,
      });

      const response = await request(app).get('/api/technicians');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTechnicians);
      expect(response.body.count).toBe(2);
      expect(Technician.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        search: undefined,
        filters: {},
        sortBy: 'created_at',
        sortOrder: 'DESC',
        req: expect.any(Object),
      });
    });

    test('should handle search and filtering', async () => {
      Technician.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 },
        appliedFilters: { status: 'available' },
        rlsApplied: true,
      });

      const response = await request(app)
        .get('/api/technicians')
        .query({ search: 'TECH', status: 'available' });

      expect(response.status).toBe(200);
      expect(Technician.findAll).toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      Technician.findAll.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/technicians');

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/technicians/:id', () => {
    test('should return a technician by ID', async () => {
      const mockTechnician = {
        id: 1,
        license_number: 'TECH-001',
        status: 'available',
        hourly_rate: 75.50,
        is_active: true,
      };

      Technician.findById.mockResolvedValue(mockTechnician);

      const response = await request(app).get('/api/technicians/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTechnician);
      expect(Technician.findById).toHaveBeenCalledWith(1, expect.any(Object));
    });

    test('should return 404 for non-existent technician', async () => {
      Technician.findById.mockResolvedValue(null);

      const response = await request(app).get('/api/technicians/999');

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.error).toBeDefined();
    });

    test('should handle database errors', async () => {
      Technician.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/technicians/1');

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('POST /api/technicians', () => {
    test('should create a new technician successfully', async () => {
      const newTechnicianData = {
        license_number: 'TECH-003',
        hourly_rate: 85.00,
        skills: ['plumbing', 'electrical'],
      };

      const createdTechnician = {
        id: 3,
        ...newTechnicianData,
        status: 'available',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      Technician.create.mockResolvedValue(createdTechnician);
      auditService.log.mockResolvedValue(true);

      const response = await request(app).post('/api/technicians').send(newTechnicianData);

      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdTechnician);
      expect(Technician.create).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: 'create',
          resourceType: 'technician',
          resourceId: 3,
          result: 'success',
        })
      );
    });

    test('should handle database errors', async () => {
      Technician.create.mockRejectedValue(new Error('License number already exists'));

      const response = await request(app)
        .post('/api/technicians')
        .send({ license_number: 'TECH-DUPLICATE' });

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('PATCH /api/technicians/:id', () => {
    test('should update a technician successfully', async () => {
      const updateData = { status: 'on_job', hourly_rate: 90.00 };
      const updatedTechnician = {
        id: 1,
        license_number: 'TECH-001',
        ...updateData,
        is_active: true,
      };

      Technician.findById.mockResolvedValueOnce({ id: 1, status: 'available' });
      Technician.update.mockResolvedValue(updatedTechnician);
      Technician.findById.mockResolvedValueOnce(updatedTechnician);
      auditService.log.mockResolvedValue(true);

      const response = await request(app).patch('/api/technicians/1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedTechnician);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should return 404 for non-existent technician', async () => {
      Technician.findById.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/technicians/999')
        .send({ status: 'on_job' });

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE /api/technicians/:id', () => {
    test('should hard delete a technician successfully', async () => {
      Technician.findById.mockResolvedValue({ id: 1, license_number: 'TECH-001' });
      Technician.delete.mockResolvedValue({ id: 1 });
      auditService.log.mockResolvedValue(true);

      const response = await request(app).delete('/api/technicians/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Technician.delete).toHaveBeenCalledWith(1);
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 1,
        action: 'delete',
        resourceType: 'technician',
        resourceId: 1,
        oldValues: expect.any(Object),
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Agent',
        result: 'success',
      });
    });

    test('should return 404 for non-existent technician', async () => {
      Technician.findById.mockResolvedValue(null);

      const response = await request(app).delete('/api/technicians/999');

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });
});
