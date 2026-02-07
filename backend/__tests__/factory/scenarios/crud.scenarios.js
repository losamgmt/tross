/**
 * CRUD Test Scenarios
 *
 * Pure functions that test CRUD operations for any entity.
 * Each scenario receives metadata + test context, and either:
 *   - Runs the test (if preconditions met)
 *   - Returns early (if preconditions not met)
 *
 * PRINCIPLE: No if/else per entity. Metadata drives behavior.
 *
 * CAPABILITIES: Uses getCapabilities() from scenario-helpers as the
 * SINGLE SOURCE OF TRUTH for what operations an entity supports.
 */

const { getCapabilities } = require("./scenario-helpers");

/**
 * Scenario: Create with required fields only
 *
 * Preconditions: Entity has requiredFields defined AND create is enabled
 * Tests: Minimal valid payload succeeds
 */
function createWithRequiredFields(meta, ctx) {
  const { entityName, requiredFields } = meta;
  const caps = getCapabilities(meta);

  if (!requiredFields?.length) return; // No required fields = scenario N/A
  if (!caps.canCreate) return; // Create not available = scenario N/A

  ctx.it(
    `POST /api/${meta.tableName} - creates with required fields only`,
    async () => {
      // Use buildMinimalWithFKs to resolve any FK dependencies
      const payload = await ctx.factory.buildMinimalWithFKs(entityName);
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send(payload);

      ctx.expect(response.status).toBe(201);
      const data = response.body.data || response.body;
      ctx.expect(data.id).toBeDefined();

      // Verify all required fields present in response
      for (const field of requiredFields) {
        // Skip fields that are filtered from output (e.g., auth0_id)
        if (!meta.sensitiveFields?.includes(field)) {
          ctx.expect(data[field]).toBeDefined();
        }
      }
    },
  );
}

/**
 * Scenario: Create fails when required field missing
 *
 * Preconditions: Entity has requiredFields defined AND create is enabled
 * Tests: Each required field, when omitted, causes 400
 */
function createFailsWithMissingRequired(meta, ctx) {
  const { entityName, requiredFields } = meta;
  const caps = getCapabilities(meta);

  if (!requiredFields?.length) return;
  if (!caps.canCreate) return; // Create not available = scenario N/A

  for (const field of requiredFields) {
    ctx.it(`POST /api/${meta.tableName} - fails without ${field}`, async () => {
      const payload = ctx.factory.buildMinimal(entityName);
      delete payload[field];
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send(payload);

      ctx.expect(response.status).toBe(400);
    });
  }
}

/**
 * Scenario: Read by ID returns entity
 *
 * Preconditions: None (all entities have primary key)
 * Tests: GET /:id returns created entity
 */
function readById(meta, ctx) {
  ctx.it(`GET /api/${meta.tableName}/:id - returns entity`, async () => {
    const created = await ctx.factory.create(meta.entityName);
    const auth = await ctx.authHeader("admin");

    const response = await ctx.request
      .get(`/api/${meta.tableName}/${created.id}`)
      .set(auth);

    // Debug: log actual response for failures
    if (response.status !== 200) {
      console.log(`[DEBUG] ${meta.entityName} GET /:id failed:`, {
        status: response.status,
        body: response.body,
        createdId: created.id,
        createdUserId: created.user_id,
      });
    }

    ctx.expect(response.status).toBe(200);
    const data = response.body.data || response.body;
    ctx.expect(data.id).toBe(created.id);
  });
}

/**
 * Scenario: Read by ID returns 404 for non-existent
 *
 * Preconditions: None
 * Tests: GET /:id returns 404 for missing entity
 */
function readByIdNotFound(meta, ctx) {
  ctx.it(
    `GET /api/${meta.tableName}/:id - returns 404 for non-existent`,
    async () => {
      const nonExistentId = 99999;
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .get(`/api/${meta.tableName}/${nonExistentId}`)
        .set(auth);

      ctx.expect(response.status).toBe(404);
    },
  );
}

/**
 * Scenario: List entities returns array
 *
 * Preconditions: None
 * Tests: GET / returns array including created entity
 */
function listEntities(meta, ctx) {
  ctx.it(`GET /api/${meta.tableName} - returns array with entity`, async () => {
    const created = await ctx.factory.create(meta.entityName);
    const auth = await ctx.authHeader("admin");

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ page: 1, limit: 50 })
      .set(auth);

    ctx.expect(response.status).toBe(200);
    const items = response.body.data || response.body;
    ctx.expect(Array.isArray(items)).toBe(true);

    // Find our created entity in the list
    const found = items.find((item) => item.id === created.id);
    ctx.expect(found).toBeDefined();
  });
}

