/**
 * Entity Test Data Factory
 *
 * SRP: Generate valid test data for any entity based on metadata.
 * PURE: Given metadata, produces deterministic (but unique) test data.
 *
 * PRINCIPLE: No hardcoded entity logic. Everything derived from metadata.
 * 
 * DATA GENERATION: Delegates to validation-data-generator.js which reads
 * from validation-rules.json - the SINGLE SOURCE OF TRUTH for field validation.
 */

const allMetadata = require('../../../config/models');
const validationGenerator = require('./validation-data-generator');

/**
 * Get metadata for entity by name
 */
function getMetadata(entityName) {
  const meta = allMetadata[entityName];
  if (!meta) {
    throw new Error(`Unknown entity: ${entityName}. Available: ${Object.keys(allMetadata).join(', ')}`);
  }
  return { ...meta, entityName };
}

/**
 * Map table name to entity name
 */
function entityNameFromTable(tableName) {
  const mapping = {
    users: 'user',
    roles: 'role',
    customers: 'customer',
    technicians: 'technician',
    work_orders: 'workOrder',
    contracts: 'contract',
    invoices: 'invoice',
    inventory: 'inventory',
  };
  return mapping[tableName] || tableName;
}

/**
 * Generate a unique value for a field based on validation rules
 * 
 * DELEGATION: Uses validation-data-generator which reads from
 * validation-rules.json - the same source the API validates against.
 */
function generateFieldValue(entityName, fieldName) {
  return validationGenerator.generateValidValue(fieldName, entityName);
}

/**
 * Build minimal valid payload (only required fields)
 * 
 * NOTE: FK fields are EXCLUDED from generation. They are resolved
 * by test-context.js which creates actual parent records.
 * This separation of concerns keeps the factory pure.
 */
function buildMinimal(entityName, overrides = {}) {
  const meta = getMetadata(entityName);
  const payload = {};

  // Get FK field names so we can skip them
  const fkFields = new Set(Object.keys(meta.foreignKeys || {}));

  for (const field of meta.requiredFields || []) {
    // Skip FK fields - test-context will resolve them by creating parents
    if (fkFields.has(field)) continue;
    payload[field] = generateFieldValue(entityName, field);
  }

  return { ...payload, ...overrides };
}

/**
 * Build complete payload (all non-readonly fields)
 * 
 * NOTE: FK fields are EXCLUDED from generation. They should be
 * explicitly provided via overrides with real parent entity IDs.
 */
function buildComplete(entityName, overrides = {}) {
  const meta = getMetadata(entityName);
  const payload = {};

  // Get FK field names so we can skip them
  const fkFields = new Set(Object.keys(meta.foreignKeys || {}));

  // Get all fields from fieldAccess (the canonical field list)
  const allFields = Object.keys(meta.fieldAccess || {});
  
  for (const fieldName of allFields) {
    // Skip system fields that shouldn't be in payloads
    if (['id', 'created_at', 'updated_at'].includes(fieldName)) continue;
    
    // Skip FK fields - must be provided via overrides with real IDs
    if (fkFields.has(fieldName)) continue;
    
    const access = meta.fieldAccess[fieldName];
    // Skip fields that can't be created
    if (access?.create === 'none') continue;
    
    payload[fieldName] = generateFieldValue(entityName, fieldName);
  }

  // Ensure required non-FK fields are present
  for (const field of meta.requiredFields || []) {
    if (fkFields.has(field)) continue;
    if (!payload[field]) {
      payload[field] = generateFieldValue(entityName, field);
    }
  }

  return { ...payload, ...overrides };
}

/**
 * Dependency graph for entity creation order
 * Entities with FK dependencies must be created after their parents
 */
function getDependencyOrder(entityName) {
  const meta = getMetadata(entityName);
  const deps = [];

  for (const [fkField, fkDef] of Object.entries(meta.foreignKeys || {})) {
    // Skip optional FKs (not in requiredFields)
    if (!meta.requiredFields?.includes(fkField)) continue;
    deps.push(entityNameFromTable(fkDef.table));
  }

  return deps;
}

/**
 * Create entity with all required parent entities
 * Returns { entity, parents: { parentName: parentEntity } }
 */
async function createWithParents(entityName, ctx, overrides = {}) {
  const meta = getMetadata(entityName);
  const parents = {};
  const payload = buildMinimal(entityName, overrides);

  // Create required parent entities first
  for (const [fkField, fkDef] of Object.entries(meta.foreignKeys || {})) {
    if (!meta.requiredFields?.includes(fkField)) continue;
    
    const parentName = entityNameFromTable(fkDef.table);
    const parent = await ctx.factory.create(parentName);
    parents[parentName] = parent;
    payload[fkField] = parent.id;
  }

  // Create the entity
  const response = await ctx.request
    .post(`/${meta.tableName}`)
    .set(ctx.authHeader('admin'))
    .send(payload);

  if (response.status !== 201) {
    throw new Error(`Failed to create ${entityName}: ${JSON.stringify(response.body)}`);
  }

  return { entity: response.body, parents };
}

/**
 * Reset the counter for test isolation
 */
function resetCounter() {
  validationGenerator.resetCounter();
}

module.exports = {
  getMetadata,
  entityNameFromTable,
  generateFieldValue,
  buildMinimal,
  buildComplete,
  getDependencyOrder,
  createWithParents,
  resetCounter,
};
