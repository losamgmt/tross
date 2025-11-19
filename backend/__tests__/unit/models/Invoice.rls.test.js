/**
 * Invoice Model - Row-Level Security Tests
 * Tests RLS filtering including null policy handling:
 * - Customers see only THEIR invoices (own_invoices_only)
 * - Technicians have NO ACCESS (null policy → 1=0 failsafe)
 * - Dispatcher+ see ALL invoices (all_records)
 */

const Invoice = require('../../../db/models/Invoice');
const db = require('../../../db/connection');

// Global mock setup
jest.mock('../../../services/pagination-service', () => ({
  validateParams: jest.fn(() => ({ page: 1, limit: 50, offset: 0 })),
  generateMetadata: jest.fn(() => ({ page: 1, limit: 50, total: 1, totalPages: 1 })),
}));

jest.mock('../../../services/query-builder-service', () => ({
  buildSearchClause: jest.fn(() => ({ clause: '', params: [], paramOffset: 0 })),
  buildFilterClause: jest.fn(() => ({ clause: '', params: [], applied: {} })),
  buildSortClause: jest.fn(() => 'ORDER BY i.created_at DESC'),
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

jest.mock('../../../config/models/invoice-metadata', () => ({
  searchableFields: ['invoice_number'],
  filterableFields: ['status', 'is_active', 'customer_id'],
  sortableFields: ['created_at', 'invoice_number', 'due_date'],
  defaultSort: 'created_at DESC',
}));

const PaginationService = require('../../../services/pagination-service');
const QueryBuilderService = require('../../../services/query-builder-service');

describe('Invoice Model - RLS Tests', () => {
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
      clause: 'i.is_active = $1',
      params: [true],
      applied: { is_active: true },
      paramOffset: 1,
    });

    QueryBuilderService.buildSortClause.mockReturnValue('i.created_at DESC');

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
      const result = Invoice._buildRLSFilter(null);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    it('should return no filter when rlsPolicy is missing', () => {
      const req = { rlsUserId: 99 };
      const result = Invoice._buildRLSFilter(req);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    it('should return security failsafe (1=0) for null policy (technician)', () => {
      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = Invoice._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });

    it('should return security failsafe (1=0) for unknown policy', () => {
      const req = { rlsPolicy: 'unknown_policy', rlsUserId: 42 };
      const result = Invoice._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });

    it('should return no filter for all_records policy', () => {
      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = Invoice._buildRLSFilter(req);
      expect(result).toEqual({ clause: '', values: [], applied: true });
    });

    it('should return customer filter for own_invoices_only policy', () => {
      const req = { rlsPolicy: 'own_invoices_only', rlsUserId: 99 };
      const result = Invoice._buildRLSFilter(req);
      expect(result.clause).toBe('i.customer_id = $1');
      expect(result.values).toEqual([99]);
      expect(result.applied).toBe(true);
    });

    it('should return security failsafe when userId missing for own_invoices_only', () => {
      const req = { rlsPolicy: 'own_invoices_only' };
      const result = Invoice._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });
  });

  describe('_applyRLSFilter()', () => {
    it('should return existing WHERE unchanged when no RLS policy', () => {
      const req = null;
      const result = Invoice._applyRLSFilter(req, 'i.status = $1', ['paid']);
      expect(result.whereClause).toBe('WHERE i.status = $1');
      expect(result.values).toEqual(['paid']);
      expect(result.rlsApplied).toBe(false);
    });

    it('should return existing WHERE unchanged for all_records policy', () => {
      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = Invoice._applyRLSFilter(req, 'WHERE i.status = $1', ['paid']);
      expect(result.whereClause).toBe('WHERE i.status = $1');
      expect(result.values).toEqual(['paid']);
      expect(result.rlsApplied).toBe(true);
    });

    it('should add customer RLS filter when no existing WHERE clause', () => {
      const req = { rlsPolicy: 'own_invoices_only', rlsUserId: 99 };
      const result = Invoice._applyRLSFilter(req, '', []);
      expect(result.whereClause).toBe('WHERE i.customer_id = $1');
      expect(result.values).toEqual([99]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should add null policy failsafe (1=0) when no existing WHERE clause', () => {
      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = Invoice._applyRLSFilter(req, '', []);
      expect(result.whereClause).toBe('WHERE 1=0');
      expect(result.values).toEqual([]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should combine customer RLS with existing WHERE clause', () => {
      const req = { rlsPolicy: 'own_invoices_only', rlsUserId: 99 };
      const result = Invoice._applyRLSFilter(req, 'WHERE i.status = $1', ['paid']);
      expect(result.whereClause).toBe('WHERE i.status = $1 AND i.customer_id = $2');
      expect(result.values).toEqual(['paid', 99]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should combine null policy failsafe with existing WHERE clause', () => {
      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = Invoice._applyRLSFilter(req, 'WHERE i.status = $1', ['paid']);
      expect(result.whereClause).toBe('WHERE i.status = $1 AND 1=0');
      expect(result.values).toEqual(['paid']);
      expect(result.rlsApplied).toBe(true);
    });

    it('should adjust parameter placeholders correctly', () => {
      const req = { rlsPolicy: 'own_invoices_only', rlsUserId: 99 };
      const result = Invoice._applyRLSFilter(req, 'i.is_active = $1 AND i.status = $2', [true, 'sent']);
      expect(result.whereClause).toBe('WHERE i.is_active = $1 AND i.status = $2 AND i.customer_id = $3');
      expect(result.values).toEqual([true, 'sent', 99]);
      expect(result.rlsApplied).toBe(true);
    });
  });

  describe('findById() with RLS', () => {
    it('should work without RLS context', async () => {
      const mockInvoice = { id: 1, invoice_number: 'INV-001', customer_id: 99 };
      db.query.mockResolvedValueOnce({ rows: [mockInvoice] });

      const result = await Invoice.findById(1);

      expect(result).toEqual(mockInvoice);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('i.id = $1'),
        [1],
      );
    });

    it('should apply all_records RLS policy (no filtering)', async () => {
      const mockInvoice = { id: 1, invoice_number: 'INV-001', customer_id: 99 };
      db.query.mockResolvedValueOnce({ rows: [mockInvoice] });

      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = await Invoice.findById(1, req);

      expect(result).toEqual(mockInvoice);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('i.id = $1'),
        [1],
      );
    });

    it('should apply own_invoices_only RLS policy (customer)', async () => {
      const mockInvoice = { id: 1, invoice_number: 'INV-001', customer_id: 99 };
      db.query.mockResolvedValueOnce({ rows: [mockInvoice] });

      const req = { rlsPolicy: 'own_invoices_only', rlsUserId: 99 };
      const result = await Invoice.findById(1, req);

      expect(result).toEqual(mockInvoice);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('i.id = $1 AND i.customer_id = $2'),
        [1, 99],
      );
    });

    it('should apply null policy (technician - no access)', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = await Invoice.findById(1, req);

      expect(result).toBeNull();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('i.id = $1 AND 1=0'),
        [1],
      );
    });

    it('should return null when customer RLS blocks access', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = { rlsPolicy: 'own_invoices_only', rlsUserId: 999 };
      const result = await Invoice.findById(1, req);

      expect(result).toBeNull();
    });
  });

  describe('findAll() with RLS', () => {
    it('should work without RLS context', async () => {
      const mockInvoices = [
        { id: 1, invoice_number: 'INV-001', customer_id: 99 },
        { id: 2, invoice_number: 'INV-002', customer_id: 100 },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockInvoices });

      const result = await Invoice.findAll({});

      expect(result.data).toEqual(mockInvoices);
      expect(result.rlsApplied).toBe(false);
    });

    it('should apply all_records RLS policy (no filtering)', async () => {
      const mockInvoices = [
        { id: 1, invoice_number: 'INV-001', customer_id: 99 },
        { id: 2, invoice_number: 'INV-002', customer_id: 100 },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockInvoices });

      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = await Invoice.findAll({ req });

      expect(result.data).toEqual(mockInvoices);
      expect(result.rlsApplied).toBe(true);
    });

    it('should apply own_invoices_only RLS policy (customer)', async () => {
      const mockInvoices = [{ id: 1, invoice_number: 'INV-001', customer_id: 99 }];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockInvoices });

      const req = { rlsPolicy: 'own_invoices_only', rlsUserId: 99 };
      const result = await Invoice.findAll({ req });

      expect(result.data).toEqual(mockInvoices);
      expect(result.rlsApplied).toBe(true);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('i.customer_id = $');
    });

    it('should apply null policy (technician - no access)', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = await Invoice.findAll({ req });

      expect(result.data).toEqual([]);
      expect(result.rlsApplied).toBe(true);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('1=0');
    });

    it('should combine customer RLS with search and filters', async () => {
      const mockInvoices = [{ id: 1, invoice_number: 'INV-001', customer_id: 99, status: 'paid' }];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockInvoices });

      QueryBuilderService.buildSearchClause.mockReturnValueOnce({
        clause: "i.invoice_number ILIKE '%001%'",
        values: [],
      });
      QueryBuilderService.buildFilterClause.mockReturnValueOnce({
        clause: 'i.status = $1',
        values: ['paid'],
        applied: { status: 'paid' },
      });

      const req = { rlsPolicy: 'own_invoices_only', rlsUserId: 99 };
      const result = await Invoice.findAll({
        search: '001',
        filters: { status: 'paid' },
        req,
      });

      expect(result.rlsApplied).toBe(true);
      expect(result.data).toEqual(mockInvoices);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('AND');
    });

    it('should combine null policy with filters (technician blocked)', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      QueryBuilderService.buildFilterClause.mockReturnValueOnce({
        clause: 'i.status = $1',
        values: ['paid'],
        applied: { status: 'paid' },
      });

      const req = { rlsPolicy: null, rlsUserId: 42 };
      const result = await Invoice.findAll({
        filters: { status: 'paid' },
        req,
      });

      expect(result.rlsApplied).toBe(true);
      expect(result.data).toEqual([]);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('1=0');
    });
  });
});
