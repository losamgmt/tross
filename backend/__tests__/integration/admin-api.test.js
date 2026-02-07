/**
 * Admin API Integration Tests
 *
 * Tests admin-only endpoints for system management:
 * - Sessions management (active sessions, force logout)
 * - Entity metadata (permission matrices, validation rules)
 * - Logs (data and auth logs with filtering)
 *
 * All endpoints require admin role.
 */

const request = require("supertest");
const app = require("../../server");
const {
  createTestUser,
  cleanupTestDatabase,
  getTestPool,
} = require("../helpers/test-db");

describe("Admin API - Integration Tests", () => {
  let adminToken;
  let adminUser;
  let managerToken;
  let userToken;
  let pool;

  beforeAll(async () => {
    pool = getTestPool();

    // Create test users with different roles
    const admin = await createTestUser("admin");
    adminUser = admin.user;
    adminToken = admin.token;

    const manager = await createTestUser("manager");
    managerToken = manager.token;

    const user = await createTestUser("technician");
    userToken = user.token;
  });

  afterEach(async () => {
    // Clean up test data between tests (but keep users for auth)
    await pool.query("TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE");
    await pool.query("TRUNCATE TABLE refresh_tokens RESTART IDENTITY CASCADE");
  });

  // ============================================================================
  // AUTHORIZATION TESTS
  // ============================================================================
  describe("Authorization", () => {
    test("should return 401 without authentication", async () => {
      const response = await request(app).get("/api/admin/system/sessions");
      expect(response.status).toBe(401);
    });

    test("should return 403 for non-admin users", async () => {
      const response = await request(app)
        .get("/api/admin/system/sessions")
        .set("Authorization", `Bearer ${userToken}`);
      expect(response.status).toBe(403);
    });

    test("should return 403 for manager users", async () => {
      const response = await request(app)
        .get("/api/admin/system/sessions")
        .set("Authorization", `Bearer ${managerToken}`);
      expect(response.status).toBe(403);
    });

    test("should return 200 for admin users", async () => {
      const response = await request(app)
        .get("/api/admin/system/sessions")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
    });
  });

  // ============================================================================
  // SESSIONS ENDPOINT TESTS
  // ============================================================================
  describe("GET /api/admin/system/sessions", () => {
    test("should return empty array when no active sessions", async () => {
      const response = await request(app)
        .get("/api/admin/system/sessions")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test("should return active sessions with user info", async () => {
      // Create a refresh token to simulate an active session
      const testUser = await createTestUser("technician");
      await pool.query(
        `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_active, ip_address, user_agent)
        VALUES ($1, 'test-hash-123', NOW() + INTERVAL '7 days', true, '127.0.0.1', 'Test Browser')
      `,
        [testUser.user.id],
      );

      const response = await request(app)
        .get("/api/admin/system/sessions")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);

      const session = response.body.data.find(
        (s) => s.userId === testUser.user.id,
      );
      expect(session).toBeDefined();
      expect(session.user).toMatchObject({
        email: testUser.user.email,
        role: "technician",
      });
      expect(session.ipAddress).toBe("127.0.0.1");
    });

    test("should not return expired sessions", async () => {
      // Create an expired refresh token
      const testUser = await createTestUser("technician");
      await pool.query(
        `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_active, ip_address)
        VALUES ($1, 'expired-hash', NOW() - INTERVAL '1 day', true, '127.0.0.1')
      `,
        [testUser.user.id],
      );

      const response = await request(app)
        .get("/api/admin/system/sessions")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Should not include expired session
      const session = response.body.data.find(
        (s) => s.userId === testUser.user.id,
      );
      expect(session).toBeUndefined();
    });
  });

  describe("POST /api/admin/system/sessions/:userId/force-logout", () => {
    test("should suspend user and revoke their tokens", async () => {
      // Create a user with an active session
      const testUser = await createTestUser("technician");
      await pool.query(
        `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_active)
        VALUES ($1, 'active-hash', NOW() + INTERVAL '7 days', true)
      `,
        [testUser.user.id],
      );

      const response = await request(app)
        .post(`/api/admin/system/sessions/${testUser.user.id}/force-logout`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Test suspension" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.newStatus).toBe("suspended");
      expect(response.body.data.revokedSessionCount).toBeGreaterThanOrEqual(1);

      // Verify user is suspended in database
      const userCheck = await pool.query(
        "SELECT status FROM users WHERE id = $1",
        [testUser.user.id],
      );
      expect(userCheck.rows[0].status).toBe("suspended");

      // Verify token is revoked
      const tokenCheck = await pool.query(
        "SELECT is_active FROM refresh_tokens WHERE user_id = $1",
        [testUser.user.id],
      );
      expect(tokenCheck.rows[0].is_active).toBe(false);
    });

    test("should return 400 when trying to logout self", async () => {
      const response = await request(app)
        .post(`/api/admin/system/sessions/${adminUser.id}/force-logout`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("yourself");
    });

    test("should return 404 for non-existent user", async () => {
      const response = await request(app)
        .post("/api/admin/system/sessions/99999/force-logout")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test("should return 400 for invalid user ID", async () => {
      const response = await request(app)
        .post("/api/admin/system/sessions/invalid/force-logout")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/admin/system/sessions/:userId/reactivate", () => {
    test("should reactivate a suspended user", async () => {
      // Create and suspend a user
      const testUser = await createTestUser("technician");
      await pool.query("UPDATE users SET status = $1 WHERE id = $2", [
        "suspended",
        testUser.user.id,
      ]);

      const response = await request(app)
        .post(`/api/admin/system/sessions/${testUser.user.id}/reactivate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.status).toBe("active");

      // Verify in database
      const userCheck = await pool.query(
        "SELECT status FROM users WHERE id = $1",
        [testUser.user.id],
      );
      expect(userCheck.rows[0].status).toBe("active");
    });

    test("should return 404 for user not suspended", async () => {
      const testUser = await createTestUser("technician");

      const response = await request(app)
        .post(`/api/admin/system/sessions/${testUser.user.id}/reactivate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // ENTITIES ENDPOINT TESTS
  // ============================================================================
  describe("GET /api/admin/entities", () => {
    test("should return list of all entities", async () => {
      const response = await request(app)
        .get("/api/admin/entities")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check structure of entity list item
      const firstEntity = response.body.data[0];
      expect(firstEntity).toHaveProperty("name");
      expect(firstEntity).toHaveProperty("tableName");
      expect(firstEntity).toHaveProperty("primaryKey");
    });

    test("should include known entities", async () => {
      const response = await request(app)
        .get("/api/admin/entities")
        .set("Authorization", `Bearer ${adminToken}`);

      const entityNames = response.body.data.map((e) => e.name);
      expect(entityNames).toContain("customer");
      expect(entityNames).toContain("work_order");
      expect(entityNames).toContain("user");
    });
  });

  describe("GET /api/admin/:entity", () => {
    test("should return entity metadata with RLS matrix", async () => {
      const response = await request(app)
        .get("/api/admin/customer")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("name", "customer");
      expect(response.body.data).toHaveProperty("rlsMatrix");
      expect(response.body.data.rlsMatrix).toHaveProperty("rows");
      expect(response.body.data.rlsMatrix).toHaveProperty("columns");
    });

    test("should return entity metadata with field access matrix", async () => {
      const response = await request(app)
        .get("/api/admin/customer")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("fieldAccessMatrix");
      expect(response.body.data.fieldAccessMatrix).toHaveProperty("rows");
      expect(response.body.data.fieldAccessMatrix).toHaveProperty("columns");
    });

    test("should return validation rules", async () => {
      const response = await request(app)
        .get("/api/admin/customer")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("validationRules");
      expect(Array.isArray(response.body.data.validationRules)).toBe(true);
    });

    test("should return 404 for unknown entity", async () => {
      const response = await request(app)
        .get("/api/admin/nonexistent")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test("should return raw metadata for /:entity/raw", async () => {
      const response = await request(app)
        .get("/api/admin/customer/raw")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("tableName");
      expect(response.body.data).toHaveProperty("fieldAccess");
    });
  });

  // ============================================================================
  // LOGS ENDPOINT TESTS
  // ============================================================================
  describe("GET /api/admin/system/logs/data", () => {
    beforeEach(async () => {
      // Create some audit log entries for testing
      await pool.query(
        `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values, ip_address)
        VALUES 
          ($1, 'create', 'customers', 1, '{"name": "Test Customer"}', '127.0.0.1'),
          ($1, 'update', 'customers', 1, '{"name": "Updated Customer"}', '127.0.0.1'),
          ($1, 'delete', 'work_orders', 5, '{}', '192.168.1.1')
      `,
        [adminUser.id],
      );
    });

    test("should return paginated data logs", async () => {
      const response = await request(app)
        .get("/api/admin/system/logs/data")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("data"); // logs array
      expect(response.body.data).toHaveProperty("pagination");
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    test("should filter by resourceType", async () => {
      const response = await request(app)
        .get("/api/admin/system/logs/data?resourceType=customers")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.data.forEach((log) => {
        expect(log.resourceType).toBe("customers");
      });
    });

    test("should filter by action", async () => {
      const response = await request(app)
        .get("/api/admin/system/logs/data?action=create")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.data.forEach((log) => {
        expect(log.action).toBe("create");
      });
    });

    test("should support pagination parameters", async () => {
      const response = await request(app)
        .get("/api/admin/system/logs/data?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.data.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });
  });

  describe("GET /api/admin/system/logs/auth", () => {
    beforeEach(async () => {
      // Create some auth-related audit log entries
      await pool.query(
        `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent)
        VALUES 
          ($1, 'login_success', 'auth', $1, '127.0.0.1', 'Test Browser'),
          ($1, 'login_failure', 'auth', NULL, '192.168.1.100', 'Bad Actor Browser'),
          ($1, 'logout', 'auth', $1, '127.0.0.1', 'Test Browser')
      `,
        [adminUser.id],
      );
    });

    test("should return paginated auth logs", async () => {
      const response = await request(app)
        .get("/api/admin/system/logs/auth")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("data"); // logs array
      expect(response.body.data).toHaveProperty("pagination");
    });

    test("should filter by action type", async () => {
      const response = await request(app)
        .get("/api/admin/system/logs/auth?action=login_failure")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.data.forEach((log) => {
        expect(log.action).toBe("login_failure");
      });
    });

    test("should include user agent information", async () => {
      const response = await request(app)
        .get("/api/admin/system/logs/auth")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // At least one log should have userAgent (camelCase from service)
      const logsWithUserAgent = response.body.data.data.filter(
        (l) => l.userAgent,
      );
      expect(logsWithUserAgent.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/admin/system/logs/summary", () => {
    test("should return log summary for default period", async () => {
      const response = await request(app)
        .get("/api/admin/system/logs/summary")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("period");
    });

    test("should accept period parameter", async () => {
      const response = await request(app)
        .get("/api/admin/system/logs/summary?period=week")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.period).toBe("week");
    });
  });

  // ============================================================================
  // CONFIG ENDPOINT TESTS
  // ============================================================================
  describe("GET /api/admin/system/config/permissions", () => {
    test("should return permissions.json content", async () => {
      const response = await request(app)
        .get("/api/admin/system/config/permissions")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("roles");
      expect(response.body.data).toHaveProperty("resources");
    });
  });

  describe("GET /api/admin/system/config/validation", () => {
    test("should return derived validation rules from entity metadata", async () => {
      const response = await request(app)
        .get("/api/admin/system/config/validation")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Validation is now derived from entity metadata (SSOT pattern)
      expect(response.body.data).toHaveProperty("entities");
      expect(response.body.data).toHaveProperty("source", "entity-metadata");
    });
  });

  // ============================================================================
  // SESSION DELETE TEST
  // ============================================================================
  describe("DELETE /api/admin/system/sessions/:sessionId", () => {
    test("should revoke a specific session", async () => {
      // Create an active session
      const testUser = await createTestUser("technician");
      const insertResult = await pool.query(
        `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_active)
        VALUES ($1, 'session-to-revoke', NOW() + INTERVAL '7 days', true)
        RETURNING id
      `,
        [testUser.user.id],
      );
      const sessionId = insertResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/admin/system/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify session is revoked
      const check = await pool.query(
        "SELECT is_active FROM refresh_tokens WHERE id = $1",
        [sessionId],
      );
      expect(check.rows[0].is_active).toBe(false);
    });

    test("should return 404 for non-existent session", async () => {
      const response = await request(app)
        .delete("/api/admin/system/sessions/99999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test("should return 400 for invalid session ID", async () => {
      const response = await request(app)
        .delete("/api/admin/system/sessions/invalid")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // MAINTENANCE MODE TESTS
  // ============================================================================
  describe("GET /api/admin/system/maintenance", () => {
    test("should return current maintenance mode status", async () => {
      const response = await request(app)
        .get("/api/admin/system/maintenance")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // getMaintenanceMode returns the value object directly (not wrapped)
      expect(response.body.data).toHaveProperty("enabled");
      expect(typeof response.body.data.enabled).toBe("boolean");
    });
  });

  describe("PUT /api/admin/system/maintenance", () => {
    afterEach(async () => {
      // Reset maintenance mode to disabled after each test
      await request(app)
        .put("/api/admin/system/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ enabled: false });
    });

    test("should enable maintenance mode", async () => {
      const response = await request(app)
        .put("/api/admin/system/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          enabled: true,
          message: "Scheduled maintenance in progress",
          allowed_roles: ["admin"],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.message).toBe(
        "Scheduled maintenance in progress",
      );
    });

    test("should disable maintenance mode", async () => {
      // First enable it
      await request(app)
        .put("/api/admin/system/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ enabled: true });

      // Then disable it
      const response = await request(app)
        .put("/api/admin/system/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
    });

    test("should return 400 when enabled is not boolean", async () => {
      const response = await request(app)
        .put("/api/admin/system/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ enabled: "yes" });

      expect(response.status).toBe(400);
    });

    test("should return 400 when enabled is missing", async () => {
      const response = await request(app)
        .put("/api/admin/system/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ message: "No enabled field" });

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // SYSTEM SETTINGS TESTS
  // ============================================================================
  describe("GET /api/admin/system/settings", () => {
    test("should return all system settings", async () => {
      const response = await request(app)
        .get("/api/admin/system/settings")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/admin/system/settings/:key", () => {
    test("should return a specific setting", async () => {
      const response = await request(app)
        .get("/api/admin/system/settings/maintenance_mode")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("key", "maintenance_mode");
      expect(response.body.data).toHaveProperty("value");
    });

    test("should return 404 for unknown setting", async () => {
      const response = await request(app)
        .get("/api/admin/system/settings/nonexistent_setting")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/admin/system/settings/:key", () => {
    test("should update a setting value", async () => {
      const newValue = { test_flag: true, updated: Date.now() };

      const response = await request(app)
        .put("/api/admin/system/settings/feature_flags")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ value: newValue });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should return 400 when value is missing", async () => {
      const response = await request(app)
        .put("/api/admin/system/settings/feature_flags")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
