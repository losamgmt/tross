/**
 * Health Endpoint - Integration Tests
 *
 * Tests health check endpoints with real database connections
 * Validates system health monitoring and status reporting
 *
 * PATTERN: Uses TestContext for all authentication setup.
 */

const { createTestContext } = require("../core");
const { clearCache } = require("../../routes/health");

describe("Health Endpoints - Integration Tests", () => {
  const ctx = createTestContext({ roles: ["admin", "user"] });

  beforeAll(() => ctx.setup());
  afterAll(() => ctx.teardown());

  beforeEach(() => {
    clearCache();
  });

  describe("GET /api/health - Basic Health Check", () => {
    test("should include uptime greater than or equal to 0", async () => {
      const response = await ctx.get("/api/health").execute();

      const healthData =
        response.status === 200 ? response.body.data : response.body;
      expect(healthData.uptime).toBeGreaterThanOrEqual(0);
    });

    test("should have valid timestamp", async () => {
      const response = await ctx.get("/api/health").execute();

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    test("should verify database connectivity", async () => {
      const response = await ctx.get("/api/health").execute();

      expect([200, 503]).toContain(response.status);
      const healthData =
        response.status === 200 ? response.body.data : response.body;
      expect(["healthy", "degraded", "critical"]).toContain(healthData.status);
    });
  });

  describe("GET /api/health/databases - Database Health Check", () => {
    test("should return 200 when database is healthy", async () => {
      const response = await ctx.get("/api/health/databases").as("admin").execute();

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
      const response = await ctx.get("/api/health/databases").unauthenticated().execute();

      expect(response.status).toBe(401);
    });

    test("should include database metrics", async () => {
      const response = await ctx.get("/api/health/databases").as("admin").execute();

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
      const response = await ctx.get("/api/health/databases").as("admin").execute();

      const mainDb = response.body.data.databases[0];
      expect(mainDb.responseTime).toBeLessThan(1000);
    });

    test("should have reasonable connection usage", async () => {
      const response = await ctx.get("/api/health/databases").as("admin").execute();

      const mainDb = response.body.data.databases[0];
      expect(mainDb.connectionCount).toBeGreaterThanOrEqual(0);
      expect(mainDb.maxConnections).toBeGreaterThan(0);
      expect(mainDb.connectionCount).toBeLessThanOrEqual(mainDb.maxConnections);
    });

    test("should determine status based on metrics", async () => {
      const response = await ctx.get("/api/health/databases").as("admin").execute();

      const mainDb = response.body.data.databases[0];
      expect(["healthy", "degraded", "critical"]).toContain(mainDb.status);

      if (mainDb.status !== "healthy") {
        expect(mainDb.errorMessage).toBeDefined();
      }
    });
  });

  describe("Health Check - Error Scenarios", () => {
    test("should handle concurrent health checks", async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => ctx.get("/api/health").execute());

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect([200, 503]).toContain(response.status);
        const status = response.body.data?.status || response.body.status;
        expect(["healthy", "degraded", "critical"]).toContain(status);
      });
    });

    test("should handle concurrent database health checks", async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => ctx.get("/api/health/databases").as("admin").execute());

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data.databases).toBeInstanceOf(Array);
        expect(response.body.data.databases.length).toBeGreaterThan(0);
        expect(["healthy", "degraded", "critical"]).toContain(
          response.body.data.databases[0].status
        );
      });
    });
  });

  describe("Health Check - Performance", () => {
    test("basic health check should respond quickly", async () => {
      const start = Date.now();

      const response = await ctx.get("/api/health").execute();

      const duration = Date.now() - start;
      expect([200, 503]).toContain(response.status);
      expect(duration).toBeLessThan(500);
    });

    test("database health check should respond within timeout", async () => {
      const start = Date.now();

      const response = await ctx.get("/api/health/databases").as("admin").execute();

      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe("Health Check - Response Format", () => {
    test("should return proper content-type headers", async () => {
      const response = await ctx.get("/api/health").execute();

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    test("should not expose sensitive information", async () => {
      const response = await ctx.get("/api/health").execute();

      const body = JSON.stringify(response.body);
      expect(body).not.toMatch(/password/i);
      expect(body).not.toMatch(/secret/i);
      expect(body).not.toMatch(/key/i);
      expect(body).not.toMatch(/token/i);
    });

    test("should include all required fields", async () => {
      const response = await ctx.get("/api/health").execute();

      expect(response.body).toHaveProperty("timestamp");

      const healthData = response.body.data || response.body;
      const requiredFields = ["status", "uptime", "database", "memory", "nodeVersion"];

      requiredFields.forEach((field) => {
        expect(healthData).toHaveProperty(field);
      });
    });
  });

  describe("GET /api/health/ready - Storage Configuration", () => {
    test("should include storage configuration in readiness check", async () => {
      const response = await ctx.get("/api/health/ready").execute();

      expect([200, 503]).toContain(response.status);
      const healthData = response.body.data || response.body;
      expect(healthData.checks).toHaveProperty("storage");
      expect(healthData.checks.storage).toHaveProperty("configured");
      expect(healthData.checks.storage).toHaveProperty("provider");
      expect(healthData.checks.storage).toHaveProperty("status");
    });

    test("should report storage provider type", async () => {
      const response = await ctx.get("/api/health/ready").execute();

      const healthData = response.body.data || response.body;
      expect(["r2", "s3", "none"]).toContain(healthData.checks.storage.provider);
    });
  });

  describe("GET /api/health/storage - Deep Storage Check", () => {
    test("should require authentication", async () => {
      const response = await ctx.get("/api/health/storage").unauthenticated().execute();

      expect(response.status).toBe(401);
    });

    test("should require admin role", async () => {
      const response = await ctx.get("/api/health/storage").as("user").execute();

      expect(response.status).toBe(403);
    });

    test("should return storage health details for admin", async () => {
      const response = await ctx.get("/api/health/storage").as("admin").execute();

      expect([200, 503]).toContain(response.status);

      const storageData = response.body.data?.storage || response.body.storage;
      expect(storageData).toHaveProperty("configured");
      expect(storageData).toHaveProperty("provider");
      expect(storageData).toHaveProperty("status");
      expect(storageData).toHaveProperty("lastChecked");
    });

    test("should include response time when storage is checked", async () => {
      const response = await ctx.get("/api/health/storage").as("admin").execute();

      const storageData = response.body.data?.storage || response.body.storage;
      expect(storageData).toHaveProperty("responseTime");
      expect(typeof storageData.responseTime).toBe("number");
    });

    test("should not expose sensitive information", async () => {
      const response = await ctx.get("/api/health/storage").as("admin").execute();

      const body = JSON.stringify(response.body);
      expect(body).not.toMatch(/secret/i);
      expect(body).not.toMatch(/access.?key/i);
      expect(body).not.toMatch(/password/i);
    });
  });
});
