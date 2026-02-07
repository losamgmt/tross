/**
 * Lifecycle Test Scenarios
 *
 * Pure functions testing entity lifecycle: timestamps, status, soft-delete.
 * Driven by Entity Contract v2.0 universal fields.
 *
 * NOTE: Not all entities have all lifecycle fields. For example:
 * - preferences: No is_active (1:1 user settings table, lifecycle bound to user)
 * - Some entities may not expose created_at in their response
 */

const { getCapabilities } = require("./scenario-helpers");

/**
 * Check if entity has a specific field that is visible to admin (read access)
 * @param {Object} meta - Entity metadata
 * @param {string} fieldName - Field to check
 * @returns {boolean} Whether entity has this field readable by admin
 */
function hasVisibleField(meta, fieldName) {
  if (!meta.fieldAccess) return false;
  const access = meta.fieldAccess[fieldName];
  if (!access) return false;
  // Field must be readable by at least admin (not 'none')
  return access.read !== "none";
}

/**
 * Scenario: created_at set on create
 *
 * Preconditions:
 * - API create is not disabled
 * - Entity has created_at field
 * Tests: created_at is auto-populated on create
 */
function createdAtSetOnCreate(meta, ctx) {
  const caps = getCapabilities(meta);
  if (!caps.canCreate) return; // Create disabled = scenario N/A
  if (!hasVisibleField(meta, "created_at")) return; // Entity doesn't have visible created_at

  ctx.it(
    `POST /api/${meta.tableName} - sets created_at automatically`,
    async () => {
      const beforeCreate = new Date();
      const auth = await ctx.authHeader("admin");

      // Use buildMinimalWithFKs to resolve any FK dependencies
      const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName);
      const response = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send(payload);

      ctx.expect(response.status).toBe(201);
      const data = response.body.data || response.body;

      const createdAt = new Date(data.created_at);
      ctx
        .expect(createdAt.getTime())
        .toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
    },
  );
}

/**
 * Scenario: is_active defaults to true
 *
 * Preconditions:
 * - API create is not disabled
 * - Entity has is_active field
 * Tests: New entities have is_active=true by default
 */
function isActiveDefaultsToTrue(meta, ctx) {
  const caps = getCapabilities(meta);
  if (!caps.canCreate) return; // Create disabled = scenario N/A
  if (!hasVisibleField(meta, "is_active")) return; // Entity doesn't have visible is_active

  ctx.it(
    `POST /api/${meta.tableName} - defaults is_active to true`,
    async () => {
      // Use buildMinimalWithFKs to resolve any FK dependencies
      const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName);
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send(payload);

      ctx.expect(response.status).toBe(201);
      const data = response.body.data || response.body;
      ctx.expect(data.is_active).toBe(true);
    },
  );
}

/**
 * Scenario: GET list excludes inactive records by default
 *
 * Preconditions:
 * - API create is not disabled
 * - Entity has is_active field
 * Tests: Records with is_active=false are NOT returned in list without explicit flag
 *
 * This tests the server-side filter in GenericEntityService.findAll():
 *   if (!includeInactive) { filterOptions.is_active = true; }
 */
function getListExcludesInactiveRecords(meta, ctx) {
  const caps = getCapabilities(meta);
  if (!caps.canCreate) return; // Create disabled = scenario N/A
  if (!hasVisibleField(meta, "is_active")) return; // Entity doesn't have visible is_active

  ctx.it(
    `GET /api/${meta.tableName} - excludes inactive records by default`,
    async () => {
      const auth = await ctx.authHeader("admin");

      // Create an active record
      const activePayload = await ctx.factory.buildMinimalWithFKs(
        meta.entityName,
      );
      const activeResponse = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send(activePayload);
      ctx.expect(activeResponse.status).toBe(201);
      const activeRecord = activeResponse.body.data || activeResponse.body;

      // Create another record and then deactivate it
      const inactivePayload = await ctx.factory.buildMinimalWithFKs(
        meta.entityName,
      );
      const inactiveResponse = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send(inactivePayload);
      ctx.expect(inactiveResponse.status).toBe(201);
      const inactiveRecord =
        inactiveResponse.body.data || inactiveResponse.body;

      // Deactivate the second record via PATCH
      const deactivateResponse = await ctx.request
        .patch(`/api/${meta.tableName}/${inactiveRecord.id}`)
        .set(auth)
        .send({ is_active: false });
      ctx.expect(deactivateResponse.status).toBe(200);

      // GET list without includeInactive flag
      const listResponse = await ctx.request
        .get(`/api/${meta.tableName}`)
        .set(auth)
        .query({ limit: 100 });

      ctx.expect(listResponse.status).toBe(200);
      const items = listResponse.body.data || listResponse.body;

      // Active record SHOULD be in results
      const foundActive = items.find((item) => item.id === activeRecord.id);
      ctx.expect(foundActive).toBeDefined();

      // Inactive record should NOT be in results
      const foundInactive = items.find((item) => item.id === inactiveRecord.id);
      ctx.expect(foundInactive).toBeUndefined();
    },
  );
}

module.exports = {
  createdAtSetOnCreate,
  isActiveDefaultsToTrue,
  getListExcludesInactiveRecords,
};
