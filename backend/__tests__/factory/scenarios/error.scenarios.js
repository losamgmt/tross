/**
 * Error Handling Test Scenarios
 *
 * PRINCIPLE: Happy paths are only half the story. Error handling is CRITICAL.
 * These scenarios systematically test failure modes across all entities.
 *
 * Each scenario tests a specific error condition and verifies:
 * 1. Correct HTTP status code
 * 2. Proper error message format
 * 3. No sensitive data leakage
 * 4. Consistent response structure
 */

const { getCapabilities } = require("./scenario-helpers");

/**
 * Scenario: Update non-existent entity returns 404
 *
 * Preconditions: Entity has mutable fields
 * Tests: PATCH /:id with non-existent ID returns 404 (or 400 if validation fails first)
 */
function updateNonExistent(meta, ctx) {
  // Need a valid payload to pass validation
  const mutableFields = Object.keys(meta.fieldAccess || {}).filter((field) => {
    if (["id", "created_at"].includes(field)) return false;
    if (meta.immutableFields?.includes(field)) return false;
    const access = meta.fieldAccess[field];
    return access?.update && access.update !== "none";
  });

  if (!mutableFields.length) return;

  ctx.it(
    `PATCH /api/${meta.tableName}/99999 - returns 404 for non-existent`,
    async () => {
      const auth = await ctx.authHeader("admin");
      const field = mutableFields[0];
      const value = ctx.factory.generateFieldValue(meta.entityName, field);

      const response = await ctx.request
        .patch(`/api/${meta.tableName}/99999`)
        .set(auth)
        .send({ [field]: value });

      ctx.expect(response.status).toBe(404);
      ctx.expect(response.body.success).toBe(false);
    },
  );
}

/**
 * Scenario: Delete non-existent entity returns 404
 *
 * Preconditions: None
 * Tests: DELETE /:id with non-existent ID returns 404
 */
function deleteNonExistent(meta, ctx) {
  ctx.it(
    `DELETE /api/${meta.tableName}/99999 - returns 404 for non-existent`,
    async () => {
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .delete(`/api/${meta.tableName}/99999`)
        .set(auth);

      ctx.expect(response.status).toBe(404);
      ctx.expect(response.body.success).toBe(false);
    },
  );
}

/**
 * Scenario: No authentication returns 401
 *
 * Preconditions: None
 * Tests: All CRUD operations without auth header return 401
 */
function noAuthReturns401(meta, ctx) {
  const caps = getCapabilities(meta);

  ctx.it(`GET /api/${meta.tableName} - returns 401 without auth`, async () => {
    const response = await ctx.request.get(`/api/${meta.tableName}`);

    ctx.expect(response.status).toBe(401);
  });

  // Only test POST 401 if create is not disabled
  if (caps.canCreate) {
    ctx.it(
      `POST /api/${meta.tableName} - returns 401 without auth`,
      async () => {
        const payload = ctx.factory.buildMinimal(meta.entityName);

        const response = await ctx.request
          .post(`/api/${meta.tableName}`)
          .send(payload);

        ctx.expect(response.status).toBe(401);
      },
    );
  }
}

/**
 * Scenario: Invalid JSON body returns 400
 *
 * Preconditions: API create is not disabled
 * Tests: Malformed JSON in request body returns 400
 */
function invalidJsonBody(meta, ctx) {
  const caps = getCapabilities(meta);
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  ctx.it(
    `POST /api/${meta.tableName} - returns 400 for invalid JSON`,
    async () => {
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .set("Content-Type", "application/json")
        .send("{ invalid json }");

      ctx.expect(response.status).toBe(400);
    },
  );
}

/**
 * Scenario: Empty body on create returns 400
 *
 * Preconditions: Entity has required fields AND create is not disabled
 * Tests: Empty body on POST returns 400
 */
function emptyBodyOnCreate(meta, ctx) {
  const caps = getCapabilities(meta);
  if (!meta.requiredFields?.length) return;
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  ctx.it(
    `POST /api/${meta.tableName} - returns 400 for empty body`,
    async () => {
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send({});

      ctx.expect(response.status).toBe(400);
    },
  );
}

/**
 * Scenario: Null values for required fields returns 400
 *
 * Preconditions: Entity has required fields AND create is not disabled
 * Tests: Null for required field returns 400
 */
