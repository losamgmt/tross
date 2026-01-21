/**
 * Scenario Helpers
 * 
 * SINGLE SOURCE OF TRUTH for capability checks across all scenario files.
 * 
 * SYSTEMIC SOLUTION: Instead of each scenario file defining its own
 * isCreateDisabled() function, they all import from here.
 */

const entityFactory = require('../data/entity-factory');

/**
 * Get capabilities for an entity
 * Wrapper that accepts either entityName or meta object
 * 
 * @param {Object|string} metaOrName - Entity metadata object or entity name
 * @returns {Object} Capabilities object
 */
function getCapabilities(metaOrName) {
  const entityName = typeof metaOrName === 'string' 
    ? metaOrName 
    : metaOrName.entityName;
  return entityFactory.getCapabilities(entityName);
}

/**
 * Check if API create is disabled for this entity
 * (entityPermissions.create === null means system-only creation)
 * 
 * DEPRECATED: Use getCapabilities(meta).canCreate instead
 * Kept for backwards compatibility during migration
 * 
 * @param {Object} meta - Entity metadata
 * @returns {boolean} True if create is disabled
 */
function isCreateDisabled(meta) {
  return !getCapabilities(meta).canCreate;
}

/**
 * Check if API read is disabled for this entity
 * 
 * @param {Object} meta - Entity metadata
 * @returns {boolean} True if read is disabled
 */
function isReadDisabled(meta) {
  return !getCapabilities(meta).canRead;
}

/**
 * Check if API update is disabled for this entity
 * 
 * @param {Object} meta - Entity metadata
 * @returns {boolean} True if update is disabled
 */
function isUpdateDisabled(meta) {
  return !getCapabilities(meta).canUpdate;
}

/**
 * Check if API delete is disabled for this entity
 * 
 * @param {Object} meta - Entity metadata
 * @returns {boolean} True if delete is disabled
 */
function isDeleteDisabled(meta) {
  return !getCapabilities(meta).canDelete;
}

/**
 * Check if entity uses own-record-only RLS
 * 
 * @param {Object} meta - Entity metadata
 * @returns {boolean} True if entity uses own_record_only RLS
 */
function isOwnRecordOnly(meta) {
  return getCapabilities(meta).isOwnRecordOnly;
}

module.exports = {
  getCapabilities,
  isCreateDisabled,
  isReadDisabled,
  isUpdateDisabled,
  isDeleteDisabled,
  isOwnRecordOnly,
};
