/**
 * Contract Model - Row-Level Security Tests
 * Tests RLS filtering including null policy handling:
 * - Customers see only THEIR contracts (own_contracts_only)
 * - Technicians have NO ACCESS (null policy → 1=0 failsafe)
 * - Dispatcher+ see ALL contracts (all_records)
 */

const Contract = require('../../../db/models/Contract');
const db = require('../../../db/connection');

// Global mock setup
jest.mock('../../../services/pagination-service', () => ({
  validateParams: jest.fn(() => ({ page: 1, limit: 50, offset: 0 })),
  generateMetadata: jest.fn(() => ({ page: 1, limit: 50, total: 1, totalPages: 1 })),
}));

jest.mock('../../../services/query-builder-service', () => ({
  buildSearchClause: jest.fn(() => ({ clause: '', params: [], paramOffset: 0 })),
  buildFilterClause: jest.fn(() => ({ clause: '', params: [], applied: {} })),
  buildSortClause: jest.fn(() => 'ORDER BY c.created_at DESC'),
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

jest.mock('../../../config/models/contract-metadata', () => ({
  searchableFields: ['contract_number'],
  filterableFields: ['status', 'is_active', 'customer_id'],
  sortableFields: ['created_at', 'contract_number', 'start_date'],
  defaultSort: 'created_at DESC',
}));

const PaginationService = require('../../../services/pagination-service');
const QueryBuilderService = require('../../../services/query-builder-service');

describe('Contract Model - RLS Tests', () => {
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
    it('should return no filter when req is null', () => {
      const result = Contract._buildRLSFilter(null);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    it('should return no filter when rlsPolicy is missing', () => {
      const req = { rlsUserId: 99 };
      const result = Contract._buildRLSFilter(req);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    it('should return security failsafe (1=0) for null policy (technician)', () => {
      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = Contract._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });

    it('should return security failsafe (1=0) for unknown policy', () => {
      const req = { rlsPolicy: 'unknown_policy', rlsUserId: 42 };
      const result = Contract._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });

    it('should return no filter for all_records policy', () => {
      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = Contract._buildRLSFilter(req);
      expect(result).toEqual({ clause: '', values: [], applied: true });
    });

    it('should return customer filter for own_contracts_only policy', () => {
      const req = { rlsPolicy: 'own_contracts_only', rlsUserId: 99 };
      const result = Contract._buildRLSFilter(req);
      expect(result.clause).toBe('c.customer_id = $1');
      expect(result.values).toEqual([99]);
      expect(result.applied).toBe(true);
    });

    it('should return security failsafe when userId missing for own_contracts_only', () => {
      const req = { rlsPolicy: 'own_contracts_only' };
      const result = Contract._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });
  });

  describe('_applyRLSFilter()', () => {
    it('should return existing WHERE unchanged when no RLS policy', () => {
      const req = null;
      const result = Contract._applyRLSFilter(req, 'c.status = $1', ['active']);
      expect(result.whereClause).toBe('WHERE c.status = $1');
      expect(result.values).toEqual(['active']);
      expect(result.rlsApplied).toBe(false);
    });

    it('should return existing WHERE unchanged for all_records policy', () => {
      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = Contract._applyRLSFilter(req, 'WHERE c.status = $1', ['active']);
      expect(result.whereClause).toBe('WHERE c.status = $1');
      expect(result.values).toEqual(['active']);
      expect(result.rlsApplied).toBe(true);
    });

    it('should add customer RLS filter when no existing WHERE clause', () => {
      const req = { rlsPolicy: 'own_contracts_only', rlsUserId: 99 };
      const result = Contract._applyRLSFilter(req, '', []);
      expect(result.whereClause).toBe('WHERE c.customer_id = $1');
      expect(result.values).toEqual([99]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should add null policy failsafe (1=0) when no existing WHERE clause', () => {
      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = Contract._applyRLSFilter(req, '', []);
      expect(result.whereClause).toBe('WHERE 1=0');
      expect(result.values).toEqual([]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should combine customer RLS with existing WHERE clause', () => {
      const req = { rlsPolicy: 'own_contracts_only', rlsUserId: 99 };
      const result = Contract._applyRLSFilter(req, 'c.status = $1', ['active']);
      expect(result.whereClause).toBe('WHERE c.status = $1 AND c.customer_id = $2');
      expect(result.values).toEqual(['active', 99]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should combine null policy failsafe with existing WHERE clause', () => {
      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = Contract._applyRLSFilter(req, 'c.status = $1', ['active']);
      expect(result.whereClause).toBe('WHERE c.status = $1 AND 1=0');
      expect(result.values).toEqual(['active']);
      expect(result.rlsApplied).toBe(true);
    });

    it('should adjust parameter placeholders correctly', () => {
      const req = { rlsPolicy: 'own_contracts_only', rlsUserId: 99 };
      const result = Contract._applyRLSFilter(req, 'c.is_active = $1 AND c.status = $2', [true, 'active']);
      expect(result.whereClause).toBe('WHERE c.is_active = $1 AND c.status = $2 AND c.customer_id = $3');
      expect(result.values).toEqual([true, 'active', 99]);
      expect(result.rlsApplied).toBe(true);
    });
  });

  describe('findById() with RLS', () => {
    it('should work without RLS context', async () => {
      const mockContract = { id: 1, contract_number: 'CNT-001', customer_id: 99 };
      db.query.mockResolvedValueOnce({ rows: [mockContract] });

      const result = await Contract.findById(1);

      expect(result).toEqual(mockContract);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('c.id = $1'),
        [1],
      );
    });

    it('should apply all_records RLS policy (no filtering)', async () => {
      const mockContract = { id: 1, contract_number: 'CNT-001', customer_id: 99 };
      db.query.mockResolvedValueOnce({ rows: [mockContract] });

      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = await Contract.findById(1, req);

      expect(result).toEqual(mockContract);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('c.id = $1'),
        [1],
      );
    });

    it('should apply own_contracts_only RLS policy (customer)', async () => {
      const mockContract = { id: 1, contract_number: 'CNT-001', customer_id: 99 };
      db.query.mockResolvedValueOnce({ rows: [mockContract] });

      const req = { rlsPolicy: 'own_contracts_only', rlsUserId: 99 };
      const result = await Contract.findById(1, req);

      expect(result).toEqual(mockContract);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('c.id = $1 AND c.customer_id = $2'),
        [1, 99],
      );
    });

    it('should apply null policy (technician - no access)', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = await Contract.findById(1, req);

      expect(result).toBeNull();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('c.id = $1 AND 1=0'),
        [1],
      );
    });

    it('should return null when customer RLS blocks access', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = { rlsPolicy: 'own_contracts_only', rlsUserId: 999 };
      const result = await Contract.findById(1, req);

      expect(result).toBeNull();
    });
  });

  describe('findAll() with RLS', () => {
    it('should work without RLS context', async () => {
      const mockContracts = [
        { id: 1, contract_number: 'CNT-001', customer_id: 99 },
        { id: 2, contract_number: 'CNT-002', customer_id: 100 },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockContracts });

      const result = await Contract.findAll({});

      expect(result.data).toEqual(mockContracts);
      expect(result.rlsApplied).toBe(false);
    });

    it('should apply all_records RLS policy (no filtering)', async () => {
      const mockContracts = [
        { id: 1, contract_number: 'CNT-001', customer_id: 99 },
        { id: 2, contract_number: 'CNT-002', customer_id: 100 },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockContracts });

      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = await Contract.findAll({ req });

      expect(result.data).toEqual(mockContracts);
      expect(result.rlsApplied).toBe(true);
    });

    it('should apply own_contracts_only RLS policy (customer)', async () => {
      const mockContracts = [{ id: 1, contract_number: 'CNT-001', customer_id: 99 }];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockContracts });

      const req = { rlsPolicy: 'own_contracts_only', rlsUserId: 99 };
      const result = await Contract.findAll({ req });

      expect(result.data).toEqual(mockContracts);
      expect(result.rlsApplied).toBe(true);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('c.customer_id = $');
    });

    it('should apply null policy (technician - no access)', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = await Contract.findAll({ req });

      expect(result.data).toEqual([]);
      expect(result.rlsApplied).toBe(true);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('1=0');
    });

    it('should combine customer RLS with search and filters', async () => {
      const mockContracts = [{ id: 1, contract_number: 'CNT-001', customer_id: 99, status: 'active' }];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockContracts });

      QueryBuilderService.buildSearchClause.mockReturnValueOnce({
        clause: "c.contract_number ILIKE '%001%'",
        values: [],
      });
      QueryBuilderService.buildFilterClause.mockReturnValueOnce({
        clause: 'c.status = $1',
        values: ['active'],
        applied: { status: 'active' },
      });

      const req = { rlsPolicy: 'own_contracts_only', rlsUserId: 99 };
      const result = await Contract.findAll({
        search: '001',
        filters: { status: 'active' },
        req,
      });

      expect(result.rlsApplied).toBe(true);
      expect(result.data).toEqual(mockContracts);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('AND');
    });

    it('should combine null policy with filters (technician blocked)', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      QueryBuilderService.buildFilterClause.mockReturnValueOnce({
        clause: 'c.status = $1',
        values: ['active'],
        applied: { status: 'active' },
      });

      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = await Contract.findAll({
        filters: { status: 'active' },
        req,
      });

      expect(result.rlsApplied).toBe(true);
      expect(result.data).toEqual([]);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('1=0');
    });
  });
});
