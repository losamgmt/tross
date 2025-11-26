/**
 * Update Helper Utilities
 *
 * Provides reusable utilities for UPDATE operations across all models:
 * - Dynamic SET clause building with allowedFields filtering
 * - JSONB field handling with type casting
 * - String trimming for specific fields
 *
 * SINGLE RESPONSIBILITY: Build UPDATE query components
 * YAGNI: Only includes utilities for ACTUALLY duplicated code (SET clause building)
 */

/**
 * Build dynamic SET clause for UPDATE queries
 *
 * @param {Object} data - Update data from request
 * @param {string[]} allowedFields - Whitelist of updatable fields
 * @param {Object} [options] - Optional configuration
 * @param {string[]} [options.jsonbFields] - Fields that need ::jsonb casting
 * @param {string[]} [options.trimFields] - Fields that should be trimmed
 *
 * @returns {Object} { updates: string[], values: any[], hasUpdates: boolean }
 *
 * @example
 * // Simple usage
 * const { updates, values } = buildUpdateClause(
 *   { email: 'new@example.com', phone: '555-1234' },
 *   ['email', 'phone', 'company_name']
 * );
 * // Returns: { updates: ['email = $1', 'phone = $2'], values: ['new@example.com', '555-1234'] }
 *
 * @example
 * // With JSONB fields
 * const { updates, values } = buildUpdateClause(
 *   { skills: ['JavaScript', 'Node.js'], hourly_rate: 75 },
 *   ['skills', 'hourly_rate', 'certifications'],
 *   { jsonbFields: ['skills', 'certifications'] }
 * );
 * // Returns: { updates: ['skills = $1::jsonb', 'hourly_rate = $2'], values: ['["JavaScript","Node.js"]', 75] }
 *
 * @example
 * // With field trimming
 * const { updates, values } = buildUpdateClause(
 *   { email: '  user@example.com  ', company_name: '  Acme Corp  ' },
 *   ['email', 'company_name', 'phone'],
 *   { trimFields: ['email', 'company_name'] }
 * );
 * // Returns: { updates: ['email = $1', 'company_name = $2'], values: ['user@example.com', 'Acme Corp'] }
 */
function buildUpdateClause(data, allowedFields, options = {}) {
  const { jsonbFields = [], trimFields = [] } = options;

  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    // Skip fields that are not allowed or undefined
    if (!allowedFields.includes(key) || value === undefined) {
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
};
