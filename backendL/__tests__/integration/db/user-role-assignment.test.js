/**
 * User Role Assignment Integration Tests
 * Tests setting/changing user roles (one role per user - KISS)
 *
 * Architecture: ONE role per user (many-to-one via users.role_id FK)
 * Pattern: Uses centralized test constants for ALL test data
 */

const request = require("supertest");
const app = require("../../../server");
const {
  cleanupTestDatabase,
  createTestUser,
  uniqueEmail,
  generateAdminToken,
  generateClientToken,
  uniqueRoleName,
} = require("../../helpers/test-db");
const {
  TEST_ROLES,
  TEST_EMAIL_PREFIXES,
  TEST_ERROR_MESSAGES,
} = require("../../../config/test-constants");
const Role = require("../../../db/models/Role");
const User = require("../../../db/models/User");

describe("User Role Assignment - Integration Tests", () => {
  let adminToken;
  let adminUser;
  let clientToken;
  let testUserId;
  let managerRoleId;
  let dispatcherRoleId;

  // STANDARD PATTERN: globalSetup handles schema, beforeAll creates test users
  beforeAll(async () => {
    const adminData = await createTestUser("admin");
    adminToken = adminData.token;
    adminUser = adminData.user;

    const clientData = await createTestUser("client");
    clientToken = clientData.token;

    // Get existing core roles
    const managerRole = await Role.getByName("manager");
    const dispatcherRole = await Role.getByName("dispatcher");
    managerRoleId = managerRole.id;
    dispatcherRoleId = dispatcherRole.id;

    // Create a test user
    const userResponse = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: uniqueEmail(TEST_EMAIL_PREFIXES.GENERIC),
        first_name: "Role",
        last_name: "Test",
      });
    testUserId = userResponse.body.data.id;
  });

  // STANDARD PATTERN: Clean data after all tests
  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe("PUT /api/users/:id/role - Set/Change User Role", () => {
    it("should assign initial role to user as admin", async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: managerRoleId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("manager");
      expect(response.body.message).toContain("assigned successfully");

      // Verify user has the role
      const user = await User.findById(testUserId);
      expect(user.role).toBe("manager");
      expect(user.role_id).toBe(managerRoleId);
    });

    it("should REPLACE role when assigning different role (one role per user)", async () => {
      // User currently has 'manager' role, change to 'dispatcher'
      const response = await request(app)
        .put(`/api/users/${testUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: dispatcherRoleId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("dispatcher");

      // Verify role was REPLACED (not added)
      const user = await User.findById(testUserId);
      expect(user.role).toBe("dispatcher");
      expect(user.role_id).toBe(dispatcherRoleId);
    });

    it("should allow reassigning same role (idempotent)", async () => {
      // Assign dispatcher again (already has dispatcher)
      const response = await request(app)
        .put(`/api/users/${testUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: dispatcherRoleId })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Still has dispatcher role
      const user = await User.findById(testUserId);
      expect(user.role).toBe("dispatcher");
    });

    it("should reject assigning non-existent role", async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: 99999 })
        .expect(404);

      expect(response.body.error).toContain("Role Not Found");
    });

    it("should reject request without role_id", async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe(
        TEST_ERROR_MESSAGES.VALIDATION.ERROR_TYPE,
      );
      expect(response.body.message).toBe(
        TEST_ERROR_MESSAGES.VALIDATION.ROLE_ID_REQUIRED,
      );
    });

    it("should reject non-admin user", async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/role`)
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ role_id: managerRoleId })
        .expect(403);
    });

    it("should reject unauthenticated request", async () => {
      await request(app)
        .put(`/api/users/${testUserId}/role`)
        .send({ role_id: managerRoleId })
        .expect(401);
    });

    it("should log role assignment in audit_logs", async () => {
      // Assign role
      const response = await request(app)
        .put(`/api/users/${testUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: managerRoleId })
        .expect(200);

      // Check audit log
      const db = require("../../../db/connection");

      // Query for audit log (use most recent role_assign for this resource)
      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_assign' 
         AND resource_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [testUserId],
      );

      expect(auditResult.rows.length).toBeGreaterThan(0);
      if (auditResult.rows.length > 0) {
        const auditLog = auditResult.rows[0];
        expect(auditLog.action).toBe("role_assign");
        expect(auditLog.resource_type).toBe("user");
        expect(auditLog.resource_id).toBe(testUserId);
      }
    });
  });

  describe("Complete User Role Workflow", () => {
    it("should handle full workflow: create user → assign role → change role → change again", async () => {
      // 1. Create new user
      const createResponse = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: uniqueEmail("workflow"),
          first_name: "Workflow",
          last_name: "Test",
        })
        .expect(201);

      const userId = createResponse.body.data.id;
      expect(userId).toBeDefined();

      // User starts with 'client' role (default in createTestUser or null)
      let user = await User.findById(userId);

      // 2. Assign 'manager' role
      await request(app)
        .put(`/api/users/${userId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: managerRoleId })
        .expect(200);

      user = await User.findById(userId);
      expect(user.role).toBe("manager");

      // 3. Change to 'dispatcher' role (replaces manager)
      await request(app)
        .put(`/api/users/${userId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: dispatcherRoleId })
        .expect(200);

      user = await User.findById(userId);
      expect(user.role).toBe("dispatcher");

      // 4. Change back to 'manager'
      await request(app)
        .put(`/api/users/${userId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: managerRoleId })
        .expect(200);

      user = await User.findById(userId);
      expect(user.role).toBe("manager");

      // Verify: User has exactly ONE role at all times
      expect(user.role_id).toBe(managerRoleId);
    });
  });

  describe("Role Assignment Error Handling", () => {
    it("should handle assignment to non-existent user gracefully", async () => {
      const response = await request(app)
        .put("/api/users/99999/role")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: managerRoleId })
        .expect(500); // User.setRole will fail if user doesn't exist

      expect(response.body.error).toBe("Internal Server Error");
    });

    it("should validate role_id is a number", async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: "not-a-number" })
        .expect(400);

      expect(response.body.error).toBe(
        TEST_ERROR_MESSAGES.VALIDATION.ERROR_TYPE,
      );
      expect(response.body.message).toBe(
        TEST_ERROR_MESSAGES.VALIDATION.ROLE_ID_MUST_BE_NUMBER,
      );
    });
  });
});
