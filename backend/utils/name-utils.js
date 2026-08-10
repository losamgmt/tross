/**
 * Name Utilities — SINGLE SOURCE OF TRUTH for display-name resolution.
 *
 * Promoted from __tests__/helpers/ (UDN P1): production code now resolves an
 * entity's human-readable display name from its metadata name-strategy.
 *
 * Display-name contract (per config/name-patterns.js namePattern):
 * - HUMAN    : compose `displayFields` (first_name + last_name) — same-row.
 * - SIMPLE   : the authored `displayField` column (e.g. `name`).
 * - COMPUTED : the identifier `displayField` column (e.g. `work_order_number`).
 * - custom   : namePattern null but a `displayField` is declared (subcontractor
 *              `company_name`, unit `unit_identifier`).
 * - null/none: no resolvable display name (pure junction/system tables).
 *
 * `resolveDisplayName` is the runtime SSOT. For HUMAN entities the same
 * composition is expressed in SQL by `buildHumanNameSqlExpr` (consumed by the
 * P2 GENERATED column); a parity test guards that the two agree.
 *
 * @module utils/name-utils
 */

'use strict';

const { NAME_PATTERNS } = require('../config/name-patterns');

const isNil = (value) => value === null || value === undefined;

// ============================================================================
// FIELD COMPOSITION (shared primitive)
// ============================================================================

/**
 * Compose an ordered set of record fields into a single space-joined string.
 * Each field is coerced to string, trimmed, and empty values are dropped.
 * This is the JS twin of `buildHumanNameSqlExpr` — keep them in lockstep.
 *
 * @param {Object} record - Source record (row or write payload)
 * @param {string[]} fields - Ordered field names to compose
 * @returns {string} Space-joined composition ('' when nothing resolves)
 */
function composeFields(record, fields) {
  if (!record || !Array.isArray(fields)) {
    return '';
  }

  return fields
    .map((field) => (isNil(record[field]) ? '' : String(record[field]).trim()))
    .filter(Boolean)
    .join(' ');
}

// ============================================================================
// HUMAN ENTITY NAME FUNCTIONS
// ============================================================================

/**
 * Generate full name for HUMAN entities (user, customer, technician)
 *
 * @param {Object} entity - Entity with first_name and last_name fields
 * @returns {string} Full name in "First Last" format
 *
 * @example
 * fullName({ first_name: 'Jane', last_name: 'Smith' }) // 'Jane Smith'
 * fullName({ first_name: 'Jane' }) // 'Jane'
 * fullName({}) // ''
 */
function fullName(entity) {
  return composeFields(entity, ['first_name', 'last_name']);
}

/**
 * Generate sort name for HUMAN entities (Last, First format)
 *
 * @param {Object} entity - Entity with first_name and last_name fields
 * @returns {string} Sort name in "Last, First" format
 *
 * @example
 * sortName({ first_name: 'Jane', last_name: 'Smith' }) // 'Smith, Jane'
 */
function sortName(entity) {
  if (!entity) {
    return '';
  }

  const first = (entity.first_name || '').trim();
  const last = (entity.last_name || '').trim();

  if (last && first) {
    return `${last}, ${first}`;
  }
  return last || first || '';
}

/**
 * Get display name with fallback to email username
 *
 * @param {Object} entity - Entity with first_name and/or email
 * @returns {string} Display name (first_name or email username)
 *
 * @example
 * displayName({ first_name: 'Jane', email: 'jane@example.com' }) // 'Jane'
 * displayName({ email: 'jane@example.com' }) // 'jane'
 */
function displayName(entity) {
  if (!entity) {
    return '';
  }

  if (entity.first_name) {
    return entity.first_name.trim();
  }

  if (entity.email) {
    return entity.email.split('@')[0];
  }

  return '';
}

// ============================================================================
// TEXT UTILITIES
// ============================================================================

/**
 * Truncate text to specified length with ellipsis
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 *
 * @example
 * truncate('This is a long description', 10) // 'This is a...'
 */
function truncate(text, maxLength = 30) {
  if (!text) {
    return '';
  }

  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return trimmed.slice(0, maxLength).trim() + '...';
}

// ============================================================================
// COMPUTED ENTITY NAME FUNCTIONS
// ============================================================================

/**
 * Compute name for COMPUTED entities (work_order, invoice, contract)
 * Template format: "{customer.fullName}: {summary}: {identifier}"
 *
 * @param {Object} options - Options for computing name
 * @param {Object} options.entity - The entity (work_order, invoice, contract)
 * @param {Object} options.customer - Related customer entity
 * @param {string} options.identifierField - Name of identifier field (e.g., 'work_order_number')
 * @returns {string} Computed name
 *
 * @example
 * computeName({
 *   entity: { summary: 'Fix kitchen sink', work_order_number: 'WO-2024-0001' },
 *   customer: { first_name: 'Jane', last_name: 'Smith' },
 *   identifierField: 'work_order_number'
 * })
 * // Returns: 'Jane Smith: Fix kitchen sink: WO-2024-0001'
 */
