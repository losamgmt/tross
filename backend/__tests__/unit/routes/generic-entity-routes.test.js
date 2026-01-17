/**
 * Parameterized Unit Tests: Generic Entity Routes
 *
 * DRY Architecture: Tests ALL entity CRUD routes with a single parameterized suite.
 * Since all entity routes use GenericEntityService, they share identical behavior.
 *
 * PERFORMANCE: 
 * - All apps created once in module scope (not per-test)
 * - Lightweight mocks, no DB connections
 * - 3s timeout per test for fail-fast
 *
 * ENTITIES COVERED:
 * - customers, technicians, inventory, invoices, contracts, work_orders
 */

const request = require('supertest');
const express = require('express');
const GenericEntityService = require('../../../services/generic-entity-service');
const auditService = require('../../../services/audit-service');
const { HTTP_STATUS } = require('../../../config/constants');

// ============================================================================
// MOCKS (Hoisted by Jest - BEFORE any requires)
// ============================================================================

// Mock DB connection to prevent pool initialization
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: { totalCount: 0, options: { max: 10 } },
}));

// Mock logger to prevent file I/O
jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../services/generic-entity-service', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByField: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  batch: jest.fn(),
  // _getMetadata is called during router creation to get entity config
  _getMetadata: jest.fn((entityName) => ({
    entityName,
    displayName: entityName.charAt(0).toUpperCase() + entityName.slice(1),
    tableName: entityName === 'work_order' ? 'work_orders' : entityName + 's',
    rlsResource: entityName === 'work_order' ? 'work_orders' : entityName + 's',
    fields: [
      { name: 'id', type: 'integer', primaryKey: true },
      { name: 'created_at', type: 'timestamp' },
      { name: 'updated_at', type: 'timestamp' },
    ],
    searchableFields: ['id'],
    filterableFields: ['id'],
    sortableFields: ['id', 'created_at'],
  })),
}));
jest.mock('../../../services/audit-service');
jest.mock('../../../utils/request-helpers', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
  getUserAgent: jest.fn(() => 'test-agent'),
  getAuditMetadata: jest.fn(() => ({ ip: '127.0.0.1', userAgent: 'test' })),
}));

jest.mock('../../../middleware/auth', () => {
  const passMiddleware = (req, res, next) => {
    req.user = { user_id: 1, role: 'admin' };
    req.dbUser = { id: 1, role: 'admin' }; // Route handlers use req.dbUser.role
    next();
  };
  return {
    authenticateToken: passMiddleware,
    // Unified signature: requirePermission(operation) returns middleware
    requirePermission: () => passMiddleware,
    requireMinimumRole: () => passMiddleware,
  };
});

jest.mock('../../../middleware/row-level-security', () => {
  // Unified signature: enforceRLS is a middleware function (no args)
  const rlsMiddleware = (req, res, next) => {
    req.rlsPolicy = 'all_records';
    req.rlsUserId = 1;
    next();
  };
  return {
    enforceRLS: rlsMiddleware,
  };
});

// Mock generic-entity middleware used by routes/entities.js
jest.mock('../../../middleware/generic-entity', () => {
  const passMiddleware = (req, res, next) => next();
  const validateBodyMiddleware = () => (req, res, next) => {
    if (!req.validated) req.validated = {};
    req.validated.body = req.body; // Pass body through as validated
    next();
  };
  return {
    // genericRequirePermission and genericEnforceRLS removed - unified middleware used directly
    genericValidateBody: validateBodyMiddleware,
    extractEntity: passMiddleware,
  };
});

jest.mock('../../../validators', () => {
  const passThrough = (req, res, next) => {
    if (!req.validated) req.validated = {};
    next();
  };
  const paginationMiddleware = (req, res, next) => {
    if (!req.validated) req.validated = {};
    req.validated.pagination = { page: 1, limit: 50, offset: 0 };
    req.validated.query = { search: '', filters: {}, sortBy: 'created_at', sortOrder: 'DESC' };
    next();
  };
  const idMiddleware = (req, res, next) => {
    if (!req.validated) req.validated = {};
    req.validated.id = parseInt(req.params.id);
    next();
  };

  return {
    validatePagination: () => paginationMiddleware,
    validateQuery: () => paginationMiddleware,
    validateIdParam: () => idMiddleware,
    // NOTE: Entity-specific validators (validateCustomerCreate, etc.) removed
    // Routes use genericValidateBody middleware, not these validators
  };
});