/**
 * Scenario: Update modifies mutable fields
 *
 * Preconditions: Entity has at least one mutable field
 * Tests: PATCH /:id updates allowed fields
 */
function updateMutableFields(meta, ctx) {
  // Find a field that's: (1) in fieldAccess, (2) not immutable, (3) not id/created_at
  const mutableFields = Object.keys(meta.fieldAccess || {}).filter((field) => {
    if (["id", "created_at"].includes(field)) return false;
    if (meta.immutableFields?.includes(field)) return false;
    const access = meta.fieldAccess[field];
    return access?.update && access.update !== "none";
  });

  if (!mutableFields.length) return; // No mutable fields = scenario N/A

  const fieldToUpdate = mutableFields[0];

  ctx.it(
    `PATCH /api/${meta.tableName}/:id - updates ${fieldToUpdate}`,
    async () => {
      const created = await ctx.factory.create(meta.entityName);
      const newValue = ctx.factory.generateFieldValue(
        meta.entityName,
        fieldToUpdate,
      );
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .patch(`/api/${meta.tableName}/${created.id}`)
        .set(auth)
        .send({ [fieldToUpdate]: newValue });

      ctx.expect(response.status).toBe(200);
      const data = response.body.data || response.body;
      ctx.expect(data[fieldToUpdate]).toEqual(newValue);
    },
  );
}

/**
 * Scenario: Update fails on immutable fields
 *
 * Preconditions: Entity has immutableFields defined
 * Tests: PATCH /:id with immutable field returns 400
 */
function updateFailsOnImmutableFields(meta, ctx) {
  const { immutableFields } = meta;
  if (!immutableFields?.length) return;

  for (const field of immutableFields) {
    // Skip fields not in fieldAccess (internal fields)
    if (!meta.fieldAccess?.[field]) continue;

    ctx.it(
      `PATCH /api/${meta.tableName}/:id - rejects update to ${field}`,
      async () => {
        const created = await ctx.factory.create(meta.entityName);
        const newValue = ctx.factory.generateFieldValue(meta.entityName, field);
        const auth = await ctx.authHeader("admin");

        const response = await ctx.request
          .patch(`/api/${meta.tableName}/${created.id}`)
          .set(auth)
          .send({ [field]: newValue });

        // Could be 400 (validation) or 200 with field unchanged (silently ignored)
        // Either behavior is acceptable - the field should NOT change
        if (response.status === 200) {
          const data = response.body.data || response.body;
          ctx.expect(data[field]).toEqual(created[field]);
        } else {
          ctx.expect(response.status).toBe(400);
        }
      },
    );
  }
}

/**
 * Scenario: Delete removes entity
 *
 * Preconditions: None
 * Tests: DELETE /:id removes entity, subsequent GET returns 404
 */
function deleteEntity(meta, ctx) {
  ctx.it(`DELETE /api/${meta.tableName}/:id - removes entity`, async () => {
    const created = await ctx.factory.create(meta.entityName);
    const auth = await ctx.authHeader("admin");

    const deleteResponse = await ctx.request
      .delete(`/api/${meta.tableName}/${created.id}`)
      .set(auth);

    ctx.expect(deleteResponse.status).toBe(200);

    // Verify GET now returns 404
    const getResponse = await ctx.request
      .get(`/api/${meta.tableName}/${created.id}`)
      .set(auth);

    ctx.expect(getResponse.status).toBe(404);
  });
}

/**
 * Scenario: Delete with dependents (cascade)
 *
 * Preconditions: Entity has dependents defined in metadata
 * Tests: DELETE /:id cascades to dependents
 */
function deleteWithDependents(meta, ctx) {
  const { dependents } = meta;
  if (!dependents?.length) return;

  ctx.it(
    `DELETE /api/${meta.tableName}/:id - cascades to dependents`,
    async () => {
      const { entity, dependentRecords } =
        await ctx.factory.createWithDependents(meta.entityName);
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .delete(`/api/${meta.tableName}/${entity.id}`)
        .set(auth);

      ctx.expect(response.status).toBe(200);

      // Verify dependents were cleaned up
      for (const dep of dependentRecords) {
        const depExists = await ctx.db.query(
          `SELECT 1 FROM ${dep.table} WHERE id = $1`,
          [dep.id],
        );
        ctx.expect(depExists.rows.length).toBe(0);
      }
    },
  );
}

module.exports = {
  createWithRequiredFields,
  createFailsWithMissingRequired,
  readById,
  readByIdNotFound,
  listEntities,
  updateMutableFields,
  updateFailsOnImmutableFields,
  deleteEntity,
  deleteWithDependents,
};