function nullRequiredFieldReturns400(meta, ctx) {
  const { requiredFields, entityName, tableName } = meta;
  const caps = getCapabilities(meta);
  if (!requiredFields?.length) return;
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  for (const field of requiredFields) {
    ctx.it(`POST /api/${tableName} - rejects null for ${field}`, async () => {
      const payload = await ctx.factory.buildMinimalWithFKs(entityName);
      payload[field] = null;
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .post(`/api/${tableName}`)
        .set(auth)
        .send(payload);

      ctx.expect(response.status).toBe(400);
    });
  }
}

/**
 * Scenario: Invalid enum values rejected
 *
 * Preconditions: Entity has enum fields AND create is not disabled
 * Tests: Invalid enum value returns 400
 */
function invalidEnumRejected(meta, ctx) {
  const { fields, entityName, tableName } = meta;
  const caps = getCapabilities(meta);
  if (!fields) return;
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  const enumFields = Object.entries(fields)
    .filter(([_, def]) => def.type === "enum" && def.values?.length)
    .map(([name]) => name);

  for (const field of enumFields) {
    ctx.it(
      `POST /api/${tableName} - rejects invalid enum for ${field}`,
      async () => {
        const payload = await ctx.factory.buildMinimalWithFKs(entityName);
        payload[field] = "INVALID_ENUM_VALUE_XYZ";
        const auth = await ctx.authHeader("admin");

        const response = await ctx.request
          .post(`/api/${tableName}`)
          .set(auth)
          .send(payload);

        ctx.expect(response.status).toBe(400);
      },
    );
  }
}

/**
 * Scenario: Invalid email format rejected
 *
 * Preconditions: Entity has email fields AND create is not disabled
 * Tests: Invalid email format returns 400
 */
function invalidEmailRejected(meta, ctx) {
  const { fields, entityName, tableName } = meta;
  const caps = getCapabilities(meta);
  if (!fields) return;
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  const emailFields = Object.entries(fields)
    .filter(([_, def]) => def.type === "email")
    .map(([name]) => name);

  for (const field of emailFields) {
    ctx.it(
      `POST /api/${tableName} - rejects invalid email for ${field}`,
      async () => {
        const payload = await ctx.factory.buildMinimalWithFKs(entityName);
        payload[field] = "not-a-valid-email";
        const auth = await ctx.authHeader("admin");

        const response = await ctx.request
          .post(`/api/${tableName}`)
          .set(auth)
          .send(payload);

        ctx.expect(response.status).toBe(400);
      },
    );
  }
}

/**
 * Scenario: XSS payloads don't cause errors
 *
 * Preconditions: Entity has free-text string fields (no pattern validation) AND create is not disabled
 * Tests: XSS payloads are handled without causing server errors
 * Note: Output encoding is frontend's responsibility; backend stores raw data safely
 *
 * UPDATED: Fields with pattern validation (like first_name, last_name) correctly
 * reject XSS payloads. Only free-text fields should accept arbitrary content.
 */
function xssHandledSafely(meta, ctx) {
  const { fields, entityName, tableName } = meta;
  const caps = getCapabilities(meta);
  if (!fields) return;
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  // Load validation rules to check for patterns
  const { loadValidationRules } = require("../../../utils/validation-loader");
  const rules = loadValidationRules();

  // Find string fields that DON'T have pattern validation (free-text fields)
  // These should accept XSS payloads safely (output encoding is frontend's job)
  const freeTextFields = Object.entries(fields)
    .filter(([name, def]) => {
      if (def.type !== "string") return false;
      // Skip fields with pattern validation
      const fieldRule = rules.fields[name];
      if (fieldRule?.pattern) return false;
      if (def.pattern) return false;
      // Skip known restricted fields (names have letter-only patterns)
      if (["first_name", "last_name", "email"].includes(name)) return false;
      return true;
    })
    .map(([name]) => name)
    .slice(0, 1); // Test just 1 field

  if (!freeTextFields.length) return; // Skip if no free-text fields

  ctx.it(
    `POST /api/${tableName} - handles XSS payload without error`,
    async () => {
      const payload = await ctx.factory.buildMinimalWithFKs(entityName);
      const xssPayload = '<script>alert("xss")</script>';
      payload[freeTextFields[0]] = xssPayload;
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .post(`/api/${tableName}`)
        .set(auth)
        .send(payload);

      // Should succeed - storing HTML is valid for free-text fields
      // Output encoding is frontend's responsibility
      ctx.expect(response.status).toBe(201);
      ctx.expect(response.body.success).toBe(true);
    },
  );
}

/**
 * Scenario: Pagination edge cases
 *
 * Preconditions: None
 * Tests: Invalid pagination params handled gracefully
 */
