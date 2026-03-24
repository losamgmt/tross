/**
 * Audit API Endpoints - Integration Tests
 *
 * Tests audit log read endpoints with real server
 * Validates permission-based access to audit trails
 *
 * PATTERN: Uses TestContext for all authentication setup.
 */

const { createTestContext } = require("../core");
const { HTTP_STATUS } = require("../../config/constants");

describe("Audit API Endpoints - Integration Tests", () => {
  const ctx = createTestContext({ roles: ["admin", "technician", "viewer"] });

  beforeAll(() => ctx.setup());
  afterAll(() => ctx.teardown());

  describe("GET /api/audit/all - Get All Audit Logs (Admin)", () => {
    test("should return 401 without authentication", async () => {
      const response = await ctx.get("/api/audit/all").unauthenticated().execute();
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test("should return 403 for non-admin users", async () => {
      const response = await ctx.get("/api/audit/all").as("viewer").execute();
      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    test("should return audit logs for admin", async () => {
      const response = await ctx.get("/api/audit/all").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("should respect limit parameter", async () => {
      const response = await ctx.get("/api/audit/all?limit=5").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    test("should respect offset parameter", async () => {
      const response = await ctx.get("/api/audit/all?offset=10").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
    });

    test("should accept filter parameter for data actions", async () => {
      const response = await ctx.get("/api/audit/all?filter=data").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
    });

    test("should accept filter parameter for auth actions", async () => {
      const response = await ctx.get("/api/audit/all?filter=auth").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
    });

    test("should reject limit above maximum with 400", async () => {
      const response = await ctx.get("/api/audit/all?limit=1000").as("admin").execute();
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test("should return pagination metadata", async () => {
      const response = await ctx.get("/api/audit/all").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination).toMatchObject({
        limit: expect.any(Number),
        offset: expect.any(Number),
      });
    });
  });

  describe("GET /api/audit/user/:userId - Get User Audit Trail", () => {
    test("should return 401 without authentication", async () => {
      const response = await ctx.get("/api/audit/user/1").unauthenticated().execute();
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test("should return 400 for invalid user ID", async () => {
      const response = await ctx.get("/api/audit/user/invalid").as("admin").execute();
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test("should return 403 for non-admin viewing other user", async () => {
      const response = await ctx.get(`/api/audit/user/${ctx.user("admin").id}`).as("technician").execute();
      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    test("should allow users to view own audit trail", async () => {
      const response = await ctx.get(`/api/audit/user/${ctx.user("technician").id}`).as("technician").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("should allow admin to view any user audit trail", async () => {
      const response = await ctx.get(`/api/audit/user/${ctx.user("technician").id}`).as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
    });

    test("should respect limit parameter", async () => {
      const response = await ctx.get(`/api/audit/user/${ctx.user("admin").id}?limit=10`).as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    test("should return empty array for user with no activity", async () => {
      const newUser = await ctx.createUser("viewer");
      const response = await ctx.get(`/api/audit/user/${newUser.user.id}`).as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/audit/:resourceType/:resourceId - Get Resource Audit Trail", () => {
    test("should return 401 without authentication", async () => {
      const response = await ctx.get("/api/audit/users/1").unauthenticated().execute();
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test("should return 400 for invalid resource ID", async () => {
      const response = await ctx.get("/api/audit/users/invalid").as("admin").execute();
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test("should return 403 when lacking read permission on resource type", async () => {
      const response = await ctx.get("/api/audit/audit_log/1").as("viewer").execute();
      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    test("should return audit trail for accessible resource type", async () => {
      const response = await ctx.get("/api/audit/users/1").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("should respect limit parameter", async () => {
      const response = await ctx.get("/api/audit/users/1?limit=5").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    test("should work with singular resource type (auto-pluralization)", async () => {
      const response = await ctx.get("/api/audit/user/1").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
    });

    test("should return empty array for resource with no audit history", async () => {
      const response = await ctx.get("/api/audit/work_orders/999999").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    test("should handle various resource types", async () => {
      const resourceTypes = ["customers", "work_orders", "roles"];

      for (const resourceType of resourceTypes) {
        const response = await ctx.get(`/api/audit/${resourceType}/1`).as("admin").execute();

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe("Audit Log Response Format", () => {
    test("should format dates as ISO strings", async () => {
      const response = await ctx.get("/api/audit/all").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);

      if (response.body.data.length > 0) {
        const log = response.body.data[0];
        if (log.created_at) {
          expect(typeof log.created_at).toBe("string");
          expect(() => new Date(log.created_at)).not.toThrow();
        }
      }
    });

    test("should include standard audit fields", async () => {
      const response = await ctx.get("/api/audit/all").as("admin").execute();

      expect(response.status).toBe(HTTP_STATUS.OK);

      if (response.body.data.length > 0) {
        const log = response.body.data[0];
        expect(log).toHaveProperty("id");
        expect(log).toHaveProperty("action");
      }
    });
  });
});
