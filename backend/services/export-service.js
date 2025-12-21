/**
 * Export Service - CSV Generation for Entity Data
 *
 * SRP: ONLY handles generating CSV exports from entity queries
 *
 * FEATURES:
 * - Full query results (no pagination limits)
 * - Respects filters, search, sort
 * - RLS-aware (user only sees what they're allowed to)
 * - Streaming support for large datasets
 * - Configurable column selection
 *
 * ARCHITECTURE:
 * - Reuses GenericEntityService query building patterns
 * - Returns stream for memory efficiency
 * - Extensible for future formats (Excel, JSON, etc.)
 */

const allMetadata = require('../config/models');
const { logger } = require('../config/logger');
const db = require('../db/connection');
const QueryBuilderService = require('./query-builder-service');
const { buildRLSFilter } = require('../db/helpers/rls-filter-helper');

/**
 * Escape a value for CSV format
 * - Wraps in quotes if contains comma, quote, or newline
 * - Escapes internal quotes by doubling them
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Check if escaping is needed
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(rows, columns) {
  if (!rows || rows.length === 0) {
    // Return headers only
    return columns.map(col => escapeCSVValue(col.label)).join(',') + '\n';
  }

  // Header row
  const header = columns.map(col => escapeCSVValue(col.label)).join(',');

  // Data rows
  const dataRows = rows.map(row => {
    return columns.map(col => {
      const value = row[col.field];
      return escapeCSVValue(value);
    }).join(',');
  });

  return [header, ...dataRows].join('\n') + '\n';
}

class ExportService {
  /**
   * Export entity data to CSV format
   *
   * @param {string} entityName - Entity name (e.g., 'work_order', 'customer')
   * @param {Object} options - Query options (search, filters, sort)
   * @param {Object} [rlsContext] - RLS context from middleware
   * @param {string[]} [selectedFields] - Specific fields to export (null = all exportable)
   * @returns {Promise<{csv: string, filename: string, count: number}>}
   */
  static async exportToCSV(entityName, options = {}, rlsContext = null, selectedFields = null) {
    const metadata = allMetadata[entityName];

    if (!metadata) {
      throw new Error(`Unknown entity: ${entityName}`);
    }

    const {
      tableName,
      searchableFields = [],
      filterableFields = [],
      sortableFields = [],
      defaultSort = { field: 'id', order: 'ASC' },
      exportableFields = null, // Explicit export list, or derive from fields
      fields = {},
    } = metadata;

    // Normalize fields to array format: { fieldName: {...} } → [{ name, label, ... }]
    const fieldsArray = Array.isArray(fields)
      ? fields
      : Object.entries(fields).map(([name, def]) => ({
        name,
        label: this._formatLabel(name),
        ...def,
      }));

    // Determine which fields to export
    // Priority: selectedFields param > metadata.exportableFields > all non-sensitive fields
    let columnsToExport;
    const sensitiveFields = new Set(['auth0_id', 'refresh_token', 'api_key', 'password']);

    if (selectedFields && selectedFields.length > 0) {
      // User-specified fields
      columnsToExport = selectedFields
        .map(fieldName => {
          const fieldDef = fieldsArray.find(f => f.name === fieldName);
          return fieldDef ? { field: fieldName, label: fieldDef.label || this._formatLabel(fieldName) } : null;
        })
        .filter(Boolean);
    } else if (exportableFields && exportableFields.length > 0) {
      // Metadata-defined exportable fields
      columnsToExport = exportableFields
        .map(fieldName => {
          const fieldDef = fieldsArray.find(f => f.name === fieldName);
          return fieldDef ? { field: fieldName, label: fieldDef.label || this._formatLabel(fieldName) } : null;
        })
        .filter(Boolean);
    } else {
      // Default: all fields except sensitive ones
      columnsToExport = fieldsArray
        .filter(f => !sensitiveFields.has(f.name) && !f.sensitive)
        .map(f => ({ field: f.name, label: f.label || f.name }));
    }

    if (columnsToExport.length === 0) {
      throw new Error(`No exportable fields found for entity: ${entityName}`);
    }

    // Build query (similar to findAll but no pagination)
    const search = QueryBuilderService.buildSearchClause(
      options.search,
      searchableFields,
      tableName,
    );

    const filterOptions = { ...options.filters };

    // Always filter to active records unless explicitly including inactive
    if (!options.includeInactive) {
      filterOptions.is_active = true;
    }

    const filters = QueryBuilderService.buildFilterClause(
      filterOptions,
      filterableFields,
      search ? search.paramOffset : 0,
      tableName,
    );

    const whereClauses = [search?.clause, filters?.clause].filter(Boolean);
    const params = [
      ...(search?.params || []),
      ...(filters?.params || []),
    ];

    // Apply RLS filter
    if (rlsContext) {
      const rlsFilter = buildRLSFilter(rlsContext, metadata, params.length);

      if (rlsFilter.clause) {
        whereClauses.push(rlsFilter.clause);
        params.push(...rlsFilter.params);
      }

      logger.debug('[ExportService] RLS applied', {
        entity: entityName,
        policy: rlsContext.policy,
        applied: rlsFilter.applied,
      });
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const sortClause = QueryBuilderService.buildSortClause(
      options.sortBy,
      options.sortOrder,
      sortableFields,
      defaultSort,
      tableName,
    );

    // Select only the fields we're exporting
    const selectFields = columnsToExport.map(c => `${tableName}.${c.field}`).join(', ');

    // Query without LIMIT - get all matching records
    const query = `
      SELECT ${selectFields}
      FROM ${tableName}
      ${whereClause}
      ORDER BY ${sortClause}
    `;

    logger.info('[ExportService] Executing export query', {
      entity: entityName,
      columns: columnsToExport.length,
      whereClause: whereClause || '(none)',
    });

    const result = await db.query(query, params);

    // Generate CSV
    const csv = convertToCSV(result.rows, columnsToExport);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `${entityName}_export_${timestamp}.csv`;

    logger.info('[ExportService] Export complete', {
      entity: entityName,
      rowCount: result.rows.length,
      filename,
    });

    return {
      csv,
      filename,
      count: result.rows.length,
      columns: columnsToExport.map(c => c.label),
    };
  }

  /**
   * Get exportable fields for an entity
   * Useful for UI to show column selection
   */
  static getExportableFields(entityName) {
    const metadata = allMetadata[entityName];

    if (!metadata) {
      throw new Error(`Unknown entity: ${entityName}`);
    }

    const { fields = {}, exportableFields = null } = metadata;
    const sensitiveFields = new Set(['auth0_id', 'refresh_token', 'api_key', 'password']);

    // Normalize fields to array format
    const fieldsArray = Array.isArray(fields)
      ? fields
      : Object.entries(fields).map(([name, def]) => ({
        name,
        label: this._formatLabel(name),
        ...def,
      }));

    if (exportableFields && exportableFields.length > 0) {
      return exportableFields
        .map(fieldName => {
          const fieldDef = fieldsArray.find(f => f.name === fieldName);
          return fieldDef ? { field: fieldName, label: fieldDef.label || this._formatLabel(fieldName) } : null;
        })
        .filter(Boolean);
    }

    return fieldsArray
      .filter(f => !sensitiveFields.has(f.name) && !f.sensitive)
      .map(f => ({ field: f.name, label: f.label || f.name }));
  }

  /**
   * Format a field name as a human-readable label
   * e.g., 'first_name' → 'First Name'
   */
  static _formatLabel(fieldName) {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

module.exports = ExportService;
