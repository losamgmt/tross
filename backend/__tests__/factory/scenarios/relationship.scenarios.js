/**
 * Relationship Test Scenarios
 *
 * Pure functions testing foreign key relationships and cascades.
 * Driven by relationships and foreignKeys in metadata.
 */

/**
 * Check if a FK field is settable during entity creation
 * Some FKs are read-only or set via separate workflows
 */
function isFkSettableOnCreate(meta, fkField, fkDef) {
  // Explicit metadata flag takes precedence
  if (fkDef.settableOnCreate === false) return false;
  
  // Check fieldAccess if available
  const fieldAccess = meta.fieldAccess?.[fkField];
  if (fieldAccess && fieldAccess.create === 'none') return false;
  
  // Default: assume settable
  return true;
}

/**
 * Scenario: FK references valid parent
 *
 * Preconditions: Entity has foreignKeys defined AND the FK is settable on create
 * Tests: FK to existing parent succeeds
 */
function fkReferencesValidParent(meta, ctx) {
  const { foreignKeys } = meta;
  if (!foreignKeys) return;

  for (const [fkField, fkDef] of Object.entries(foreignKeys)) {
    // Skip FKs that aren't settable during creation
    if (!isFkSettableOnCreate(meta, fkField, fkDef)) continue;

    ctx.it(`POST /api/${meta.tableName} - accepts valid ${fkField} reference`, async () => {
      // Create parent entity first (the one we're specifically testing)
      const parentName = ctx.entityNameFromTable(fkDef.table);
      const parent = await ctx.factory.create(parentName);
      const auth = await ctx.authHeader('admin');

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
    });
  }
}

module.exports = {
  fkReferencesValidParent,
};
