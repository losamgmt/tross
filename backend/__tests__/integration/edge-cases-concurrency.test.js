/**
 * Edge Case Tests - Unique Constraint Enforcement
 *
 * Tests that unique constraints are properly enforced under concurrent load.
 * These tests have DETERMINISTIC outcomes - exactly one success, rest fail.
 *
 * Non-deterministic "stress tests" have been removed - they don't test
 * business logic and produce flaky results.
 */

const request = require("supertest");
const app = require("../../server");
const { createTestUser, cleanupTestDatabase } = require("../helpers/test-db");
const { getUniqueValues } = require("../helpers/test-helpers");
const GenericEntityService = require("../../services/generic-entity-service");

describe("Unique Constraint Enforcement Tests", () => {
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    adminUser = await createTestUser("admin");
    adminToken = adminUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe("Unique Constraint Races", () => {
    test("should prevent duplicate email creation in concurrent requests", async () => {
      const unique = getUniqueValues();
      const testEmail = unique.email; // Use validated email format

      // Fire 3 simultaneous creates with same email
      // Each request uses unique.lastName which is letters-only (validation-safe)
      const creates = Array(3)
        .fill(null)
        .map((_, index) => {
          // Generate letter suffix for index (0->A, 1->B, 2->C)
          const indexSuffix = String.fromCharCode(65 + index);
          return request(app)
            .post("/api/customers")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
              first_name: unique.firstName,
              last_name: `User${indexSuffix}`, // Letters only: UserA, UserB, UserC
              company_name: unique.companyName,
              email: testEmail, // Same email for all (to test uniqueness)
              phone: unique.phone,
            });
        });

      const responses = await Promise.all(creates);

      // Only one should succeed, others should fail with 409
      const successCount = responses.filter((r) => r.status === 201).length;
      const conflictCount = responses.filter((r) => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(2);

      // Clean up created customer(s)
      const result = await GenericEntityService.findByField(
        "customer",
        "email",
        testEmail,
      );
      if (result) {
        await GenericEntityService.delete("customer", result.id);
      }
    });
  });
});
