/**
 * Name Field Types - SINGLE SOURCE OF TRUTH
 *
 * NO IMPORTS ALLOWED - This file must be dependency-free to avoid circular imports.
 *
 * Name Types are FIELD-LEVEL metadata describing how an entity's name/identifier is constructed.
 * Think of these as validation patterns for the name field:
 *
 * - HUMAN: Uses first_name + last_name for display (user, customer, technician)
 * - SIMPLE: Has a direct name field with unique identifier (role, inventory)
 * - COMPUTED: Auto-generated identifier + computed name (work_order, invoice, contract)
 *
 * This is NOT entity classification - it's field-level metadata about naming patterns.
 */

/**
 * Name field type enum
 */
const NAME_TYPES = Object.freeze({
  HUMAN: "human",
  SIMPLE: "simple",
  COMPUTED: "computed",
});

module.exports = {
  NAME_TYPES,
};
