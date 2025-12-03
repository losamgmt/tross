/**
 * Role CRUD Integration Tests
 * Tests all role CRUD operations with real PostgreSQL database
 *
 * Architecture: Modular, focused on Role domain only
 * Pattern: Uses centralized test constants for ALL test data
 */

const request = require("supertest");
const app = require("../../../server");
const {
  cleanupTestDatabase,
  createTestUser,
  uniqueRoleName,
} = require("../../helpers/test-db");
const {
  TEST_ROLES,
  TEST_ERROR_MESSAGES,
} = require("../../../config/test-constants");
const Role = require("../../../db/models/Role");

describe("Role CRUD Operations - Integration Tests", () => {
  let adminToken;
  let adminUser;
  let clientToken;
  let testRoleId;
  let testRoleName;

  // STANDARD PATTERN: globalSetup handles schema, beforeAll creates test users
  beforeAll(async () => {
    // Create test users (schema already set up by globalSetup)
    const adminData = await createTestUser("admin");
    adminToken = adminData.token;
    adminUser = adminData.user;

    const clientData = await createTestUser("client");
    clientToken = clientData.token;
  });

  // STANDARD PATTERN: Clean data between tests, not schema
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe("POST /api/roles - Create Role", () => {
    it("should create a new role as admin", async () => {
      // Use centralized unique role name to avoid conflicts with seeded data
      testRoleName = uniqueRoleName(TEST_ROLES.UNIQUE_COORDINATOR);

      const newRole = {
        name: testRoleName,
      };

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newRole)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.name).toBe(testRoleName);
      expect(response.body.message).toBe("Role created successfully");

      // Store for later tests
      testRoleId = response.body.data.id;
    });

    it("should normalize role name to lowercase", async () => {
      const uniqueName = uniqueRoleName(TEST_ROLES.UNIQUE_SUPERVISOR);

      const newRole = {
        name: uniqueName.toUpperCase(), // Send uppercase
      };

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newRole)
        .expect(201);

      expect(response.body.data.name).toBe(uniqueName.toLowerCase());
    });

    it("should reject duplicate role name", async () => {
      // First create the role
      const roleName = uniqueRoleName(TEST_ROLES.UNIQUE_ANALYST);
      await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: roleName })
        .expect(201);

      // Try to create duplicate
      const duplicateRole = {
        name: roleName, // Already exists
      };

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(duplicateRole)
        .expect(409);

      expect(response.body.error).toBe("Conflict");
      expect(response.body.message).toBe("Role name already exists");
    });

    it("should reject request without name", async () => {
      const invalidRole = {};

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidRole)
        .expect(400);

      expect(response.body.error).toBe(
        TEST_ERROR_MESSAGES.VALIDATION.ERROR_TYPE,
      );
      expect(response.body.message).toBe(
        TEST_ERROR_MESSAGES.VALIDATION.ROLE_NAME_REQUIRED,
      );
    });

    it("should reject empty role name", async () => {
      const invalidRole = {
        name: "   ", // Just whitespace - Joi will trim and fail validation
      };

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidRole)
        .expect(400);

      expect(response.body.error).toBe(
        TEST_ERROR_MESSAGES.VALIDATION.ERROR_TYPE,
      );
      expect(response.body.message).toBe(
        TEST_ERROR_MESSAGES.VALIDATION.ROLE_NAME_REQUIRED,
      );
    });

    it("should reject non-admin user", async () => {
      const newRole = {
        name: uniqueRoleName(TEST_ROLES.UNIQUE_OBSERVER),
      };

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${clientToken}`)
        .send(newRole)
        .expect(403);

      expect(response.body.error).toBe("Forbidden");
    });

    it("should reject unauthenticated request", async () => {
      const newRole = {
        name: uniqueRoleName(TEST_ROLES.UNIQUE_AUDITOR),
      };

      await request(app).post("/api/roles").send(newRole).expect(401);
    });
  });

  describe("PUT /api/roles/:id - Update Role", () => {
    it("should update role name as admin", async () => {
      const updatedName = uniqueRoleName(TEST_ROLES.UPDATED_COORDINATOR);

      const updates = {
        name: updatedName,
      };

      const response = await request(app)
        .put(`/api/roles/${testRoleId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updatedName);
      expect(response.body.message).toBe("Role updated successfully");
    });

    it("should normalize updated role name to lowercase", async () => {
      const updatedName = uniqueRoleName(TEST_ROLES.UPDATED_SUPERVISOR);

      const updates = {
        name: updatedName.toUpperCase(), // Send uppercase
      };

      const response = await request(app)
        .put(`/api/roles/${testRoleId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.data.name).toBe(updatedName.toLowerCase());
    });

    it("should reject update to duplicate name", async () => {
      // Create another role to conflict with
      const existingRoleName = uniqueRoleName(TEST_ROLES.CONFLICT_NAME);
      await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: existingRoleName })
        .expect(201);

      // Try to update testRoleId to that name
      const updates = {
        name: existingRoleName,
      };

      const response = await request(app)
        .put(`/api/roles/${testRoleId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updates)
        .expect(409);

      expect(response.body.error).toBe("Conflict");
    });

    it("should reject update without name", async () => {
      const updates = {};

      const response = await request(app)
        .put(`/api/roles/${testRoleId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updates)
        .expect(400);

      expect(response.body.error).toBe(
        TEST_ERROR_MESSAGES.VALIDATION.ERROR_TYPE,
      );
      expect(response.body.message).toBe(
        TEST_ERROR_MESSAGES.VALIDATION.AT_LEAST_ONE_FIELD,
      );
    });

    it("should reject update for non-existent role", async () => {
      const updates = {
        name: uniqueRoleName(TEST_ROLES.UNIQUE_OBSERVER),
      };

      await request(app)
        .put("/api/roles/99999")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updates)
        .expect(404);
    });

    it("should reject update for protected role (admin)", async () => {
      const adminRole = await Role.getByName("admin");

      const updates = {
        name: uniqueRoleName(TEST_ROLES.UNIQUE_AUDITOR),
      };

      const response = await request(app)
        .put(`/api/roles/${adminRole.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updates)
        .expect(400);

      expect(response.body.message).toBe("Cannot modify protected role");
    });

    it("should reject update for protected role (client)", async () => {
      const clientRole = await Role.getByName("client");

      const updates = {
        name: uniqueRoleName(TEST_ROLES.UNIQUE_COORDINATOR),
      };

      const response = await request(app)
        .put(`/api/roles/${clientRole.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updates)
        .expect(400);

      expect(response.body.message).toBe("Cannot modify protected role");
    });

    it("should reject non-admin user", async () => {
      const updates = {
        name: uniqueRoleName(TEST_ROLES.UNIQUE_ANALYST),
      };

      await request(app)
        .put(`/api/roles/${testRoleId}`)
        .set("Authorization", `Bearer ${clientToken}`)
        .send(updates)
        .expect(403);
    });
  });

  describe("DELETE /api/roles/:id - Delete Role", () => {
    let roleToDelete;

    beforeEach(async () => {
      // Create a role to delete using centralized constants
      const deletableRoleName = uniqueRoleName(TEST_ROLES.UNIQUE_OBSERVER);

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: deletableRoleName });

      roleToDelete = response.body.data;
    });

    it("should delete role as admin", async () => {
      const response = await request(app)
        .delete(`/api/roles/${roleToDelete.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Role deleted successfully");

      // Verify role is deleted
      const deletedRole = await Role.findById(roleToDelete.id);
      expect(deletedRole).toBeUndefined();
    });

    it("should reject delete for non-existent role", async () => {
      await request(app)
        .delete("/api/roles/99999")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });

    it("should reject delete for protected role (admin)", async () => {
      const adminRole = await Role.getByName("admin");

      const response = await request(app)
        .delete(`/api/roles/${adminRole.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBe("Cannot delete protected role");
    });

    it("should reject delete for protected role (client)", async () => {
      const clientRole = await Role.getByName("client");

      const response = await request(app)
        .delete(`/api/roles/${clientRole.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBe("Cannot delete protected role");
    });

    it("should reject delete for role with assigned users", async () => {
      // Create a role with unique name
      const roleWithUsersName = uniqueRoleName(TEST_ROLES.UNIQUE_AUDITOR);
      const newRole = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: roleWithUsersName });

      // Create a user assigned to this role
      const { uniqueEmail } = require("../../helpers/test-db");
      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: uniqueEmail("test-user-role"),
          first_name: "User",
          last_name: "WithRole",
          role_id: newRole.body.data.id,
        });

      const response = await request(app)
        .delete(`/api/roles/${newRole.body.data.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toContain("Cannot delete role:");
      expect(response.body.message).toContain("user(s) are assigned");
    });

    it("should reject non-admin user", async () => {
      await request(app)
        .delete(`/api/roles/${roleToDelete.id}`)
        .set("Authorization", `Bearer ${clientToken}`)
        .expect(403);
    });

    it("should reject unauthenticated request", async () => {
      await request(app).delete(`/api/roles/${roleToDelete.id}`).expect(401);
    });
  });

  describe("Audit Logging for Role CRUD", () => {
    it("should log role creation in audit_logs", async () => {
      const auditRoleName = uniqueRoleName(TEST_ROLES.UNIQUE_COORDINATOR);

      const newRole = {
        name: auditRoleName,
      };

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newRole);

      const roleId = response.body.data.id;

      const db = require("../../../db/connection");

      // CRITICAL: Use req.dbUser.id from auth middleware (findOrCreate user)
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(
        adminToken,
        process.env.JWT_SECRET || "dev-secret-key",
      );
      const User = require("../../../db/models/User");
      const authenticatedUser = await User.findByAuth0Id(decoded.sub);

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_create' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, authenticatedUser.id],
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].resource_type).toBe("role");
      expect(auditResult.rows[0].result).toBe("success");
    });

    it("should log role updates in audit_logs", async () => {
      const createRoleName = uniqueRoleName(TEST_ROLES.UNIQUE_SUPERVISOR);
      const updatedRoleName = uniqueRoleName(TEST_ROLES.UPDATED_SUPERVISOR);

      const createResponse = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: createRoleName });

      const roleId = createResponse.body.data.id;

      await request(app)
        .put(`/api/roles/${roleId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: updatedRoleName });

      const db = require("../../../db/connection");

      // CRITICAL: Use req.dbUser.id from auth middleware (findOrCreate user)
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(
        adminToken,
        process.env.JWT_SECRET || "dev-secret-key",
      );
      const User = require("../../../db/models/User");
      const authenticatedUser = await User.findByAuth0Id(decoded.sub);

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_update' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, authenticatedUser.id],
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].old_values).toBeDefined();
      // new_values is JSONB - check if it contains the updated role name
      const newValues = JSON.stringify(auditResult.rows[0].new_values);
      expect(newValues).toContain(updatedRoleName);
    });

    it("should log role deletion in audit_logs", async () => {
      const deleteRoleName = uniqueRoleName(TEST_ROLES.UNIQUE_ANALYST);

      const createResponse = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: deleteRoleName });

      const roleId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/roles/${roleId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      const db = require("../../../db/connection");

      // CRITICAL: Use req.dbUser.id from auth middleware (findOrCreate user)
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(
        adminToken,
        process.env.JWT_SECRET || "dev-secret-key",
      );
      const User = require("../../../db/models/User");
      const authenticatedUser = await User.findByAuth0Id(decoded.sub);

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_delete' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, authenticatedUser.id],
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].result).toBe("success");
    });
  });
});
