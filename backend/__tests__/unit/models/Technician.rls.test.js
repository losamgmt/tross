/**
 * Technician Model - Row-Level Security Tests
 * Tests RLS filtering for technicians resource
 */

// Mock declarations FIRST (hoisted by Jest)
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
jest.mock('../../../config/models/technician-metadata', () => ({
  searchableFields: ['license_number'],
  filterableFields: ['status', 'is_active'],
  sortableFields: ['created_at', 'license_number'],
  defaultSort: { field: 'created_at', order: 'DESC' },
}));

// NOW import modules (after mocks are declared)
const Technician = require('../../../db/models/Technician');
const PaginationService = require('../../../services/pagination-service');
const QueryBuilderService = require('../../../services/query-builder-service');
const db = require('../../../db/connection');

describe('Technician Model - RLS Tests', () => {
  beforeEach(() => {
    // Clear mock call history
    db.query.mockClear();
    PaginationService.validateParams.mockClear();
    PaginationService.generateMetadata.mockClear();
    QueryBuilderService.buildSearchClause.mockClear();
    QueryBuilderService.buildFilterClause.mockClear();
    QueryBuilderService.buildSortClause.mockClear();

    // Setup default mock implementations (can be overridden per test)
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
    QueryBuilderService.buildSearchClause.mockReturnValue({
      clause: null,
      params: [],
      paramOffset: 0,
    });
    QueryBuilderService.buildFilterClause.mockReturnValue({
      clause: 't.is_active = $1',
      params: [true],
      applied: { is_active: true },
      paramOffset: 1,
    });
    QueryBuilderService.buildSortClause.mockReturnValue('created_at DESC');
  });

  describe('_buildRLSFilter()', () => {
    test('should return no filter when req is null', () => {
      const result = Technician._buildRLSFilter(null);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    test('should return no filter when rlsPolicy is missing', () => {
      const req = { rlsUserId: 42 };
      const result = Technician._buildRLSFilter(req);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    test('should return security failsafe (1=0) for unknown policy', () => {
      const req = { rlsPolicy: 'unknown_policy', rlsUserId: 42 };
      const result = Technician._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });

    test('should return no filter for all_records policy', () => {
      const req = { rlsPolicy: 'all_records', rlsUserId: 42 };
      const result = Technician._buildRLSFilter(req);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    test('should return technician filter for own_record_only policy', () => {
      const req = { rlsPolicy: 'own_record_only', rlsUserId: 42 };
      const result = Technician._buildRLSFilter(req);
      expect(result.clause).toBe('t.id = $1');
      expect(result.values).toEqual([42]);
      expect(result.applied).toBe(true);
    });

    test('should return security failsafe when userId missing for own_record_only', () => {
      const req = { rlsPolicy: 'own_record_only' };
      const result = Technician._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });
  });

  describe('_applyRLSFilter()', () => {
    test('should return existing WHERE unchanged when no RLS policy', () => {
      const req = null;
      const result = Technician._applyRLSFilter(req, 't.status = $1', ['active']);
      expect(result.whereClause).toBe('WHERE t.status = $1');
      expect(result.values).toEqual(['active']);
      expect(result.rlsApplied).toBe(false);
    });

    test('should return existing WHERE unchanged for all_records policy', () => {
      const req = { rlsPolicy: 'all_records', rlsUserId: 42 };
      const result = Technician._applyRLSFilter(req, 't.status = $1', ['active']);
      expect(result.whereClause).toBe('WHERE t.status = $1');
      expect(result.values).toEqual(['active']);
      expect(result.rlsApplied).toBe(false);
    });

    test('should add RLS filter when no existing WHERE clause', () => {
      const req = { rlsPolicy: 'own_record_only', rlsUserId: 42 };
      const result = Technician._applyRLSFilter(req, '', []);
      expect(result.whereClause).toBe('WHERE t.id = $1');
      expect(result.values).toEqual([42]);
      expect(result.rlsApplied).toBe(true);
    });

    test('should combine RLS with existing WHERE clause', () => {
      const req = { rlsPolicy: 'own_record_only', rlsUserId: 42 };
      const result = Technician._applyRLSFilter(req, 'WHERE t.status = $1', ['active']);
      expect(result.whereClause).toBe('WHERE t.status = $1 AND t.id = $2');
      expect(result.values).toEqual(['active', 42]);
      expect(result.rlsApplied).toBe(true);
    });

    test('should adjust parameter placeholders correctly', () => {
      const req = { rlsPolicy: 'own_record_only', rlsUserId: 99 };
      const result = Technician._applyRLSFilter(req, 't.is_active = $1 AND t.status = $2', [true, 'active']);
      expect(result.whereClause).toBe('WHERE t.is_active = $1 AND t.status = $2 AND t.id = $3');
      expect(result.values).toEqual([true, 'active', 99]);
      expect(result.rlsApplied).toBe(true);
    });

    test('should handle security failsafe (1=0) clause', () => {
      const req = { rlsPolicy: 'unknown_policy', rlsUserId: 42 };
      const result = Technician._applyRLSFilter(req, 't.status = $1', ['active']);
      expect(result.whereClause).toBe('WHERE t.status = $1 AND 1=0');
      expect(result.values).toEqual(['active']);
      expect(result.rlsApplied).toBe(true);
    });
  });

  describe('findById() with RLS', () => {
    test('should work without RLS context', async () => {
      const mockTechnician = { id: 1, license_number: 'LIC-001', status: 'available' };
      db.query.mockResolvedValueOnce({ rows: [mockTechnician] });

      const result = await Technician.findById(1);

      expect(result).toEqual(mockTechnician);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('t.id = $1'),
        [1],
      );
    });

    test('should apply all_records RLS policy (no filtering)', async () => {
      const mockTechnician = { id: 1, license_number: 'LIC-001', status: 'available' };
      db.query.mockResolvedValueOnce({ rows: [mockTechnician] });

      const req = { rlsPolicy: 'all_records', rlsUserId: 42 };
      const result = await Technician.findById(1, req);

      expect(result).toEqual(mockTechnician);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('t.id = $1'),
        [1],
      );
    });

    test('should apply own_record_only RLS policy', async () => {
      const mockTechnician = { id: 42, license_number: 'LIC-042', status: 'available' };
      db.query.mockResolvedValueOnce({ rows: [mockTechnician] });

      const req = { rlsPolicy: 'own_record_only', rlsUserId: 42 };
      const result = await Technician.findById(42, req);

      expect(result).toEqual(mockTechnician);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.id = $1 AND t.id = $2'),
        [42, 42],
      );
    });

    test('should return null when RLS blocks access', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = { rlsPolicy: 'own_record_only', rlsUserId: 99 };
      const result = await Technician.findById(42, req);

      expect(result).toBeNull();
    });
  });

  describe('findAll() with RLS', () => {
    test('should work without RLS context', async () => {
      // Arrange
      const mockTechnicians = [
        { id: 1, license_number: 'LIC-001' },
        { id: 2, license_number: 'LIC-002' },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockTechnicians });

      // Act
      const result = await Technician.findAll({});

      // Assert
      expect(result.data).toEqual(mockTechnicians);
      expect(result.rlsApplied).toBe(false);
      expect(QueryBuilderService.buildFilterClause).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true }),
        expect.any(Array),
        expect.any(Number)
      );
    });

    test('should apply all_records RLS policy (no filtering)', async () => {
      // Arrange
      const mockTechnicians = [
        { id: 1, license_number: 'LIC-001' },
        { id: 2, license_number: 'LIC-002' },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockTechnicians });

      // Act
      const req = { rlsPolicy: 'all_records', rlsUserId: 42 };
      const result = await Technician.findAll({ req });

      // Assert
      expect(result.data).toEqual(mockTechnicians);
      expect(result.rlsApplied).toBe(false);
    });

    test('should apply own_record_only RLS policy', async () => {
      // Arrange
      const mockTechnician = { id: 42, license_number: 'LIC-042' };
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: [mockTechnician] });

      // Act
      const req = { rlsPolicy: 'own_record_only', rlsUserId: 42 };
      const result = await Technician.findAll({ req });

      // Assert
      expect(result.data).toEqual([mockTechnician]);
      expect(result.rlsApplied).toBe(true);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('t.id = $');
    });

    test('should combine RLS with search and filters', async () => {
      // Arrange
      const mockTechnicians = [{ id: 42, license_number: 'LIC-042', status: 'available' }];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockTechnicians });

      // Override default mock for this specific test
      QueryBuilderService.buildSearchClause.mockReturnValueOnce({
        clause: "t.license_number ILIKE '%042%'",
        params: ['%042%'],
        paramOffset: 1,
      });
      QueryBuilderService.buildFilterClause.mockReturnValueOnce({
        clause: 't.status = $2 AND t.is_active = $3',
        params: ['available', true],
        applied: { status: 'available', is_active: true },
        paramOffset: 3,
      });

      // Act
      const req = { rlsPolicy: 'own_record_only', rlsUserId: 42 };
      const result = await Technician.findAll({
        search: '042',
        filters: { status: 'available' },
        req,
      });

      // Assert
      expect(result.rlsApplied).toBe(true);
      expect(result.data).toEqual(mockTechnicians);
      expect(QueryBuilderService.buildSearchClause).toHaveBeenCalledWith('042', expect.any(Array));
      expect(QueryBuilderService.buildFilterClause).toHaveBeenCalled();
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('AND');
    });
  });
});
