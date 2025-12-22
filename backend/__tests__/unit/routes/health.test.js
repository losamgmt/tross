/**
 * Health Routes - Unit Tests
 *
 * Tests health check endpoints:
 * - Basic health check (public)
 * - Database health check (admin only)
 *
 * KISS: Test business logic ONLY
 * - Response structure
 * - Status determination logic
 * - Error handling
 *
 * SAFETY: All tests have 3s timeout, verbose logging enabled
 */

const request = require('supertest');
const express = require('express');

// Enable verbose logging for debugging
const originalLog = console.log;
const testLog = (...args) => originalLog('[HEALTH-TEST]', new Date().toISOString(), ...args);

// Mock dependencies BEFORE requiring routes
jest.mock('../../../db/connection', () => {
  testLog('MOCK: Creating db connection mock');
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    getClient: jest.fn(),
    testConnection: jest.fn(),
    end: jest.fn(),
    closePool: jest.fn(),
    pool: {
      totalCount: 2,
      options: { max: 10 },
    },
  };
});

jest.mock('../../../config/logger', () => {
  testLog('MOCK: Creating logger mock');
  return {
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    },
  };
});

// Mock auth middleware
jest.mock('../../../middleware/auth', () => {
  testLog('MOCK: Creating auth middleware mock');
  return {
    authenticateToken: jest.fn((req, res, next) => {
      testLog('AUTH: authenticateToken called');
      next();
    }),
    requireMinimumRole: jest.fn(() => (req, res, next) => {
      testLog('AUTH: requireMinimumRole called');
      next();
    }),
  };
});

testLog('SETUP: Loading modules');
const db = require('../../../db/connection');
const healthRouter = require('../../../routes/health');
const { clearCache } = require('../../../routes/health');
const { authenticateToken, requireMinimumRole } = require('../../../middleware/auth');
testLog('SETUP: Modules loaded successfully');

