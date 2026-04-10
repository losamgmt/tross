/**
 * Metadata Accessors
 *
 * MIGRATION BRIDGE: Provides backwards-compatible access to field properties.
 *
 * During the field-centric migration (Phase 2A), metadata can express rules in
 * TWO ways:
 *
 * 1. LEGACY (entity-level arrays):
 *    requiredFields: ['name', 'email']
 *    immutableFields: ['id']
 *    searchableFields: ['name']
 *
 * 2. FIELD-CENTRIC (on the field):
 *    fields: {
 *      name: { type: 'string', required: true, searchable: true }
 *    }
 *
 * These accessors:
 * - Read field-level properties FIRST (preferred)
 * - Fall back to entity-level arrays (legacy)
 * - Log deprecation warnings when using legacy-only patterns
 * - After migration: legacy arrays can be removed
 *
 * USAGE:
 *   const { getRequiredFields, isFieldRequired } = require('./metadata-accessors');
 *   const required = getRequiredFields(metadata);
 *   const isReq = isFieldRequired(metadata, 'name');
 *
 * @module config/metadata-accessors
 */

const testLogger = require('./test-logger');
const log = testLogger;

/**
 * Migration state tracking - controls deprecation warnings
 */
const MIGRATION_CONFIG = {
  // Set to true to log deprecation warnings for legacy patterns
  warnOnLegacyUsage: process.env.NODE_ENV !== 'test',
  // Set to true after migration to require field-level properties
  requireFieldLevel: false,
  // Cache for deprecation warnings (avoid spam)
  warnedEntities: new Set(),
};

/**
 * Log a deprecation warning (once per entity per property)
 * @param {string} entityKey - Entity being accessed
 * @param {string} property - Legacy property name
 */
function logDeprecationWarning(entityKey, property) {
  if (!MIGRATION_CONFIG.warnOnLegacyUsage) {
    return;
  }

  const key = `${entityKey}:${property}`;
  if (MIGRATION_CONFIG.warnedEntities.has(key)) {
    return;
  }

  MIGRATION_CONFIG.warnedEntities.add(key);
  log.log(
    `DEPRECATION: ${entityKey} uses legacy '${property}' array. ` +
      `Migrate to field-level '${property.replace('Fields', '')}' property.`,
  );
}

// ============================================================================
// REQUIRED FIELDS
// ============================================================================

/**
 * Get all required fields for an entity.
 *
 * Migration strategy (safe for partial migrations):
 * - If legacy `requiredFields` array exists → use it (with deprecation warning)
 * - If NO legacy array → derive from field-level `required: true`
 *
 * This ensures entities are not broken during incremental migration.
 *
 * @param {Object} metadata - Entity metadata
 * @returns {string[]} Array of required field names
 */
function getRequiredFields(metadata) {
  const fields = metadata.fields || {};
  const entityKey = metadata.entityKey || 'unknown';

  // Get legacy array
  const fromArray = metadata.requiredFields;

  // If legacy array exists (even if empty), use it
  // This ensures we don't break entities during partial migration
  if (Array.isArray(fromArray)) {
    if (fromArray.length > 0) {
      logDeprecationWarning(entityKey, 'requiredFields');
    }
    return fromArray;
  }

  // No legacy array → derive from field-level properties
  const fromFields = Object.entries(fields)
    .filter(([_, fieldDef]) => fieldDef.required === true)
    .map(([fieldName]) => fieldName);

  return fromFields;
}

/**
 * Check if a specific field is required.
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} fieldName - Field to check
 * @returns {boolean} True if field is required
 */
function isFieldRequired(metadata, fieldName) {
  const fieldDef = metadata.fields?.[fieldName];

  // Check field-level first
  if (fieldDef?.required !== undefined) {
    return fieldDef.required === true;
  }

  // Fall back to legacy array
  return (metadata.requiredFields || []).includes(fieldName);
}

// ============================================================================
// IMMUTABLE FIELDS
// ============================================================================

/**
 * Get all immutable fields for an entity.
 *
 * Migration strategy (safe for partial migrations):
 * - If legacy `immutableFields` array exists → use it (with deprecation warning)
 * - If NO legacy array → derive from field-level `immutable: true`
 *
 * @param {Object} metadata - Entity metadata
 * @returns {string[]} Array of immutable field names
 */