function computeName({ entity, customer, identifierField }) {
  if (!entity) {
    return '';
  }

  const customerName = customer ? fullName(customer) : 'Unknown Customer';
  const summary = truncate(entity.summary || '', 50);
  const identifier = entity[identifierField] || '';

  // Build name parts, filtering out empty values
  const parts = [customerName];
  if (summary) {
    parts.push(summary);
  }
  if (identifier) {
    parts.push(identifier);
  }

  return parts.join(': ');
}

/**
 * Format a template string with entity data
 * Supports simple {field} and {field.subfield} notation
 *
 * @param {string} template - Template string with {field} placeholders
 * @param {Object} data - Data object to fill placeholders
 * @returns {string} Formatted string
 *
 * @example
 * formatTemplate('{first_name} {last_name}', { first_name: 'Jane', last_name: 'Smith' })
 * // Returns: 'Jane Smith'
 */
function formatTemplate(template, data) {
  if (!template || !data) {
    return template || '';
  }

  return template.replace(/\{([^}]+)\}/g, (match, path) => {
    const parts = path.split('.');
    let value = data;

    for (const part of parts) {
      if (isNil(value)) {
        return '';
      }
      value = value[part];
    }

    return isNil(value) ? '' : String(value);
  });
}

// ============================================================================
// DISPLAY-NAME RESOLUTION (SSOT)
// ============================================================================

/**
 * Resolve an entity's human-readable display name from its metadata strategy.
 *
 * The single runtime entry point for "what do we show for this row". Keyed on
 * `metadata.namePattern`:
 * - HUMAN    -> compose `displayFields` (default ['first_name','last_name'])
 * - anything with a singular `displayField` -> that column's value
 *   (SIMPLE authored `name`, COMPUTED identifier, custom company_name/unit_identifier)
 * - otherwise -> '' (junction/system tables have no display name)
 *
 * @param {Object} record - Entity row (or a write payload)
 * @param {Object} metadata - Entity metadata (namePattern, displayFields, displayField)
 * @returns {string} Display name ('' when none resolves)
 */
function resolveDisplayName(record, metadata) {
  if (!record || !metadata) {
    return '';
  }

  if (metadata.namePattern === NAME_PATTERNS.HUMAN) {
    const fields =
      Array.isArray(metadata.displayFields) && metadata.displayFields.length > 0
        ? metadata.displayFields
        : ['first_name', 'last_name'];
    return composeFields(record, fields);
  }

  if (typeof metadata.displayField === 'string' && metadata.displayField) {
    const value = record[metadata.displayField];
    return isNil(value) ? '' : String(value).trim();
  }

  return '';
}

// ============================================================================
// SQL EXPRESSION (SSOT for the HUMAN GENERATED column — consumed by P2)
// ============================================================================

/**
 * Build the SQL expression that composes a HUMAN display name, for use in a
 * Postgres `GENERATED ALWAYS AS (<expr>) STORED` column (UDN P2).
 *
 * Mirrors `composeFields` exactly: each column is trimmed, empty values become
 * NULL, non-null parts are joined by a single space, and an all-empty result
 * collapses to NULL (which is the SQL twin of the JS ''). A parity test asserts
 * the two implementations agree.
 *
 * @param {string[]} [fields=['first_name','last_name']] - Columns to compose
 * @param {Object} [options]
 * @param {string} [options.alias=''] - Optional table alias to qualify columns
 * @returns {string} SQL scalar expression
 *
 * @example
 * buildHumanNameSqlExpr(['first_name', 'last_name'])
 * // "NULLIF(TRIM(COALESCE(NULLIF(TRIM(first_name), '') || ' ', '') || COALESCE(NULLIF(TRIM(last_name), '') || ' ', '')), '')"
 */
function buildHumanNameSqlExpr(fields = ['first_name', 'last_name'], options = {}) {
  const { alias = '' } = options;
  const qualify = (col) => (alias ? `${alias}.${col}` : col);
  // Each field contributes its trimmed value + a trailing space, or '' when
  // empty/NULL, joined with the IMMUTABLE || operator. CONCAT_WS is only STABLE,
  // so Postgres REJECTS it in a GENERATED column. Outer TRIM drops the separator
  // space(s); NULLIF collapses an all-empty result to NULL (the SQL twin of '').
  const parts = fields
    .map((col) => `COALESCE(NULLIF(TRIM(${qualify(col)}), '') || ' ', '')`)
    .join(' || ');
  return `NULLIF(TRIM(${parts}), '')`;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Field composition primitive
  composeFields,

  // HUMAN entity functions
  fullName,
  sortName,
  displayName,

  // Text utilities
  truncate,

  // COMPUTED entity functions
  computeName,
  formatTemplate,

  // Display-name resolution (SSOT)
  resolveDisplayName,
  buildHumanNameSqlExpr,
};
