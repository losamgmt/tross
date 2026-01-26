/**
 * Role Hierarchy Loader - Unit Tests
 *
 * Tests the database-driven role hierarchy system.
 */

// Mock logger first
jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const {
  initializeFromDatabase,
  initializeFromFallback,
  clearCache,
  getRoleHierarchy,
  getRolePriorityToName,
  getRoleNameToPriority,
  getRoleDescriptions,
  getRolePriority,
  getRoleByPriority,
  getStatus,
} = require('../../../config/role-hierarchy-loader');

const { logger } = require('../../../config/logger');

describe('role-hierarchy-loader', () => {
  beforeEach(() => {
    // Reset state before each test
    clearCache();
    jest.clearAllMocks();
  });

  describe('initializeFromDatabase()', () => {
    it('should initialize from database successfully', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue({
          rows: [
            { name: 'customer', priority: 1, description: 'Basic customer access' },
            { name: 'technician', priority: 2, description: 'Field technician access' },
            { name: 'dispatcher', priority: 3, description: 'Dispatching access' },
            { name: 'manager', priority: 4, description: 'Management access' },
            { name: 'admin', priority: 5, description: 'Full system access' },
          ],
        }),
      };

      const result = await initializeFromDatabase(mockDb);

      expect(result).toBe(true);
      expect(getStatus().isFromDB).toBe(true);
      expect(getStatus().isFallback).toBe(false);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should build correct hierarchy from database', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue({
          rows: [
            { name: 'customer', priority: 1, description: 'Customer' },
            { name: 'admin', priority: 5, description: 'Admin' },
          ],
        }),
      };

      await initializeFromDatabase(mockDb);

      const hierarchy = getRoleHierarchy();
      expect(hierarchy).toEqual(['customer', 'admin']);
      expect(Object.isFrozen(hierarchy)).toBe(true);
    });

    it('should throw when no roles found', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };

      await expect(initializeFromDatabase(mockDb)).rejects.toThrow('No active roles found');
    });

    it('should throw when rows is null', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue({ rows: null }),
      };

      await expect(initializeFromDatabase(mockDb)).rejects.toThrow('No active roles found');
    });

    it('should throw and log on database error', async () => {
      const mockDb = {
        query: jest.fn().mockRejectedValue(new Error('Connection refused')),
      };

      await expect(initializeFromDatabase(mockDb)).rejects.toThrow('Connection refused');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should lowercase role names from database', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue({
          rows: [{ name: 'ADMIN', priority: 5, description: 'Admin' }],
        }),
      };

      await initializeFromDatabase(mockDb);

      expect(getRoleHierarchy()).toContain('admin');
      expect(getRolePriority('admin')).toBe(5);
    });

    it('should use default description when missing', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue({
          rows: [{ name: 'admin', priority: 5, description: null }],
        }),
      };

      await initializeFromDatabase(mockDb);

      expect(getRoleDescriptions()['admin']).toBe('admin role');
    });
  });

  describe('initializeFromFallback()', () => {
    it('should initialize from fallback constants', () => {
      const result = initializeFromFallback();

      expect(result).toBe(true);
      expect(getStatus().isFromDB).toBe(false);
      expect(getStatus().isFallback).toBe(true);
    });

    it('should not log warning in test environment', () => {
      initializeFromFallback();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should log warning in non-test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      initializeFromFallback();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('FALLBACK constants'),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('clearCache()', () => {
    it('should reset all state', () => {
      initializeFromFallback();
      expect(getStatus().isReady).toBe(true);

      clearCache();

      expect(getStatus().isFromDB).toBe(false);
      expect(getStatus().isFallback).toBe(false);
      expect(getStatus().isReady).toBe(false);
    });
  });

  describe('getRoleHierarchy()', () => {
    it('should auto-initialize from fallback if not initialized', () => {
      const hierarchy = getRoleHierarchy();

      expect(hierarchy).toBeDefined();
      expect(Array.isArray(hierarchy)).toBe(true);
      expect(hierarchy.length).toBeGreaterThan(0);
      expect(getStatus().isFallback).toBe(true);
    });

    it('should return frozen array', () => {
      const hierarchy = getRoleHierarchy();
      expect(Object.isFrozen(hierarchy)).toBe(true);
    });
  });

  describe('getRolePriorityToName()', () => {
    it('should return priority to name map', () => {
      initializeFromFallback();
      const map = getRolePriorityToName();

      expect(typeof map).toBe('object');
      expect(map[1]).toBeDefined(); // customer
    });

    it('should auto-initialize if needed', () => {
      const map = getRolePriorityToName();
      expect(getStatus().isReady).toBe(true);
    });
  });

  describe('getRoleNameToPriority()', () => {
    it('should return name to priority map', () => {
      initializeFromFallback();
      const map = getRoleNameToPriority();

      expect(typeof map).toBe('object');
      expect(map.customer).toBeDefined();
      expect(map.admin).toBeDefined();
    });
  });

  describe('getRoleDescriptions()', () => {
    it('should return descriptions map', () => {
      initializeFromFallback();
      const descriptions = getRoleDescriptions();

      expect(typeof descriptions).toBe('object');
      expect(typeof descriptions.admin).toBe('string');
    });
  });

  describe('getRolePriority()', () => {
    beforeEach(() => {
      initializeFromFallback();
    });

    it('should return priority for valid role', () => {
      const priority = getRolePriority('admin');
      expect(typeof priority).toBe('number');
      expect(priority).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      expect(getRolePriority('ADMIN')).toBe(getRolePriority('admin'));
      expect(getRolePriority('Admin')).toBe(getRolePriority('admin'));
    });

    it('should return null for unknown role', () => {
      expect(getRolePriority('superuser')).toBe(null);
    });

    it('should return null for null input', () => {
      expect(getRolePriority(null)).toBe(null);
    });

    it('should return null for undefined input', () => {
      expect(getRolePriority(undefined)).toBe(null);
    });

    it('should return null for non-string input', () => {
      expect(getRolePriority(123)).toBe(null);
      expect(getRolePriority({})).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(getRolePriority('')).toBe(null);
    });
  });

  describe('getRoleByPriority()', () => {
    beforeEach(() => {
      initializeFromFallback();
    });

    it('should return role name for valid priority', () => {
      const priorityMap = getRolePriorityToName();
      const priority = Object.keys(priorityMap)[0];
      const roleName = getRoleByPriority(parseInt(priority));

      expect(typeof roleName).toBe('string');
    });

    it('should return null for unknown priority', () => {
      expect(getRoleByPriority(999)).toBe(null);
    });

    it('should return null for negative priority', () => {
      expect(getRoleByPriority(-1)).toBe(null);
    });
  });

  describe('getStatus()', () => {
    it('should return status object', () => {
      const status = getStatus();

      expect(status).toHaveProperty('isFromDB');
      expect(status).toHaveProperty('isFallback');
      expect(status).toHaveProperty('isReady');
    });

    it('should reflect uninitialized state', () => {
      const status = getStatus();

      expect(status.isFromDB).toBe(false);
      expect(status.isFallback).toBe(false);
      expect(status.isReady).toBe(false);
    });

    it('should reflect fallback state', () => {
      initializeFromFallback();
      const status = getStatus();

      expect(status.isFromDB).toBe(false);
      expect(status.isFallback).toBe(true);
      expect(status.isReady).toBe(true);
    });

    it('should reflect database state', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue({
          rows: [{ name: 'admin', priority: 5, description: 'Admin' }],
        }),
      };

      await initializeFromDatabase(mockDb);
      const status = getStatus();

      expect(status.isFromDB).toBe(true);
      expect(status.isFallback).toBe(false);
      expect(status.isReady).toBe(true);
    });
  });
});
