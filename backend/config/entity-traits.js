/**
 * Entity Traits - SINGLE SOURCE OF TRUTH
 *
 * Defines entity-level classification: what KIND of entity (structure)
 * and what BEHAVIORS apply (traits).
 *
 * NO IMPORTS ALLOWED - This file must be dependency-free to avoid circular imports.
 *
 * @module config/entity-traits
 */

// ============================================================================
// ENTITY STRUCTURE TYPES (Mutually Exclusive)
// ============================================================================

/**
 * Entity structure type enum.
 * Every entity has exactly ONE structure type.
 *
 * - STANDARD: Normal entity with full CRUD, navigation, relationships
 * - JUNCTION: Many-to-many join table (no navigation, minimal fields)
 * - POLYMORPHIC: Entity with type discriminator (future use)
 */
const ENTITY_STRUCTURE = Object.freeze({
  STANDARD: 'standard',
  JUNCTION: 'junction',
  POLYMORPHIC: 'polymorphic',
});

// ============================================================================
// ENTITY BEHAVIORAL TRAITS (Composable)
// ============================================================================

/**
 * Entity behavioral traits enum.
 * Entities may have ZERO OR MORE behavioral traits.
 *
 * - SYSTEM: Internal system table, not user-facing (audit_log, preferences)
 * - WORKFLOW: Has status-based lifecycle (invoice, work_order, quote)
 * - AUDITABLE: Changes are tracked in audit_log
 * - UNCOUNTABLE: Excluded from dashboard/summary counts
 */
const ENTITY_TRAITS = Object.freeze({
  SYSTEM: 'system',
  WORKFLOW: 'workflow',
  AUDITABLE: 'auditable',
  UNCOUNTABLE: 'uncountable',
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if entity has a specific structure type.
 *
 * @param {Object} metadata - Entity metadata object
 * @param {string} structureType - Value from ENTITY_STRUCTURE enum
 * @returns {boolean} True if entity has the specified structure type
 *
 * @example
 * hasStructure(customerUnitMetadata, ENTITY_STRUCTURE.JUNCTION) // true
 * hasStructure(workOrderMetadata, ENTITY_STRUCTURE.STANDARD)    // true
 */
function hasStructure(metadata, structureType) {
  // Default to STANDARD if not specified
  const entityStructure = metadata.structureType || ENTITY_STRUCTURE.STANDARD;
  return entityStructure === structureType;
}

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
 * Check if entity is a junction table.
 * Convenience method - equivalent to hasStructure(metadata, ENTITY_STRUCTURE.JUNCTION)
 *
 * @param {Object} metadata - Entity metadata object
 * @returns {boolean} True if entity is a junction table
 */
function isJunction(metadata) {
  return hasStructure(metadata, ENTITY_STRUCTURE.JUNCTION);
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

/**
 * Get structure type for an entity.
 *
 * @param {Object} metadata - Entity metadata object
 * @returns {string} Structure type (defaults to STANDARD)
 */
function getStructureType(metadata) {
  return metadata.structureType || ENTITY_STRUCTURE.STANDARD;
}

module.exports = {
  ENTITY_STRUCTURE,
  ENTITY_TRAITS,
  hasStructure,
  hasTrait,
  isJunction,
  isSystemTable,
  hasWorkflow,
  getTraits,
  getStructureType,
};
