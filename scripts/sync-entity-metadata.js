#!/usr/bin/env node
/**
 * Entity Metadata Sync Script
 * 
 * SINGLE RESPONSIBILITY: Sync backend model metadata to frontend JSON
 * 
 * Reads: backend/config/models/*.js
 * Writes: frontend/assets/config/entity-metadata.json
 * 
 * USAGE:
 *   node scripts/sync-entity-metadata.js
 *   npm run sync:metadata  (if added to package.json)
 * 
 * This ensures frontend metadata stays in sync with backend without manual copy.
 * Run after any backend model changes.
 */

const fs = require('fs');
const path = require('path');

// Paths
const BACKEND_MODELS_DIR = path.join(__dirname, '../backend/config/models');
const FRONTEND_METADATA_PATH = path.join(__dirname, '../frontend/assets/config/entity-metadata.json');

// Import all backend metadata
const backendModels = require(path.join(BACKEND_MODELS_DIR, 'index.js'));

// Explicit singular → plural mappings for irregular/special plurals
// Standard English rules don't handle all cases correctly
const PLURAL_OVERRIDES = {
  'User': 'Users',
  'Role': 'Roles',
  'Customer': 'Customers',
  'Technician': 'Technicians',
  'Work Order': 'Work Orders',
  'Contract': 'Contracts',
  'Invoice': 'Invoices',
  'Inventory': 'Inventory',  // Inventory is uncountable - no 's'
};

/**
 * Get proper plural form for a display name
 * Uses explicit overrides, falls back to basic English rules
 */
function getPluralForm(singular) {
  // Check explicit overrides first
  if (PLURAL_OVERRIDES[singular]) {
    return PLURAL_OVERRIDES[singular];
  }
  
  // Basic English pluralization rules as fallback
  if (singular.endsWith('y') && !/[aeiou]y$/i.test(singular)) {
    return singular.slice(0, -1) + 'ies';
  }
  if (singular.endsWith('s') || singular.endsWith('x') || 
      singular.endsWith('ch') || singular.endsWith('sh')) {
    return singular + 'es';
  }
  return singular + 's';
}

/**
 * Transform backend field definition to frontend format
 */
function transformField(fieldName, fieldDef, foreignKeys, relationships, enums) {
  const result = { type: fieldDef.type };
  
  // Check if this is a foreign key field
  const fkConfig = foreignKeys?.[fieldName];
  const relConfig = Object.values(relationships || {}).find(
    rel => rel.foreignKey === fieldName
  );
  
  if (fkConfig || (fieldDef.type === 'integer' && fieldName.endsWith('_id') && relConfig)) {
    result.type = 'foreignKey';
    
    // Determine related entity from relationship or FK config
    if (relConfig) {
      // Convert table name to entity name (e.g., 'roles' -> 'role')
      result.relatedEntity = relConfig.table.replace(/s$/, '');
      // Use first non-id field as display field, or default to 'name'
      const displayFields = relConfig.fields?.filter(f => f !== 'id') || [];
      result.displayField = displayFields[0] || 'name';
    } else if (fkConfig) {
      result.relatedEntity = fkConfig.table.replace(/s$/, '');
      result.displayField = 'name';
    }
  }
  
  // Copy other properties
  // Note: backend uses both 'readonly' and 'readOnly' (camelCase) - check both
  if (fieldDef.required) result.required = true;
  if (fieldDef.readonly || fieldDef.readOnly) result.readonly = true;
  if (fieldDef.maxLength) result.maxLength = fieldDef.maxLength;
  if (fieldDef.minLength) result.minLength = fieldDef.minLength;
  if (fieldDef.min !== undefined) result.min = fieldDef.min;
  if (fieldDef.max !== undefined) result.max = fieldDef.max;
  if (fieldDef.default !== undefined) result.default = fieldDef.default;
  if (fieldDef.values) result.values = fieldDef.values;
  if (fieldDef.pattern) result.pattern = fieldDef.pattern;
  
  // Merge enum values from enums definition
  // Note: Frontend FieldDefinition.fromJson reads 'values' not 'enumValues'
  if (fieldDef.type === 'enum' && enums?.[fieldName]?.values) {
    result.values = enums[fieldName].values;
  }
  
  return result;
}

/**
 * Transform relationships for frontend format
 */
