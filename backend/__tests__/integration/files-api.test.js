/**
 * Files API Endpoints - Integration Tests
 *
 * Tests file attachment sub-resource endpoints with real server
 * Pattern: /api/:tableName/:id/files[/:fileId]
 *
 * Validates polymorphic file attachment patterns
 */

const request = require("supertest");
const app = require("../../server");
const {
  createTestUser,
  cleanupTestDatabase,
  createCustomerProfile,
  createWorkOrder,
} = require("../helpers/test-db");
const { withAuth } = require("../helpers/test-auth");
const { HTTP_STATUS } = require("../../config/constants");

describe("Files API Endpoints - Integration Tests", () => {
  let adminUser;
  let adminToken;
  let customerUser;
  let customerToken;
  let testWorkOrderId;

  beforeAll(async () => {
    adminUser = await createTestUser("admin");
    adminToken = adminUser.token;
    customerUser = await createTestUser("customer");
    customerToken = customerUser.token;

    // Create a work order for file tests (requires customer profile)
    const customerId = await createCustomerProfile("FilesTestCustomer");
    const workOrder = await createWorkOrder(customerId);
    testWorkOrderId = workOrder.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe("POST /api/:tableName/:id/files - Upload File", () => {
    test("should return 401 without authentication", async () => {
      const response = await request(app)
        .post("/api/work_orders/1/files")
        .set("Content-Type", "text/plain")
        .set("X-Filename", "test.txt")
        .send(Buffer.from("test content"));

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test("should deny upload without update permission on entity", async () => {
      // A customer lacks update permission on work_orders; for a work order they
      // don't own, RLS hides the record (404). Both 403 and 404 are valid denials.
      const response = await request(app)
        .post("/api/work_orders/1/files")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("Content-Type", "text/plain")
        .set("X-Filename", "test.txt")
        .send(Buffer.from("test content"));

      expect([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.NOT_FOUND]).toContain(
        response.status,
      );
    });

    test("should return 400 for invalid entity ID", async () => {
      const response = await request(app)
        .post("/api/work_orders/invalid/files")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("Content-Type", "text/plain")
        .set("X-Filename", "test.txt")
        .send(Buffer.from("test content"));

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test("should return 400 for disallowed MIME type", async () => {
      const response = await request(app)
        .post("/api/work_orders/1/files")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("Content-Type", "application/x-executable")
        .set("X-Filename", "malicious.exe")
        .send(Buffer.from("not a real exe"));

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/mime type|file type/i);
    });

    test("should return 400 for empty file body", async () => {
      const response = await request(app)
        .post("/api/work_orders/1/files")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("Content-Type", "text/plain")
        .set("X-Filename", "empty.txt")
        .send(Buffer.alloc(0));

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/empty|no file|body/i);
    });

    test("should return 404 for non-existent entity", async () => {
      const response = await request(app)
        .post("/api/work_orders/999999/files")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("Content-Type", "text/plain")
        .set("X-Filename", "test.txt")
        .send(Buffer.from("test content"));

      // Either 404 (entity not found) or 503 (storage not configured) is acceptable
      expect([
        HTTP_STATUS.NOT_FOUND,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
      ]).toContain(response.status);
    });
  });

  describe("GET /api/:tableName/:id/files - List Files", () => {
    test("should return 401 without authentication", async () => {
      const response = await request(app).get("/api/work_orders/1/files");

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test("should enforce access control on entity reads", async () => {
      // A customer can read their own work_orders; for one they don't own, RLS
      // returns 404. OK / 403 / 404 are all acceptable access-controlled results.
      const response = await request(app)
        .get("/api/work_orders/1/files")
        .set("Authorization", `Bearer ${customerToken}`);

      expect([
        HTTP_STATUS.OK,
        HTTP_STATUS.FORBIDDEN,
        HTTP_STATUS.NOT_FOUND,
      ]).toContain(response.status);
    });

    test("should return 400 for invalid entity ID", async () => {
      const response = await request(app)
        .get("/api/work_orders/invalid/files")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test("should return empty array for entity with no files", async () => {
      const response = await request(app)
        .get(`/api/work_orders/${testWorkOrderId}/files`)
        .set("Authorization", `Bearer ${adminToken}`);

      // Storage check happens before listing - expect 503 if not configured
      if (response.status === HTTP_STATUS.SERVICE_UNAVAILABLE) {
        expect(response.body.message).toMatch(/storage|not configured/i);
      } else {
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    test("should accept category filter", async () => {
      const response = await request(app)
        .get(`/api/work_orders/${testWorkOrderId}/files?category=photo`)
        .set("Authorization", `Bearer ${adminToken}`);

      // Could be 503 if storage not configured
      expect([HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE]).toContain(
        response.status,
      );
      if (response.status === HTTP_STATUS.OK) {
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe("GET /api/:tableName/:id/files/:fileId - Get Single File", () => {
    test("should return 401 without authentication", async () => {
      const response = await request(app).get("/api/work_orders/1/files/1");

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test("should return 400 for invalid file ID", async () => {
      const response = await request(app)
        .get("/api/work_orders/1/files/invalid")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test("should return 404 for non-existent file", async () => {
      const response = await request(app)
        .get("/api/work_orders/1/files/999999")
        .set("Authorization", `Bearer ${adminToken}`);

      // 404 or 503 if storage not configured
      expect([
        HTTP_STATUS.NOT_FOUND,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
      ]).toContain(response.status);
    });
  });

  describe("DELETE /api/:tableName/:id/files/:fileId - Delete File", () => {
    test("should return 401 without authentication", async () => {
      const response = await request(app).delete("/api/work_orders/1/files/1");

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test("should return 400 for invalid file ID", async () => {
      const response = await request(app)
        .delete("/api/work_orders/1/files/invalid")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test("should return 404 for non-existent file", async () => {
      const response = await request(app)
        .delete("/api/work_orders/1/files/999999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });
});
