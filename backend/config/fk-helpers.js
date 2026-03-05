/**
 * Foreign Key Helpers
 *
 * SSOT: FK definitions live in entity metadata `fields` section with
 * `type: 'foreignKey'` and `relatedEntity`.
 *
 * This module provides utilities to extract FK info from metadata,
 * eliminating the need for a separate `foreignKeys` section.
 */

/**
 * Convert snake_case to Title Case
 * @param {string} str - Snake case string (e.g., 'customer_id')
 * @returns {string} Title case string (e.g., 'Customer Id')
 */
function snakeToTitleCase(str) {
  return str
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Extract foreign key field definitions from metadata fields.
 *
 * Returns an object mapping FK field names to their config:
 * {
 *   customer_id: { relatedEntity: 'customer', displayField: 'email' },
 *   role_id: { relatedEntity: 'role', displayField: 'name' }
 * }
 *
 * @param {object} meta - Entity metadata with `fields` property
 * @returns {object} Map of FK field names to their config
 */
function extractForeignKeyFields(meta) {
  const result = {};
  const fields = meta.fields || {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (fieldDef.type === 'foreignKey' && fieldDef.relatedEntity) {
      result[fieldName] = {
        relatedEntity: fieldDef.relatedEntity,
        displayField: fieldDef.displayField,
        displayFields: fieldDef.displayFields,
        displayTemplate: fieldDef.displayTemplate,
      };
    }
  }

  return result;
}

/**
 * Get FK field names as a Set (for quick lookups).
 *
 * @param {object} meta - Entity metadata with `fields` property
 * @returns {Set<string>} Set of FK field names
 */
function getForeignKeyFieldNames(meta) {
  const result = new Set();
  const fields = meta.fields || {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (fieldDef.type === 'foreignKey' && fieldDef.relatedEntity) {
      result.add(fieldName);
    }
  }

  return result;
}

/**
 * Build FK display names for error messages.
 *
 * Returns: { customer_id: 'Customer', role_id: 'Role' }
 *
 * @param {object} meta - Entity metadata with `fields` property
 * @param {object} [allModels] - All metadata for looking up display names
 * @returns {object} Map of FK field names to display names
 */
function buildFkDisplayNames(meta, allModels = {}) {
  const result = {};
  const fields = meta.fields || {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (fieldDef.type === 'foreignKey' && fieldDef.relatedEntity) {
      // Try to get display name from related entity metadata
      const relatedMeta = allModels[fieldDef.relatedEntity];
      if (relatedMeta?.displayName) {
        result[fieldName] = relatedMeta.displayName;
      } else {
        // Fallback: title-case the relatedEntity
        result[fieldName] = snakeToTitleCase(fieldDef.relatedEntity);
      }
    }
  }

  return result;
}

/**
 * Get the target table name for a foreign key field.
 *
 * @param {object} meta - Entity metadata with `fields` property
 * @param {string} fkFieldName - FK field name (e.g., 'customer_id')
 * @param {object} allModels - All metadata for looking up table names
 * @returns {string|null} Table name or null if not found
 */
function getFkTargetTable(meta, fkFieldName, allModels) {
  const fieldDef = meta.fields?.[fkFieldName];
  if (!fieldDef || fieldDef.type !== 'foreignKey' || !fieldDef.relatedEntity) {
    return null;
  }

  const relatedMeta = allModels[fieldDef.relatedEntity];
  return relatedMeta?.tableName || null;
}

module.exports = {
  extractForeignKeyFields,
  getForeignKeyFieldNames,
  buildFkDisplayNames,
  getFkTargetTable,
  snakeToTitleCase,
};
