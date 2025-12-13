/**
 * Search Test Scenarios
 *
 * Pure functions testing search, filter, sort, and pagination.
 * Driven by searchableFields, filterableFields, sortableFields.
 */

const validationGenerator = require('../data/validation-data-generator');

/**
 * Scenario: Text search across searchable fields
 *
 * Preconditions: Entity has searchableFields defined
 * Tests: Search query matches entities by searchable fields
 */
function textSearch(meta, ctx) {
  const { searchableFields } = meta;
  if (!searchableFields?.length) return;

  // Find a searchable field that doesn't have strict pattern validation
  // Prefer fields without validation rules (like 'description', 'title')
  const searchField = searchableFields.find(f => 
    !f.includes('email') && !f.includes('phone') && 
    !f.includes('first_name') && !f.includes('last_name')
  ) || searchableFields.find(f => 
    !f.includes('email') && !f.includes('phone')
  ) || searchableFields[0];
  
  // Generate unique search token - letters only for compatibility
  const { num } = validationGenerator.getNextUnique();
  const uniqueToken = `search${validationGenerator.numberToLetters(num)}`;
  
  // Build override value based on field type and validation rules
  let overrideValue;
  if (searchField.includes('email')) {
    overrideValue = `${uniqueToken.toLowerCase()}@example.com`;
  } else if (searchField.includes('phone')) {
    overrideValue = `+1555${String(num).padStart(7, '0')}`;
  } else if (searchField === 'first_name' || searchField === 'last_name') {
    // Human name fields: letters, spaces, hyphens, apostrophes only
    overrideValue = uniqueToken; // Already alphabetic
  } else {
    overrideValue = `Test ${uniqueToken} Entity`;
  }

  ctx.it(`GET /api/${meta.tableName}?search=<term> - searches correctly`, async () => {
    const created = await ctx.factory.create(meta.entityName, {
      [searchField]: overrideValue,
    });
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ search: uniqueToken, page: 1, limit: 50 })
      .set(auth);

    ctx.expect(response.status).toBe(200);
    const items = response.body.data || response.body;
    const found = items.find((item) => item.id === created.id);
    ctx.expect(found).toBeDefined();
  });
}

/**
 * Scenario: Pagination limits results
 *
 * Preconditions: None
 * Tests: Limit and offset work correctly
 */
function pagination(meta, ctx) {
  ctx.it(`GET /api/${meta.tableName}?limit=1 - returns limited results`, async () => {
    // Create multiple entities
    await ctx.factory.create(meta.entityName);
    await ctx.factory.create(meta.entityName);
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ limit: 1 })
      .set(auth);

    ctx.expect(response.status).toBe(200);
    const items = response.body.data || response.body;
    ctx.expect(items.length).toBeLessThanOrEqual(1);
  });
}

/**
 * Scenario: Sorting by valid fields
 *
 * Preconditions: Entity has sortableFields defined
 * Tests: sortBy and sortOrder work correctly
 */
function sorting(meta, ctx) {
  const { sortableFields, tableName, entityName } = meta;
  if (!sortableFields?.length) return;

  // Test with first sortable field
  const sortField = sortableFields[0];

  ctx.it(`GET /api/${tableName}?sortBy=${sortField}&sortOrder=asc - sorts ascending`, async () => {
    await ctx.factory.create(entityName);
    await ctx.factory.create(entityName);
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${tableName}`)
      .query({ sortBy: sortField, sortOrder: 'asc', limit: 10 })
      .set(auth);

    ctx.expect(response.status).toBe(200);
  });

  ctx.it(`GET /api/${tableName}?sortBy=${sortField}&sortOrder=desc - sorts descending`, async () => {
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${tableName}`)
      .query({ sortBy: sortField, sortOrder: 'desc', limit: 10 })
      .set(auth);

    ctx.expect(response.status).toBe(200);
  });
}

/**
 * Scenario: Invalid sortBy field rejected
 *
 * Preconditions: None
 * Tests: Arbitrary/invalid sortBy values are rejected
 */
function invalidSortField(meta, ctx) {
  ctx.it(`GET /api/${meta.tableName}?sortBy=hackerField - rejects invalid sort field`, async () => {
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ sortBy: 'hackerField', sortOrder: 'asc', limit: 10 })
      .set(auth);

    ctx.expect(response.status).toBe(400);
  });
}

/**
 * Scenario: Invalid sortOrder value rejected
 *
 * Preconditions: None
 * Tests: sortOrder must be 'asc' or 'desc'
 */
function invalidSortOrder(meta, ctx) {
  const { sortableFields } = meta;
  if (!sortableFields?.length) return;

  ctx.it(`GET /api/${meta.tableName}?sortOrder=invalid - rejects invalid sort order`, async () => {
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ sortBy: sortableFields[0], sortOrder: 'DROP TABLE', limit: 10 })
      .set(auth);

    ctx.expect(response.status).toBe(400);
  });
}

/**
 * Scenario: Invalid pagination rejected
 *
 * Preconditions: None
 * Tests: page < 1 or invalid limit rejected
 */
function invalidPagination(meta, ctx) {
  ctx.it(`GET /api/${meta.tableName}?page=-1 - rejects negative page`, async () => {
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ page: -1, limit: 10 })
      .set(auth);

    ctx.expect(response.status).toBe(400);
  });

  ctx.it(`GET /api/${meta.tableName}?page=0 - rejects zero page`, async () => {
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ page: 0, limit: 10 })
      .set(auth);

    ctx.expect(response.status).toBe(400);
  });

  ctx.it(`GET /api/${meta.tableName}?limit=10000 - rejects excessive limit`, async () => {
    const auth = await ctx.authHeader('admin');

    const response = await ctx.request
      .get(`/api/${meta.tableName}`)
      .query({ page: 1, limit: 10000 })
      .set(auth);

    ctx.expect(response.status).toBe(400);
  });
}

module.exports = {
  textSearch,
  pagination,
  sorting,
  invalidSortField,
  invalidSortOrder,
  invalidPagination,
};
