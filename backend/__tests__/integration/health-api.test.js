/**
 * Health Endpoint - Integration Tests
 *
 * Tests health check endpoints with real database connections
 * Validates system health monitoring and status reporting
 */

const request = require("supertest");
const app = require("../../server");
const { clearCache } = require("../../routes/health");

describe("Health Endpoints - Integration Tests", () => {
  // Clear health cache before each test to prevent cross-test contamination
  // (health cache is a module-level singleton that persists across tests)
  beforeEach(() => {
    clearCache();
  });

  describe("GET /api/health - Basic Health Check", () => {
    test("should include uptime greater than or equal to 0", async () => {
      // Act
      const response = await request(app).get("/api/health");

      // Assert - Response format differs based on status code
      // 200 uses data wrapper, 503 merges data directly into response body
      const healthData =
        response.status === 200 ? response.body.data : response.body;
      expect(healthData.uptime).toBeGreaterThanOrEqual(0);
    });

    test("should have valid timestamp", async () => {
      // Act
      const response = await request(app).get("/api/health");

      // Assert - ResponseFormatter puts timestamp at top level
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 5000); // Within 5 seconds
    });

    test("should verify database connectivity", async () => {
      // Act - Health endpoint returns 200 for healthy/degraded, 503 for critical
      const response = await request(app).get("/api/health");

      // Assert - Both 200 and 503 indicate DB IS connected
      // 503 is returned when status is CRITICAL (slow but connected)
      expect([200, 503]).toContain(response.status);

      // Response format differs: 200 uses data wrapper, 503 merges data into response body
      const healthData =
        response.status === 200 ? response.body.data : response.body;
      expect(["healthy", "degraded", "critical"]).toContain(healthData.status);
    });
  });

  describe("GET /api/health/databases - Database Health Check", () => {
    let adminToken;

    beforeAll(async () => {
      // Get admin token for authenticated endpoint
      const { createTestUser } = require("../helpers/test-db");
      const admin = await createTestUser("admin");
      adminToken = admin.token;
    });

    test("should return 200 when database is healthy", async () => {
      // Act
      const response = await request(app)
        .get("/api/health/databases")
        .set("Authorization", `Bearer ${adminToken}`);

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

    test("should return 401 without authentication", async () => {
      // Act
      const response = await request(app).get("/api/health/databases");

      // Assert
      expect(response.status).toBe(401);
    });

    test("should include database metrics", async () => {
      // Act
      const response = await request(app)
        .get("/api/health/databases")
        .set("Authorization", `Bearer ${adminToken}`);

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

    test("should have fast response time", async () => {
      // Act
      const response = await request(app)
        .get("/api/health/databases")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert
      const mainDb = response.body.data.databases[0];
      expect(mainDb.responseTime).toBeLessThan(1000); // Under 1 second
    });

    test("should have reasonable connection usage", async () => {
      // Act
      const response = await request(app)
        .get("/api/health/databases")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert
      const mainDb = response.body.data.databases[0];
      expect(mainDb.connectionCount).toBeGreaterThanOrEqual(0);
      expect(mainDb.maxConnections).toBeGreaterThan(0);
      expect(mainDb.connectionCount).toBeLessThanOrEqual(mainDb.maxConnections);
    });

    test("should determine status based on metrics", async () => {
      // Act
      const response = await request(app)
        .get("/api/health/databases")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert
      const mainDb = response.body.data.databases[0];
      expect(["healthy", "degraded", "critical"]).toContain(mainDb.status);

      // If degraded/critical, should have errorMessage
      if (mainDb.status !== "healthy") {
        expect(mainDb.errorMessage).toBeDefined();
      }
    });
  });

  describe("Health Check - Error Scenarios", () => {
    let adminToken;

    beforeAll(async () => {
      const { createTestUser } = require("../helpers/test-db");
      const admin = await createTestUser("admin");
      adminToken = admin.token;
    });
    test("should handle concurrent health checks", async () => {
      // Act - Make 10 concurrent requests
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get("/api/health"));

      const responses = await Promise.all(requests);

      // Assert - All should return valid health status
      // 200 = healthy/degraded, 503 = critical (both are valid responses)
      responses.forEach((response) => {
        expect([200, 503]).toContain(response.status);
        // Response format differs: 200 has data.status, 503 has status at top level
        const status = response.body.data?.status || response.body.status;
        expect(["healthy", "degraded", "critical"]).toContain(status);
      });
    });

    test("should handle concurrent database health checks", async () => {
      // Act - Make 5 concurrent DB health checks
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .get("/api/health/databases")
            .set("Authorization", `Bearer ${adminToken}`),
        );

      const responses = await Promise.all(requests);

      // Assert - All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data.databases).toBeInstanceOf(Array);
        expect(response.body.data.databases.length).toBeGreaterThan(0);
        expect(["healthy", "degraded", "critical"]).toContain(
          response.body.data.databases[0].status,
        );
      });
    });
  });

  describe("Health Check - Performance", () => {
    let adminToken;

    beforeAll(async () => {
      const { createTestUser } = require("../helpers/test-db");
      const admin = await createTestUser("admin");
      adminToken = admin.token;
    });

    test("basic health check should respond quickly", async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app).get("/api/health");

      // Assert - 200 = healthy/degraded, 503 = critical (both valid)
      const duration = Date.now() - start;
      expect([200, 503]).toContain(response.status);
      expect(duration).toBeLessThan(500); // Under 500ms
    });

    test("database health check should respond within timeout", async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app)
        .get("/api/health/databases")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert
      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Under 2 seconds
    });
  });

  describe("Health Check - Response Format", () => {
    test("should return proper content-type headers", async () => {
      // Act
      const response = await request(app).get("/api/health");

      // Assert
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    test("should not expose sensitive information", async () => {
      // Act
      const response = await request(app).get("/api/health");

      // Assert - Should not contain passwords, keys, etc
      const body = JSON.stringify(response.body);
      expect(body).not.toMatch(/password/i);
      expect(body).not.toMatch(/secret/i);
      expect(body).not.toMatch(/key/i);
      expect(body).not.toMatch(/token/i);
    });

    test("should include all required fields", async () => {
      // Act
      const response = await request(app).get("/api/health");

      // Assert - Response format differs based on status:
      // 200 (healthy/degraded): { success: true, data: {...}, timestamp }
      // 503 (critical): { success: false, status, uptime, database, memory, ... }
      expect(response.body).toHaveProperty("timestamp");

      // Health info may be in data (200) or at top level (503)
      const healthData = response.body.data || response.body;
      const requiredFields = [
        "status",
        "uptime",
        "database",
        "memory",
        "nodeVersion",
      ];

      requiredFields.forEach((field) => {
        expect(healthData).toHaveProperty(field);
      });
    });
  });

  describe("GET /api/health/ready - Storage Configuration", () => {
    test("should include storage configuration in readiness check", async () => {
      // Act
      const response = await request(app).get("/api/health/ready");

      // Assert
      expect([200, 503]).toContain(response.status);
      const healthData = response.body.data || response.body;
      expect(healthData.checks).toHaveProperty("storage");
      expect(healthData.checks.storage).toHaveProperty("configured");
      expect(healthData.checks.storage).toHaveProperty("provider");
      expect(healthData.checks.storage).toHaveProperty("status");
    });

    test("should report storage provider type", async () => {
      // Act
      const response = await request(app).get("/api/health/ready");

      // Assert
      const healthData = response.body.data || response.body;
      // Provider should be 'r2', 'none', or another configured value
      expect(["r2", "s3", "none"]).toContain(
        healthData.checks.storage.provider,
      );
    });
  });

  describe("GET /api/health/storage - Deep Storage Check", () => {
    let adminToken;

    beforeAll(async () => {
      const { createTestUser } = require("../helpers/test-db");
      const admin = await createTestUser("admin");
      adminToken = admin.token;
    });

    test("should require authentication", async () => {
      // Act
      const response = await request(app).get("/api/health/storage");

      // Assert
      expect(response.status).toBe(401);
    });

    test("should require admin role", async () => {
      // Arrange
      const { createTestUser } = require("../helpers/test-db");
      const user = await createTestUser("user");

      // Act
      const response = await request(app)
        .get("/api/health/storage")
        .set("Authorization", `Bearer ${user.token}`);

      // Assert
      expect(response.status).toBe(403);
    });

    test("should return storage health details for admin", async () => {
      // Act
      const response = await request(app)
        .get("/api/health/storage")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert - Could be 200 (healthy) or 503 (not configured/unreachable)
      expect([200, 503]).toContain(response.status);

      const storageData = response.body.data?.storage || response.body.storage;
      expect(storageData).toHaveProperty("configured");
      expect(storageData).toHaveProperty("provider");
      expect(storageData).toHaveProperty("status");
      expect(storageData).toHaveProperty("lastChecked");
    });

    test("should include response time when storage is checked", async () => {
      // Act
      const response = await request(app)
        .get("/api/health/storage")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert
      const storageData = response.body.data?.storage || response.body.storage;
      expect(storageData).toHaveProperty("responseTime");
      expect(typeof storageData.responseTime).toBe("number");
    });

    test("should not expose sensitive information", async () => {
      // Act
      const response = await request(app)
        .get("/api/health/storage")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert - Should not contain credentials
      const body = JSON.stringify(response.body);
      expect(body).not.toMatch(/secret/i);
      expect(body).not.toMatch(/access.?key/i);
      expect(body).not.toMatch(/password/i);
    });
  });
});
