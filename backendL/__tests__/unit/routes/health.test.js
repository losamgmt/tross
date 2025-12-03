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
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies BEFORE requiring routes
const db = require('../../../db/connection');
jest.mock('../../../db/connection');
jest.mock('../../../config/logger');

// Mock auth middleware
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => next()),
  requireMinimumRole: jest.fn(() => (req, res, next) => next()),
}));

const healthRouter = require('../../../routes/health');
const { authenticateToken, requireMinimumRole } = require('../../../middleware/auth');

describe('Health Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/health', healthRouter);
  });

  describe('GET /api/health', () => {
    it('should return healthy status when DB is connected', async () => {
      // Arrange
      db.raw = jest.fn().mockResolvedValue({});

      // Act
      const response = await request(app).get('/api/health');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
      expect(db.raw).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return unhealthy status when DB connection fails', async () => {
      // Arrange
      const dbError = new Error('Connection refused');
      db.raw = jest.fn().mockRejectedValue(dbError);

      // Act
      const response = await request(app).get('/api/health');

      // Assert
      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: 'Connection refused',
      });
    });

    it('should return valid timestamp in ISO format', async () => {
      // Arrange
      db.raw = jest.fn().mockResolvedValue({});

      // Act
      const response = await request(app).get('/api/health');

      // Assert
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should return positive uptime', async () => {
      // Arrange
      db.raw = jest.fn().mockResolvedValue({});

      // Act
      const response = await request(app).get('/api/health');

      // Assert
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /api/health/databases', () => {
    it('should return healthy status for fast DB with low connection usage', async () => {
      // Arrange
      db.query = jest.fn().mockResolvedValue({});
      db.pool = {
        totalCount: 2,
        options: { max: 10 },
      };

      // Mock Date.now() to control response time
      const originalNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return originalNow() + (callCount > 1 ? 50 : 0); // 50ms response
      });

      // Act
      const response = await request(app).get('/api/health/databases');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.databases).toHaveLength(1);
      expect(response.body.databases[0]).toMatchObject({
        name: 'PostgreSQL (Main)',
        status: 'healthy',
        responseTime: expect.any(Number),
        connectionCount: 2,
        maxConnections: 10,
        errorMessage: null,
      });

      // Cleanup
      Date.now = originalNow;
    });

    it('should return degraded status for slow DB (100-500ms)', async () => {
      // Arrange
      db.query = jest.fn().mockResolvedValue({});
      db.pool = {
        totalCount: 3,
        options: { max: 10 },
      };

      // Mock 200ms response time
      const originalNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return originalNow() + (callCount > 1 ? 200 : 0);
      });

      // Act
      const response = await request(app).get('/api/health/databases');

      // Assert
      expect(response.body.databases[0]).toMatchObject({
        status: 'degraded',
        errorMessage: expect.stringContaining('Elevated response time'),
      });

      // Cleanup
      Date.now = originalNow;
    });

    it('should return critical status for very slow DB (>500ms)', async () => {
      // Arrange
      db.query = jest.fn().mockResolvedValue({});
      db.pool = {
        totalCount: 3,
        options: { max: 10 },
      };

      // Mock 600ms response time
      const originalNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return originalNow() + (callCount > 1 ? 600 : 0);
      });

      // Act
      const response = await request(app).get('/api/health/databases');

      // Assert
      expect(response.body.databases[0]).toMatchObject({
        status: 'critical',
        errorMessage: expect.stringContaining('Slow response time'),
      });

      // Cleanup
      Date.now = originalNow;
    });

    it('should return degraded status for high connection usage (80-95%)', async () => {
      // Arrange
      db.query = jest.fn().mockResolvedValue({});
      db.pool = {
        totalCount: 9, // 90% of 10
        options: { max: 10 },
      };

      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow());

      // Act
      const response = await request(app).get('/api/health/databases');

      // Assert
      expect(response.body.databases[0]).toMatchObject({
        status: 'degraded',
        errorMessage: expect.stringContaining('High connection usage: 9/10'),
      });

      // Cleanup
      Date.now = originalNow;
    });

    it('should return critical status for very high connection usage (>95%)', async () => {
      // Arrange
      db.query = jest.fn().mockResolvedValue({});
      db.pool = {
        totalCount: 10, // 100% of 10
        options: { max: 10 },
      };

      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow());

      // Act
      const response = await request(app).get('/api/health/databases');

      // Assert
      expect(response.body.databases[0]).toMatchObject({
        status: 'critical',
        errorMessage: expect.stringContaining('High connection usage: 10/10'),
      });

      // Cleanup
      Date.now = originalNow;
    });

    it('should return critical status when DB query fails', async () => {
      // Arrange
      const dbError = new Error('Database connection timeout');
      db.query = jest.fn().mockRejectedValue(dbError);
      db.pool = {
        totalCount: 0,
        options: { max: 10 },
      };

      // Act
      const response = await request(app).get('/api/health/databases');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.databases[0]).toMatchObject({
        status: 'critical',
        errorMessage: 'Database connection timeout',
      });
    });

    it('should include timestamp in response', async () => {
      // Arrange
      db.query = jest.fn().mockResolvedValue({});
      db.pool = {
        totalCount: 2,
        options: { max: 10 },
      };

      // Act
      const response = await request(app).get('/api/health/databases');

      // Assert
      expect(response.body.timestamp).toBeDefined();
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should handle missing pool options gracefully', async () => {
      // Arrange
      db.query = jest.fn().mockResolvedValue({});
      db.pool = {
        totalCount: 2,
        options: undefined, // Missing options
      };

      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow());

      // Act
      const response = await request(app).get('/api/health/databases');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.databases[0]).toMatchObject({
        status: 'healthy',
        maxConnections: 10, // Default fallback
      });

      // Cleanup
      Date.now = originalNow;
    });
  });
});
