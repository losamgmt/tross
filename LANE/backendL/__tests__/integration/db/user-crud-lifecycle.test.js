/**
 * User CRUD Lifecycle Tests
 *
 * Test Design Philosophy:
 * - Follow natural CRUD lifecycle: CREATE → READ → UPDATE → DELETE
 * - Track entity state across operations (entities flow through all tests)
 * - Minimize redundant database operations
 * - Mirror real-world usage patterns
 * - Each entity has a complete lifecycle journey
 *
 * Pattern:
 * 1. CREATE entity → store ID
 * 2. READ entity using stored ID → verify data
 * 3. UPDATE entity using stored ID → verify changes
 * 4. DELETE entity using stored ID → verify removal
 */

const request = require("supertest");
const app = require("../../../server");
const {
  cleanupTestDatabase,
  createTestUser,
} = require("../../helpers/test-db");
const User = require("../../../db/models/User");

const uniqueEmail = () =>
  `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;

describe("User CRUD Lifecycle Tests", () => {
  let adminToken;
  let adminUser;
  let clientToken;
  let clientUser;

  // STANDARD PATTERN: Create test users once for all lifecycle tests
  beforeAll(async () => {
    const adminData = await createTestUser("admin");
    adminToken = adminData.token;
    adminUser = adminData.user;

    const clientData = await createTestUser("client");
    clientToken = clientData.token;
    clientUser = clientData.user;
  });

  // Clean up once after all tests complete
  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe("Complete User Lifecycle: CREATE → READ → UPDATE → DELETE", () => {
    let lifecycleUser = null;

    it("1. CREATE: Should create a new user", async () => {
      const userData = {
        email: uniqueEmail(),
        first_name: "Lifecycle",
        last_name: "Test",
      };

      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.is_active).toBe(true);

      // Store for next lifecycle stages
      lifecycleUser = response.body.data;
    });

    it("2. READ: Should retrieve the created user", async () => {
      expect(lifecycleUser).not.toBeNull();
      expect(lifecycleUser.id).toBeDefined();

      const user = await User.findById(lifecycleUser.id);

      expect(user).not.toBeNull();
      expect(user.id).toBe(lifecycleUser.id);
      expect(user.email).toBe(lifecycleUser.email);
      expect(user.first_name).toBe("Lifecycle");
      expect(user.is_active).toBe(true);
    });

    it("3. UPDATE: Should update the user details", async () => {
      expect(lifecycleUser).not.toBeNull();

      const updates = {
        first_name: "Updated",
        last_name: "Lifecycle",
      };

      const response = await request(app)
        .put(`/api/users/${lifecycleUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.first_name).toBe("Updated");
      expect(response.body.data.last_name).toBe("Lifecycle");
      expect(response.body.data.id).toBe(lifecycleUser.id);

      // Update our tracked entity
      lifecycleUser = response.body.data;
    });

    it("4. DELETE: Should permanently delete the user", async () => {
      expect(lifecycleUser).not.toBeNull();

      const response = await request(app)
        .delete(`/api/users/${lifecycleUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User deleted successfully");

      // Verify permanent deletion (user should not exist)
      const deletedUser = await User.findById(lifecycleUser.id);
      expect(deletedUser).toBeNull(); // User completely removed from database
    });

    it("5. AUDIT: Should have logged all lifecycle operations", async () => {
      expect(lifecycleUser).not.toBeNull();

      const db = require("../../../db/connection");
      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE resource_type = 'user' 
         AND resource_id = $1 
         ORDER BY created_at ASC`,
        [lifecycleUser.id],
      );

      // Should have: CREATE, UPDATE, DELETE
      expect(auditResult.rows.length).toBeGreaterThanOrEqual(3);

      const actions = auditResult.rows.map((r) => r.action);
      expect(actions).toContain("user_create");
      expect(actions).toContain("user_update");
      expect(actions).toContain("user_delete");
    });
  });

  describe("Validation Tests (Using Fresh Entities)", () => {
    it("CREATE: Should reject duplicate email", async () => {
      const email = uniqueEmail();

      // Create first user
      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email, first_name: "First", last_name: "User" })
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email, first_name: "Second", last_name: "User" })
        .expect(409);
    });

    it("CREATE: Should reject missing email", async () => {
      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ first_name: "No", last_name: "Email" })
        .expect(400);
    });

    it("UPDATE: Should reject empty updates", async () => {
      // Create test user
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: uniqueEmail(), first_name: "Test", last_name: "User" })
        .expect(201);

      const userId = response.body.data.id;

      // Try empty update
      await request(app)
        .put(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it("UPDATE: Should reject non-existent user", async () => {
      await request(app)
        .put("/api/users/99999")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ first_name: "Ghost" })
        .expect(404);
    });

    it("DELETE: Should reject non-existent user", async () => {
      await request(app)
        .delete("/api/users/99999")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });

    it("DELETE: Should prevent admin from deleting themselves", async () => {
      // The authenticated user should not be able to delete themselves
      // We need to find out WHO the authenticated user is (the one the token resolves to)
      // The most professional way: look up the user by auth0_id from the token

      // Decode the token to get auth0_id
      const jwt = require("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
      const decoded = jwt.verify(adminToken, JWT_SECRET);

      // Find the actual authenticated user by auth0_id
      const authenticatedUser = await User.findByAuth0Id(decoded.sub);
      expect(authenticatedUser).not.toBeNull();

      // Now try to delete the authenticated user - should be blocked
      const response = await request(app)
        .delete(`/api/users/${authenticatedUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBe("Cannot delete your own account");
    });
  });

  describe("Authorization Tests", () => {
    it("CREATE: Should reject non-admin user", async () => {
      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ email: uniqueEmail(), first_name: "Test", last_name: "User" })
        .expect(403);
    });

    it("CREATE: Should reject unauthenticated request", async () => {
      await request(app)
        .post("/api/users")
        .send({ email: uniqueEmail(), first_name: "Test", last_name: "User" })
        .expect(401);
    });

    it("UPDATE: Should reject non-admin user", async () => {
      // Create user as admin
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: uniqueEmail(), first_name: "Test", last_name: "User" })
        .expect(201);

      const userId = response.body.data.id;

      // Try to update as client
      await request(app)
        .put(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ first_name: "Hacked" })
        .expect(403);
    });

    it("DELETE: Should reject non-admin user", async () => {
      // Create user as admin
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: uniqueEmail(), first_name: "Test", last_name: "User" })
        .expect(201);

      const userId = response.body.data.id;

      // Try to delete as client
      await request(app)
        .delete(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${clientToken}`)
        .expect(403);
    });

    it("DELETE: Should reject unauthenticated request", async () => {
      // Create user as admin
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: uniqueEmail(), first_name: "Test", last_name: "User" })
        .expect(201);

      const userId = response.body.data.id;

      // Try to delete without auth
      await request(app).delete(`/api/users/${userId}`).expect(401);
    });
  });
});
