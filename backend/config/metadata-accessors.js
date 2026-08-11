/**
 * Metadata Accessors
 *
 * Field TRAITS (required/immutable/searchable/filterable/sortable) are read
 * from the canonical FIELD-CENTRIC shape only, via the generic accessors:
 *
 *    fields: {
 *      name: { type: 'string', required: true, searchable: true }
 *    }
 *
 * USAGE:
 *   const { getFieldsWithTrait, fieldHasTrait, FIELD_TRAIT } = require('./metadata-accessors');
 *   const required = getFieldsWithTrait(metadata, FIELD_TRAIT.REQUIRED);
 *   const isReq = fieldHasTrait(metadata, 'name', FIELD_TRAIT.REQUIRED);
 *
 * MIGRATION BRIDGE: the fieldAccess, navigation, and features accessors still
 * read the field-level shape first and fall back to the older entity-level
 * shapes (logging a deprecation warning), until those are migrated too.
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
// FIELD-TRAIT VOCABULARY + GENERIC ACCESSORS (the canonical field-trait API)
// ============================================================================

/**
 * The queryable field-trait vocabulary. Each value IS the boolean field property
 * that flags membership. Pass these to getFieldsWithTrait / fieldHasTrait — never a raw string.
 */
const FIELD_TRAIT = Object.freeze({
  REQUIRED: 'required',
  IMMUTABLE: 'immutable',
  SEARCHABLE: 'searchable',
  FILTERABLE: 'filterable',
  SORTABLE: 'sortable',
});

/**
 * Field names on an entity that carry a given trait (field-level only; no legacy bridge).
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} trait - A FIELD_TRAIT value
 * @returns {string[]} Field names where fields[name][trait] === true
 */
function getFieldsWithTrait(metadata, trait) {
  const fields = metadata.fields || {};
  return Object.entries(fields)
    .filter(([, fieldDef]) => fieldDef[trait] === true)
    .map(([fieldName]) => fieldName);
}

/**
 * Whether a single field carries a given trait (field-level only).
 *
 * @param {Object} metadata - Entity metadata
 * @param {string} fieldName - Field to check
 * @param {string} trait - A FIELD_TRAIT value
 * @returns {boolean}
 */
function fieldHasTrait(metadata, fieldName, trait) {
  return metadata.fields?.[fieldName]?.[trait] === true;
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
// JUNCTION
// ============================================================================

/**
 * Get junction configuration for an entity.
 *
 * @param {Object} metadata - Entity metadata
 * @returns {Object|null} Junction config { entities, uniqueOn } or null if not a junction
 */
function getJunction(metadata) {
  return metadata.junction !== undefined ? metadata.junction : null;
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
// DISPLAY
// ============================================================================

/**
 * Get the human-readable display field for an entity.
 *
 * Prefers `displayField` (presentation) over `identityField` (uniqueness),
 * falling back to 'name'. Used to pick the column to surface for a related
 * entity in JOIN projections and foreign-key display.
 *
 * @param {Object} metadata - Entity metadata
 * @returns {string} Display field name (e.g., 'email' for customers, 'name' for roles)
 */
function getEntityDisplayField(metadata) {
  return metadata.displayField || metadata.identityField || 'name';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Canonical field-trait API (generic — pass a FIELD_TRAIT value)
  FIELD_TRAIT,
  getFieldsWithTrait,
  fieldHasTrait,

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

  // Display
  getEntityDisplayField,

  // Config (for testing)
  MIGRATION_CONFIG,
};
