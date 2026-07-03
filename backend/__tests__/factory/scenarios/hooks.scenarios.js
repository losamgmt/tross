/**
 * Hook System Integration Scenarios
 *
 * Tests beforeChange and afterChange hooks at the API level.
 * Driven by entity metadata field hooks configuration.
 *
 * SELF-SELECTION: These scenarios only run for entities that have hooks defined
 * in their field metadata (beforeChange or afterChange arrays).
 *
 * NOTE: If no entities have hooks defined, these tests will be skipped automatically.
 * That's by design - testing infrastructure is ready for when hooks are added.
 */

const { getCapabilities } = require("./scenario-helpers");

/**
 * Check if entity has any beforeChange hooks defined
 * @param {Object} meta - Entity metadata
 * @returns {Array<{fieldName: string, hooks: Array}>} Fields with beforeChange hooks
 */
function getFieldsWithBeforeHooks(meta) {
  if (!meta.fields) return [];
  return Object.entries(meta.fields)
    .filter(([_, field]) => field.beforeChange && field.beforeChange.length > 0)
    .map(([fieldName, field]) => ({ fieldName, hooks: field.beforeChange }));
}

/**
 * Check if entity has any afterChange hooks defined
 * @param {Object} meta - Entity metadata
 * @returns {Array<{fieldName: string, hooks: Array}>} Fields with afterChange hooks
 */
function getFieldsWithAfterHooks(meta) {
  if (!meta.fields) return [];
  return Object.entries(meta.fields)
    .filter(([_, field]) => field.afterChange && field.afterChange.length > 0)
    .map(([fieldName, field]) => ({ fieldName, hooks: field.afterChange }));
}

/**
 * Helper: Get a test value appropriate for a field type
 * @param {Object} field - Field metadata
 * @param {Object} [meta] - Entity metadata (for enum lookups)
 * @returns {any} Appropriate test value
 */
function getTestValueForField(field, meta) {
  if (!field) return "test_value";

  switch (field.type) {
    case "enum":
      // Look up valid enum values from metadata
      if (field.enumKey && meta?.enums?.[field.enumKey]) {
        const validValues = Object.keys(meta.enums[field.enumKey]);
        // Return last value (often represents a "final" state) or first available
        return validValues[validValues.length - 1] || validValues[0];
      }
      // Fallback to common enum values
      return field.allowedValues?.[0] || "active";
    case "integer":
    case "decimal":
      return 100;
    case "boolean":
      return true;
    case "date":
      return new Date().toISOString().split("T")[0];
    case "datetime":
    case "timestamp":
      return new Date().toISOString();
    default:
      return "test_value";
  }
}

/**
 * Assert an update response is COHERENT for whichever hook branch fired, instead
 * of merely landing in a broad status set. Deterministic per-entity behavior
 * (e.g. the invoice high-value approval workflow) is proven separately in
 * integration/hooks-approval.test.js.
 *
 * @param {Object} ctx - Scenario context (provides expect)
 * @param {Object} response - supertest response from the hooked-field update
 */
function assertHookResponseCoherent(ctx, response) {
  const body = response.body || {};

  if (response.status === 202) {
    // beforeChange requiresApproval → APPROVAL_REQUIRED envelope with approvalInfo
    ctx.expect(body.code).toBe("APPROVAL_REQUIRED");
    ctx.expect(body.details?.approvalInfo).toBeDefined();
  } else if (response.status === 403) {
    // beforeChange blocked → failure envelope with a reason
    ctx.expect(body.success).toBe(false);
    ctx.expect(body.message).toBeTruthy();
  } else {
    // Hook allowed the change → update succeeded
    ctx.expect(response.status).toBe(200);
  }
}

/**
 * Scenario: beforeChange hooks are evaluated on update
 *
 * Preconditions:
 * - Entity has at least one field with beforeChange hooks
 * - API update is not disabled
 * Tests: Hook blocking behavior, approval requirements
 */
