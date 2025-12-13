/**
 * Update Helper Utilities
 *
 * Provides reusable utilities for UPDATE operations across all models:
 * - Dynamic SET clause building with EXCLUSION pattern
 * - JSONB field handling with type casting
 * - String trimming for specific fields
 * - STRICT validation: rejects requests with immutable field attempts
 *
 * SINGLE RESPONSIBILITY: Build UPDATE query components
 *
 * DESIGN PRINCIPLE (Phase 4):
 * Uses EXCLUSION pattern - all fields are updateable EXCEPT those explicitly excluded.
 * This is DRY (don't repeat every field) and admin-friendly (new fields auto-allowed).
 *
 * STRICT MODE (Updated):
 * If client attempts to update immutable fields, the ENTIRE request is rejected
 * with field-level error details. No silent partial updates.
 */

const { ENTITY_FIELDS } = require('../../config/constants');

/**
 * Custom error for immutable field violations
 */
class ImmutableFieldError extends Error {
  constructor(violations) {
    const fieldNames = violations.map(v => v.field).join(', ');
    super(`Cannot update immutable field(s): ${fieldNames}`);
    this.name = 'ImmutableFieldError';
    this.code = 'IMMUTABLE_FIELD_VIOLATION';
    this.violations = violations;
    this.statusCode = 400;
  }
}

/**
 * Build dynamic SET clause for UPDATE queries
 *
 * Uses EXCLUSION pattern: All fields allowed except those in excludedFields
 * Universal immutables (id, created_at) are always excluded automatically.
 *
 * STRICT MODE: If any immutable fields are present in data, throws ImmutableFieldError
 * with detailed field-level violation info for frontend display.
 *
 * @param {Object} data - Update data from request
 * @param {string[]} [excludedFields=[]] - Fields that cannot be updated (entity-specific)
 * @param {Object} [options] - Optional configuration
 * @param {string[]} [options.jsonbFields] - Fields that need ::jsonb casting
 * @param {string[]} [options.trimFields] - Fields that should be trimmed
 *
 * @returns {Object} { updates: string[], values: any[], hasUpdates: boolean }
 * @throws {ImmutableFieldError} If any immutable fields are present in data
 *
 * @example
 * // Default: only universal immutables excluded
 * const { updates, values } = buildUpdateClause(
 *   { name: 'New Name', email: 'new@example.com', id: 999 },
 *   []
 * );
 * // THROWS: ImmutableFieldError with violations: [{ field: 'id', message: '...' }]
 *
 * @example
 * // With entity-specific exclusions
 * const { updates, values } = buildUpdateClause(
 *   { auth0_id: 'new', first_name: 'John' },
 *   ['auth0_id']  // auth0_id is immutable for users
 * );
 * // THROWS: ImmutableFieldError with violations: [{ field: 'auth0_id', message: '...' }]
 */
function buildUpdateClause(data, excludedFields = [], options = {}) {
  const { jsonbFields = [], trimFields = [] } = options;

  // Combine universal immutables (from centralized constants) with entity-specific exclusions
  const allExcluded = [...ENTITY_FIELDS.UNIVERSAL_IMMUTABLES, ...excludedFields];

  // STRICT MODE: Check for immutable field violations BEFORE building query
  const violations = [];
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) {
      continue; // undefined is not an attempt to update
    }

    if (allExcluded.includes(key)) {
      violations.push({
        field: key,
        message: `Field '${key}' is immutable and cannot be updated`,
        code: 'IMMUTABLE_FIELD',
      });
    }
  }

  // Reject entire request if any immutable fields were attempted
  if (violations.length > 0) {
    throw new ImmutableFieldError(violations);
  }

  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    // Skip undefined values (not provided = not updating)
    if (value === undefined) {
      continue;
    }

    // Handle JSONB fields with type casting
    if (jsonbFields.includes(key) && value !== null) {
      updates.push(`${key} = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(value));
      paramIndex++;
      continue;
    }

    // Handle regular fields
    updates.push(`${key} = $${paramIndex}`);

    // Trim string fields if specified
    if (trimFields.includes(key) && typeof value === 'string') {
      values.push(value.trim());
    } else {
      values.push(value);
    }

    paramIndex++;
  }

  return {
    updates,
    values,
    hasUpdates: updates.length > 0,
  };
}

module.exports = {
  buildUpdateClause,
  ImmutableFieldError,
};
