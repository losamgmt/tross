/**
 * User Model - Row-Level Security Tests
 * Tests RLS filtering:
 * - Customers see only THEIR profile (own_record_only)
 * - Technician+ see ALL users (all_records)
 */

const User = require('../../../db/models/User');
const db = require('../../../db/connection');

// Global mock setup
jest.mock('../../../services/pagination-service', () => ({
  validateParams: jest.fn(() => ({ page: 1, limit: 50, offset: 0 })),
  generateMetadata: jest.fn(() => ({ page: 1, limit: 50, total: 1, totalPages: 1 })),
}));

jest.mock('../../../services/query-builder-service', () => ({
  buildSearchClause: jest.fn(() => ({ clause: '', params: [], paramOffset: 0 })),
  buildFilterClause: jest.fn(() => ({ clause: '', params: [], paramOffset: 0 })),
  buildSortClause: jest.fn(() => 'created_at DESC'),
}));

jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
}));

jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../config/models/user-metadata', () => ({
  searchableFields: ['first_name', 'last_name', 'email'],
  filterableFields: ['role_id', 'is_active', 'status'],
  sortableFields: ['id', 'email', 'first_name', 'last_name', 'created_at'],
  defaultSort: { field: 'created_at', order: 'DESC' },
}));

const PaginationService = require('../../../services/pagination-service');
const QueryBuilderService = require('../../../services/query-builder-service');

describe('User Model - RLS Tests', () => {
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
      clause: 'u.is_active = $1',
      params: [true],
      applied: { is_active: true },
      paramOffset: 1,
    });

    QueryBuilderService.buildSortClause.mockReturnValue('u.created_at DESC');

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
    it('should return no filter when req is null', () => {
      const result = User._buildRLSFilter(null);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    it('should return no filter when rlsPolicy is missing', () => {
      const req = { rlsUserId: 99 };
      const result = User._buildRLSFilter(req);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    it('should return security failsafe (1=0) for unknown policy', () => {
      const req = { rlsPolicy: 'unknown_policy', rlsUserId: 42 };
      const result = User._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });

    it('should return no filter for all_records policy', () => {
      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = User._buildRLSFilter(req);
      expect(result).toEqual({ clause: '', values: [], applied: true });
    });

    it('should return user filter for own_record_only policy', () => {
      const req = { rlsPolicy: 'own_record_only', rlsUserId: 99 };
      const result = User._buildRLSFilter(req);
      expect(result.clause).toBe('u.id = $1');
      expect(result.values).toEqual([99]);
      expect(result.applied).toBe(true);
    });

    it('should return security failsafe when userId missing for own_record_only', () => {
      const req = { rlsPolicy: 'own_record_only' };
      const result = User._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });
  });

  describe('_applyRLSFilter()', () => {
    it('should return existing WHERE unchanged when no RLS policy', () => {
      const req = null;
      const result = User._applyRLSFilter(req, 'u.is_active = $1', [true]);
      expect(result.whereClause).toBe('u.is_active = $1');
      expect(result.values).toEqual([true]);
      expect(result.rlsApplied).toBe(false);
    });

    it('should return existing WHERE unchanged for all_records policy', () => {
      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = User._applyRLSFilter(req, 'WHERE u.is_active = $1', [true]);
      expect(result.whereClause).toBe('WHERE u.is_active = $1');
      expect(result.values).toEqual([true]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should add user RLS filter when no existing WHERE clause', () => {
      const req = { rlsPolicy: 'own_record_only', rlsUserId: 99 };
      const result = User._applyRLSFilter(req, '', []);
      expect(result.whereClause).toBe('WHERE u.id = $1');
      expect(result.values).toEqual([99]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should combine user RLS with existing WHERE clause', () => {
      const req = { rlsPolicy: 'own_record_only', rlsUserId: 99 };
      const result = User._applyRLSFilter(req, 'WHERE u.is_active = $1', [true]);
      expect(result.whereClause).toBe('WHERE u.is_active = $1 AND u.id = $2');
      expect(result.values).toEqual([true, 99]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should adjust parameter placeholders correctly', () => {
      const req = { rlsPolicy: 'own_record_only', rlsUserId: 99 };
      const result = User._applyRLSFilter(req, 'u.is_active = $1 AND u.role_id = $2', [true, 2]);
      expect(result.whereClause).toBe('WHERE u.is_active = $1 AND u.role_id = $2 AND u.id = $3');
      expect(result.values).toEqual([true, 2, 99]);
      expect(result.rlsApplied).toBe(true);
    });
  });

  describe('findById() with RLS', () => {
    it('should work without RLS context', async () => {
      const mockUser = { id: 1, email: 'user@example.com', role: 'customer' };
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await User.findById(1);

      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('u.id = $1'),
        [1],
      );
    });

    it('should apply all_records RLS policy (no filtering)', async () => {
      const mockUser = { id: 1, email: 'user@example.com', role: 'customer' };
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = await User.findById(1, req);

      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('u.id = $1'),
        [1],
      );
    });

    it('should apply own_record_only RLS policy (customer)', async () => {
      const mockUser = { id: 99, email: 'customer@example.com', role: 'customer' };
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const req = { rlsPolicy: 'own_record_only', rlsUserId: 99 };
      const result = await User.findById(99, req);

      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('u.id = $1 AND u.id = $2'),
        [99, 99],
      );
    });

    it('should return null when customer RLS blocks access', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = { rlsPolicy: 'own_record_only', rlsUserId: 999 };
      const result = await User.findById(1, req);

      expect(result).toBeNull();
    });
  });

  describe('findAll() with RLS', () => {
    it('should work without RLS context', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', role: 'customer' },
        { id: 2, email: 'user2@example.com', role: 'technician' },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ total: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockUsers });

      const result = await User.findAll({});

      expect(result.data).toHaveLength(2);
      expect(result.rlsApplied).toBe(false);
    });

    it('should apply all_records RLS policy (no filtering)', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', role: 'customer' },
        { id: 2, email: 'user2@example.com', role: 'technician' },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ total: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockUsers });

      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = await User.findAll({ req });

      expect(result.data).toHaveLength(2);
      expect(result.rlsApplied).toBe(true);
    });

    it('should apply own_record_only RLS policy (customer)', async () => {
      const mockUsers = [{ id: 99, email: 'customer@example.com', role: 'customer' }];
      db.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockUsers });

      const req = { rlsPolicy: 'own_record_only', rlsUserId: 99 };
      const result = await User.findAll({ req });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(99);
      expect(result.rlsApplied).toBe(true);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('u.id = $');
    });

    it('should combine customer RLS with filters', async () => {
      const mockUsers = [{ id: 99, email: 'customer@example.com', role: 'customer', is_active: true }];
      db.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockUsers });

      const req = { rlsPolicy: 'own_record_only', rlsUserId: 99 };
      const result = await User.findAll({
        filters: { is_active: true },
        req,
      });

      expect(result.rlsApplied).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
