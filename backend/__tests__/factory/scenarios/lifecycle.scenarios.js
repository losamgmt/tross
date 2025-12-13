/**
 * Lifecycle Test Scenarios
 *
 * Pure functions testing entity lifecycle: timestamps, status, soft-delete.
 * Driven by Entity Contract v2.0 universal fields.
 */

/**
 * Scenario: created_at set on create
 *
 * Preconditions: None (all entities have created_at)
 * Tests: created_at is auto-populated on create
 */
function createdAtSetOnCreate(meta, ctx) {
  ctx.it(`POST /api/${meta.tableName} - sets created_at automatically`, async () => {
    const beforeCreate = new Date();
    const auth = await ctx.authHeader('admin');

    // Use buildMinimalWithFKs to resolve any FK dependencies
    const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName);
    const response = await ctx.request
      .post(`/api/${meta.tableName}`)
      .set(auth)
      .send(payload);

    ctx.expect(response.status).toBe(201);
    const data = response.body.data || response.body;

    const createdAt = new Date(data.created_at);
    ctx.expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
  });
}

/**
 * Scenario: is_active defaults to true
 *
 * Preconditions: None (Entity Contract v2.0)
 * Tests: New entities have is_active=true by default
 */
function isActiveDefaultsToTrue(meta, ctx) {
  ctx.it(`POST /api/${meta.tableName} - defaults is_active to true`, async () => {
    // Use buildMinimalWithFKs to resolve any FK dependencies
    const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName);
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .post(`/api/${meta.tableName}`)
      .set(auth)
      .send(payload);

    ctx.expect(response.status).toBe(201);
    const data = response.body.data || response.body;
    ctx.expect(data.is_active).toBe(true);
  });
}

module.exports = {
  createdAtSetOnCreate,
  isActiveDefaultsToTrue,
};
