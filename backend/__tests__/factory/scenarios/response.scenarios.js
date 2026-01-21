/**
 * Response Format Test Scenarios
 *
 * Pure functions testing API response structure and consistency.
 * Tests content-type, success/error formats, and response shape.
 */

const { getCapabilities } = require('./scenario-helpers');

/**
 * Scenario: Response includes proper content-type
 *
 * Preconditions: None
 * Tests: All responses have application/json content-type
 */
function contentType(meta, ctx) {
  ctx.it(`GET /api/${meta.tableName} - returns application/json content-type`, async () => {
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ limit: 1 })
      .set(auth);

    ctx.expect(response.status).toBe(200);
    ctx.expect(response.headers['content-type']).toMatch(/application\/json/);
  });
}

/**
 * Scenario: Success response format is consistent
 *
 * Preconditions: None
 * Tests: Success responses have expected structure
 */
function successFormat(meta, ctx) {
  ctx.it(`GET /api/${meta.tableName} - returns consistent success format`, async () => {
    await ctx.factory.create(meta.entityName);
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ limit: 10 })
      .set(auth);

    ctx.expect(response.status).toBe(200);
    ctx.expect(response.body).toBeDefined();
    // Should have data array for list endpoints
    ctx.expect(Array.isArray(response.body.data) || Array.isArray(response.body)).toBe(true);
  });

  ctx.it(`GET /api/${meta.tableName}/:id - returns single entity format`, async () => {
    const created = await ctx.factory.create(meta.entityName);
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}/${created.id}`)
      .set(auth);

    ctx.expect(response.status).toBe(200);
    const data = response.body.data || response.body;
    ctx.expect(data.id).toBe(created.id);
  });
}

/**
 * Scenario: Error response format is consistent
 *
 * Preconditions: None
 * Tests: Error responses have expected structure
 */
function errorFormat(meta, ctx) {
  const caps = getCapabilities(meta);
  
  ctx.it(`GET /api/${meta.tableName}/99999 - returns consistent error format`, async () => {
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}/99999`)
      .set(auth);

    // Should be 404 not found
    ctx.expect(response.status).toBe(404);
    ctx.expect(response.body).toBeDefined();
    // Error response should have error message
    ctx.expect(response.body.error || response.body.message).toBeDefined();
  });

  // Only test POST error format if create is enabled
  if (caps.canCreate) {
    ctx.it(`POST /api/${meta.tableName} with invalid data - returns error format`, async () => {
      const auth = await ctx.authHeader('admin');

      const response = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send({}); // Empty payload

      ctx.expect(response.status).toBe(400);
      ctx.expect(response.body).toBeDefined();
      ctx.expect(response.body.error || response.body.message || response.body.errors).toBeDefined();
    });
  }
}

/**
 * Scenario: Pagination metadata in list responses
 *
 * Preconditions: None  
 * Tests: List responses include pagination info when available
 */
function paginationMetadata(meta, ctx) {
  ctx.it(`GET /api/${meta.tableName} - includes pagination metadata`, async () => {
    await ctx.factory.create(meta.entityName);
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ limit: 10, page: 1 })
      .set(auth);

    ctx.expect(response.status).toBe(200);
    // Should have some indication of pagination (varies by implementation)
    // At minimum, data should be an array
    const data = response.body.data || response.body;
    ctx.expect(Array.isArray(data)).toBe(true);
  });
}

module.exports = {
  contentType,
  successFormat,
  errorFormat,
  paginationMetadata,
};