function getImmutableFields(metadata) {
  const fields = metadata.fields || {};
  const entityKey = metadata.entityKey || 'unknown';

  // Get legacy array
  const fromArray = metadata.immutableFields;

  // If legacy array exists (even if empty), use it
  if (Array.isArray(fromArray)) {
    if (fromArray.length > 0) {
      logDeprecationWarning(entityKey, 'immutableFields');
    }
    return fromArray;
  }

  // No legacy array → derive from field-level properties
  const fromFields = Object.entries(fields)
    .filter(([_, fieldDef]) => fieldDef.immutable === true)
    .map(([fieldName]) => fieldName);

  return fromFields;
}

/**
 * Check if a specific field is immutable.
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} fieldName - Field to check
 * @returns {boolean} True if field is immutable
 */
function isFieldImmutable(metadata, fieldName) {
  const fieldDef = metadata.fields?.[fieldName];

  // Check field-level first
  if (fieldDef?.immutable !== undefined) {
    return fieldDef.immutable === true;
  }

  // Fall back to legacy array
  return (metadata.immutableFields || []).includes(fieldName);
}

// ============================================================================
// SEARCHABLE FIELDS
// ============================================================================

/**
 * Get all searchable fields for an entity.
 *
 * Migration strategy (safe for partial migrations):
 * - If legacy `searchableFields` array exists → use it (with deprecation warning)
 * - If NO legacy array → derive from field-level `searchable: true`
 *
 * @param {Object} metadata - Entity metadata
 * @returns {string[]} Array of searchable field names
 */
function getSearchableFields(metadata) {
  const fields = metadata.fields || {};
  const entityKey = metadata.entityKey || 'unknown';

  // Get legacy array
  const fromArray = metadata.searchableFields;

  // If legacy array exists (even if empty), use it
  if (Array.isArray(fromArray)) {
    if (fromArray.length > 0) {
      logDeprecationWarning(entityKey, 'searchableFields');
    }
    return fromArray;
  }

  // No legacy array → derive from field-level properties
  const fromFields = Object.entries(fields)
    .filter(([_, fieldDef]) => fieldDef.searchable === true)
    .map(([fieldName]) => fieldName);

  return fromFields;
}

/**
 * Check if a specific field is searchable.
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} fieldName - Field to check
 * @returns {boolean} True if field is searchable
 */
function isFieldSearchable(metadata, fieldName) {
  const fieldDef = metadata.fields?.[fieldName];

  // Check field-level first
  if (fieldDef?.searchable !== undefined) {
    return fieldDef.searchable === true;
  }

  // Fall back to legacy array
  return (metadata.searchableFields || []).includes(fieldName);
}

// ============================================================================
// FILTERABLE FIELDS
// ============================================================================

/**
 * Get all filterable fields for an entity.
 *
 * Migration strategy (safe for partial migrations):
 * - If legacy `filterableFields` array exists → use it (with deprecation warning)
 * - If NO legacy array → derive from field-level `filterable: true`
 *
 * @param {Object} metadata - Entity metadata
 * @returns {string[]} Array of filterable field names
 */
function getFilterableFields(metadata) {
  const fields = metadata.fields || {};
  const entityKey = metadata.entityKey || 'unknown';

  // Get legacy array
  const fromArray = metadata.filterableFields;

  // If legacy array exists (even if empty), use it
  if (Array.isArray(fromArray)) {
    if (fromArray.length > 0) {
      logDeprecationWarning(entityKey, 'filterableFields');
    }
    return fromArray;
  }

  // No legacy array → derive from field-level properties
  const fromFields = Object.entries(fields)
    .filter(([_, fieldDef]) => fieldDef.filterable === true)
    .map(([fieldName]) => fieldName);

  return fromFields;
}

/**
 * Check if a specific field is filterable.
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} fieldName - Field to check
 * @returns {boolean} True if field is filterable
 */
function isFieldFilterable(metadata, fieldName) {
  const fieldDef = metadata.fields?.[fieldName];

  // Check field-level first
  if (fieldDef?.filterable !== undefined) {
    return fieldDef.filterable === true;
  }

  // Fall back to legacy array
  return (metadata.filterableFields || []).includes(fieldName);
}