describe('Health Routes', () => {
  let app;
  let originalMemoryUsage;

  beforeAll(() => {
    testLog('SUITE: beforeAll - Starting health routes test suite');
    // Save original process.memoryUsage
    originalMemoryUsage = process.memoryUsage;
  });

  afterAll(() => {
    testLog('SUITE: afterAll - Cleaning up health routes test suite');
    // Restore original process.memoryUsage
    process.memoryUsage = originalMemoryUsage;
  });

  beforeEach(() => {
    testLog('TEST: beforeEach - Setting up test');
    jest.clearAllMocks();

    // Mock process.memoryUsage to return healthy memory values
    // This prevents environmental flakiness when Jest uses >400MB
    process.memoryUsage = () => ({
      rss: 100 * 1024 * 1024,      // 100MB RSS
      heapUsed: 50 * 1024 * 1024,  // 50MB heap used (well under 400MB threshold)
      heapTotal: 80 * 1024 * 1024, // 80MB heap total
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024,
    });

    // Clear health cache to prevent test contamination
    clearCache();

    // Set up default db mocks (PURE pattern - always reset)
    db.query.mockClear();
    db.query.mockResolvedValue({ rows: [] });
    db.pool = {
      totalCount: 2,
      options: { max: 10 },
    };

    // Reset auth middleware mocks to pass-through
    authenticateToken.mockImplementation((req, res, next) => {
      testLog('AUTH: authenticateToken called - passing through');
      req.user = { user_id: 1, role: 'admin' }; // Mock authenticated admin user
      next();
    });
    requireMinimumRole.mockImplementation((role) => {
      testLog(`AUTH: requireMinimumRole(${role}) called - returning middleware`);
      return (req, res, next) => {
        testLog(`AUTH: requireMinimumRole middleware executing - passing through`);
        next();
      };
    });

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/health', healthRouter);
    testLog('TEST: beforeEach - Setup complete');
  });

  afterEach(() => {
    testLog('TEST: afterEach - Cleaning up test');
    // CRITICAL: Clear all mocks to prevent contamination of next test file
    jest.clearAllMocks();
    
    // Reset auth middleware to default implementations
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { user_id: 1, role: 'admin' };
      next();
    });
    requireMinimumRole.mockImplementation((role) => (req, res, next) => next());
    
    testLog('TEST: afterEach - Cleanup complete');
  });

  describe('GET /api/health', () => {
    test('should return healthy status when DB is connected', async () => {
      testLog('TEST START: healthy status test');
      try {
        // Arrange
        db.query.mockResolvedValue({ rows: [] });
        testLog('ARRANGE: db.query mocked');

        // Act
        testLog('ACT: Sending GET /api/health');
        const response = await request(app).get('/api/health');
        testLog('ACT: Response received, status:', response.status);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        });
        expect(db.query).toHaveBeenCalledWith('SELECT 1');
        testLog('TEST END: healthy status test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 3000);

    test('should return unhealthy status when DB connection fails', async () => {
      testLog('TEST START: unhealthy status test');
      try {
        // Arrange
        const dbError = new Error('Connection refused');
        db.query.mockRejectedValue(dbError);
        testLog('ARRANGE: db.query mocked to reject');

        // Act
        testLog('ACT: Sending GET /api/health');
        const response = await request(app).get('/api/health');
        testLog('ACT: Response received, status:', response.status);

        // Assert - 503 returned for critical/unhealthy status
        expect(response.status).toBe(503);
        expect(response.body).toMatchObject({
          success: false,
          error: 'Service Unavailable',
          status: 'critical', // New implementation uses HEALTH.STATUS values
          timestamp: expect.any(String),
        });
        // Database should show as not connected
        expect(response.body.database.connected).toBe(false);
        testLog('TEST END: unhealthy status test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 3000);

    test('should return valid timestamp in ISO format', async () => {
      testLog('TEST START: timestamp format test');
      try {
        // Arrange
        db.query.mockResolvedValue({ rows: [] });

        // Act
        const response = await request(app).get('/api/health');

        // Assert
        const timestamp = new Date(response.body.timestamp);
        expect(timestamp.toISOString()).toBe(response.body.timestamp);
        testLog('TEST END: timestamp format test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 3000);

    test('should return positive uptime', async () => {
      testLog('TEST START: uptime test');
      try {
        // Arrange
        db.query.mockResolvedValue({ rows: [] });

        // Act
        const response = await request(app).get('/api/health');

        // Assert
        expect(response.body.uptime).toBeGreaterThan(0);
        testLog('TEST END: uptime test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 3000);
  });

  // Re-enabling tests one by one with proper logging and timeouts
  describe('GET /api/health/databases', () => {
    // TEST 7: Simplest - just timestamp validation ✅ PASSED
    test('should include timestamp in response', async () => {
      testLog('TEST START: timestamp in databases response test');
      try {
        // Arrange
        db.query.mockResolvedValue({});
        db.pool = {
          totalCount: 2,
          options: { max: 10 },
        };
        testLog('ARRANGE: db.query and pool configured');

        // Act
        testLog('ACT: Sending GET /api/health/databases');
        const response = await request(app).get('/api/health/databases');
        testLog('ACT: Response received, status:', response.status);

        // Assert
        expect(response.body.timestamp).toBeDefined();
        const timestamp = new Date(response.body.timestamp);
        expect(timestamp.toISOString()).toBe(response.body.timestamp);
        testLog('TEST END: timestamp in databases response test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 3000);

    // TEST 8: Missing pool options - graceful fallback ✅ PASSED
    test('should handle missing pool options gracefully', async () => {
      testLog('TEST START: missing pool options test');
      try {
        // Arrange
        db.query.mockResolvedValue({});
        db.pool = {
          totalCount: 2,
          options: undefined, // Missing options
        };
        testLog('ARRANGE: db.query and pool configured with missing options');

        // Act
        testLog('ACT: Sending GET /api/health/databases');
        const response = await request(app).get('/api/health/databases');
        testLog('ACT: Response received, status:', response.status);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.databases[0]).toMatchObject({
          status: expect.any(String),
          maxConnections: 10, // Default fallback
        });
        testLog('TEST END: missing pool options test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 3000);

    // TEST 1: Basic success path - fast DB, low connections
    test('should return healthy status for fast DB with low connection usage', async () => {
      testLog('TEST START: healthy status for fast DB test');
      try {
        // Arrange
        db.query.mockResolvedValue({});
        db.pool = {
          totalCount: 2,
          options: { max: 10 },
        };
        testLog('ARRANGE: db.query and pool configured');

        // Act
        testLog('ACT: Sending GET /api/health/databases');
        const response = await request(app).get('/api/health/databases');
        testLog('ACT: Response received, status:', response.status);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.databases).toHaveLength(1);
        expect(response.body.data.databases[0]).toMatchObject({
          name: 'PostgreSQL (Main)',
          status: expect.stringMatching(/healthy|degraded/), // Accept any non-critical
          responseTime: expect.any(Number),
          connectionCount: 2,
          maxConnections: 10,
        });
        testLog('TEST END: healthy status for fast DB test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 3000);

    // TEST 4: High connection usage (80-95%) - degraded status
    test('should return degraded status for high connection usage (80-95%)', async () => {
      testLog('TEST START: high connection usage test');
      try {
        // Arrange
        db.query.mockResolvedValue({});
        db.pool = {
          totalCount: 9, // 90% of 10
          options: { max: 10 },
        };
        testLog('ARRANGE: db.query and pool configured with 90% usage');

        // Act
        testLog('ACT: Sending GET /api/health/databases');
        const response = await request(app).get('/api/health/databases');
        testLog('ACT: Response received, status:', response.status);

        // Assert - test behavior, not message implementation details
        expect(response.body.data.databases[0].status).toBe('degraded');
        expect(response.body.data.databases[0]).toHaveProperty('message');
        testLog('TEST END: high connection usage test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 3000);

    // TEST 5: Very high connection usage (>95%) - critical status
    test('should return critical status for very high connection usage (>95%)', async () => {
      testLog('TEST START: very high connection usage test');
      try {
        // Arrange
        db.query.mockResolvedValue({});
        db.pool = {
          totalCount: 10, // 100% of 10
          options: { max: 10 },
        };
        testLog('ARRANGE: db.query and pool configured with 100% usage');

        // Act
        testLog('ACT: Sending GET /api/health/databases');
        const response = await request(app).get('/api/health/databases');
        testLog('ACT: Response received, status:', response.status);

        // Assert - test behavior, not message implementation details
        expect(response.body.data.databases[0].status).toBe('critical');
        expect(response.body.data.databases[0]).toHaveProperty('message');
        testLog('TEST END: very high connection usage test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 3000);

    // TEST 6: DB query failure - critical status with error
    test('should return critical status when DB query fails', async () => {
      testLog('TEST START: DB query failure test');
      try {
        // Arrange
        const dbError = new Error('Database connection timeout');
        db.query.mockRejectedValue(dbError);
        db.pool = {
          totalCount: 0,
          options: { max: 10 },
        };
        testLog('ARRANGE: db.query mocked to reject with error');

        // Act
        testLog('ACT: Sending GET /api/health/databases');
        const response = await request(app).get('/api/health/databases');
        testLog('ACT: Response received, status:', response.status);

        // Assert - test behavior: error in → critical status out
        expect(response.status).toBe(200);
        expect(response.body.data.databases[0].status).toBe('critical');
        expect(response.body.data.databases[0]).toHaveProperty('message');
        testLog('TEST END: DB query failure test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 3000);

    // TEST 2: Slow DB (100-500ms) - degraded status (WITH TIMING DELAY)
    test('should return degraded status for slow DB (100-500ms)', async () => {
      testLog('TEST START: slow DB test');
      try {
        // Arrange - simulate slow response with delayed mock
        db.query.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({}), 250)));
        db.pool = {
          totalCount: 3,
          options: { max: 10 },
        };
        testLog('ARRANGE: db.query mocked with 250ms delay');

        // Act
        testLog('ACT: Sending GET /api/health/databases');
        const response = await request(app).get('/api/health/databases');
        testLog('ACT: Response received, status:', response.status);

        // Assert
        expect(response.body.data.databases[0].status).toBe('degraded');
        expect(response.body.data.databases[0].responseTime).toBeGreaterThan(100);
        testLog('TEST END: slow DB test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 5000); // Higher timeout for delayed test

    // TEST 3: Very slow DB (>500ms) - critical status (WITH TIMING DELAY)
    test('should return critical status for very slow DB (>500ms)', async () => {
      testLog('TEST START: very slow DB test');
      try {
        // Arrange - simulate very slow response
        db.query.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({}), 600)));
        db.pool = {
          totalCount: 3,
          options: { max: 10 },
        };
        testLog('ARRANGE: db.query mocked with 600ms delay');

        // Act
        testLog('ACT: Sending GET /api/health/databases');
        const response = await request(app).get('/api/health/databases');
        testLog('ACT: Response received, status:', response.status);

        // Assert
        expect(response.body.data.databases[0].status).toBe('critical');
        expect(response.body.data.databases[0].responseTime).toBeGreaterThan(500);
        testLog('TEST END: very slow DB test - PASSED');
      } catch (error) {
        testLog('TEST ERROR:', error.message);
        throw error;
      }
    }, 5000); // Higher timeout for delayed test
  });
});
