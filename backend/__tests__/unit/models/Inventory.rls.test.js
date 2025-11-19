/**
 * Inventory Model - Row-Level Security Tests
 *
 * Tests RLS implementation for Inventory model with null policy (no filtering)
 * Inventory is management resource - all authorized users can view all inventory
 *
 * Test Coverage:
 * - _buildRLSFilter with null policy (returns no filtering)
 * - _applyRLSFilter does not modify WHERE clause
 * - findById works with/without req
 * - findAll works with/without req
 * - rlsApplied metadata correctly reflects null policy
 */

const Inventory = require('../../../db/models/Inventory');
const db = require('../../../db/connection');

// Global mock setup
jest.mock('../../../services/pagination-service', () => ({
  validateParams: jest.fn(() => ({ page: 1, limit: 50, offset: 0 })),
  generateMetadata: jest.fn(() => ({ page: 1, limit: 50, total: 1, totalPages: 1 })),
}));

jest.mock('../../../services/query-builder-service', () => ({
  buildSearchClause: jest.fn(() => ({ clause: '', params: [], paramOffset: 0 })),
  buildFilterClause: jest.fn(() => ({ clause: '', params: [], applied: {} })),
  buildSortClause: jest.fn(() => 'ORDER BY inv.created_at DESC'),
}));

// Mock database
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
}));

const PaginationService = require('../../../services/pagination-service');
const QueryBuilderService = require('../../../services/query-builder-service');

describe('Inventory Model - Row-Level Security', () => {
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
      clause: 'inv.is_active = $1',
      params: [true],
      applied: { is_active: true },
      paramOffset: 1,
    });

    QueryBuilderService.buildSortClause.mockReturnValue('inv.created_at DESC');

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
        rlsResource: 'inventory',
      };

      const result = Inventory._buildRLSFilter(req);

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
        rlsResource: 'inventory',
      };

      const result = Inventory._buildRLSFilter(req);

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
        rlsResource: 'inventory',
      };

      const result = Inventory._buildRLSFilter(req);

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
        rlsResource: 'inventory',
      };

      const result = Inventory._buildRLSFilter(req);

      expect(result).toEqual({
        clause: '',
        values: [],
        applied: false,
      });
    });

    it('should return no filtering when req is null', () => {
      const result = Inventory._buildRLSFilter(null);

      expect(result).toEqual({
        clause: '',
        values: [],
        applied: false,
      });
    });

    it('should return no filtering when req is undefined', () => {
      const result = Inventory._buildRLSFilter(undefined);

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
        rlsResource: 'inventory',
      };

      const existingWhere = 'WHERE i.id = $1';
      const existingValues = [5];

      const result = Inventory._applyRLSFilter(req, existingWhere, existingValues);

      expect(result.whereClause).toBe('WHERE i.id = $1');
      expect(result.values).toEqual([5]);
      expect(result.applied).toBe(false);
    });

    it('should not modify WHERE clause when no existing WHERE', () => {
      const req = {
        user: { id: 2, role: 'technician' },
        rlsPolicy: null,
        rlsUserId: 2,
        rlsResource: 'inventory',
      };

      const result = Inventory._applyRLSFilter(req, '', []);

      expect(result.whereClause).toBe('');
      expect(result.values).toEqual([]);
      expect(result.applied).toBe(false);
    });

    it('should handle req = null without modification', () => {
      const existingWhere = 'WHERE quantity < $1';
      const existingValues = [10];

      const result = Inventory._applyRLSFilter(null, existingWhere, existingValues);

      expect(result.whereClause).toBe('WHERE quantity < $1');
      expect(result.values).toEqual([10]);
      expect(result.applied).toBe(false);
    });
  });

  describe('findById with RLS', () => {
    it('should fetch inventory without filtering (null policy)', async () => {
      const mockItem = { id: 1, name: 'Widget', sku: 'WID-001', quantity: 50 };
      db.query.mockResolvedValue({ rows: [mockItem] });

      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'inventory',
      };

      const item = await Inventory.findById(1, req);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT i.* FROM inventory i WHERE i.id = $1',
        [1],
      );
      expect(item).toEqual({
        id: 1,
        name: 'Widget',
        sku: 'WID-001',
        quantity: 50,
        rlsApplied: false,
      });
    });

    it('should fetch inventory without req (backward compatibility)', async () => {
      const mockItem = { id: 2, name: 'Gadget', sku: 'GAD-002', quantity: 25 };
      db.query.mockResolvedValue({ rows: [mockItem] });

      const item = await Inventory.findById(2);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT i.* FROM inventory i WHERE i.id = $1',
        [2],
      );
      expect(item).toEqual({
        id: 2,
        name: 'Gadget',
        sku: 'GAD-002',
        quantity: 25,
      });
      expect(item.rlsApplied).toBeUndefined();
    });

    it('should return null when inventory not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'inventory',
      };

      const item = await Inventory.findById(999, req);

      expect(item).toBeNull();
    });
  });

  describe('findAll with RLS', () => {
    it('should fetch all inventory without filtering (null policy)', async () => {
      const mockItems = [
        { id: 1, name: 'Widget', sku: 'WID-001', quantity: 50 },
        { id: 2, name: 'Gadget', sku: 'GAD-002', quantity: 25 },
      ];
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockItems }); // SELECT query

      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'inventory',
      };

      const result = await Inventory.findAll({ req });

      expect(result.data).toEqual(mockItems);
      expect(result.rlsApplied).toBe(false);
    });

    it('should fetch all inventory without req (backward compatibility)', async () => {
      const mockItems = [
        { id: 1, name: 'Widget', sku: 'WID-001', quantity: 50 },
        { id: 2, name: 'Gadget', sku: 'GAD-002', quantity: 25 },
      ];
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: mockItems });

      const result = await Inventory.findAll();

      expect(result.data).toEqual(mockItems);
      expect(result.rlsApplied).toBe(false);
    });

    it('should work with search and filters (no RLS interference)', async () => {
      const mockItems = [{ id: 1, name: 'Widget', sku: 'WID-001', quantity: 50 }];
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockItems });

      const req = {
        user: { id: 1, role: 'customer' },
        rlsPolicy: null,
        rlsUserId: 1,
        rlsResource: 'inventory',
      };

      const result = await Inventory.findAll({
        search: 'widget',
        filters: { quantity: 50 },
        req,
      });

      expect(result.data).toEqual(mockItems);
      expect(result.rlsApplied).toBe(false);
    });
  });

  describe('Null policy semantics for inventory', () => {
    it('should confirm null policy means "no filtering" for management resource', () => {
      // Inventory is different from Invoice/Contract:
      // - Invoice/Contract: null policy = deny (WHERE 1=0) for technicians
      // - Inventory: null policy = no-op (no filtering) for all roles
      // Inventory is needed for work order creation, quotes, etc.

      const req = {
        user: { id: 2, role: 'technician' },
        rlsPolicy: null,
        rlsUserId: 2,
        rlsResource: 'inventory',
      };

      const result = Inventory._buildRLSFilter(req);

      // Inventory: null = management resource, everyone sees everything
      expect(result.clause).toBe('');
      expect(result.applied).toBe(false);

      // This is different from Invoice/Contract where null = 1=0 denial for technicians
      // But same as Roles where null = public reference data
    });
  });
});
