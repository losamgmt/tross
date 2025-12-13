/**
 * User Model Metadata
 *
 * SRP: ONLY defines User table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 *
 * SINGLE SOURCE OF TRUTH for User model query capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'users',

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
    'first_name',
    'last_name',
    'email',
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
    'email',
    'auth0_id',
    'first_name',
    'last_name',
    'role_id',
    'is_active',
    'status',
    'created_at',
    'updated_at',
  ],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  /**
   * Fields that can be used in ORDER BY clauses
   * All non-sensitive fields are sortable by default
   */
  sortableFields: [
    'id',
    'email',
    'first_name',
    'last_name',
    'role_id',
    'is_active',
    'status',
    'created_at',
    'updated_at',
  ],

  /**
   * Default sort when no sortBy specified
   */
  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  // ============================================================================
  // SECURITY CONFIGURATION
  // ============================================================================

  /**
   * Fields to EXCLUDE from SELECT statements (security)
   * These should never be returned to clients
   */
  excludedFields: [
    // Users table doesn't store passwords (Auth0 handles that)
    // But this is where we'd list sensitive fields
  ],

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
    role: {
      type: 'belongsTo',
      foreignKey: 'role_id',
      table: 'roles',
      fields: ['id', 'name', 'description', 'priority'],
    },
  },
};
