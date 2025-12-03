/**
 * Schema Introspection Service
 *
 * SINGLE SOURCE OF TRUTH: PostgreSQL information_schema
 *
 * Introspects database schema at runtime to auto-generate:
 * - UI field types
 * - Validation rules
 * - Form configs
 * - Table configs
 *
 * Philosophy: Database schema drives EVERYTHING.
 * Add a column → UI updates automatically.
 */

const db = require('../db/connection');

class SchemaIntrospectionService {
  /**
   * Get complete schema metadata for a table
   *
   * @param {string} tableName - Table to introspect
   * @returns {Promise<Object>} Schema metadata
   */
  async getTableSchema(tableName) {
    const [columns, constraints, foreignKeys, indexes] = await Promise.all([
      this._getColumns(tableName),
      this._getConstraints(tableName),
      this._getForeignKeys(tableName),
      this._getIndexes(tableName),
    ]);

    return {
      tableName,
      columns: this._enrichColumns(columns, foreignKeys),
      constraints,
      foreignKeys,
      indexes,
      displayName: this._generateDisplayName(tableName),
    };
  }

  /**
   * Get all available tables in public schema
   */
  async getAllTables() {
    const result = await db.query(`
      SELECT 
        table_name,
        obj_description((table_schema || '.' || table_name)::regclass) as description
      FROM information_schema.tables 
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    return result.rows.map((row) => ({
      name: row.table_name,
      displayName: this._generateDisplayName(row.table_name),
      description: row.description,
    }));
  }

  /**
   * Get column information from information_schema
   * @private
   */
  async _getColumns(tableName) {
    const result = await db.query(
      `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        udt_name,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
      [tableName],
    );

    return result.rows;
  }

  /**
   * Get table constraints (PRIMARY KEY, UNIQUE, CHECK)
   * @private
   */
  async _getConstraints(tableName) {
    const result = await db.query(
      `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
    `,
      [tableName],
    );

    return result.rows;
  }

  /**
   * Get foreign key relationships
   * @private
   */
  async _getForeignKeys(tableName) {
    const result = await db.query(
      `
      SELECT 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.key_column_usage AS kcu
      JOIN information_schema.referential_constraints AS rc
        ON kcu.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON rc.constraint_name = ccu.constraint_name
      WHERE kcu.table_schema = 'public'
        AND kcu.table_name = $1
        AND EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          WHERE tc.constraint_name = kcu.constraint_name
            AND tc.constraint_type = 'FOREIGN KEY'
        )
    `,
      [tableName],
    );

    return result.rows;
  }

  /**
   * Get table indexes
   * @private
   */
  async _getIndexes(tableName) {
    const result = await db.query(
      `
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = $1
    `,
      [tableName],
    );

    return result.rows;
  }

  /**
   * Enrich column metadata with UI hints and foreign key info
   * @private
   */
  _enrichColumns(columns, foreignKeys) {
    const fkMap = new Map(
      foreignKeys.map((fk) => [
        fk.column_name,
        {
          table: fk.foreign_table_name,
          column: fk.foreign_column_name,
          updateRule: fk.update_rule,
          deleteRule: fk.delete_rule,
        },
      ]),
    );

    return columns.map((col) => {
      const foreignKey = fkMap.get(col.column_name);

      return {
        name: col.column_name,
        type: this._mapPostgreSQLType(col.data_type, col.udt_name),
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        maxLength: col.character_maximum_length,
        precision: col.numeric_precision,
        scale: col.numeric_scale,
        position: col.ordinal_position,

        // UI metadata (inferred from schema)
        uiType: this._inferUIType(col, foreignKey),
        label: this._generateLabel(col.column_name),
        readonly: this._isReadonly(col.column_name),
        searchable: this._isSearchable(col),
        sortable: true,

        // Foreign key info
        foreignKey: foreignKey || null,
      };
    });
  }

  /**
   * Map PostgreSQL types to generic types
   * @private
   */
  _mapPostgreSQLType(dataType, udtName) {
    const typeMap = {
      integer: 'number',
      bigint: 'number',
      smallint: 'number',
      numeric: 'number',
      real: 'number',
      'double precision': 'number',
      'character varying': 'string',
      character: 'string',
      text: 'string',
      boolean: 'boolean',
      'timestamp without time zone': 'datetime',
      'timestamp with time zone': 'datetime',
      date: 'date',
      time: 'time',
      uuid: 'string',
      json: 'json',
      jsonb: 'json',
    };

    return typeMap[dataType] || typeMap[udtName] || 'string';
  }

