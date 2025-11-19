/**
 * WorkOrder Model - Row-Level Security Tests
 * Tests bidirectional RLS filtering:
 * - Customers see only THEIR work orders (own_work_orders_only)
 * - Technicians see only ASSIGNED work orders (assigned_work_orders_only)
 * - Dispatcher+ see ALL work orders (all_records)
 */

const WorkOrder = require('../../../db/models/WorkOrder');
const db = require('../../../db/connection');

// Global mock setup (performance optimization)
jest.mock('../../../services/pagination-service', () => ({
  validateParams: jest.fn(() => ({ page: 1, limit: 50, offset: 0 })),
  generateMetadata: jest.fn(() => ({ page: 1, limit: 50, total: 1, totalPages: 1 })),
}));

jest.mock('../../../services/query-builder-service', () => ({
  buildSearchClause: jest.fn(() => ({ clause: '', params: [], paramOffset: 0 })),
  buildFilterClause: jest.fn(() => ({ clause: '', params: [], applied: {} })),
  buildSortClause: jest.fn(() => 'ORDER BY wo.created_at DESC'),
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

jest.mock('../../../config/models/work-order-metadata', () => ({
  searchableFields: ['title', 'description'],
  filterableFields: ['status', 'priority', 'is_active', 'customer_id', 'assigned_technician_id'],
  sortableFields: ['created_at', 'title', 'priority'],
  defaultSort: 'created_at DESC',
}));

const PaginationService = require('../../../services/pagination-service');
const QueryBuilderService = require('../../../services/query-builder-service');

describe('WorkOrder Model - RLS Tests', () => {
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
      clause: 'wo.is_active = $1',
      params: [true],
      applied: { is_active: true },
      paramOffset: 1,
    });

    QueryBuilderService.buildSortClause.mockReturnValue('wo.created_at DESC');

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
      const result = WorkOrder._buildRLSFilter(null);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    it('should return no filter when rlsPolicy is missing', () => {
      const req = { rlsUserId: 42 };
      const result = WorkOrder._buildRLSFilter(req);
      expect(result).toEqual({ clause: '', values: [], applied: false });
    });

    it('should return security failsafe (1=0) for unknown policy', () => {
      const req = { rlsPolicy: 'unknown_policy', rlsUserId: 42 };
      const result = WorkOrder._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });

    it('should return no filter for all_records policy', () => {
      const req = { rlsPolicy: 'all_records', rlsUserId: 42 };
      const result = WorkOrder._buildRLSFilter(req);
      expect(result).toEqual({ clause: '', values: [], applied: true });
    });

    it('should return customer filter for own_work_orders_only policy', () => {
      const req = { rlsPolicy: 'own_work_orders_only', rlsUserId: 99 };
      const result = WorkOrder._buildRLSFilter(req);
      expect(result.clause).toBe('wo.customer_id = $1');
      expect(result.values).toEqual([99]);
      expect(result.applied).toBe(true);
    });

    it('should return technician filter for assigned_work_orders_only policy', () => {
      const req = { rlsPolicy: 'assigned_work_orders_only', rlsUserId: 42 };
      const result = WorkOrder._buildRLSFilter(req);
      expect(result.clause).toBe('wo.assigned_technician_id = $1');
      expect(result.values).toEqual([42]);
      expect(result.applied).toBe(true);
    });

    it('should return security failsafe when userId missing for own_work_orders_only', () => {
      const req = { rlsPolicy: 'own_work_orders_only' };
      const result = WorkOrder._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });

    it('should return security failsafe when userId missing for assigned_work_orders_only', () => {
      const req = { rlsPolicy: 'assigned_work_orders_only' };
      const result = WorkOrder._buildRLSFilter(req);
      expect(result.clause).toBe('1=0');
      expect(result.applied).toBe(true);
    });
  });

  describe('_applyRLSFilter()', () => {
    it('should return existing WHERE unchanged when no RLS policy', () => {
      const req = null;
      const result = WorkOrder._applyRLSFilter(req, 'wo.status = $1', ['pending']);
      expect(result.whereClause).toBe('WHERE wo.status = $1');
      expect(result.values).toEqual(['pending']);
      expect(result.rlsApplied).toBe(false);
    });

    it('should return existing WHERE unchanged for all_records policy', () => {
      const req = { rlsPolicy: 'all_records', rlsUserId: 42 };
      const result = WorkOrder._applyRLSFilter(req, 'WHERE wo.status = $1', ['pending']);
      expect(result.whereClause).toBe('WHERE wo.status = $1');
      expect(result.values).toEqual(['pending']);
      expect(result.rlsApplied).toBe(true);
    });

    it('should add customer RLS filter when no existing WHERE clause', () => {
      const req = { rlsPolicy: 'own_work_orders_only', rlsUserId: 99 };
      const result = WorkOrder._applyRLSFilter(req, '', []);
      expect(result.whereClause).toBe('WHERE wo.customer_id = $1');
      expect(result.values).toEqual([99]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should add technician RLS filter when no existing WHERE clause', () => {
      const req = { rlsPolicy: 'assigned_work_orders_only', rlsUserId: 42 };
      const result = WorkOrder._applyRLSFilter(req, '', []);
      expect(result.whereClause).toBe('WHERE wo.assigned_technician_id = $1');
      expect(result.values).toEqual([42]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should combine customer RLS with existing WHERE clause', () => {
      const req = { rlsPolicy: 'own_work_orders_only', rlsUserId: 99 };
      const result = WorkOrder._applyRLSFilter(req, 'WHERE wo.status = $1', ['pending']);
      expect(result.whereClause).toBe('WHERE wo.status = $1 AND wo.customer_id = $2');
      expect(result.values).toEqual(['pending', 99]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should combine technician RLS with existing WHERE clause', () => {
      const req = { rlsPolicy: 'assigned_work_orders_only', rlsUserId: 42 };
      const result = WorkOrder._applyRLSFilter(req, 'WHERE wo.priority = $1', ['high']);
      expect(result.whereClause).toBe('WHERE wo.priority = $1 AND wo.assigned_technician_id = $2');
      expect(result.values).toEqual(['high', 42]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should adjust parameter placeholders correctly', () => {
      const req = { rlsPolicy: 'own_work_orders_only', rlsUserId: 99 };
      const result = WorkOrder._applyRLSFilter(req, 'wo.is_active = $1 AND wo.status = $2', [true, 'pending']);
      expect(result.whereClause).toBe('WHERE wo.is_active = $1 AND wo.status = $2 AND wo.customer_id = $3');
      expect(result.values).toEqual([true, 'pending', 99]);
      expect(result.rlsApplied).toBe(true);
    });

    it('should handle security failsafe (1=0) clause', () => {
      const req = { rlsPolicy: 'unknown_policy', rlsUserId: 42 };
      const result = WorkOrder._applyRLSFilter(req, 'wo.status = $1', ['pending']);
      expect(result.whereClause).toBe('WHERE wo.status = $1 AND 1=0');
      expect(result.values).toEqual(['pending']);
      expect(result.rlsApplied).toBe(true);
    });
  });

  describe('findById() with RLS', () => {
    it('should work without RLS context', async () => {
      const mockWorkOrder = { id: 1, title: 'Fix HVAC', customer_id: 99, assigned_technician_id: 42 };
      db.query.mockResolvedValueOnce({ rows: [mockWorkOrder] });

      const result = await WorkOrder.findById(1);

      expect(result).toEqual(mockWorkOrder);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('wo.id = $1'),
        [1],
      );
    });

    it('should apply all_records RLS policy (no filtering)', async () => {
      const mockWorkOrder = { id: 1, title: 'Fix HVAC', customer_id: 99, assigned_technician_id: 42 };
      db.query.mockResolvedValueOnce({ rows: [mockWorkOrder] });

      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = await WorkOrder.findById(1, req);

      expect(result).toEqual(mockWorkOrder);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('wo.id = $1'),
        [1],
      );
    });

    it('should apply own_work_orders_only RLS policy (customer)', async () => {
      const mockWorkOrder = { id: 1, title: 'Fix HVAC', customer_id: 99, assigned_technician_id: 42 };
      db.query.mockResolvedValueOnce({ rows: [mockWorkOrder] });

      const req = { rlsPolicy: 'own_work_orders_only', rlsUserId: 99 };
      const result = await WorkOrder.findById(1, req);

      expect(result).toEqual(mockWorkOrder);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('wo.id = $1 AND wo.customer_id = $2'),
        [1, 99],
      );
    });

    it('should apply assigned_work_orders_only RLS policy (technician)', async () => {
      const mockWorkOrder = { id: 1, title: 'Fix HVAC', customer_id: 99, assigned_technician_id: 42 };
      db.query.mockResolvedValueOnce({ rows: [mockWorkOrder] });

      const req = { rlsPolicy: 'assigned_work_orders_only', rlsUserId: 42 };
      const result = await WorkOrder.findById(1, req);

      expect(result).toEqual(mockWorkOrder);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('wo.id = $1 AND wo.assigned_technician_id = $2'),
        [1, 42],
      );
    });

    it('should return null when customer RLS blocks access', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = { rlsPolicy: 'own_work_orders_only', rlsUserId: 999 };
      const result = await WorkOrder.findById(1, req);

      expect(result).toBeNull();
    });

    it('should return null when technician RLS blocks access', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = { rlsPolicy: 'assigned_work_orders_only', rlsUserId: 888 };
      const result = await WorkOrder.findById(1, req);

      expect(result).toBeNull();
    });
  });

  describe('findAll() with RLS', () => {
    it('should work without RLS context', async () => {
      const mockWorkOrders = [
        { id: 1, title: 'Fix HVAC', customer_id: 99 },
        { id: 2, title: 'Install AC', customer_id: 100 },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockWorkOrders });

      const result = await WorkOrder.findAll({});

      expect(result.data).toEqual(mockWorkOrders);
      expect(result.rlsApplied).toBe(false);
    });

    it('should apply all_records RLS policy (no filtering)', async () => {
      const mockWorkOrders = [
        { id: 1, title: 'Fix HVAC', customer_id: 99 },
        { id: 2, title: 'Install AC', customer_id: 100 },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockWorkOrders });

      const req = { rlsPolicy: 'all_records', rlsUserId: 5 };
      const result = await WorkOrder.findAll({ req });

      expect(result.data).toEqual(mockWorkOrders);
      expect(result.rlsApplied).toBe(true);
    });

    it('should apply own_work_orders_only RLS policy (customer)', async () => {
      const mockWorkOrders = [{ id: 1, title: 'Fix HVAC', customer_id: 99 }];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockWorkOrders });

      const req = { rlsPolicy: 'own_work_orders_only', rlsUserId: 99 };
      const result = await WorkOrder.findAll({ req });

      expect(result.data).toEqual(mockWorkOrders);
      expect(result.rlsApplied).toBe(true);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('wo.customer_id = $');
    });

    it('should apply assigned_work_orders_only RLS policy (technician)', async () => {
      const mockWorkOrders = [{ id: 1, title: 'Fix HVAC', assigned_technician_id: 42 }];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockWorkOrders });

      const req = { rlsPolicy: 'assigned_work_orders_only', rlsUserId: 42 };
      const result = await WorkOrder.findAll({ req });

      expect(result.data).toEqual(mockWorkOrders);
      expect(result.rlsApplied).toBe(true);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('wo.assigned_technician_id = $');
    });

    it('should combine customer RLS with search and filters', async () => {
      const mockWorkOrders = [{ id: 1, title: 'Fix HVAC', customer_id: 99, status: 'pending' }];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockWorkOrders });

      QueryBuilderService.buildSearchClause.mockReturnValueOnce({
        clause: "wo.title ILIKE '%HVAC%'",
        values: [],
      });
      QueryBuilderService.buildFilterClause.mockReturnValueOnce({
        clause: 'wo.status = $1',
        values: ['pending'],
        applied: { status: 'pending' },
      });

      const req = { rlsPolicy: 'own_work_orders_only', rlsUserId: 99 };
      const result = await WorkOrder.findAll({
        search: 'HVAC',
        filters: { status: 'pending' },
        req,
      });

      expect(result.rlsApplied).toBe(true);
      expect(result.data).toEqual(mockWorkOrders);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('AND');
    });

    it('should combine technician RLS with search and filters', async () => {
      const mockWorkOrders = [{ id: 1, title: 'Install AC', assigned_technician_id: 42, priority: 'high' }];
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      db.query.mockResolvedValueOnce({ rows: mockWorkOrders });

      QueryBuilderService.buildSearchClause.mockReturnValueOnce({
        clause: "wo.title ILIKE '%AC%'",
        values: [],
      });
      QueryBuilderService.buildFilterClause.mockReturnValueOnce({
        clause: 'wo.priority = $1',
        values: ['high'],
        applied: { priority: 'high' },
      });

      const req = { rlsPolicy: 'assigned_work_orders_only', rlsUserId: 42 };
      const result = await WorkOrder.findAll({
        search: 'AC',
        filters: { priority: 'high' },
        req,
      });

      expect(result.rlsApplied).toBe(true);
      expect(result.data).toEqual(mockWorkOrders);
      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('WHERE');
      expect(countQuery).toContain('AND');
    });
  });
});
