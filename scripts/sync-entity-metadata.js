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
  NAV_CONFIG_JSON,
} = require("./lib/paths");
const {
  snakeToTitleCase,
  camelToTitleCase,
  capitalize,
} = require("./lib/string-utils");

// Metadata accessor functions - derive values from field-level properties
// when legacy arrays are not present (supports field-centric migration)
const {
  getRequiredFields,
  getImmutableFields,
  getSearchableFields,
  getFilterableFields,
  getSortableFields,
  getNavigation,
  getFeatures,
  getJunction,
} = require("../backend/config/metadata-accessors");

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
 * Transform backend field definition to frontend format
 *
 * SINGLE CODE PATH: Foreign keys MUST use `type: 'foreignKey', references: '...'`
 * No legacy fallbacks - all FKs must be explicitly declared in field definitions.
 */
function transformField(fieldName, fieldDef, enums, allModels) {
  const result = { type: fieldDef.type };

  // Helper to get display field for a related entity
  const getDisplayFieldForEntity = (entityName) => {
    const relatedMeta = allModels?.[entityName];
    return relatedMeta?.displayField || relatedMeta?.identityField || "name";
  };

  // Foreign key handling - SINGLE PATH: type + references required
  if (fieldDef.type === "foreignKey" && fieldDef.references) {
    result.references = fieldDef.references;
    result.displayField =
      fieldDef.displayField || getDisplayFieldForEntity(fieldDef.references);
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
  // NEW pattern: enumKey references enums.[enumKey] where values are object keys
  // LEGACY pattern: fieldDef.values array OR enums.[fieldName].values
  if (fieldDef.type === "enum") {
    const enumKey = fieldDef.enumKey || fieldName;
    const enumDef = enums?.[enumKey];
    
    let values = [];
    let colors = {};
    
    if (enumDef && typeof enumDef === 'object') {
      // New pattern: values are object keys, colors inside each value
      // e.g., { active: { color: 'success' }, inactive: { color: 'warning' } }
      if (!enumDef.values) {
        // New format: keys are values
        values = Object.keys(enumDef);
        for (const val of values) {
          if (enumDef[val]?.color) {
            colors[val] = enumDef[val].color;
          }
        }
      } else {
        // Legacy format: { values: [...], colors: {...} }
        values = enumDef.values;
        colors = enumDef.colors || {};
      }
    } else if (fieldDef.values) {
      // Direct values on field (legacy)
      values = fieldDef.values;
    }

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
  // Get consolidated features via accessor
  const features = getFeatures(backendMeta);

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
    supportsFileAttachments: features.fileAttachments ?? false,
    // Summary endpoint configuration for analytics (null = not summarizable)
    summaryConfig: features.summary ?? null,
  };

  // displayField - what to show when this entity is referenced (e.g., in FK dropdowns)
  // Distinct from identityField (unique key) - e.g., role: identityField=priority, displayField=name
  // ALWAYS emit - defaults to identityField for consistency
  result.displayField = backendMeta.displayField ?? backendMeta.identityField;

  // Display names - convert snake_case entity name to Title Case
  const displayName = snakeToTitleCase(entityName);
  result.displayName = displayName;
  result.displayNamePlural = getPluralForm(displayName);

  // ============================================================================
  // CONSISTENT SHAPE: All array/object fields ALWAYS present (empty if none)
  // Frontend can confidently access without null checks.
  // ============================================================================

  // Arrays - Use accessor functions to support field-centric migration
  // Accessors derive values from field-level properties when legacy arrays absent
  result.requiredFields = getRequiredFields(backendMeta);
  result.immutableFields = getImmutableFields(backendMeta);
  result.searchableFields = getSearchableFields(backendMeta);
  result.filterableFields = getFilterableFields(backendMeta);
  result.sortableFields = getSortableFields(backendMeta);
  result.displayColumns = backendMeta.displayColumns ?? [];

  // Default sort - ALWAYS emit (sensible default if none)
  result.defaultSort = backendMeta.defaultSort ?? { field: "created_at", order: "DESC" };

  // Field aliases for UI labels - ALWAYS emit (empty object if none)
  result.fieldAliases = backendMeta.fieldAliases ?? {};

  // Name pattern for entity category (human, simple, computed, null)
  // Determines how entity names are displayed/computed
  // ALWAYS emit - null is valid for system entities
  result.namePattern = backendMeta.namePattern ?? null;

  // System protected (for roles) - ALWAYS emit
  result.systemProtected = backendMeta.systemProtected ?? [];

  // Field groups (for semantic grouping in forms/UI)
  // Always include to maintain consistent contract
  result.fieldGroups = backendMeta.fieldGroups ?? {};

  // Fields
  result.fields = {};
  for (const [fieldName, fieldDef] of Object.entries(
    backendMeta.fields || {},
  )) {
    result.fields[fieldName] = transformField(
      fieldName,
      fieldDef,
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

  // ============================================================================
  // RELATIONSHIP SUPPORT (M:M, hasMany, hasOne, belongsTo)
  // ============================================================================
  // CONSISTENT SHAPE: All entities have these properties, varying only in content.
  // This enables frontend code to confidently access without null checks.

  // Sync relationships for ?include= API support and frontend data fetching
  // ALWAYS emit (empty object if none) - consistent shape contract
  result.relationships = {};
  if (backendMeta.relationships && Object.keys(backendMeta.relationships).length > 0) {
    for (const [relName, relDef] of Object.entries(backendMeta.relationships)) {
      result.relationships[relName] = {
        type: relDef.type,
        table: relDef.table,
        foreignKey: relDef.foreignKey,
        // M:M specific properties
        ...(relDef.through && { through: relDef.through }),
        ...(relDef.targetKey && { targetKey: relDef.targetKey }),
        // Field subset to retrieve
        ...(relDef.fields?.length && { fields: relDef.fields }),
        // Human-readable description
        ...(relDef.description && { description: relDef.description }),
      };
    }
  }

  // Junction entity markers (for M:M pivot tables)
  // ALWAYS emit - consistent shape contract
  // Uses getJunction() accessor for consolidated junction property
  const junctionConfig = getJunction(backendMeta);
  result.isJunction = junctionConfig !== null;
  result.junctionFor = junctionConfig
    ? { entity1: junctionConfig.entities[0], entity2: junctionConfig.entities[1] }
    : null;

  // Default includes (auto-loaded relationships)
  // ALWAYS emit (empty array if none) - consistent shape contract
  result.defaultIncludes = backendMeta.defaultIncludes ?? [];

  return result;
}

/**
 * Build entityPlacements from backend metadata
 *
 * SSOT: navGroup and navOrder come from backend metadata.
 * This replaces the hardcoded placements in nav-config.json.
 *
 * @returns {Object} entityPlacements object for nav-config.json
 */
function buildEntityPlacements() {
  const placements = {};

  for (const [entityName, backendMeta] of Object.entries(backendModels)) {
    // Only include entities with navigation (visible in nav)
    // Uses getNavigation() accessor for consolidated navigation property
    const navigation = getNavigation(backendMeta);
    if (navigation) {
      placements[entityName] = {
        group: navigation.group,
        order: navigation.order ?? 99,
      };
    }
  }

  return placements;
}

/**
 * Update nav-config.json with derived entityPlacements
 *
 * Reads existing nav-config.json, replaces entityPlacements section,
 * and writes back with proper formatting.
 */
function updateNavConfig() {
  console.log("\n🔄 Updating nav-config.json entityPlacements...\n");

  // Read existing nav-config.json
  const existingConfig = JSON.parse(fs.readFileSync(NAV_CONFIG_JSON, "utf8"));

  // Build placements from metadata
  const entityPlacements = buildEntityPlacements();

  // Update only the entityPlacements section
  existingConfig.entityPlacements = entityPlacements;

  // Write back with consistent formatting
  const output = JSON.stringify(existingConfig, null, 2);
  fs.writeFileSync(NAV_CONFIG_JSON, output);

  const placementCount = Object.keys(entityPlacements).length;
  console.log(`  ✓ Updated ${placementCount} entity placements`);
  for (const [name, placement] of Object.entries(entityPlacements)) {
    console.log(`    - ${name}: ${placement.group} (order ${placement.order})`);
  }

  return entityPlacements;
}

/**
 * Main sync function
 */
function syncMetadata() {
  console.log("🔄 Syncing entity metadata from backend to frontend...\n");

  // Build frontend metadata
  // Note: lastModified removed for deterministic output (CI stability)
  // Use git history for change tracking
  const frontendMetadata = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://tross.com/schemas/entity-metadata.json",
    title: "Tross Entity Metadata",
    description:
      "Frontend mirror of backend entity metadata. Auto-generated by sync-entity-metadata.js",
    version: "1.0.0",
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

  // Also update nav-config.json entityPlacements (SSOT)
  updateNavConfig();

  return frontendMetadata;
}

// ============================================================================
// EXPORTS (for testing)
// ============================================================================
module.exports = {
  getPluralForm,
  transformField,
  transformPreferenceSchema,
  transformModel,
  buildEntityPlacements,
  updateNavConfig,
  syncMetadata,
  PLURAL_OVERRIDES,
};

// ============================================================================
// CLI ENTRYPOINT
// ============================================================================
if (require.main === module) {
  syncMetadata();
}