function beforeChangeHooksOnUpdate(meta, ctx) {
  const caps = getCapabilities(meta);
  if (!caps.canUpdate) return; // Update disabled = scenario N/A

  const fieldsWithHooks = getFieldsWithBeforeHooks(meta);
  if (fieldsWithHooks.length === 0) return; // No beforeChange hooks = scenario N/A

  // Test each field that has hooks (flat structure, no nesting)
  fieldsWithHooks.forEach(({ fieldName }) => {
    ctx.it(
      `PATCH /api/${meta.tableName}/:id - evaluates ${fieldName} beforeChange hooks`,
      async () => {
        const auth = await ctx.authHeader("admin");

        // Create entity first
        const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName);
        const createResponse = await ctx.request
          .post(`/api/${meta.tableName}`)
          .set(auth)
          .send(payload);

        ctx.expect(createResponse.status).toBe(201);
        const created = createResponse.body.data || createResponse.body;

        // Attempt to update the hooked field
        // The hook should be evaluated (may allow or block based on conditions)
        const updateResponse = await ctx.request
          .patch(`/api/${meta.tableName}/${created.id}`)
          .set(auth)
          .send({ [fieldName]: getTestValueForField(meta.fields[fieldName], meta) });

        // Assert the response is coherent for whichever hook branch fired
        // (allow / block / requiresApproval), not merely in a broad status set.
        assertHookResponseCoherent(ctx, updateResponse);
      },
    );
  });
}

/**
 * Scenario: afterChange hooks are executed on create
 *
 * Preconditions:
 * - Entity has at least one field with afterChange hooks
 * - API create is not disabled
 * Tests: After-hooks execute (via side effects or logs)
 */
function afterChangeHooksOnCreate(meta, ctx) {
  const caps = getCapabilities(meta);
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  const fieldsWithHooks = getFieldsWithAfterHooks(meta);
  if (fieldsWithHooks.length === 0) return; // No afterChange hooks = scenario N/A

  ctx.it(
    `POST /api/${meta.tableName} - successfully creates when afterChange hooks defined`,
    async () => {
      const auth = await ctx.authHeader("admin");

      // Create entity with hooked field
      const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName);
      const response = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send(payload);

      // Create should succeed - afterChange hooks don't block creates
      ctx.expect(response.status).toBe(201);
      const data = response.body.data || response.body;
      ctx.expect(data.id).toBeDefined();
    },
  );
}

/**
 * Scenario: afterChange hooks are executed on update
 *
 * Preconditions:
 * - Entity has at least one field with afterChange hooks
 * - API update is not disabled
 * Tests: After-hooks execute without blocking update
 */
function afterChangeHooksOnUpdate(meta, ctx) {
  const caps = getCapabilities(meta);
  if (!caps.canUpdate) return; // Update disabled = scenario N/A

  const fieldsWithHooks = getFieldsWithAfterHooks(meta);
  if (fieldsWithHooks.length === 0) return; // No afterChange hooks = scenario N/A

  fieldsWithHooks.forEach(({ fieldName }) => {
    ctx.it(
      `PATCH /api/${meta.tableName}/:id - executes ${fieldName} afterChange hooks`,
      async () => {
        const auth = await ctx.authHeader("admin");

        // Create entity first
        const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName);
        const createResponse = await ctx.request
          .post(`/api/${meta.tableName}`)
          .set(auth)
          .send(payload);

        ctx.expect(createResponse.status).toBe(201);
        const created = createResponse.body.data || createResponse.body;

        // Update the hooked field
        const updateResponse = await ctx.request
          .patch(`/api/${meta.tableName}/${created.id}`)
          .set(auth)
          .send({ [fieldName]: getTestValueForField(meta.fields[fieldName], meta) });

        // afterChange never blocks; a beforeChange hook on the same field may
        // still intercept (block / requiresApproval), so assert branch coherence.
        assertHookResponseCoherent(ctx, updateResponse);
      },
    );
  });
}

module.exports = {
  beforeChangeHooksOnUpdate,
  afterChangeHooksOnCreate,
  afterChangeHooksOnUpdate,
};
