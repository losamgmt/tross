/**
 * Name Display Patterns - SINGLE SOURCE OF TRUTH
 *
 * Defines how an entity's display name is constructed from its fields.
 * This is a FIELD-LEVEL concern, not an entity classification.
 *
 * NO IMPORTS ALLOWED - This file must be dependency-free to avoid circular imports.
 *
 * @module config/name-patterns
 */

/**
 * Name display pattern enum.
 *
 * - HUMAN: Uses first_name + last_name for display (user, customer, technician)
 * - SIMPLE: Uses a direct 'name' field (role, inventory, property)
 * - COMPUTED: Uses auto-generated identifier like WO-2026-0001 (work_order, invoice)
 * - null: System table without user-facing display name (audit_log, junction tables)
 */
const NAME_PATTERNS = Object.freeze({
  HUMAN: 'human',
  SIMPLE: 'simple',
  COMPUTED: 'computed',
});

module.exports = { NAME_PATTERNS };
