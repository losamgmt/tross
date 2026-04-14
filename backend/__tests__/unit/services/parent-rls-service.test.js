/**
 * Parent RLS Service - Unit Tests (ADR-011)
 *
 * Tests the parent RLS checking service using mocked dependencies.
 * Integration tests in parent-rls-files.test.js verify end-to-end behavior.
 *
 * Key behaviors:
 * - getMetadataByTableName: Looks up entity metadata by table name
 * - buildParentRLSContext: Builds ADR-011 context from db user
 * - findParentWithRLS: Validates parent access using RLS engine
 */

// Mock db/connection BEFORE importing service
jest.mock('../../../db/connection', () => ({
  pool: { query: jest.fn() },
}));

// Mock logger to suppress output
jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock buildRLSFilter for isolated unit testing
jest.mock('../../../db/helpers/rls', () => ({
  buildRLSFilter: jest.fn(),
}));

// Mock extractProfileIds
jest.mock('../../../middleware/row-level-security', () => ({
  extractProfileIds: jest.fn((dbUser) => {
    // Simulate dynamic profile extraction (snake_case keys)
    const profiles = {};
    for (const key of Object.keys(dbUser)) {
      if (key.endsWith('_profile_id')) {
        profiles[key] = dbUser[key];
      }
    }
    return profiles;
  }),
}));

const { buildRLSFilter } = require('../../../db/helpers/rls');
const allMetadata = require('../../../config/models');
const {
  createParentRLSChecker,
  getMetadataByTableName,
  buildParentRLSContext,
} = require('../../../services/entity/parent-rls-service');