  /**
   * Infer UI input type from column metadata
   * @private
   */
  _inferUIType(column, foreignKey) {
    const { column_name, data_type } = column;

    // System fields (readonly) - Contract v2.0
    if (
      ['id', 'created_at', 'updated_at'].includes(
        column_name,
      )
    ) {
      return 'readonly';
    }

    // Foreign keys → select dropdown
    if (foreignKey) {
      return 'select';
    }

    // Email detection
    if (column_name.includes('email')) {
      return 'email';
    }

    // URL detection
    if (column_name.includes('url') || column_name.includes('website')) {
      return 'url';
    }

    // Phone detection
    if (column_name.includes('phone') || column_name.includes('tel')) {
      return 'tel';
    }

    // Boolean → toggle
    if (data_type === 'boolean') {
      return 'boolean';
    }

    // Text → textarea
    if (data_type === 'text') {
      return 'textarea';
    }

    // Timestamps → datetime picker
    if (data_type.includes('timestamp')) {
      return 'datetime';
    }

    // Date → date picker
    if (data_type === 'date') {
      return 'date';
    }

    // Numbers
    if (
      data_type.includes('int') ||
      data_type.includes('numeric') ||
      data_type === 'real' ||
      data_type === 'double precision'
    ) {
      return 'number';
    }

    // JSON → code editor
    if (data_type === 'json' || data_type === 'jsonb') {
      return 'json';
    }

    // Default
    return 'text';
  }

  /**
   * Generate human-readable label from column name
   * @private
   */
  _generateLabel(columnName) {
    // Special cases
    const specialLabels = {
      id: 'ID',
      email: 'Email Address',
      auth0_id: 'Auth0 ID',
      role_id: 'Role',
      is_active: 'Active',
      created_at: 'Created',
      updated_at: 'Last Updated',
    };

    if (specialLabels[columnName]) {
      return specialLabels[columnName];
    }

    // Convert snake_case to Title Case
    return columnName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate display name for table
   * @private
   */
  _generateDisplayName(tableName) {
    // Special cases
    const specialNames = {
      users: 'Users',
      roles: 'Roles',
      audit_logs: 'Audit Logs',
      refresh_tokens: 'Refresh Tokens',
    };

    if (specialNames[tableName]) {
      return specialNames[tableName];
    }

    // Convert snake_case to Title Case (singular)
    return tableName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Determine if field should be readonly in forms
   * @private
   */
  _isReadonly(columnName) {
    // Contract v2.0: Readonly fields (cached from audit_logs or auto-managed)
    const readonlyFields = [
      'id',
      'created_at',
      'updated_at',
    ];

    return readonlyFields.includes(columnName);
  }

  /**
   * Determine if field should be searchable
   * @private
   */
  _isSearchable(column) {
    const { column_name, data_type } = column;

    // Don't search IDs or timestamps
    if (column_name === 'id' || column_name.endsWith('_at')) {
      return false;
    }

    // Only search text and varchar fields
    return (
      data_type === 'text' ||
      data_type === 'character varying' ||
      data_type === 'character'
    );
  }

  /**
   * Get select options for a foreign key field
   *
   * @param {string} tableName - Referenced table
   * @param {string} valueColumn - Column to use as value (default: 'id')
   * @param {string} labelColumn - Column to use as label (default: 'name')
   * @returns {Promise<Array>} Array of {value, label} objects
   */
  async getForeignKeyOptions(
    tableName,
    valueColumn = 'id',
    labelColumn = 'name',
  ) {
    // Try to find a name-like column
    const nameColumns = ['name', 'title', 'email', 'description'];
    const schema = await this.getTableSchema(tableName);

    // Find best label column
    let actualLabelColumn = labelColumn;
    if (!schema.columns.find((c) => c.name === labelColumn)) {
      actualLabelColumn =
        schema.columns.find((c) => nameColumns.includes(c.name))?.name ||
        schema.columns[1]?.name ||
        valueColumn;
    }

    const result = await db.query(
      `SELECT ${valueColumn} as value, ${actualLabelColumn} as label 
       FROM ${tableName} 
       WHERE is_active = true 
       ORDER BY ${actualLabelColumn}`,
    );

    return result.rows;
  }
}

module.exports = new SchemaIntrospectionService();
