/**
 * Unit Tests: customers routes - CRUD Operations
 *
 * Tests core CRUD operations for customer routes with mocked dependencies.
 * Uses centralized setup from route-test-setup.js (DRY architecture).
 *
 * Test Coverage: GET, POST, PATCH, DELETE /api/customers and /api/customers/:id
 */

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
jest.mock('../../../utils/validation-loader', () => ({
  buildCompositeSchema: jest.fn(() => ({ validate: jest.fn(() => ({ error: null })) })),
  getValidationMetadata: jest.fn(() => ({ version: '2.0.0', operations: [], policy: {} })),
}));
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.dbUser = { id: 1, role: 'admin' };
    req.user = { userId: 1 };
    next();
  }),
  requirePermission: jest.fn(() => (req, res, next) => next()),
}));
jest.mock('../../../middleware/row-level-security', () => ({
  enforceRLS: jest.fn(() => (req, res, next) => {
    req.rlsPolicy = 'all_records';
    req.rlsUserId = 1;
    next();
  }),
}));

// Mock validators (same pattern as users.crud.test.js)
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
  // Direct middleware (not factories) - must be plain functions for Express
  validateCustomerCreate: (req, res, next) => next(),
  validateCustomerUpdate: (req, res, next) => next(),
}));

const request = require('supertest');
const Customer = require('../../../db/models/Customer');
const auditService = require('../../../services/audit-service');
const { AuditActions, ResourceTypes, AuditResults } = require('../../../services/audit-constants');
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

const customersRouter = require('../../../routes/customers');
const app = createRouteTestApp(customersRouter, '/api/customers');

describe('routes/customers.js - CRUD Operations', () => {
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

  describe('GET /api/customers', () => {
    test('should return all customers successfully', async () => {
      const mockCustomers = [
        { id: 1, email: 'customer1@test.com', company_name: 'ACME Corp', is_active: true },
        { id: 2, email: 'customer2@test.com', company_name: 'Beta LLC', is_active: true },
      ];

      Customer.findAll.mockResolvedValue({
        data: mockCustomers,
        pagination: { page: 1, limit: 50, totalRecords: 2, totalPages: 1 },
        appliedFilters: {},
        rlsApplied: true,
      });

      const response = await request(app).get('/api/customers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCustomers);
      expect(response.body.count).toBe(2);
      expect(Customer.findAll).toHaveBeenCalledWith({
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
      Customer.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 },
        appliedFilters: { status: 'active' },
        rlsApplied: true,
      });

      const response = await request(app)
        .get('/api/customers')
        .query({ search: 'ACME', status: 'active' });

      expect(response.status).toBe(200);
      expect(Customer.findAll).toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      Customer.findAll.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/customers');

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/customers/:id', () => {
    test('should return a customer by ID', async () => {
      const mockCustomer = {
        id: 1,
        email: 'customer1@test.com',
        company_name: 'ACME Corp',
        phone: '555-0100',
        is_active: true,
      };

      Customer.findById.mockResolvedValue(mockCustomer);

      const response = await request(app).get('/api/customers/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCustomer);
      expect(Customer.findById).toHaveBeenCalledWith(1, expect.any(Object));
    });

    test('should return 404 for non-existent customer', async () => {
      Customer.findById.mockResolvedValue(null);

      const response = await request(app).get('/api/customers/999');

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.error).toBeDefined();
    });

    test('should handle database errors', async () => {
      Customer.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/customers/1');

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('POST /api/customers', () => {
    test('should create a new customer successfully', async () => {
      const newCustomerData = {
        email: 'newcustomer@test.com',
        company_name: 'New Corp',
        phone: '555-0200',
      };

      const createdCustomer = {
        id: 3,
        ...newCustomerData,
        status: 'pending',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      Customer.create.mockResolvedValue(createdCustomer);
      auditService.log.mockResolvedValue(true);

      const response = await request(app).post('/api/customers').send(newCustomerData);

      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdCustomer);
      expect(Customer.create).toHaveBeenCalledWith(newCustomerData);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: AuditActions.CUSTOMER_CREATE,
          resourceType: ResourceTypes.CUSTOMER,
          resourceId: 3,
          result: AuditResults.SUCCESS,
        })
      );
    });

    test('should handle database errors', async () => {
      Customer.create.mockRejectedValue(new Error('Email already exists'));

      const response = await request(app)
        .post('/api/customers')
        .send({ email: 'duplicate@test.com' });

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('PATCH /api/customers/:id', () => {
    test('should update a customer successfully', async () => {
      const updateData = { company_name: 'Updated Corp', phone: '555-9999' };
      const updatedCustomer = {
        id: 1,
        email: 'customer1@test.com',
        ...updateData,
        is_active: true,
      };

      Customer.findById.mockResolvedValueOnce({ id: 1, company_name: 'Old Corp' });
      Customer.update.mockResolvedValue(updatedCustomer);
      Customer.findById.mockResolvedValueOnce(updatedCustomer);
      auditService.log.mockResolvedValue(true);

      const response = await request(app).patch('/api/customers/1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedCustomer);
      expect(auditService.log).toHaveBeenCalled();
    });

    test('should return 404 for non-existent customer', async () => {
      Customer.findById.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/customers/999')
        .send({ company_name: 'Test' });

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE /api/customers/:id', () => {
    test('should hard delete a customer successfully', async () => {
      Customer.findById.mockResolvedValue({ id: 1, email: 'customer1@test.com' });
      Customer.delete.mockResolvedValue({ id: 1 });
      auditService.log.mockResolvedValue(true);

      const response = await request(app).delete('/api/customers/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Customer.delete).toHaveBeenCalledWith(1);
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 1,
        action: AuditActions.CUSTOMER_DELETE,
        resourceType: ResourceTypes.CUSTOMER,
        resourceId: 1,
        oldValues: expect.any(Object),
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Agent',
        result: AuditResults.SUCCESS,
      });
    });

    test('should return 404 for non-existent customer', async () => {
      Customer.findById.mockResolvedValue(null);

      const response = await request(app).delete('/api/customers/999');

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });
});
