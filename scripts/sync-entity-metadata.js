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

const fs = require("fs");
const path = require("path");

// Shared utilities - DRY compliance
const {
  BACKEND_MODELS_DIR,
  ENTITY_METADATA_JSON,
} = require("./lib/paths");
const {
  snakeToTitleCase,
  camelToTitleCase,
  capitalize,
} = require("./lib/string-utils");

// Import all backend metadata
const backendModels = require(path.join(BACKEND_MODELS_DIR, "index.js"));

// Explicit singular → plural mappings for irregular/special plurals
// Standard English rules don't handle all cases correctly
const PLURAL_OVERRIDES = {
  User: "Users",
  Role: "Roles",
  Customer: "Customers",
  Technician: "Technicians",
  "Work Order": "Work Orders",
  Contract: "Contracts",
  Invoice: "Invoices",
  Inventory: "Inventory", // Inventory is uncountable - no 's'
  Preferences: "Preferences", // Already plural (or singular form of preferences)
  Notification: "Notifications",
  "Saved View": "Saved Views",
  "File Attachment": "File Attachments",
  "Audit Log": "Audit Logs",
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
  if (singular.endsWith("y") && !/[aeiou]y$/i.test(singular)) {
    return singular.slice(0, -1) + "ies";
  }
  if (
    singular.endsWith("s") ||
    singular.endsWith("x") ||
    singular.endsWith("ch") ||
    singular.endsWith("sh")
  ) {
    return singular + "es";
  }
  return singular + "s";
}

/**
 * Get entity key from table name using actual metadata lookup.
 * This is much more robust than naive ".replace(/s$/, "")" de-pluralization.
 *
 * @param {string} tableName - Table name (e.g., 'roles', 'work_orders', 'inventory')
 * @param {object} allModels - All backend models for lookup
 * @returns {string} Entity key (e.g., 'role', 'work_order', 'inventory')
 */
function getEntityKeyFromTable(tableName, allModels) {
  // First try: direct lookup by tableName in metadata
  for (const [entityKey, meta] of Object.entries(allModels || {})) {
    if (meta.tableName === tableName) {
      return entityKey;
    }
  }

  // Fallback: naive de-pluralization (handles regular plurals)
  // This is only used if table isn't in our metadata (external tables)
  const naive = tableName.replace(/s$/, "");
  return naive;
}

/**
 * Transform backend field definition to frontend format
 */
