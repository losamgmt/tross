/**
 * Role Model - Row-Level Security Tests
 *
 * Tests RLS implementation for Role model with null policy (no filtering)
 * Roles are public reference data - everyone sees all roles for dropdowns/UI
 *
 * Test Coverage:
 * - _buildRLSFilter with null policy (returns no filtering)
 * - _applyRLSFilter does not modify WHERE clause
 * - findById works with/without req
 * - findAll works with/without req
 * - rlsApplied metadata correctly reflects null policy
 */

const Role = require('../../../db/models/Role');
const db = require('../../../db/connection');

// Global mock setup
jest.mock('../../../services/pagination-service', () => ({
  validateParams: jest.fn(() => ({ page: 1, limit: 50, offset: 0 })),
  generateMetadata: jest.fn((page, limit, total) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  })),
}));

jest.mock('../../../services/query-builder-service', () => ({
  buildSearchClause: jest.fn(() => ({ clause: '', params: [], paramOffset: 0 })),
  buildFilterClause: jest.fn(() => ({ clause: '', params: [], paramOffset: 0 })),
  buildSortClause: jest.fn(() => 'priority ASC'),
}));

// Mock database
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
}));

const PaginationService = require('../../../services/pagination-service');
const QueryBuilderService = require('../../../services/query-builder-service');