// ============================================================================
// SORTABLE FIELDS
// ============================================================================

/**
 * Get all sortable fields for an entity.
 *
 * Migration strategy (safe for partial migrations):
 * - If legacy `sortableFields` array exists → use it (with deprecation warning)
 * - If NO legacy array → derive from field-level `sortable: true`
 *
 * @param {Object} metadata - Entity metadata
 * @returns {string[]} Array of sortable field names
 */
function getSortableFields(metadata) {
  const fields = metadata.fields || {};
  const entityKey = metadata.entityKey || 'unknown';

  // Get legacy array
  const fromArray = metadata.sortableFields;

  // If legacy array exists (even if empty), use it
  if (Array.isArray(fromArray)) {
    if (fromArray.length > 0) {
      logDeprecationWarning(entityKey, 'sortableFields');
    }
    return fromArray;
  }

  // No legacy array → derive from field-level properties
  const fromFields = Object.entries(fields)
    .filter(([_, fieldDef]) => fieldDef.sortable === true)
    .map(([fieldName]) => fieldName);

  return fromFields;
}

/**
 * Check if a specific field is sortable.
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} fieldName - Field to check
 * @returns {boolean} True if field is sortable
 */
function isFieldSortable(metadata, fieldName) {
  const fieldDef = metadata.fields?.[fieldName];

  // Check field-level first
  if (fieldDef?.sortable !== undefined) {
    return fieldDef.sortable === true;
  }

  // Fall back to legacy array
  return (metadata.sortableFields || []).includes(fieldName);
}

// ============================================================================
// FIELD ACCESS (fieldAccess → fields.*.access)
// ============================================================================

/**
 * Get field access rules for a specific field.
 * Reads from field-level `access: {...}` first, falls back to `fieldAccess[field]`.
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} fieldName - Field to get access rules for
 * @returns {Object|null} Access rules { create, read, update, delete } or null
 */
function getFieldAccess(metadata, fieldName) {
  const fieldDef = metadata.fields?.[fieldName];

  // Check field-level first
  if (fieldDef?.access) {
    return fieldDef.access;
  }

  // Fall back to legacy fieldAccess
  const legacyAccess = metadata.fieldAccess?.[fieldName];
  if (legacyAccess) {
    const entityKey = metadata.entityKey || 'unknown';
    logDeprecationWarning(entityKey, 'fieldAccess');
    return legacyAccess;
  }

  return null;
}

/**
 * Get all field access rules for an entity.
 * Merges field-level access with legacy fieldAccess (field-level takes precedence).
 *
 * @param {Object} metadata - Entity metadata
 * @returns {Object} Map of fieldName → access rules
 */
function getAllFieldAccess(metadata) {
  const result = {};
  const fields = metadata.fields || {};
  const legacyAccess = metadata.fieldAccess || {};

  // Start with legacy (will be overwritten by field-level)
  for (const [fieldName, access] of Object.entries(legacyAccess)) {
    result[fieldName] = access;
  }

  // Override with field-level access
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (fieldDef.access) {
      result[fieldName] = fieldDef.access;
    }
  }

  return result;
}

// ============================================================================
// HOOKS (beforeChange, afterChange)
// ============================================================================

/**
 * Get beforeChange hooks for a specific field.
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} fieldName - Field to get hooks for
 * @returns {Array} Array of beforeChange hook definitions
 */
function getBeforeChangeHooks(metadata, fieldName) {
  const fieldDef = metadata.fields?.[fieldName];
  return fieldDef?.beforeChange || [];
}

/**
 * Get afterChange hooks for a specific field.
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} fieldName - Field to get hooks for
 * @returns {Array} Array of afterChange hook definitions
 */
function getAfterChangeHooks(metadata, fieldName) {
  const fieldDef = metadata.fields?.[fieldName];
  return fieldDef?.afterChange || [];
}

/**
 * Get all hooks for an entity, organized by field.
 *
 * @param {Object} metadata - Entity metadata
 * @returns {Object} { fieldName: { beforeChange: [...], afterChange: [...] } }
 */