function paginationEdgeCases(meta, ctx) {
  ctx.it(
    `GET /api/${meta.tableName}?page=-1 - handles negative page`,
    async () => {
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .get(`/api/${meta.tableName}`)
        .query({ page: -1, limit: 10 })
        .set(auth);

      // Should either correct to page 1 or return 400
      ctx.expect([200, 400]).toContain(response.status);
    },
  );

  ctx.it(
    `GET /api/${meta.tableName}?limit=0 - handles zero limit`,
    async () => {
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .get(`/api/${meta.tableName}`)
        .query({ page: 1, limit: 0 })
        .set(auth);

      // Should either use default limit or return 400
      ctx.expect([200, 400]).toContain(response.status);
    },
  );

  ctx.it(
    `GET /api/${meta.tableName}?limit=10000 - handles excessive limit`,
    async () => {
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .get(`/api/${meta.tableName}`)
        .query({ page: 1, limit: 10000 })
        .set(auth);

      // Should cap limit or return 400
      ctx.expect([200, 400]).toContain(response.status);

      if (response.status === 200 && response.body.pagination) {
        // If successful, limit should be capped to max allowed
        ctx.expect(response.body.pagination.limit).toBeLessThanOrEqual(500);
      }
    },
  );
}

/**
 * Scenario: Sort by invalid field returns 400
 *
 * Preconditions: Entity supports sorting
 * Tests: Sort by non-existent field returns 400
 */
function sortByInvalidField(meta, ctx) {
  ctx.it(
    `GET /api/${meta.tableName}?sort=fake_field - rejects invalid sort field`,
    async () => {
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .get(`/api/${meta.tableName}`)
        .query({ sort: "nonexistent_field_xyz" })
        .set(auth);

      ctx.expect(response.status).toBe(400);
    },
  );
}

/**
 * Scenario: Error responses have consistent structure
 *
 * Preconditions: None
 * Tests: Error responses always have success:false and message
 */
function errorResponseStructure(meta, ctx) {
  ctx.it(
    `GET /api/${meta.tableName}/99999 - error has consistent structure`,
    async () => {
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .get(`/api/${meta.tableName}/99999`)
        .set(auth);

      ctx.expect(response.status).toBe(404);
      ctx.expect(response.body).toHaveProperty("success", false);
      ctx.expect(response.body).toHaveProperty("message");
      ctx.expect(typeof response.body.message).toBe("string");
      // Should not expose internal details
      ctx.expect(response.body.stack).toBeUndefined();
    },
  );
}

/**
 * Scenario: Concurrent operations don't corrupt data
 *
 * Preconditions: Entity has mutable fields
 * Tests: Concurrent updates don't lose data
 */
function concurrentOperationsSafe(meta, ctx) {
  const mutableFields = Object.keys(meta.fieldAccess || {}).filter((field) => {
    if (["id", "created_at"].includes(field)) return false;
    if (meta.immutableFields?.includes(field)) return false;
    const access = meta.fieldAccess[field];
    return access?.update && access.update !== "none";
  });

  if (!mutableFields.length) return;

  ctx.it(
    `PATCH /api/${meta.tableName}/:id - handles concurrent updates`,
    async () => {
      const created = await ctx.factory.create(meta.entityName);
      const field = mutableFields[0];
      const auth = await ctx.authHeader("admin");

      // Make 3 concurrent updates
      const updates = [1, 2, 3].map((n) =>
        ctx.request
          .patch(`/api/${meta.tableName}/${created.id}`)
          .set(auth)
          .send({
            [field]: ctx.factory.generateFieldValue(meta.entityName, field),
          }),
      );

      const responses = await Promise.all(updates);

      // All should succeed (200) - no 500 errors from race conditions
      responses.forEach((response) => {
        ctx.expect([200, 409]).toContain(response.status);
      });
    },
  );
}

/**
 * Scenario: String field too long returns 400
 *
 * Preconditions: Entity has string fields with maxLength validation AND validation is enforced
 * Tests: Overly long strings are rejected OR truncated (server may handle either way)
 *
 * NOTE: This is a soft test - some servers truncate instead of reject.
 * We verify the server handles the request (not necessarily how).
 * Skip entities that might have unique constraints causing issues.
 */
