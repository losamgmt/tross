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
  });
});
