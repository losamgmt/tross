/**
 * Unit Tests: technicians routes - CRUD Operations
 * Tests GET /api/technicians, GET /api/technicians/:id, POST, PATCH, DELETE
 */

// HOISTED MOCKS (Pure Test Pattern)
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
const express = require('express');
const techniciansRouter = require('../../../routes/technicians');
const Technician = require('../../../db/models/Technician');
const auditService = require('../../../services/audit-service');
const { getClientIp, getUserAgent } = require('../../../utils/request-helpers');
const { authenticateToken, requirePermission } = require('../../../middleware/auth');
const { HTTP_STATUS } = require('../../../config/constants');

// Create test Express app
const app = express();
app.use(express.json());
app.use('/api/technicians', techniciansRouter);

describe('Technicians Routes - CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getClientIp.mockReturnValue('127.0.0.1');
    getUserAgent.mockReturnValue('Jest Test Agent');
    authenticateToken.mockImplementation((req, res, next) => {
      req.dbUser = { id: 1, role: 'admin' };
      req.user = { userId: 1 };
      next();
    });
    requirePermission.mockImplementation(() => (req, res, next) => next());
  });

  describe('GET /api/technicians', () => {
    it('should return all technicians successfully', async () => {
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

    it('should handle search and filtering', async () => {
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

    it('should handle database errors', async () => {
      Technician.findAll.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/technicians');

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe('Internal Server Error');
    });
  });

  describe('GET /api/technicians/:id', () => {
    it('should return a technician by ID', async () => {
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

    it('should return 404 for non-existent technician', async () => {
      Technician.findById.mockResolvedValue(null);

      const response = await request(app).get('/api/technicians/999');

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.error).toBe('Not Found');
    });

    it('should handle database errors', async () => {
      Technician.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/technicians/1');

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('POST /api/technicians', () => {
    it('should create a new technician successfully', async () => {
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

    it('should handle database errors', async () => {
      Technician.create.mockRejectedValue(new Error('License number already exists'));

      const response = await request(app)
        .post('/api/technicians')
        .send({ license_number: 'TECH-DUPLICATE' });

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBe('Failed to create technician');
    });
  });

  describe('PATCH /api/technicians/:id', () => {
    it('should update a technician successfully', async () => {
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

    it('should return 404 for non-existent technician', async () => {
      Technician.findById.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/technicians/999')
        .send({ status: 'on_job' });

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE /api/technicians/:id', () => {
    it('should soft delete a technician successfully', async () => {
      Technician.findById.mockResolvedValue({ id: 1, license_number: 'TECH-001' });
      Technician.deactivate = jest.fn().mockResolvedValue({ id: 1, is_active: false });
      auditService.log.mockResolvedValue(true);

      const response = await request(app).delete('/api/technicians/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Technician.deactivate).toHaveBeenCalledWith(1);
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 1,
        action: 'deactivate',
        resourceType: 'technician',
        resourceId: 1,
        oldValues: expect.any(Object),
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Agent',
        result: 'success',
      });
    });

    it('should return 404 for non-existent technician', async () => {
      Technician.findById.mockResolvedValue(null);

      const response = await request(app).delete('/api/technicians/999');

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });
});