describe('Parent RLS Service', () => {
  // ============================================================================
  // getMetadataByTableName
  // ============================================================================

  describe('getMetadataByTableName', () => {
    it('should return metadata for known table', () => {
      const metadata = getMetadataByTableName('work_orders');

      expect(metadata).toBeDefined();
      expect(metadata.tableName).toBe('work_orders');
      expect(metadata.rlsResource).toBeDefined();
    });

    it('should return metadata for customers table', () => {
      const metadata = getMetadataByTableName('customers');

      expect(metadata).toBeDefined();
      expect(metadata.tableName).toBe('customers');
    });

    it('should return null for unknown table', () => {
      const metadata = getMetadataByTableName('nonexistent_table');
      expect(metadata).toBeNull();
    });

    it('should return null for empty string', () => {
      const metadata = getMetadataByTableName('');
      expect(metadata).toBeNull();
    });
  });

  // ============================================================================
  // buildParentRLSContext (ADR-011)
  // ============================================================================

  describe('buildParentRLSContext', () => {
    it('should build context with role, userId, resource, and profile IDs', () => {
      const dbUser = {
        id: 1,
        role: 'customer',
        customer_profile_id: 42,
        technician_profile_id: null,
      };

      const context = buildParentRLSContext(dbUser, 'work_orders');

      expect(context).toEqual({
        role: 'customer',
        userId: 1,
        resource: 'work_orders',
        customer_profile_id: 42,
        technician_profile_id: null,
      });
    });

    it('should build context for technician with technician_profile_id', () => {
      const dbUser = {
        id: 2,
        role: 'technician',
        customer_profile_id: null,
        technician_profile_id: 99,
      };

      const context = buildParentRLSContext(dbUser, 'work_orders');

      expect(context.role).toBe('technician');
      expect(context.userId).toBe(2);
      expect(context.technician_profile_id).toBe(99);
      expect(context.customer_profile_id).toBeNull();
    });

    it('should build context for admin with no profiles', () => {
      const dbUser = {
        id: 3,
        role: 'admin',
        customer_profile_id: null,
        technician_profile_id: null,
      };

      const context = buildParentRLSContext(dbUser, 'customers');

      expect(context.role).toBe('admin');
      expect(context.resource).toBe('customers');
    });
  });

  // ============================================================================
  // createParentRLSChecker / findParentWithRLS
  // ============================================================================

  describe('createParentRLSChecker', () => {
    let mockQueryFn;
    let findParentWithRLS;

    beforeEach(() => {
      mockQueryFn = jest.fn();
      findParentWithRLS = createParentRLSChecker(mockQueryFn);
      buildRLSFilter.mockReset();
    });

    // --------------------------------------------------------------------------
    // Input validation
    // --------------------------------------------------------------------------

    describe('input validation', () => {
      it('should return null for null tableName', async () => {
        const result = await findParentWithRLS(null, 1, { role: 'admin' });

        expect(result).toBeNull();
        expect(mockQueryFn).not.toHaveBeenCalled();
        expect(buildRLSFilter).not.toHaveBeenCalled();
      });

      it('should return null for empty tableName', async () => {
        const result = await findParentWithRLS('', 1, { role: 'admin' });

        expect(result).toBeNull();
        expect(mockQueryFn).not.toHaveBeenCalled();
      });

      it('should return null for non-string tableName', async () => {
        const result = await findParentWithRLS(123, 1, { role: 'admin' });

        expect(result).toBeNull();
        expect(mockQueryFn).not.toHaveBeenCalled();
      });

      it('should return null for zero entityId', async () => {
        const result = await findParentWithRLS('work_orders', 0, { role: 'admin' });

        expect(result).toBeNull();
        expect(mockQueryFn).not.toHaveBeenCalled();
      });

      it('should return null for negative entityId', async () => {
        const result = await findParentWithRLS('work_orders', -5, { role: 'admin' });

        expect(result).toBeNull();
        expect(mockQueryFn).not.toHaveBeenCalled();
      });

      it('should return null for string entityId', async () => {
        const result = await findParentWithRLS('work_orders', 'abc', { role: 'admin' });

        expect(result).toBeNull();
        expect(mockQueryFn).not.toHaveBeenCalled();
      });
    });

    // --------------------------------------------------------------------------
    // RLS filter integration
    // --------------------------------------------------------------------------

    describe('RLS filter behavior', () => {
      it('should execute query without filter when buildRLSFilter returns empty clause', async () => {
        buildRLSFilter.mockReturnValue({ clause: '', params: [], applied: false });
        mockQueryFn.mockResolvedValue({ rows: [{ id: 100 }] });

        const rlsContext = { role: 'admin', userId: 1 };
        const result = await findParentWithRLS('work_orders', 100, rlsContext);

        expect(result).toEqual({ id: 100 });
        expect(buildRLSFilter).toHaveBeenCalledWith(
          rlsContext,
          expect.objectContaining({ tableName: 'work_orders' }),
          'read',
          2, // paramOffset starts at 2 (after entity ID)
          allMetadata,
        );
        expect(mockQueryFn).toHaveBeenCalledWith(
          'SELECT id FROM work_orders WHERE id = $1',
          [100],
        );
      });

      it('should add RLS clause when buildRLSFilter returns filter', async () => {
        buildRLSFilter.mockReturnValue({
          clause: '(work_orders.customer_id = $2)',
          params: [42],
          applied: true,
        });
        mockQueryFn.mockResolvedValue({ rows: [{ id: 100 }] });

        const rlsContext = { role: 'customer', userId: 5, customer_profile_id: 42 };
        const result = await findParentWithRLS('work_orders', 100, rlsContext);

        expect(result).toEqual({ id: 100 });
        expect(mockQueryFn).toHaveBeenCalledWith(
          'SELECT id FROM work_orders WHERE id = $1 AND (work_orders.customer_id = $2)',
          [100, 42],
        );
      });

      it('should return null when RLS denies access (1=0 clause)', async () => {
        buildRLSFilter.mockReturnValue({ clause: '1=0', params: [], applied: true });

        const rlsContext = { role: 'customer', userId: 5 };
        const result = await findParentWithRLS('work_orders', 100, rlsContext);

        expect(result).toBeNull();
        expect(mockQueryFn).not.toHaveBeenCalled(); // Short-circuits, no DB query
      });

      it('should return null when entity not found', async () => {
        buildRLSFilter.mockReturnValue({ clause: '', params: [], applied: false });
        mockQueryFn.mockResolvedValue({ rows: [] });

        const rlsContext = { role: 'admin', userId: 1 };
        const result = await findParentWithRLS('work_orders', 999, rlsContext);

        expect(result).toBeNull();
      });

      it('should return null when RLS filters out entity', async () => {
        buildRLSFilter.mockReturnValue({
          clause: '(work_orders.customer_id = $2)',
          params: [42],
          applied: true,
        });
        mockQueryFn.mockResolvedValue({ rows: [] }); // No match with filter

        const rlsContext = { role: 'customer', userId: 5, customer_profile_id: 42 };
        const result = await findParentWithRLS('work_orders', 100, rlsContext);

        expect(result).toBeNull();
      });
    });

    // --------------------------------------------------------------------------
    // Error handling
    // --------------------------------------------------------------------------

    describe('error handling', () => {
      it('should throw when query fails', async () => {
        buildRLSFilter.mockReturnValue({ clause: '', params: [], applied: false });
        mockQueryFn.mockRejectedValue(new Error('Database connection failed'));

        const rlsContext = { role: 'admin', userId: 1 };

        await expect(
          findParentWithRLS('work_orders', 100, rlsContext),
        ).rejects.toThrow('Database connection failed');
      });
    });

    // --------------------------------------------------------------------------
    // Unknown tables (no metadata)
    // --------------------------------------------------------------------------

    describe('unknown table (no metadata)', () => {
      it('should still call buildRLSFilter with tableName-only metadata', async () => {
        buildRLSFilter.mockReturnValue({ clause: '', params: [], applied: false });
        mockQueryFn.mockResolvedValue({ rows: [{ id: 1 }] });

        const rlsContext = { role: 'admin', userId: 1 };
        const result = await findParentWithRLS('unknown_table', 1, rlsContext);

        expect(result).toEqual({ id: 1 });
        expect(buildRLSFilter).toHaveBeenCalledWith(
          rlsContext,
          { tableName: 'unknown_table' },
          'read',
          2,
          allMetadata,
        );
      });
    });
  });
});
