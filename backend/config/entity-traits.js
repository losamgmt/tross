/**
 * Entity Traits - SINGLE SOURCE OF TRUTH
 *
 * Defines entity-level behavioral traits (what BEHAVIORS apply to an entity).
 *
 * NO IMPORTS ALLOWED - This file must be dependency-free to avoid circular imports.
 *
 * @module config/entity-traits
 */

// ============================================================================
// ENTITY BEHAVIORAL TRAITS (Composable)
// ============================================================================

/**
 * Entity behavioral traits enum.
 * Entities may have ZERO OR MORE behavioral traits.
 *
 * - SYSTEM: Internal system table, not user-facing (audit_log, preferences)
 * - WORKFLOW: Has status-based lifecycle (invoice, work_order, quote)
 * - UNCOUNTABLE: Excluded from dashboard/summary counts
 */
const ENTITY_TRAITS = Object.freeze({
  SYSTEM: 'system',
  WORKFLOW: 'workflow',
  UNCOUNTABLE: 'uncountable',
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if entity has a specific behavioral trait.
 *
 * @param {Object} metadata - Entity metadata object
 * @param {string} trait - Value from ENTITY_TRAITS enum
 * @returns {boolean} True if entity has the specified trait
 *
 * @example
 * hasTrait(auditLogMetadata, ENTITY_TRAITS.SYSTEM)     // true
 * hasTrait(invoiceMetadata, ENTITY_TRAITS.WORKFLOW)    // true
 * hasTrait(assetMetadata, ENTITY_TRAITS.WORKFLOW)      // false
 */
function hasTrait(metadata, trait) {
  const traits = metadata.traits || [];
  return traits.includes(trait);
}

/**
 * Check if entity is a system table.
 * Convenience method - equivalent to hasTrait(metadata, ENTITY_TRAITS.SYSTEM)
 *
 * @param {Object} metadata - Entity metadata object
 * @returns {boolean} True if entity is a system table
 */
function isSystemTable(metadata) {
  return hasTrait(metadata, ENTITY_TRAITS.SYSTEM);
}

/**
 * Check if entity has workflow (status-based lifecycle).
 * Convenience method - equivalent to hasTrait(metadata, ENTITY_TRAITS.WORKFLOW)
 *
 * @param {Object} metadata - Entity metadata object
 * @returns {boolean} True if entity has workflow
 */
function hasWorkflow(metadata) {
  return hasTrait(metadata, ENTITY_TRAITS.WORKFLOW);
}

/**
 * Get all traits for an entity.
 *
 * @param {Object} metadata - Entity metadata object
 * @returns {string[]} Array of trait values (may be empty)
 */
function getTraits(metadata) {
  return metadata.traits || [];
}

module.exports = {
  ENTITY_TRAITS,
  hasTrait,
  isSystemTable,
  hasWorkflow,
  getTraits,
};