function getAllHooks(metadata) {
  const result = {};
  const fields = metadata.fields || {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const beforeChange = fieldDef.beforeChange || [];
    const afterChange = fieldDef.afterChange || [];

    if (beforeChange.length > 0 || afterChange.length > 0) {
      result[fieldName] = { beforeChange, afterChange };
    }
  }

  return result;
}

// ============================================================================
// NAVIGATION (navVisibility, navGroup, navOrder → navigation)
// ============================================================================

/**
 * Get navigation configuration for an entity.
 * Reads from `navigation: { ... }` first, falls back to legacy nav* properties.
 *
 * @param {Object} metadata - Entity metadata
 * @returns {Object|null} Navigation config { visibility, group, order } or null if hidden
 */
function getNavigation(metadata) {
  const entityKey = metadata.entityKey || 'unknown';

  // Check for new consolidated navigation property
  if (metadata.navigation !== undefined) {
    return metadata.navigation;
  }

  // Fall back to legacy nav* properties
  const visibility = metadata.navVisibility;

  // If explicitly null, this entity is hidden from navigation
  if (visibility === null) {
    return null;
  }

  // If any legacy nav property exists, use them and warn
  if (visibility !== undefined) {
    logDeprecationWarning(entityKey, 'navVisibility');
    return {
      visibility: visibility,
      group: metadata.navGroup || null,
      order: metadata.navOrder || 0,
    };
  }

  // No navigation config
  return null;
}

// ============================================================================
// FEATURES (supportsFileAttachments, summaryConfig → features)
// ============================================================================

/**
 * Get features configuration for an entity.
 * Reads from `features: { ... }` first, falls back to legacy properties.
 *
 * @param {Object} metadata - Entity metadata
 * @returns {Object} Features config { fileAttachments, summary }
 */
function getFeatures(metadata) {
  const entityKey = metadata.entityKey || 'unknown';

  // Check for new consolidated features property
  if (metadata.features !== undefined) {
    return metadata.features;
  }

  // Build from legacy properties
  const result = {};

  if (metadata.supportsFileAttachments !== undefined) {
    logDeprecationWarning(entityKey, 'supportsFileAttachments');
    result.fileAttachments = metadata.supportsFileAttachments;
  }

  if (metadata.summaryConfig !== undefined) {
    logDeprecationWarning(entityKey, 'summaryConfig');
    result.summary = metadata.summaryConfig;
  }

  return result;
}

// ============================================================================
// JUNCTION (junctionFor, isJunction → junction)
// ============================================================================

/**
 * Get junction configuration for an entity.
 * Reads from `junction: { ... }` first, falls back to legacy junctionFor.
 *
 * @param {Object} metadata - Entity metadata
 * @returns {Object|null} Junction config { entities, uniqueOn } or null if not a junction
 */
function getJunction(metadata) {
  const entityKey = metadata.entityKey || 'unknown';

  // Check for new consolidated junction property
  if (metadata.junction !== undefined) {
    return metadata.junction;
  }

  // Fall back to legacy junctionFor property
  if (metadata.junctionFor) {
    logDeprecationWarning(entityKey, 'junctionFor');
    const { entity1, entity2 } = metadata.junctionFor;
    return {
      entities: [entity1, entity2],
      uniqueOn: [[`${entity1}_id`, `${entity2}_id`]],
    };
  }

  return null;
}

/**
 * Check if an entity is a junction table.
 *
 * @param {Object} metadata - Entity metadata
 * @returns {boolean} True if entity is a junction
 */