// ============================================================================
// ENTITY CONFIGURATION
// ============================================================================

// Import the generic entity routers
const {
  usersRouter,
  rolesRouter,
  customersRouter,
  techniciansRouter,
  inventoryRouter,
  invoicesRouter,
  contractsRouter,
  workOrdersRouter,
} = require('../../../routes/entities');

/**
 * Entity definitions for parameterized tests
 * Each entity has the same CRUD behavior via GenericEntityService
 */
const ENTITIES = [
  {
    name: 'user',
    routePath: '/api/users',
    router: usersRouter,
    sampleData: { id: 1, email: 'user@example.com', username: 'testuser', role_id: 1 },
    createData: { email: 'newuser@example.com', username: 'newuser', role_id: 1 },
  },
  {
    name: 'role',
    routePath: '/api/roles',
    router: rolesRouter,
    sampleData: { id: 1, name: 'admin', description: 'Administrator', priority: 100 },
    createData: { name: 'newrole', description: 'New Role', priority: 10 },
  },
  {
    name: 'customer',
    routePath: '/api/customers',
    router: customersRouter,
    sampleData: { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User' },
    createData: { email: 'new@example.com', first_name: 'New', last_name: 'User' },
  },
  {
    name: 'technician',
    routePath: '/api/technicians',
    router: techniciansRouter,
    sampleData: { id: 1, user_id: 1, specialty: 'HVAC', status: 'active' },
    createData: { user_id: 2, specialty: 'Plumbing', status: 'active' },
  },
  {
    name: 'inventory',
    routePath: '/api/inventory',
    router: inventoryRouter,
    sampleData: { id: 1, name: 'Widget', quantity: 100, unit_price: 9.99 },
    createData: { name: 'New Widget', quantity: 50, unit_price: 19.99 },
  },
  {
    name: 'invoice',
    routePath: '/api/invoices',
    router: invoicesRouter,
    sampleData: { id: 1, customer_id: 1, total_amount: 100.00, status: 'pending' },
    createData: { customer_id: 1, total_amount: 200.00, status: 'draft' },
  },
  {
    name: 'contract',
    routePath: '/api/contracts',
    router: contractsRouter,
    sampleData: { id: 1, customer_id: 1, name: 'Service Contract', status: 'active' },
    createData: { customer_id: 1, name: 'New Contract', status: 'draft' },
  },
  {
    name: 'work_order',
    routePath: '/api/work_orders',
    router: workOrdersRouter,
    sampleData: { id: 1, customer_id: 1, title: 'Fix HVAC', status: 'pending', priority: 'medium' },
    createData: { customer_id: 1, title: 'New Work Order', status: 'pending', priority: 'low' },
  },
];

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestApp(routePath, router) {
  const app = express();
  app.use(express.json());
  app.use(routePath, router);
  // Global error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  });
  return app;
}

function resetMocks() {
  jest.clearAllMocks();
  auditService.log = jest.fn().mockResolvedValue(true);
  // GenericEntityService is already mocked with jest.fn() - just clear and set returns
}

// ============================================================================
// PARAMETERIZED TEST SUITE (3s timeout per test for fail-fast)
// ============================================================================

describe.each(ENTITIES)(
  '$name routes - CRUD Operations',
  ({ name, routePath, router, sampleData, createData }) => {
    let app;

    beforeAll(() => {
      // Router is already imported from routes/entities.js
      app = createTestApp(routePath, router);
    });

    beforeEach(() => {
      resetMocks();
    });

    // ===========================
    // GET /api/{entity} - List All
    // ===========================
    describe(`GET ${routePath}`, () => {
      test('should return paginated list with count and timestamp', async () => {
        // Arrange
        GenericEntityService.findAll.mockResolvedValue({
          data: [sampleData],
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
          appliedFilters: {},
          rlsApplied: false,
        });

        // Act
        const response = await request(app).get(routePath);

        // Assert
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBeDefined();
        expect(response.body.pagination).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
        expect(GenericEntityService.findAll).toHaveBeenCalledWith(
          name,
          expect.any(Object),
          expect.any(Object)
        );
      });

      test('should return empty array when no records exist', async () => {
        // Arrange
        GenericEntityService.findAll.mockResolvedValue({
          data: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
          appliedFilters: {},
          rlsApplied: false,
        });

        // Act
        const response = await request(app).get(routePath);

        // Assert
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.data).toEqual([]);
        expect(response.body.count).toBe(0);
      });

      test('should handle database errors', async () => {
        // Arrange
        GenericEntityService.findAll.mockRejectedValue(new Error('Database error'));

        // Act
        const response = await request(app).get(routePath);

        // Assert
        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      });
    });

    // ===========================
    // GET /api/{entity}/:id - Get by ID
    // ===========================
    describe(`GET ${routePath}/:id`, () => {
      test('should return entity by ID', async () => {
        // Arrange
        GenericEntityService.findById.mockResolvedValue(sampleData);

        // Act
        const response = await request(app).get(`${routePath}/1`);

        // Assert
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
        expect(GenericEntityService.findById).toHaveBeenCalledWith(
          name,
          expect.any(Number),
          expect.any(Object)
        );
      });

      test('should return 404 when entity not found', async () => {
        // Arrange
        GenericEntityService.findById.mockResolvedValue(null);

        // Act
        const response = await request(app).get(`${routePath}/999`);

        // Assert
        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(response.body.success).toBe(false);
      });

      test('should handle database errors', async () => {
        // Arrange
        GenericEntityService.findById.mockRejectedValue(new Error('Database error'));

        // Act
        const response = await request(app).get(`${routePath}/1`);

        // Assert
        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      });
    });

    // ===========================
    // POST /api/{entity} - Create
    // ===========================
    describe(`POST ${routePath}`, () => {
      test('should create entity successfully', async () => {
        // Arrange
        const created = { id: 1, ...createData };
        GenericEntityService.create.mockResolvedValue(created);

        // Act
        const response = await request(app).post(routePath).send(createData);

        // Assert
        expect(response.status).toBe(HTTP_STATUS.CREATED);
        expect(response.body.success).toBe(true);
        expect(GenericEntityService.create).toHaveBeenCalledWith(
          name,
          expect.any(Object),
          expect.any(Object)
        );
      });

      test('should handle database errors during creation', async () => {
        // Arrange
        GenericEntityService.create.mockRejectedValue(new Error('Creation failed'));

        // Act
        const response = await request(app).post(routePath).send(createData);

        // Assert
        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      });
    });

    // ===========================
    // PATCH /api/{entity}/:id - Update
    // ===========================
    describe(`PATCH ${routePath}/:id`, () => {
      test('should update entity successfully', async () => {
        // Arrange
        GenericEntityService.findById.mockResolvedValue(sampleData);
        GenericEntityService.update.mockResolvedValue({ ...sampleData, updated: true });

        // Act
        const response = await request(app).patch(`${routePath}/1`).send({ status: 'updated' });

        // Assert
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
        expect(GenericEntityService.update).toHaveBeenCalledWith(
          name,
          1,
          expect.any(Object),
          expect.any(Object)
        );
      });

      test('should return 404 when updating non-existent entity', async () => {
        // Arrange
        GenericEntityService.findById.mockResolvedValue(null);

        // Act
        const response = await request(app).patch(`${routePath}/999`).send({ status: 'updated' });

        // Assert
        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(response.body.success).toBe(false);
      });
    });

    // ===========================
    // DELETE /api/{entity}/:id - Delete
    // ===========================
    describe(`DELETE ${routePath}/:id`, () => {
      test('should delete entity successfully', async () => {
        // Arrange
        GenericEntityService.findById.mockResolvedValue(sampleData);
        GenericEntityService.delete.mockResolvedValue(true);

        // Act
        const response = await request(app).delete(`${routePath}/1`);

        // Assert
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
        expect(GenericEntityService.delete).toHaveBeenCalledWith(
          name,
          1,
          expect.any(Object)
        );
      });

      test('should return 404 when deleting non-existent entity', async () => {
        // Arrange - routes call delete() directly, not findById first
        GenericEntityService.delete.mockResolvedValue(null);

        // Act
        const response = await request(app).delete(`${routePath}/999`);

        // Assert
        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(response.body.success).toBe(false);
      });
    });
  }
);
