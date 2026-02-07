/**
 * Validation Test Scenarios
 *
 * Pure functions testing input validation and constraint enforcement.
 * Driven by metadata.fields and database constraints.
 */

const { getCapabilities } = require("./scenario-helpers");

/**
 * Scenario: Unique constraint violation
 *
 * Preconditions: Entity has identityField AND identityFieldUnique flag is true AND create is not disabled
 * Tests: Duplicate identity field value rejected with 409
 *
 * Note: Not all identity fields have unique constraints.
 * For example, work order titles can be duplicated.
 * Set identityFieldUnique: true in metadata to enable this test.
 *
 * Note: COMPUTED entities (work_order, invoice, contract) have auto-generated
 * identity fields that users cannot set (create: 'none'), so they are excluded
 * from this test. The server guarantees uniqueness via auto-generation.
 */
function uniqueConstraintViolation(meta, ctx) {
  const { identityField, identityFieldUnique, fieldAccess } = meta;

  // Skip if no identity field or it's not marked as unique
  if (!identityField) return;
  if (!identityFieldUnique) return;
  const caps = getCapabilities(meta);
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  // Skip if identity field is auto-generated (create: 'none')
  // COMPUTED entities have auto-generated identifiers that users cannot set
  const identityFieldAccess = fieldAccess?.[identityField];
  if (identityFieldAccess?.create === "none") {
    return; // Skip - server auto-generates unique values
  }

  ctx.it(
    `POST /api/${meta.tableName} - rejects duplicate ${identityField}`,
    async () => {
      // Create first entity
      const first = await ctx.factory.create(meta.entityName);
      const auth = await ctx.authHeader("admin");

      // Attempt to create second with same identity field
      // Use buildMinimalWithFKs to resolve FK dependencies
      const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName, {
        [identityField]: first[identityField],
      });

      const response = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send(payload);

      ctx.expect(response.status).toBe(409);
    },
  );
}

/**
 * Scenario: Foreign key constraint violation
 *
 * Preconditions: Entity has foreignKeys defined AND create is not disabled
 * Tests: Invalid FK values rejected with appropriate error
 */
function foreignKeyViolation(meta, ctx) {
  const { foreignKeys } = meta;
  const caps = getCapabilities(meta);
  if (!foreignKeys) return;
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  for (const [fkField, fkDef] of Object.entries(foreignKeys)) {
    ctx.it(
      `POST /api/${meta.tableName} - rejects invalid ${fkField} reference`,
      async () => {
        const payload = ctx.factory.buildMinimal(meta.entityName);
        payload[fkField] = 99999; // Non-existent FK
        const auth = await ctx.authHeader("admin");

        const response = await ctx.request
          .post(`/api/${meta.tableName}`)
          .set(auth)
          .send(payload);

        // Could be 400 (validation) or 422 (FK constraint)
        ctx.expect([400, 422]).toContain(response.status);
      },
    );
  }
}

/**
 * Scenario: SQL injection prevention
 *
 * Preconditions: Entity has searchableFields
 * Tests: SQL injection attempts are safely handled
 */
function sqlInjectionPrevention(meta, ctx) {
  const { searchableFields } = meta;
  if (!searchableFields?.length) return;

  ctx.it(
    `GET /api/${meta.tableName}?search=<injection> - handles SQL injection safely`,
    async () => {
      const auth = await ctx.authHeader("admin");
      const injection = "'; DROP TABLE users; --";

      const response = await ctx.request
        .get(`/api/${meta.tableName}`)
        .query({ search: injection })
        .set(auth);

      // Should either succeed safely (empty results) or return 400
      ctx.expect([200, 400]).toContain(response.status);

      // Should NOT expose database errors
      if (response.body.error) {
        ctx.expect(response.body.error).not.toMatch(/sql|syntax|query/i);
      }
    },
  );
}

/**
 * Scenario: Invalid ID format rejected
 *
 * Preconditions: None (all entities have :id routes)
 * Tests: Completely non-numeric IDs return 400
 *
 * Note: Our API uses parseInt which accepts "1abc" as 1 (JavaScript behavior).
 * We only test IDs that truly cannot be parsed.
 */
function invalidIdFormat(meta, ctx) {
  // Only IDs that parseInt cannot parse at all
  // Note: Empty string in URL path may route differently, so we exclude it
  const invalidIds = ["abc", "undefined", "null"];

  for (const invalidId of invalidIds) {
    ctx.it(
      `GET /api/${meta.tableName}/${invalidId} - returns 400 for invalid ID`,
      async () => {
        const auth = await ctx.authHeader("admin");

        const response = await ctx.request
          .get(`/api/${meta.tableName}/${invalidId}`)
          .set(auth);

        ctx.expect(response.status).toBe(400);
      },
    );
  }
}

/**
 * Scenario: Invalid ID range rejected
 *
 * Preconditions: None (all entities have :id routes)
 * Tests: Negative/zero/overflow IDs return 400
 */
function invalidIdRange(meta, ctx) {
  const invalidIds = ["-1", "0", "99999999999999999999"];

  for (const invalidId of invalidIds) {
    ctx.it(
      `GET /api/${meta.tableName}/${invalidId} - returns 400 for out-of-range ID`,
      async () => {
        const auth = await ctx.authHeader("admin");

        const response = await ctx.request
          .get(`/api/${meta.tableName}/${invalidId}`)
          .set(auth);

        ctx.expect(response.status).toBe(400);
      },
    );
  }
}

/**
 * Scenario: Empty strings rejected for required fields
 *
 * Preconditions: Entity has requiredFields AND create is not disabled
 * Tests: Empty string for required field returns 400
 */
function emptyStringRejected(meta, ctx) {
  const { requiredFields, entityName, tableName } = meta;
  const caps = getCapabilities(meta);
  if (!requiredFields?.length) return;
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  // Only test string-type required fields
  const stringFields = requiredFields.filter((field) => {
    const fieldMeta = meta.fields?.[field];
    return (
      !fieldMeta || fieldMeta.type === "string" || fieldMeta.type === undefined
    );
  });

  for (const field of stringFields) {
    ctx.it(
      `POST /api/${tableName} - rejects empty string for ${field}`,
      async () => {
        const payload = await ctx.factory.buildMinimalWithFKs(entityName);
        payload[field] = "";
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
 * Scenario: Unknown fields stripped from request
 *
 * Preconditions: API create is not disabled
 * Tests: Unknown fields don't appear in response or cause errors
 */
function unknownFieldsStripped(meta, ctx) {
  const { entityName, tableName } = meta;
  const caps = getCapabilities(meta);
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  ctx.it(`POST /api/${tableName} - unknown fields stripped`, async () => {
    const payload = await ctx.factory.buildMinimalWithFKs(entityName);
    payload.__unknown_field__ = "should be ignored";
    payload.hackerField = "also ignored";
    const auth = await ctx.authHeader("admin");

    const response = await ctx.request
      .post(`/api/${tableName}`)
      .set(auth)
      .send(payload);

    ctx.expect(response.status).toBe(201);
    const data = response.body.data || response.body;
    ctx.expect(data.__unknown_field__).toBeUndefined();
    ctx.expect(data.hackerField).toBeUndefined();
  });
}

module.exports = {
  uniqueConstraintViolation,
  foreignKeyViolation,
  sqlInjectionPrevention,
  invalidIdFormat,
  invalidIdRange,
  emptyStringRejected,
  unknownFieldsStripped,
};
