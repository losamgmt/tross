/**
 * Audit Logging Tests
 *
 * Tests that CRUD operations are properly logged to audit_logs table.
 * Uses roles as the test entity since it has full audit coverage.
 */

const request = require("supertest");
const app = require("../../../server");
const {
  createTestUser,
  cleanupTestDatabase,
} = require("../../helpers/test-db");
const { getUniqueValues } = require("../../helpers/test-helpers");
const GenericEntityService = require("../../../services/generic-entity-service");
const db = require("../../../db/connection");
const jwt = require("jsonwebtoken");

describe("Audit Logging - Specialized Tests", () => {
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    adminUser = await createTestUser("admin");
    adminToken = adminUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  /**
   * Helper to get authenticated user from token
   */
  async function getAuthenticatedUserId(token) {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret-key",
    );
    const user = await GenericEntityService.findByField(
      "user",
      "auth0_id",
      decoded.sub,
    );
    return user?.id;
  }

  describe("Role CRUD Audit Logging", () => {
    test("should log role creation in audit_logs", async () => {
      const unique = getUniqueValues();
      const uniqueRoleName = `test-role-${unique.id}-audit`;

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: uniqueRoleName, priority: unique.priority });

      expect(response.status).toBe(201);

      const roleId = response.body.data.id;
      const userId = await getAuthenticatedUserId(adminToken);

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_create' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, userId],
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].resource_type).toBe("role");
      expect(auditResult.rows[0].result).toBe("success");
    });

    test("should log role updates in audit_logs", async () => {
      const unique = getUniqueValues();
      const createRoleName = `test-role-${unique.id}-create`;
      const updatedRoleName = `test-role-${unique.id}-update`;

      const createResponse = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: createRoleName, priority: unique.priority });

      const roleId = createResponse.body.data.id;

      await request(app)
        .patch(`/api/roles/${roleId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: updatedRoleName });

      const userId = await getAuthenticatedUserId(adminToken);

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_update' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, userId],
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].old_values).toBeDefined();
      const newValues = JSON.stringify(auditResult.rows[0].new_values);
      expect(newValues).toContain(updatedRoleName);
    });

    test("should log role deletion in audit_logs", async () => {
      const unique = getUniqueValues();
      const deleteRoleName = `test-role-${unique.id}-delete`;

      const createResponse = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: deleteRoleName, priority: unique.priority });

      const roleId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/roles/${roleId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      const userId = await getAuthenticatedUserId(adminToken);

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_delete' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, userId],
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].resource_type).toBe("role");
      expect(auditResult.rows[0].result).toBe("success");
    });
  });
});
