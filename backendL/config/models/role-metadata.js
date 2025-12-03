/**
 * Role Model Metadata
 *
 * SRP: ONLY defines Role table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 *
 * SINGLE SOURCE OF TRUTH for Role model query capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'roles',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: [
    'name',
    'description',
  ],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'name',
    'description',
    'priority',
    'is_active',
    'is_system_role',
    'created_at',
    'updated_at',
  ],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  /**
   * Fields that can be used in ORDER BY clauses
   * All fields are sortable by default
   */
  sortableFields: [
    'id',
    'name',
    'description',
    'priority',
    'is_active',
    'is_system_role',
    'created_at',
    'updated_at',
  ],

  /**
   * Default sort when no sortBy specified
   * Roles sorted by priority (highest first) for logical display
   */
  defaultSort: {
    field: 'priority',
    order: 'DESC',
  },

  // ============================================================================
  // SECURITY CONFIGURATION
  // ============================================================================

  /**
   * Fields to EXCLUDE from SELECT statements (security)
   * Roles have no sensitive fields
   */
  excludedFields: [],

  /**
   * Fields that require special permissions to filter/sort
   * (Future: for admin-only fields)
   */
  restrictedFields: [],

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  /**
   * Foreign key relationships
   * Used for JOIN generation and validation
   */
  relationships: {
    permissions: {
      type: 'hasMany',
      foreignKey: 'role_id',
      table: 'role_permissions',
      through: 'permissions',
      fields: ['id', 'permission_name', 'resource', 'action'],
    },
    users: {
      type: 'hasMany',
      foreignKey: 'role_id',
      table: 'users',
      fields: ['id', 'email', 'first_name', 'last_name'],
    },
  },
};
