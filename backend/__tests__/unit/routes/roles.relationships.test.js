/**
 * Unit Tests: roles routes - Relationships & Foreign Keys
 *
 * Tests relationship queries and foreign key constraint handling.
 * Uses GenericEntityService (strangler-fig migration pattern).
 */

const request = require('supertest');
const GenericEntityService = require('../../../services/generic-entity-service');
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
// MOCK CONFIGURATION
// ============================================================================

jest.mock('../../../services/generic-entity-service');
jest.mock('../../../utils/request-helpers');
jest.mock('../../../db/helpers/default-value-helper', () => ({
  getNextOrdinalValue: jest.fn().mockResolvedValue(50),
}));

jest.mock('../../../config/models/role-metadata', () => ({
  tableName: 'roles',
  primaryKey: 'id',
  searchableFields: ['name', 'description'],
  filterableFields: ['id', 'name'],
  sortableFields: ['id', 'name', 'created_at'],
  defaultSort: { field: 'name', order: 'ASC' },
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
    req.validated.query.sortBy = req.query.sortBy || 'name';
    req.validated.query.sortOrder = req.query.sortOrder || 'ASC';
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
  validateRoleCreate: jest.fn((req, res, next) => next()),
  validateRoleUpdate: jest.fn((req, res, next) => next()),
}));

// ============================================================================
// TEST APP SETUP
// ============================================================================

const rolesRouter = require('../../../routes/roles');
const { validateRoleCreate, validateIdParam } = require('../../../validators');
const app = createRouteTestApp(rolesRouter, '/api/roles');

// ============================================================================
// TEST SUITE
// ============================================================================

describe('routes/roles.js - Relationships & Foreign Keys', () => {
  beforeEach(() => {
    setupRouteMocks({
      getClientIp,
      getUserAgent,
      authenticateToken,
      requirePermission,
      enforceRLS,
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownRouteMocks();
  });

  // ===========================
  // DELETE - Foreign Key Constraints
  // ===========================
  describe('DELETE /api/roles/:id - Foreign Key Constraints', () => {
    test('should return 400 when role has associated users (FK violation)', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        if (!req.validated) req.validated = {};
        req.validated.id = 1;
        next();
      });

      const fkError = new Error('update or delete on table "roles" violates foreign key constraint');
      fkError.code = '23503';
      GenericEntityService.delete.mockRejectedValue(fkError);

      const response = await request(app).delete('/api/roles/1');
      // FK violations return 400 Bad Request with helpful message
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
    });

    test('should return 404 when role does not exist', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        if (!req.validated) req.validated = {};
        req.validated.id = 9999;
        next();
      });

      GenericEntityService.delete.mockResolvedValue(null);

      const response = await request(app).delete('/api/roles/9999');
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('should successfully delete role without dependencies', async () => {
      validateIdParam.mockImplementation(() => (req, res, next) => {
        if (!req.validated) req.validated = {};
        req.validated.id = 5;
        next();
      });

      GenericEntityService.delete.mockResolvedValue({ id: 5, name: 'Temp Role' });

      const response = await request(app).delete('/api/roles/5');
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
    });
  });

  // ===========================
  // POST - Unique Constraint
  // ===========================
  describe('POST /api/roles - Unique Constraints', () => {
    test('should return 409 when role name already exists', async () => {
      validateRoleCreate.mockImplementation((req, res, next) => next());
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      GenericEntityService.create.mockRejectedValue(duplicateError);

      const response = await request(app).post('/api/roles').send({ name: 'Admin' });
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);
      expect(response.body.success).toBe(false);
    });
  });
});
