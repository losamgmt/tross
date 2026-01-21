/**
 * Name Utilities for Test Data Generation
 *
 * TEST HELPER: These utilities are used for generating test data.
 * If production code needs these functions, promote this file back to utils/.
 *
 * Provides consistent name handling across all entity categories:
 * - HUMAN entities: fullName from first_name + last_name
 * - COMPUTED entities: name from template with related data
 *
 * @module __tests__/helpers/name-utils
 */

'use strict';

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
  if (!entity) {
    return '';
  }

  const first = (entity.first_name || '').trim();
  const last = (entity.last_name || '').trim();

  return [first, last].filter(Boolean).join(' ');
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
      if (value === null || value === undefined) {
        return '';
      }
      value = value[part];
    }

    return value !== null && value !== undefined ? String(value) : '';
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // HUMAN entity functions
  fullName,
  sortName,
  displayName,

  // Text utilities
  truncate,

  // COMPUTED entity functions
  computeName,
  formatTemplate,
};
