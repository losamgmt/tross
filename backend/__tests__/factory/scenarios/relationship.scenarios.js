/**
 * Relationship Test Scenarios
 *
 * Pure functions testing foreign key relationships, cascades, and
 * relationship loading via the ?include= query parameter.
 *
 * Driven by FK fields (type: 'foreignKey') and relationships in metadata.
 */

const { extractForeignKeyFields } = require('../../../config/fk-helpers');

/**
 * Check if a FK field is settable during entity creation
 * Uses fieldAccess to determine if the field can be set by users
 */
function isFkSettableOnCreate(meta, fkField) {
  // Check fieldAccess - if not settable by users, skip
  const fieldAccess = meta.fieldAccess?.[fkField];
  if (fieldAccess && (fieldAccess.create === 'none' || fieldAccess.create === 'system')) {
    return false;
  }

  // Default: assume settable
  return true;
}

/**
 * Scenario: FK references valid parent
 *
 * Preconditions: Entity has FK fields (type: 'foreignKey') AND the FK is settable on create
 * Tests: FK to existing parent succeeds
 */
function fkReferencesValidParent(meta, ctx) {
  const foreignKeyFields = extractForeignKeyFields(meta);
  if (Object.keys(foreignKeyFields).length === 0) return;

  for (const [fkField, fkDef] of Object.entries(foreignKeyFields)) {
    // Skip FKs that aren't settable during creation
    if (!isFkSettableOnCreate(meta, fkField)) continue;

    ctx.it(
      `POST /api/${meta.tableName} - accepts valid ${fkField} reference`,
      async () => {
        // Create parent entity first (the one we're specifically testing)
        // references is the entity name directly - no conversion needed
        const parentName = fkDef.references;
        const parent = await ctx.factory.create(parentName);
        const auth = await ctx.authHeader("admin");

        // Use buildMinimalWithFKs to resolve ALL FK dependencies, then override the tested one
        const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName, {
          [fkField]: parent.id,
        });

        const response = await ctx.request
          .post(`/api/${meta.tableName}`)
          .set(auth)
          .send(payload);

        ctx.expect(response.status).toBe(201);
        const data = response.body.data || response.body;
        ctx.expect(data[fkField]).toBe(parent.id);
      },
    );
  }
}

/**
 * Get loadable relationships (non-belongsTo) from metadata
 */
function getLoadableRelationships(meta) {
  const relationships = meta.relationships || {};
  return Object.entries(relationships).filter(
    ([, def]) => def.type !== 'belongsTo',
  );
}

/**
 * Scenario: Include parameter returns 400 for invalid relationship
 *
 * Preconditions: Entity has loadable relationships defined
 * Tests: ?include=nonexistent returns 400 with helpful error
 */
function includeInvalidRelationshipReturns400(meta, ctx) {
  // Only run if entity has loadable relationships (otherwise any include is ignored)
  const loadableRels = getLoadableRelationships(meta);
  if (loadableRels.length === 0) return;

  ctx.it(
    `GET /api/${meta.tableName}?include=nonexistent - returns 400 for invalid relationship`,
    async () => {
      const auth = await ctx.authHeader('admin');

      // Include pagination params since they're required for list endpoints
      const response = await ctx.request
        .get(`/api/${meta.tableName}?include=nonexistent&limit=10&page=1`)
        .set(auth);

      ctx.expect(response.status).toBe(400);
      ctx.expect(response.body.message || response.body.error).toContain('nonexistent');
    },
  );
}

/**
 * Scenario: Include parameter loads M:M relationships
 *
 * Preconditions: Entity has manyToMany relationships defined
 * Tests: ?include=relationshipName returns 200 with data
 */
function includeLoadsManyToMany(meta, ctx) {
  const manyToManyRels = getLoadableRelationships(meta).filter(
    ([, def]) => def.type === 'manyToMany',
  );

  if (manyToManyRels.length === 0) return;

  for (const [relName] of manyToManyRels) {
    ctx.it(
      `GET /api/${meta.tableName}?include=${relName} - accepts M:M include param`,
      async () => {
        // Create parent entity
        const parent = await ctx.factory.create(meta.entityName);
        const auth = await ctx.authHeader('admin');

        // Include pagination params
        const response = await ctx.request
          .get(`/api/${meta.tableName}?include=${relName}&limit=10&page=1`)
          .set(auth);

        // Primary assertion: request succeeds
        ctx.expect(response.status).toBe(200);

        const data = response.body.data;
        ctx.expect(Array.isArray(data)).toBe(true);
      },
    );
  }
}

/**
 * Scenario: Include parameter loads hasMany relationships
 *
 * Preconditions: Entity has hasMany relationships defined
 * Tests: ?include=relationshipName returns 200 with data
 */
function includeLoadsHasMany(meta, ctx) {
  const hasManyRels = getLoadableRelationships(meta).filter(
    ([, def]) => def.type === 'hasMany',
  );

  if (hasManyRels.length === 0) return;

  for (const [relName] of hasManyRels) {
    ctx.it(
      `GET /api/${meta.tableName}?include=${relName} - accepts hasMany include param`,
      async () => {
        // Create parent entity
        const parent = await ctx.factory.create(meta.entityName);
        const auth = await ctx.authHeader('admin');

        // Include pagination params
        const response = await ctx.request
          .get(`/api/${meta.tableName}?include=${relName}&limit=10&page=1`)
          .set(auth);

        // Primary assertion: request succeeds
        ctx.expect(response.status).toBe(200);

        const data = response.body.data;
        ctx.expect(Array.isArray(data)).toBe(true);
      },
    );
  }
}

/**
 * Scenario: Include parameter on findById loads relationships
 *
 * Preconditions: Entity has loadable relationships
 * Tests: GET /api/:table/:id?include=relName returns 200 (relationship may be empty array)
 */
function includeOnFindById(meta, ctx) {
  const loadableRels = getLoadableRelationships(meta);
  if (loadableRels.length === 0) return;

  const [relName] = loadableRels[0];

  ctx.it(
    `GET /api/${meta.tableName}/:id?include=${relName} - accepts include param on single entity`,
    async () => {
      // Create parent entity
      const parent = await ctx.factory.create(meta.entityName);
      const auth = await ctx.authHeader('admin');

      const response = await ctx.request
        .get(`/api/${meta.tableName}/${parent.id}?include=${relName}`)
        .set(auth);

      // Primary assertion: request succeeds
      ctx.expect(response.status).toBe(200);

      // Response should have data
      const data = response.body.data || response.body;
      ctx.expect(data).toBeTruthy();
    },
  );
}

module.exports = {
  fkReferencesValidParent,
  includeInvalidRelationshipReturns400,
  includeLoadsManyToMany,
  includeLoadsHasMany,
  includeOnFindById,
};
