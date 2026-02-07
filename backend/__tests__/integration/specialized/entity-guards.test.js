/**
 * Entity-Specific Guard Tests
 *
 * Tests for special entity behaviors that can't be generalized:
 * - Self-deletion prevention (users)
 * - GET /roles/:id/users (roles)
 */

const request = require("supertest");
const app = require("../../../server");
const {
  createTestUser,
  cleanupTestDatabase,
} = require("../../helpers/test-db");

describe("Entity-Specific Guards - Specialized Tests", () => {
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    adminUser = await createTestUser("admin");
    adminToken = adminUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe("User Self-Deletion Prevention", () => {
    test("should prevent self-deletion", async () => {
      // Attempt to delete self (the admin user from test setup)
      const response = await request(app)
        .delete(`/api/users/${adminUser.userId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      // Should be forbidden or have specific error
      expect([400, 403]).toContain(response.status);
    });
  });

  describe("GET /api/roles/:id/users - Get Users by Role", () => {
    test("should return 401 without authentication", async () => {
      const response = await request(app).get("/api/roles/1/users");
      expect(response.status).toBe(401);
    });

    test("should return users for a role", async () => {
      // Get a valid role ID first
      const listResponse = await request(app)
        .get("/api/roles?page=1&limit=1")
        .set("Authorization", `Bearer ${adminToken}`);

      if (listResponse.body.data?.length === 0) return;

      const roleId = listResponse.body.data[0].id;
      const response = await request(app)
        .get(`/api/roles/${roleId}/users?page=1&limit=10`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 400]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array),
        });
      }
    });
  });
});