function transformRelationships(foreignKeys, relationships) {
  const result = {};
  
  // Process relationships first (more complete info)
  for (const [relName, relConfig] of Object.entries(relationships || {})) {
    const fkField = relConfig.foreignKey;
    if (fkField) {
      const entityName = relConfig.table.replace(/s$/, '');
      const displayFields = relConfig.fields?.filter(f => f !== 'id') || [];
      
      result[fkField] = {
        relatedEntity: entityName,
        displayField: displayFields[0] || 'name',
        type: relConfig.type || 'belongsTo',
      };
    }
  }
  
  // Add any FK configs not covered by relationships
  for (const [fkField, fkConfig] of Object.entries(foreignKeys || {})) {
    if (!result[fkField]) {
      result[fkField] = {
        relatedEntity: fkConfig.table.replace(/s$/, ''),
        displayField: fkConfig.displayField || 'name',
        type: 'belongsTo',
      };
    }
  }
  
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Transform preferenceSchema to frontend format
 * Adds UI-friendly properties: label, displayLabels, order
 */
function transformPreferenceSchema(schema) {
  const result = {};
  let order = 0;

  for (const [key, def] of Object.entries(schema)) {
    result[key] = {
      ...def,
      // Generate label from camelCase key if not provided
      label: def.label || key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase())
        .trim(),
      // Add order if not specified
      order: def.order !== undefined ? def.order : order++,
    };

    // For enum types, generate displayLabels if not provided
    if (def.type === 'enum' && def.values && !def.displayLabels) {
      result[key].displayLabels = {};
      for (const val of def.values) {
        // Convert value to display label (e.g., 'system' -> 'System')
        result[key].displayLabels[val] = val
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, s => s.toUpperCase())
          .trim();
      }
    }
  }

  return result;
}

/**
 * Transform a single backend model to frontend format
 */
function transformModel(entityName, backendMeta) {
  const result = {
    tableName: backendMeta.tableName,
    primaryKey: backendMeta.primaryKey || 'id',
    identityField: backendMeta.identityField,
    rlsResource: backendMeta.rlsResource,
  };
  
  // Display names
  const displayName = entityName
    .split(/(?=[A-Z])/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace('_', ' ');
  result.displayName = displayName;
  result.displayNamePlural = getPluralForm(displayName);
  
  // Arrays
  if (backendMeta.requiredFields?.length) {
    result.requiredFields = backendMeta.requiredFields;
  }
  if (backendMeta.immutableFields?.length) {
    result.immutableFields = backendMeta.immutableFields;
  }
  if (backendMeta.searchableFields?.length) {
    result.searchableFields = backendMeta.searchableFields;
  }
  if (backendMeta.filterableFields?.length) {
    result.filterableFields = backendMeta.filterableFields;
  }
  if (backendMeta.sortableFields?.length) {
    result.sortableFields = backendMeta.sortableFields;
  }
  
  // Default sort
  if (backendMeta.defaultSort) {
    result.defaultSort = backendMeta.defaultSort;
  }
  
  // System protected (for roles)
  if (backendMeta.systemProtected) {
    result.systemProtected = backendMeta.systemProtected;
  }
  
  // Relationships
  const relationships = transformRelationships(
    backendMeta.foreignKeys,
    backendMeta.relationships
  );
  if (relationships) {
    result.relationships = relationships;
  }
  
  // Fields
  result.fields = {};
  for (const [fieldName, fieldDef] of Object.entries(backendMeta.fields || {})) {
    result.fields[fieldName] = transformField(
      fieldName,
      fieldDef,
      backendMeta.foreignKeys,
      backendMeta.relationships,
      backendMeta.enums
    );
  }

  // Preference schema (for preferences entity)
  // Copy as-is with frontend-friendly additions (label, displayLabels, order)
  if (backendMeta.preferenceSchema) {
    result.preferenceSchema = transformPreferenceSchema(backendMeta.preferenceSchema);
  }
  
  return result;
}

/**
 * Main sync function
 */
function syncMetadata() {
  console.log('🔄 Syncing entity metadata from backend to frontend...\n');
  
  // Build frontend metadata
  const frontendMetadata = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://trossapp.com/schemas/entity-metadata.json',
    title: 'TrossApp Entity Metadata',
    description: 'Frontend mirror of backend entity metadata. Auto-generated by sync-entity-metadata.js',
    version: '1.0.0',
    lastModified: new Date().toISOString().split('T')[0],
  };
  
  // Transform each model
  const entities = [];
  for (const [entityName, backendMeta] of Object.entries(backendModels)) {
    // Use entityName directly - camelCase is the canonical format across all layers
    // No conversion! Backend and frontend use the SAME entity names.
    console.log(`  ✓ ${entityName}`);
    frontendMetadata[entityName] = transformModel(entityName, backendMeta);
    entities.push(entityName);
  }
  
  // Write output
  const output = JSON.stringify(frontendMetadata, null, 2);
  fs.writeFileSync(FRONTEND_METADATA_PATH, output);
  
  console.log(`\n✅ Synced ${entities.length} entities to:`);
  console.log(`   ${FRONTEND_METADATA_PATH}`);
  console.log(`\nEntities: ${entities.join(', ')}`);

  return frontendMetadata;
}

// ============================================================================
// EXPORTS (for testing)
// ============================================================================
module.exports = {
  getPluralForm,
  transformField,
  transformRelationships,
  transformPreferenceSchema,
  transformModel,
  syncMetadata,
  PLURAL_OVERRIDES,
};

// ============================================================================
// CLI ENTRYPOINT
// ============================================================================
if (require.main === module) {
  syncMetadata();
}