function transformField(
  fieldName,
  fieldDef,
  foreignKeys,
  relationships,
  enums,
  allModels,
) {
  const result = { type: fieldDef.type };

  // Check if this is a foreign key field
  const fkConfig = foreignKeys?.[fieldName];
  const relConfig = Object.values(relationships || {}).find(
    (rel) => rel.foreignKey === fieldName,
  );

  // Helper to get display field for a related entity
  const getDisplayFieldForEntity = (entityName) => {
    const relatedMeta = allModels?.[entityName];
    // Prefer displayField (what to show in dropdowns), fallback to identityField, then 'name'
    return relatedMeta?.displayField || relatedMeta?.identityField || "name";
  };

  // Handle foreignKey type - can come from:
  // 1. Field type is directly 'foreignKey' with relatedEntity
  // 2. FK config in foreignKeys section
  // 3. Relationship config that references this field
  // 4. Integer type field ending in _id with relationship
  if (fieldDef.type === "foreignKey" && fieldDef.relatedEntity) {
    // Type is explicitly foreignKey with relatedEntity (e.g., audit_log.user_id)
    result.relatedEntity = fieldDef.relatedEntity;
    result.displayField =
      fieldDef.displayField || getDisplayFieldForEntity(fieldDef.relatedEntity);
  } else if (
    fkConfig ||
    (fieldDef.type === "integer" && fieldName.endsWith("_id") && relConfig)
  ) {
    result.type = "foreignKey";

    // Determine related entity from relationship or FK config
    if (relConfig) {
      // Use metadata lookup to get proper entity key (handles 'inventory' etc.)
      result.relatedEntity = getEntityKeyFromTable(relConfig.table, allModels);
      // Use first non-id field as display field, or default to entity's identityField
      const displayFields = relConfig.fields?.filter((f) => f !== "id") || [];
      result.displayField =
        displayFields[0] || getDisplayFieldForEntity(result.relatedEntity);
    } else if (fkConfig) {
      result.relatedEntity = getEntityKeyFromTable(fkConfig.table, allModels);
      result.displayField = getDisplayFieldForEntity(result.relatedEntity);
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
  if (fieldDef.pattern) result.pattern = fieldDef.pattern;

  // Handle enum values with optional colors
  // Frontend supports: values as array OR object with color info
  // Output format: { "value1": { "color": "success" }, "value2": null }
  if (fieldDef.type === "enum") {
    const enumDef = enums?.[fieldName];
    const values = enumDef?.values || fieldDef.values || [];
    const colors = enumDef?.colors || {};

    // Check if any colors are defined
    const hasColors = Object.keys(colors).length > 0;

    if (hasColors) {
      // Object format with colors: { "completed": { "color": "success" }, "pending": null }
      result.values = {};
      for (const val of values) {
        result.values[val] = colors[val] ? { color: colors[val] } : null;
      }
    } else {
      // Array format (no colors): ["pending", "completed"]
      result.values = values;
    }
  }

  return result;
}

/**
 * Transform relationships for frontend format
 * @param {object} foreignKeys - Foreign key configs from metadata
 * @param {object} relationships - Relationship configs from metadata
 * @param {object} allModels - All backend models for entity key lookup
 */
function transformRelationships(foreignKeys, relationships, allModels) {
  const result = {};

  // Process relationships first (more complete info)
  for (const [relName, relConfig] of Object.entries(relationships || {})) {
    const fkField = relConfig.foreignKey;
    if (fkField) {
      // Use metadata lookup to get proper entity key (handles 'inventory' etc.)
      const entityName = getEntityKeyFromTable(relConfig.table, allModels);
      const displayFields = relConfig.fields?.filter((f) => f !== "id") || [];

      result[fkField] = {
        relatedEntity: entityName,
        displayField: displayFields[0] || "name",
        type: relConfig.type || "belongsTo",
      };
    }
  }

  // Add any FK configs not covered by relationships
  for (const [fkField, fkConfig] of Object.entries(foreignKeys || {})) {
    if (!result[fkField]) {
      result[fkField] = {
        relatedEntity: getEntityKeyFromTable(fkConfig.table, allModels),
        displayField: fkConfig.displayField || "name",
        type: "belongsTo",
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
      label: def.label || camelToTitleCase(key),
      // Add order if not specified
      order: def.order !== undefined ? def.order : order++,
    };

    // For enum types, generate displayLabels if not provided
    if (def.type === "enum" && def.values && !def.displayLabels) {
      result[key].displayLabels = {};
      for (const val of def.values) {
        // Convert value to display label (e.g., 'system' -> 'System', 'in_progress' -> 'In Progress')
        result[key].displayLabels[val] = val.includes("_")
          ? snakeToTitleCase(val)
          : capitalize(val);
      }
    }
  }

  return result;
}

/**
 * Transform a single backend model to frontend format
 * @param {string} entityName - Entity name (snake_case)
 * @param {object} backendMeta - Backend metadata for this entity
 * @param {object} allModels - All backend models (for resolving FK display fields)
 */
function transformModel(entityName, backendMeta, allModels) {
  const result = {
    // Entity key (singular, for API params and lookups)
    entityKey: backendMeta.entityKey,
    // Table name in database (plural, also used for API URLs)
    tableName: backendMeta.tableName,
    primaryKey: backendMeta.primaryKey || "id",
    identityField: backendMeta.identityField,
    rlsResource: backendMeta.rlsResource,
    // Material icon for navigation menus and entity displays
    icon: backendMeta.icon,
    // Whether this entity supports file attachments (metadata-driven UI)
    supportsFileAttachments: backendMeta.supportsFileAttachments,
  };

  // displayField - what to show when this entity is referenced (e.g., in FK dropdowns)
  // Distinct from identityField (unique key) - e.g., role: identityField=priority, displayField=name
  if (backendMeta.displayField) {
    result.displayField = backendMeta.displayField;
  }

  // Display names - convert snake_case entity name to Title Case
  const displayName = snakeToTitleCase(entityName);
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

  // Display columns for table views (ordered list of default visible columns)
  if (backendMeta.displayColumns?.length) {
    result.displayColumns = backendMeta.displayColumns;
  }

  // Field aliases for UI labels (e.g., { name: 'Title' })
  if (
    backendMeta.fieldAliases &&
    Object.keys(backendMeta.fieldAliases).length > 0
  ) {
    result.fieldAliases = backendMeta.fieldAliases;
  }

  // Name type for entity category (human, simple, computed, null)
  // Determines how entity names are displayed/computed
  if (backendMeta.nameType !== undefined) {
    result.nameType = backendMeta.nameType;
  }

  // System protected (for roles)
  if (backendMeta.systemProtected) {
    result.systemProtected = backendMeta.systemProtected;
  }

  // Field groups (for semantic grouping in forms/UI)
  // Always include to maintain consistent contract
  result.fieldGroups = backendMeta.fieldGroups || {};

  // Relationships
  const relationships = transformRelationships(
    backendMeta.foreignKeys,
    backendMeta.relationships,
    allModels,
  );
  if (relationships) {
    result.relationships = relationships;
  }

  // Fields
  result.fields = {};
  for (const [fieldName, fieldDef] of Object.entries(
    backendMeta.fields || {},
  )) {
    result.fields[fieldName] = transformField(
      fieldName,
      fieldDef,
      backendMeta.foreignKeys,
      backendMeta.relationships,
      backendMeta.enums,
      allModels,
    );
  }

  // Preference schema (for preferences entity)
  // If the entity is 'preferences', generate preferenceSchema from fields
  // This allows the PreferencesProvider to get defaults from metadata
  if (backendMeta.preferenceSchema) {
    result.preferenceSchema = transformPreferenceSchema(
      backendMeta.preferenceSchema,
    );
  } else if (entityName === "preferences" && backendMeta.fields) {
    // Auto-generate preferenceSchema from fields for the preferences entity
    // Exclude system fields (id, created_at, updated_at)
    const systemFields = ["id", "created_at", "updated_at"];
    const preferenceFields = {};

    for (const [fieldName, fieldDef] of Object.entries(backendMeta.fields)) {
      if (!systemFields.includes(fieldName)) {
        preferenceFields[fieldName] = {
          type: fieldDef.type,
          default: fieldDef.default,
          ...(fieldDef.values && { values: fieldDef.values }),
          ...(fieldDef.min !== undefined && { min: fieldDef.min }),
          ...(fieldDef.max !== undefined && { max: fieldDef.max }),
        };
      }
    }

    result.preferenceSchema = transformPreferenceSchema(preferenceFields);
  }

  return result;
}

/**
 * Main sync function
 */
function syncMetadata() {
  console.log("🔄 Syncing entity metadata from backend to frontend...\n");

  // Build frontend metadata
  const frontendMetadata = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://tross.com/schemas/entity-metadata.json",
    title: "Tross Entity Metadata",
    description:
      "Frontend mirror of backend entity metadata. Auto-generated by sync-entity-metadata.js",
    version: "1.0.0",
    lastModified: new Date().toISOString().split("T")[0],
  };

  // Transform each model
  const entities = [];
  for (const [entityName, backendMeta] of Object.entries(backendModels)) {
    // Use entityName directly - camelCase is the canonical format across all layers
    // No conversion! Backend and frontend use the SAME entity names.
    console.log(`  ✓ ${entityName}`);
    frontendMetadata[entityName] = transformModel(
      entityName,
      backendMeta,
      backendModels,
    );
    entities.push(entityName);
  }

  // Write output
  const output = JSON.stringify(frontendMetadata, null, 2);
  fs.writeFileSync(ENTITY_METADATA_JSON, output);

  console.log(`\n✅ Synced ${entities.length} entities to:`);
  console.log(`   ${ENTITY_METADATA_JSON}`);
  console.log(`\nEntities: ${entities.join(", ")}`);

  return frontendMetadata;
}

// ============================================================================
// EXPORTS (for testing)
// ============================================================================
module.exports = {
  getPluralForm,
  getEntityKeyFromTable,
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
