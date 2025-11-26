/**
 * Customer Model - Row-Level Security Tests
 *
 * Tests RLS filtering logic for the Customer model.
 * Verifies that customers can only see their own records
 * and technicians+ can see all records.
 */

// Mock database BEFORE requiring Customer model
jest.mock('../../../db/connection');
jest.mock('../../../config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));
jest.mock('../../../services/pagination-service', () => ({
  validateParams: jest.fn(),
  generateMetadata: jest.fn(),
}));
jest.mock('../../../services/query-builder-service', () => ({
  buildSearchClause: jest.fn(),
  buildFilterClause: jest.fn(),
  buildSortClause: jest.fn(),
}));
jest.mock('../../../config/models/customer-metadata', () => ({
  searchableFields: ['email', 'company_name'],
  filterableFields: ['status', 'is_active'],
  sortableFields: ['email', 'created_at'],
  defaultSort: 'ORDER BY created_at DESC',
}));

const Customer = require('../../../db/models/Customer');
const db = require('../../../db/connection');
const PaginationService = require('../../../services/pagination-service');
const QueryBuilderService = require('../../../services/query-builder-service');

describe('Customer Model - Row-Level Security', () => {
  beforeEach(() => {
    // Clear all mocks
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
      clause: 'c.is_active = $1',
      params: [true],
      applied: { is_active: true },
      paramOffset: 1,
    });

    QueryBuilderService.buildSortClause.mockReturnValue('c.created_at DESC');

    // Set default returns for PaginationService
    PaginationService.validateParams.mockReturnValue({
      page: 1,
      limit: 50,
      offset: 0,
    });

    PaginationService.generateMetadata.mockReturnValue({
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });
  });

  describe('_buildRLSFilter()', () => {
    test('should return own_record_only filter for customer role', () => {
      const req = {
        rlsPolicy: 'own_record_only',
        rlsUserId: 42,
      };

      const filter = Customer._buildRLSFilter(req);

      expect(filter.applied).toBe(true);
      expect(filter.clause).toBe('c.id = $RLS_PARAM');
      expect(filter.values).toEqual([42]);
    });

    test('should return all_records filter (no clause) for technician+', () => {
      const req = {
        rlsPolicy: 'all_records',
        rlsUserId: 10,
      };

      const filter = Customer._buildRLSFilter(req);

      expect(filter.applied).toBe(false);
      expect(filter.clause).toBe('');
      expect(filter.values).toEqual([]);
    });

    test('should return no filter when req is null', () => {
      const filter = Customer._buildRLSFilter(null);

      expect(filter.applied).toBe(false);
      expect(filter.clause).toBe('');
      expect(filter.values).toEqual([]);
    });

    test('should return no filter when rlsPolicy is null', () => {
      const req = {
        rlsPolicy: null,
        rlsUserId: 10,
      };

      const filter = Customer._buildRLSFilter(req);

      expect(filter.applied).toBe(false);
      expect(filter.clause).toBe('');
      expect(filter.values).toEqual([]);
    });

    test('should return deny-all filter for unknown policy', () => {
      const req = {
        rlsPolicy: 'unknown_policy',
        rlsUserId: 10,
      };

      const filter = Customer._buildRLSFilter(req);

      expect(filter.applied).toBe(true);
      expect(filter.clause).toBe('1=0'); // Always false
      expect(filter.values).toEqual([]);
    });
  });

  describe('_applyRLSFilter()', () => {
    test('should combine RLS filter with existing WHERE clause', () => {
      const req = {
        rlsPolicy: 'own_record_only',
        rlsUserId: 42,
      };

      const result = Customer._applyRLSFilter(req, 'c.is_active = $1', [true]);

      expect(result.whereClause).toBe('WHERE c.is_active = $1 AND c.id = $2');
      expect(result.values).toEqual([true, 42]);
      expect(result.rlsApplied).toBe(true);
    });

    test('should handle empty existing WHERE clause', () => {
      const req = {
        rlsPolicy: 'own_record_only',
        rlsUserId: 42,
      };

      const result = Customer._applyRLSFilter(req, '', []);

      expect(result.whereClause).toBe('WHERE c.id = $1');
      expect(result.values).toEqual([42]);
      expect(result.rlsApplied).toBe(true);
    });

    test('should handle all_records policy with existing WHERE', () => {
      const req = {
        rlsPolicy: 'all_records',
        rlsUserId: 10,
      };

      const result = Customer._applyRLSFilter(req, 'c.is_active = $1', [true]);

      expect(result.whereClause).toBe('WHERE c.is_active = $1');
      expect(result.values).toEqual([true]);
      expect(result.rlsApplied).toBe(false);
    });

    test('should not apply RLS when req is null', () => {
      const result = Customer._applyRLSFilter(null, 'c.is_active = $1', [true]);

      expect(result.whereClause).toBe('WHERE c.is_active = $1');
      expect(result.values).toEqual([true]);
      expect(result.rlsApplied).toBe(false);
    });

    test('should correctly number parameters', () => {
      const req = {
        rlsPolicy: 'own_record_only',
        rlsUserId: 42,
      };

      const result = Customer._applyRLSFilter(
        req,
        'c.status = $1 AND c.is_active = $2',
        ['active', true],
      );

      expect(result.whereClause).toBe(
        'WHERE c.status = $1 AND c.is_active = $2 AND c.id = $3',
      );
      expect(result.values).toEqual(['active', true, 42]);
      expect(result.rlsApplied).toBe(true);
    });
  });

  describe('findById() with RLS', () => {
    test('should apply RLS filter when req provided', async () => {
      const mockCustomer = {
        id: 42,
        email: 'customer@example.com',
        is_active: true,
      };
      db.query.mockResolvedValue({ rows: [mockCustomer] });

      const req = {
        rlsPolicy: 'own_record_only',
        rlsUserId: 42,
      };

      const customer = await Customer.findById(42, req);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.id = $1 AND c.id = $2'),
        [42, 42],
      );
      expect(customer).toMatchObject(mockCustomer);
      expect(customer.rlsApplied).toBe(true);
    });

    test('should not apply RLS when req not provided', async () => {
      const mockCustomer = {
        id: 42,
        email: 'customer@example.com',
        is_active: true,
      };
      db.query.mockResolvedValue({ rows: [mockCustomer] });

      const customer = await Customer.findById(42);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.id = $1'),
        [42],
      );
      expect(customer).toEqual(mockCustomer);
      expect(customer.rlsApplied).toBeUndefined();
    });

    test('should return null when RLS blocks access', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const req = {
        rlsPolicy: 'own_record_only',
        rlsUserId: 99, // Different user
      };

      const customer = await Customer.findById(42, req);

      expect(customer).toBeNull();
    });
  });

  describe('findAll() with RLS', () => {
    test('should apply RLS filter for customer role', async () => {
      const mockCustomers = [
        { id: 42, email: 'customer@example.com', is_active: true },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Count query
      db.query.mockResolvedValueOnce({ rows: mockCustomers }); // Data query

      const req = {
        rlsPolicy: 'own_record_only',
        rlsUserId: 42,
      };

      const result = await Customer.findAll({ req });

      expect(result.data).toEqual(mockCustomers);
      expect(result.rlsApplied).toBe(true);
      expect(db.query).toHaveBeenCalledTimes(2);
      // Verify RLS clause was added
      expect(db.query.mock.calls[0][0]).toContain('c.id = $');
      expect(db.query.mock.calls[1][0]).toContain('c.id = $');
    });

    test('should not filter for technician+ (all_records)', async () => {
      const mockCustomers = [
        { id: 1, email: 'customer1@example.com' },
        { id: 2, email: 'customer2@example.com' },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockCustomers });

      const req = {
        rlsPolicy: 'all_records',
        rlsUserId: 10,
      };

      const result = await Customer.findAll({ req });

      expect(result.data).toEqual(mockCustomers);
      expect(result.rlsApplied).toBe(false);
      expect(result.data.length).toBe(2);
    });

    test('should work without RLS when req not provided', async () => {
      const mockCustomers = [
        { id: 1, email: 'customer1@example.com' },
        { id: 2, email: 'customer2@example.com' },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockCustomers });

      const result = await Customer.findAll({});

      expect(result.data).toEqual(mockCustomers);
      expect(result.rlsApplied).toBe(false);
    });

    test('should combine RLS with search and filters', async () => {
      const mockCustomers = [
        { id: 42, email: 'customer@example.com', status: 'active' },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockCustomers });

      // Mock search and filter clauses (not empty)
      QueryBuilderService.buildSearchClause.mockReturnValueOnce({
        clause: "c.email ILIKE '%customer%'",
        values: [],
      });
      QueryBuilderService.buildFilterClause.mockReturnValueOnce({
        clause: 'c.status = $1',
        values: ['active'],
        applied: { status: 'active' },
      });

      const req = {
        rlsPolicy: 'own_record_only',
        rlsUserId: 42,
      };

      const result = await Customer.findAll({
        search: 'customer',
        filters: { status: 'active' },
        req,
      });

      expect(result.rlsApplied).toBe(true);
      expect(result.data).toEqual(mockCustomers);
      // Verify multiple WHERE conditions combined
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('AND');
    });
  });
});
