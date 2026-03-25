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
const db = require("../../../db/connection");

describe("Audit Logging - Specialized Tests", () => {
  let adminUser;
  let adminToken;
  let adminUserId;

  beforeAll(async () => {
    adminUser = await createTestUser("admin");
    adminToken = adminUser.token;
    adminUserId = adminUser.user.id; // Direct access - no lookup needed
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

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

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_create' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, adminUserId],
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

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_update' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, adminUserId],
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

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_delete' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, adminUserId],
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].resource_type).toBe("role");
      expect(auditResult.rows[0].result).toBe("success");
    });
  });
});