describe('Role Model - Row-Level Security', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    db.query.mockClear();
    PaginationService.validateParams.mockClear();
    PaginationService.generateMetadata.mockClear();
    QueryBuilderService.buildSearchClause.mockClear();
    QueryBuilderService.buildFilterClause.mockClear();
    QueryBuilderService.buildSortClause.mockClear();

    // Set default returns for QueryBuilderService
    QueryBuilderService.buildSearchClause.mockReturnValue({
      clause: '',
      params: [],
      paramOffset: 0,
    });

    QueryBuilderService.buildFilterClause.mockReturnValue({
      clause: 'r.is_active = $1',
      params: [true],
      applied: { is_active: true },
      paramOffset: 1,
    });

    QueryBuilderService.buildSortClause.mockReturnValue('r.priority ASC');

    // Set default returns for PaginationService
    PaginationService.validateParams.mockReturnValue({
      page: 1,
      limit: 50,
      offset: 0,
    });

    PaginationService.generateMetadata.mockImplementation((page, limit, total) => ({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }));
  });

  describe('_buildRLSFilter', () => {
    it('should return no filtering for null policy (customer role)', () => {
      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'roles',
      };

      const result = Role._buildRLSFilter(req);

      expect(result).toEqual({
        clause: '',
        values: [],
        applied: false,
      });
    });

    it('should return no filtering for null policy (technician role)', () => {
      const req = {
        user: { id: 2, role: 'technician' },
        rlsPolicy: null,
        rlsUserId: 2,
        rlsResource: 'roles',
      };

      const result = Role._buildRLSFilter(req);

      expect(result).toEqual({
        clause: '',
        values: [],
        applied: false,
      });
    });

    it('should return no filtering for null policy (dispatcher role)', () => {
      const req = {
        user: { id: 3, role: 'dispatcher' },
        rlsPolicy: null,
        rlsUserId: 3,
        rlsResource: 'roles',
      };

      const result = Role._buildRLSFilter(req);

      expect(result).toEqual({
        clause: '',
        values: [],
        applied: false,
      });
    });

    it('should return no filtering for null policy (admin role)', () => {
      const req = {
        user: { id: 4, role: 'admin' },
        rlsPolicy: null,
        rlsUserId: 4,
        rlsResource: 'roles',
      };

      const result = Role._buildRLSFilter(req);

      expect(result).toEqual({
        clause: '',
        values: [],
        applied: false,
      });
    });

    it('should return no filtering when req is null', () => {
      const result = Role._buildRLSFilter(null);

      expect(result).toEqual({
        clause: '',
        values: [],
        applied: false,
      });
    });

    it('should return no filtering when req is undefined', () => {
      const result = Role._buildRLSFilter(undefined);

      expect(result).toEqual({
        clause: '',
        values: [],
        applied: false,
      });
    });
  });

  describe('_applyRLSFilter', () => {
    it('should not modify WHERE clause for null policy', () => {
      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'roles',
      };

      const existingWhere = 'WHERE id = $1';
      const existingValues = [5];

      const result = Role._applyRLSFilter(req, existingWhere, existingValues);

      expect(result.whereClause).toBe('WHERE id = $1');
      expect(result.values).toEqual([5]);
      expect(result.rlsApplied).toBe(false);
    });

    it('should not modify WHERE clause when no existing WHERE', () => {
      const req = {
        user: { id: 2, role: 'technician' },
        rlsPolicy: null,
        rlsUserId: 2,
        rlsResource: 'roles',
      };

      const result = Role._applyRLSFilter(req, '', []);

      expect(result.whereClause).toBe('');
      expect(result.values).toEqual([]);
      expect(result.rlsApplied).toBe(false);
    });

    it('should handle req = null without modification', () => {
      const existingWhere = 'WHERE priority > $1';
      const existingValues = [50];

      const result = Role._applyRLSFilter(null, existingWhere, existingValues);

      expect(result.whereClause).toBe('WHERE priority > $1');
      expect(result.values).toEqual([50]);
      expect(result.rlsApplied).toBe(false);
    });
  });

  describe('findById with RLS', () => {
    it('should fetch role without filtering (null policy)', async () => {
      const mockRole = { id: 1, name: 'customer', priority: 10 };
      db.query.mockResolvedValue({ rows: [mockRole] });

      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'roles',
      };

      const role = await Role.findById(1, req);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM roles WHERE id = $1',
        [1],
      );
      expect(role).toEqual({
        id: 1,
        name: 'customer',
        priority: 10,
        rlsApplied: false,
      });
    });

    it('should fetch role without req (backward compatibility)', async () => {
      const mockRole = { id: 2, name: 'technician', priority: 20 };
      db.query.mockResolvedValue({ rows: [mockRole] });

      const role = await Role.findById(2);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM roles WHERE id = $1',
        [2],
      );
      expect(role).toEqual({
        id: 2,
        name: 'technician',
        priority: 20,
        rlsApplied: false,
      });
    });

    it('should return undefined when role not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'roles',
      };

      const role = await Role.findById(999, req);

      expect(role).toBeUndefined();
    });
  });

  describe('findAll with RLS', () => {
    it('should fetch all roles without filtering (null policy)', async () => {
      const mockRoles = [
        { id: 1, name: 'customer', priority: 10 },
        { id: 2, name: 'technician', priority: 20 },
      ];
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockRoles }); // SELECT query

      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'roles',
      };

      const result = await Role.findAll({ req, includeInactive: true });

      expect(result.data).toEqual(mockRoles);
      expect(result.rlsApplied).toBe(false);
      expect(result.pagination.total).toBe(2);
    });

    it('should fetch all roles without req (backward compatibility)', async () => {
      const mockRoles = [
        { id: 1, name: 'customer', priority: 10 },
        { id: 2, name: 'technician', priority: 20 },
      ];
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        .mockResolvedValueOnce({ rows: mockRoles });

      const result = await Role.findAll({ includeInactive: true });

      expect(result.data).toEqual(mockRoles);
      expect(result.rlsApplied).toBe(false);
      expect(result.pagination.total).toBe(2);
    });

    it('should work with search and filters (no RLS interference)', async () => {
      const mockRoles = [{ id: 1, name: 'customer', priority: 10 }];
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockRoles });

      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'roles',
      };

      const result = await Role.findAll({
        search: 'customer',
        filters: { priority: 10 },
        req,
        includeInactive: true,
      });

      expect(result.data).toEqual(mockRoles);
      expect(result.rlsApplied).toBe(false);
      expect(result.appliedFilters.search).toBe('customer');
    });
  });

  describe('Null policy semantics', () => {
    it('should confirm null policy means "no filtering" not "deny all"', () => {
      // This test documents the important distinction:
      // - Invoice/Contract: null policy = deny (WHERE 1=0)
      // - Roles/Inventory: null policy = no-op (no filtering)
      // Context matters!

      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'roles',
      };

      const result = Role._buildRLSFilter(req);

      // Roles: null = public data, everyone sees everything
      expect(result.clause).toBe('');
      expect(result.applied).toBe(false);

      // This is different from Invoice/Contract where null = 1=0 denial
    });
  });
});