function isJunctionEntity(metadata) {
  return getJunction(metadata) !== null;
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Check if an entity uses any legacy patterns.
 * Useful for migration progress tracking.
 *
 * @param {Object} metadata - Entity metadata
 * @returns {Object} { usesLegacy: boolean, legacyProperties: string[] }
 */
function checkLegacyUsage(metadata) {
  const legacyProperties = [];

  if (metadata.requiredFields?.length > 0) {
    // Check if any required fields lack field-level `required: true`
    const hasFieldLevel = metadata.requiredFields.some(
      (f) => metadata.fields?.[f]?.required === true,
    );
    if (!hasFieldLevel) {
      legacyProperties.push('requiredFields');
    }
  }

  if (metadata.immutableFields?.length > 0) {
    const hasFieldLevel = metadata.immutableFields.some(
      (f) => metadata.fields?.[f]?.immutable === true,
    );
    if (!hasFieldLevel) {
      legacyProperties.push('immutableFields');
    }
  }

  if (metadata.searchableFields?.length > 0) {
    const hasFieldLevel = metadata.searchableFields.some(
      (f) => metadata.fields?.[f]?.searchable === true,
    );
    if (!hasFieldLevel) {
      legacyProperties.push('searchableFields');
    }
  }

  if (metadata.filterableFields?.length > 0) {
    const hasFieldLevel = metadata.filterableFields.some(
      (f) => metadata.fields?.[f]?.filterable === true,
    );
    if (!hasFieldLevel) {
      legacyProperties.push('filterableFields');
    }
  }

  if (metadata.sortableFields?.length > 0) {
    const hasFieldLevel = metadata.sortableFields.some(
      (f) => metadata.fields?.[f]?.sortable === true,
    );
    if (!hasFieldLevel) {
      legacyProperties.push('sortableFields');
    }
  }

  if (metadata.fieldAccess && Object.keys(metadata.fieldAccess).length > 0) {
    // Check if any fields have legacy-only access
    const hasFieldLevel = Object.keys(metadata.fieldAccess).some(
      (f) => metadata.fields?.[f]?.access !== undefined,
    );
    if (!hasFieldLevel) {
      legacyProperties.push('fieldAccess');
    }
  }

  // Check for legacy navigation properties
  if (metadata.navVisibility !== undefined && metadata.navigation === undefined) {
    legacyProperties.push('navVisibility');
  }
  if (metadata.navGroup !== undefined && metadata.navigation === undefined) {
    legacyProperties.push('navGroup');
  }
  if (metadata.navOrder !== undefined && metadata.navigation === undefined) {
    legacyProperties.push('navOrder');
  }

  // Check for legacy feature properties
  if (metadata.supportsFileAttachments !== undefined && metadata.features === undefined) {
    legacyProperties.push('supportsFileAttachments');
  }
  if (metadata.summaryConfig !== undefined && metadata.features === undefined) {
    legacyProperties.push('summaryConfig');
  }

  // Check for legacy junction properties
  if (metadata.junctionFor !== undefined && metadata.junction === undefined) {
    legacyProperties.push('junctionFor');
  }
  if (metadata.isJunction !== undefined && metadata.junction === undefined) {
    legacyProperties.push('isJunction');
  }

  return {
    usesLegacy: legacyProperties.length > 0,
    legacyProperties,
  };
}

/**
 * Get migration status for all entities.
 *
 * @param {Object} allMetadata - Map of entityKey → metadata
 * @returns {Object} Migration status report
 */
function getMigrationStatus(allMetadata) {
  const results = {
    total: 0,
    migrated: 0,
    partial: 0,
    legacy: 0,
    entities: {},
  };

  for (const [entityKey, metadata] of Object.entries(allMetadata)) {
    results.total++;
    const status = checkLegacyUsage(metadata);

    if (!status.usesLegacy) {
      results.migrated++;
      results.entities[entityKey] = { status: 'migrated', legacyProperties: [] };
    } else if (status.legacyProperties.length < 6) {
      results.partial++;
      results.entities[entityKey] = {
        status: 'partial',
        legacyProperties: status.legacyProperties,
      };
    } else {
      results.legacy++;
      results.entities[entityKey] = {
        status: 'legacy',
        legacyProperties: status.legacyProperties,
      };
    }
  }

  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Required fields
  getRequiredFields,
  isFieldRequired,

  // Immutable fields
  getImmutableFields,
  isFieldImmutable,

  // Searchable fields
  getSearchableFields,
  isFieldSearchable,

  // Filterable fields
  getFilterableFields,
  isFieldFilterable,

  // Sortable fields
  getSortableFields,
  isFieldSortable,

  // Field access
  getFieldAccess,
  getAllFieldAccess,

  // Hooks
  getBeforeChangeHooks,
  getAfterChangeHooks,
  getAllHooks,

  // Navigation
  getNavigation,

  // Features
  getFeatures,

  // Junction
  getJunction,
  isJunctionEntity,

  // Migration helpers
  checkLegacyUsage,
  getMigrationStatus,

  // Config (for testing)
  MIGRATION_CONFIG,
};
