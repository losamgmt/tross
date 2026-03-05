/**
 * Relationship Test Scenarios
 *
 * Pure functions testing foreign key relationships and cascades.
 * Driven by FK fields (type: 'foreignKey') in metadata.
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
        // relatedEntity is the entity name directly - no conversion needed
        const parentName = fkDef.relatedEntity;
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

module.exports = {
  fkReferencesValidParent,
};
