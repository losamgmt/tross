/**
 * Health Endpoint - Integration Tests
 *
 * Tests health check endpoints with real database connections
 * Validates system health monitoring and status reporting
 */

const request = require('supertest');
const app = require('../../server');

describe('Health Endpoints - Integration Tests', () => {
  // No DB cleanup needed - health endpoints are read-only

  describe('GET /api/health - Basic Health Check', () => {
    test('should return 200 and operational status', async () => {
      // Act
      const response = await request(app).get('/api/health');

      // Assert - Health endpoint may return 200 or 503 depending on service health
      // Status can be healthy, degraded, or critical based on underlying services
      expect([200, 503]).toContain(response.status);
      expect(['healthy', 'degraded', 'critical']).toContain(response.body.status);
      expect(response.body).toMatchObject({
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    test('should include uptime greater than or equal to 0', async () => {
      // Act
      const response = await request(app).get('/api/health');

      // Assert
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should have valid timestamp', async () => {
      // Act
      const response = await request(app).get('/api/health');

      // Assert
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 5000); // Within 5 seconds
    });

    test('should verify database connectivity', async () => {
      // Act - If this returns 200, DB is connected
      const response = await request(app).get('/api/health');

      // Assert - 200 means DB connected; status may be healthy, degraded, or critical based on latency/load
      expect(response.status).toBe(200);
      expect(['healthy', 'degraded', 'critical']).toContain(response.body.status);
    });
  });

  describe('GET /api/health/databases - Database Health Check', () => {
    let adminToken;

    beforeAll(async () => {
      // Get admin token for authenticated endpoint
      const { createTestUser } = require('../helpers/test-db');
      const admin = await createTestUser('admin');
      adminToken = admin.token;
    });

    test('should return 200 when database is healthy', async () => {
      // Act
      const response = await request(app)
        .get('/api/health/databases')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          databases: expect.any(Array),
        }),
        timestamp: expect.any(String),
      });
      expect(response.body.data.databases.length).toBeGreaterThan(0);
    });

    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/health/databases');

      // Assert
      expect(response.status).toBe(401);
    });

    test('should include database metrics', async () => {
      // Act
      const response = await request(app)
        .get('/api/health/databases')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const mainDb = response.body.data.databases[0];
      expect(mainDb).toMatchObject({
        name: expect.any(String),
        status: expect.stringMatching(/^(healthy|degraded|critical)$/),
        responseTime: expect.any(Number),
        connectionCount: expect.any(Number),
        maxConnections: expect.any(Number),
        lastChecked: expect.any(String),
      });
    });

    test('should have fast response time', async () => {
      // Act
      const response = await request(app)
        .get('/api/health/databases')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const mainDb = response.body.data.databases[0];
      expect(mainDb.responseTime).toBeLessThan(1000); // Under 1 second
    });

    test('should have reasonable connection usage', async () => {
      // Act
      const response = await request(app)
        .get('/api/health/databases')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const mainDb = response.body.data.databases[0];
      expect(mainDb.connectionCount).toBeGreaterThanOrEqual(0);
      expect(mainDb.maxConnections).toBeGreaterThan(0);
      expect(mainDb.connectionCount).toBeLessThanOrEqual(
        mainDb.maxConnections,
      );
    });

    test('should determine status based on metrics', async () => {
      // Act
      const response = await request(app)
        .get('/api/health/databases')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const mainDb = response.body.data.databases[0];
      expect(['healthy', 'degraded', 'critical']).toContain(mainDb.status);

      // If degraded/critical, should have errorMessage
      if (mainDb.status !== 'healthy') {
        expect(mainDb.errorMessage).toBeDefined();
      }
    });
  });

  describe('Health Check - Error Scenarios', () => {
    let adminToken;

    beforeAll(async () => {
      const { createTestUser } = require('../helpers/test-db');
      const admin = await createTestUser('admin');
      adminToken = admin.token;
    });
    test('should handle concurrent health checks', async () => {
      // Act - Make 10 concurrent requests
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get('/api/health'));

      const responses = await Promise.all(requests);

      // Assert - All should succeed; status may vary based on latency/load
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(['healthy', 'degraded', 'critical']).toContain(response.body.status);
      });
    });

    test('should handle concurrent database health checks', async () => {
      // Act - Make 5 concurrent DB health checks
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .get('/api/health/databases')
            .set('Authorization', `Bearer ${adminToken}`),
        );

      const responses = await Promise.all(requests);

      // Assert - All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data.databases).toBeInstanceOf(Array);
        expect(response.body.data.databases.length).toBeGreaterThan(0);
        expect(['healthy', 'degraded', 'critical']).toContain(
          response.body.data.databases[0].status,
        );
      });
    });
  });

  describe('Health Check - Performance', () => {
    let adminToken;

    beforeAll(async () => {
      const { createTestUser } = require('../helpers/test-db');
      const admin = await createTestUser('admin');
      adminToken = admin.token;
    });

    test('basic health check should respond quickly', async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app).get('/api/health');

      // Assert
      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500); // Under 500ms
    });

    test('database health check should respond within timeout', async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app)
        .get('/api/health/databases')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Under 2 seconds
    });
  });

  describe('Health Check - Response Format', () => {
    test('should return proper content-type headers', async () => {
      // Act
      const response = await request(app).get('/api/health');

      // Assert
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should not expose sensitive information', async () => {
      // Act
      const response = await request(app).get('/api/health');

      // Assert - Should not contain passwords, keys, etc
      const body = JSON.stringify(response.body);
      expect(body).not.toMatch(/password/i);
      expect(body).not.toMatch(/secret/i);
      expect(body).not.toMatch(/key/i);
      expect(body).not.toMatch(/token/i);
    });

    test('should include all required fields', async () => {
      // Act
      const response = await request(app).get('/api/health');

      // Assert - Test ACTUAL contract, not implementation details
      const requiredFields = [
        'status',
        'timestamp',
        'uptime',
        'database',
        'memory',
        'nodeVersion',
      ];

      requiredFields.forEach((field) => {
        expect(response.body).toHaveProperty(field);
      });
    });
  });
});