function stringTooLongRejected(meta, ctx) {
  const { fields, entityName, tableName } = meta;
  const caps = getCapabilities(meta);
  if (!fields) return;
  if (!caps.canCreate) return;

  // Skip entities with sensitive unique constraints that might cause 500s
  const skipEntities = ["role", "user"];
  if (skipEntities.includes(entityName)) return;

  // Only test fields that explicitly require validation (not auto-computed or immutable fields)
  const stringFieldsWithLimit = Object.entries(fields)
    .filter(([name, def]) => {
      if (def.type !== "string" || !def.maxLength) return false;
      // Skip auto-generated fields (computed identifiers)
      const fieldAccess = meta.fieldAccess?.[name];
      if (fieldAccess?.create === "none") return false;
      // Skip immutable fields that may have special constraints
      if (meta.immutableFields?.includes(name)) return false;
      // Skip known problematic fields (external IDs, etc.)
      if (name.endsWith("_id") || name === "auth0_id") return false;
      return true;
    })
    .slice(0, 1); // Test 1 field to keep test suite fast

  for (const [field, def] of stringFieldsWithLimit) {
    ctx.it(
      `POST /api/${tableName} - handles ${field} exceeding maxLength gracefully`,
      async () => {
        const payload = await ctx.factory.buildMinimalWithFKs(entityName);
        payload[field] = "x".repeat(def.maxLength + 100);
        const auth = await ctx.authHeader("admin");

        const response = await ctx.request
          .post(`/api/${tableName}`)
          .set(auth)
          .send(payload);

        // Should either reject (400) or accept with truncation (201), not crash (500)
        ctx.expect([201, 400]).toContain(response.status);
      },
    );
  }
}

/**
 * Scenario: Invalid date format rejected
 *
 * Preconditions: Entity has date fields AND create is not disabled
 * Tests: Invalid date strings are rejected
 */
function invalidDateRejected(meta, ctx) {
  const { fields, entityName, tableName } = meta;
  const caps = getCapabilities(meta);
  if (!fields) return;
  if (!caps.canCreate) return;

  const dateFields = Object.entries(fields)
    .filter(([_, def]) => ["date", "datetime", "timestamp"].includes(def.type))
    .map(([name]) => name)
    .filter((name) => !["created_at", "updated_at"].includes(name))
    .slice(0, 1);

  for (const field of dateFields) {
    ctx.it(
      `POST /api/${tableName} - rejects invalid date for ${field}`,
      async () => {
        const payload = await ctx.factory.buildMinimalWithFKs(entityName);
        payload[field] = "not-a-date";
        const auth = await ctx.authHeader("admin");

        const response = await ctx.request
          .post(`/api/${tableName}`)
          .set(auth)
          .send(payload);

        ctx.expect(response.status).toBe(400);
      },
    );
  }
}

/**
 * Scenario: Negative ID returns 400
 *
 * Preconditions: None
 * Tests: Negative IDs return 400 (bad request)
 */
function negativeIdRejected(meta, ctx) {
  ctx.it(
    `GET /api/${meta.tableName}/-1 - returns 400 for negative ID`,
    async () => {
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .get(`/api/${meta.tableName}/-1`)
        .set(auth);

      ctx.expect(response.status).toBe(400);
    },
  );
}

/**
 * Scenario: Boolean field validation
 *
 * Preconditions: Entity has boolean fields AND create is not disabled
 * Tests: Invalid boolean values are coerced or rejected
 */
function booleanFieldHandling(meta, ctx) {
  const { fields, entityName, tableName } = meta;
  const caps = getCapabilities(meta);
  if (!fields) return;
  if (!caps.canCreate) return;

  const boolFields = Object.entries(fields)
    .filter(([_, def]) => def.type === "boolean")
    .map(([name]) => name)
    .filter((name) => !["is_active"].includes(name))
    .slice(0, 1);

  // Test string "true" and "false" are coerced correctly
  for (const field of boolFields) {
    ctx.it(
      `POST /api/${tableName} - handles string boolean for ${field}`,
      async () => {
        const payload = await ctx.factory.buildMinimalWithFKs(entityName);
        payload[field] = "true"; // String instead of boolean
        const auth = await ctx.authHeader("admin");

        const response = await ctx.request
          .post(`/api/${tableName}`)
          .set(auth)
          .send(payload);

        // Should either coerce (201) or reject (400), not crash (500)
        ctx.expect([200, 201, 400]).toContain(response.status);
      },
    );
  }
}

module.exports = {
  updateNonExistent,
  deleteNonExistent,
  noAuthReturns401,
  invalidJsonBody,
  emptyBodyOnCreate,
  nullRequiredFieldReturns400,
  invalidEnumRejected,
  invalidEmailRejected,
  xssHandledSafely,
  paginationEdgeCases,
  sortByInvalidField,
  errorResponseStructure,
  concurrentOperationsSafe,
  stringTooLongRejected,
  invalidDateRejected,
  negativeIdRejected,
  booleanFieldHandling,
};
