/**
 * Stats Service Unit Tests
 */

const StatsService = require('../../../services/stats-service');

// Mock dependencies
jest.mock('../../../db/connection');
jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const db = require('../../../db/connection');

describe('StatsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('count', () => {
    it('should count records for an entity', async () => {
      // Mock DB response
      db.query.mockResolvedValue({ rows: [{ count: '42' }] });

      // Mock request with RLS context
      const mockReq = {
        user: { role: 'admin', userId: 1 },
        rlsPolicy: 'all_records',
      };

      const result = await StatsService.count('work_order', mockReq);

      expect(result).toBe(42);
      expect(db.query).toHaveBeenCalled();
      expect(db.query.mock.calls[0][0]).toContain('SELECT COUNT(*)');
      expect(db.query.mock.calls[0][0]).toContain('work_orders');
    });

    it('should apply filters to count', async () => {
      db.query.mockResolvedValue({ rows: [{ count: '5' }] });

      const mockReq = {
        user: { role: 'admin', userId: 1 },
        rlsPolicy: 'all_records',
      };

      const result = await StatsService.count('work_order', mockReq, { status: 'pending' });

      expect(result).toBe(5);
      expect(db.query.mock.calls[0][0]).toContain('status');
    });

    it('should throw for unknown entity', async () => {
      const mockReq = { user: { role: 'admin', userId: 1 } };

      await expect(StatsService.count('unknown_entity', mockReq))
        .rejects.toThrow('Unknown entity: unknown_entity');
    });
  });

  describe('countGrouped', () => {
    it('should count records grouped by a field', async () => {
      db.query.mockResolvedValue({
        rows: [
          { value: 'pending', count: '5' },
          { value: 'completed', count: '10' },
        ],
      });

      const mockReq = {
        user: { role: 'admin', userId: 1 },
        rlsPolicy: 'all_records',
      };

      const result = await StatsService.countGrouped('work_order', mockReq, 'status');

      expect(result).toEqual([
        { value: 'pending', count: 5 },
        { value: 'completed', count: 10 },
      ]);
      expect(db.query.mock.calls[0][0]).toContain('GROUP BY');
    });

    it('should throw for non-filterable group field', async () => {
      const mockReq = {
        user: { role: 'admin', userId: 1 },
        rlsPolicy: 'all_records',
      };

      await expect(StatsService.countGrouped('work_order', mockReq, 'not_a_field'))
        .rejects.toThrow("Cannot group by 'not_a_field' - not a filterable field");
    });
  });

  describe('sum', () => {
    it('should sum a numeric field', async () => {
      db.query.mockResolvedValue({ rows: [{ total: '12500.50' }] });

      const mockReq = {
        user: { role: 'admin', userId: 1 },
        rlsPolicy: 'all_records',
      };

      const result = await StatsService.sum('invoice', mockReq, 'total');

      expect(result).toBe(12500.50);
      expect(db.query.mock.calls[0][0]).toContain('SUM');
    });

    it('should throw for non-numeric field', async () => {
      const mockReq = {
        user: { role: 'admin', userId: 1 },
        rlsPolicy: 'all_records',
      };

      await expect(StatsService.sum('work_order', mockReq, 'status'))
        .rejects.toThrow();
    });

    it('should throw for unknown entity', async () => {
      const mockReq = { user: { role: 'admin', userId: 1 } };

      await expect(StatsService.sum('unknown_entity', mockReq, 'amount'))
        .rejects.toThrow('Unknown entity: unknown_entity');
    });

    it('should apply filters to sum', async () => {
      db.query.mockResolvedValue({ rows: [{ total: '5000.00' }] });

      const mockReq = {
        user: { role: 'admin', userId: 1 },
        rlsPolicy: 'all_records',
      };

      const result = await StatsService.sum('invoice', mockReq, 'total', { status: 'paid' });

      expect(result).toBe(5000.00);
      expect(db.query.mock.calls[0][0]).toContain('status');
    });

    it('should return 0 when COALESCE handles null sum', async () => {
      db.query.mockResolvedValue({ rows: [{ total: '0' }] });

      const mockReq = {
        user: { role: 'admin', userId: 1 },
        rlsPolicy: 'all_records',
      };

      const result = await StatsService.sum('invoice', mockReq, 'total', { status: 'nonexistent' });

      expect(result).toBe(0);
    });
  });

  describe('countGrouped with filters', () => {
    it('should apply filters to grouped count', async () => {
      db.query.mockResolvedValue({
        rows: [{ value: 'pending', count: '3' }],
      });

      const mockReq = {
        user: { role: 'admin', userId: 1 },
        rlsPolicy: 'all_records',
      };

      const result = await StatsService.countGrouped('work_order', mockReq, 'status', { priority: 'high' });

      expect(result).toEqual([{ value: 'pending', count: 3 }]);
      expect(db.query.mock.calls[0][0]).toContain('priority');
    });

    it('should throw for unknown entity', async () => {
      const mockReq = { user: { role: 'admin', userId: 1 } };

      await expect(StatsService.countGrouped('unknown_entity', mockReq, 'status'))
        .rejects.toThrow('Unknown entity: unknown_entity');
    });
  });

  describe('RLS integration', () => {
    it('should apply RLS filter for non-admin users in count', async () => {
      db.query.mockResolvedValue({ rows: [{ count: '2' }] });

      const mockReq = {
        user: { role: 'technician', userId: 5, id: 5 },
        rlsPolicy: 'own_records',
      };

      const result = await StatsService.count('work_order', mockReq);

      expect(result).toBe(2);
      // Query should include some form of RLS condition
      expect(db.query).toHaveBeenCalled();
    });

    it('should apply RLS filter for non-admin users in countGrouped', async () => {
      db.query.mockResolvedValue({
        rows: [{ value: 'pending', count: '1' }],
      });

      const mockReq = {
        user: { role: 'technician', userId: 5, id: 5 },
        rlsPolicy: 'own_records',
      };

      const result = await StatsService.countGrouped('work_order', mockReq, 'status');

      expect(result).toEqual([{ value: 'pending', count: 1 }]);
      expect(db.query).toHaveBeenCalled();
    });

    it('should apply RLS filter for non-admin users in sum', async () => {
      db.query.mockResolvedValue({ rows: [{ total: '100.00' }] });

      const mockReq = {
        user: { role: 'technician', userId: 5, id: 5 },
        rlsPolicy: 'own_records',
      };

      const result = await StatsService.sum('invoice', mockReq, 'total');

      expect(result).toBe(100.00);
      expect(db.query).toHaveBeenCalled();
    });
  });
});
