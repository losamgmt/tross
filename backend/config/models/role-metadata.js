/**
 * Role Model Metadata
 *
 * SRP: ONLY defines Role table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Role model query and CRUD capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'roles',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The human-readable identifier field (not the PK)
   * Used for: Display names, search results, logging
   */
  identityField: 'name',

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'roles',

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['name', 'priority'],

  /**
   * Fields that can be set during CREATE
   * Excludes: id, created_at, updated_at (system-managed)
   */
  createableFields: ['name', 'description', 'priority', 'status'],

  /**
   * Fields that can be modified during UPDATE
   * Excludes: id, name (immutable after creation), created_at
   */
  updateableFields: ['description', 'priority', 'status', 'is_active'],

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
    'status',
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
    'status',
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

  // ============================================================================
  // FIELD DEFINITIONS (for validation & documentation)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    name: { type: 'string', required: true, maxLength: 50 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Lifecycle status
    status: {
      type: 'string',
      enum: ['active', 'disabled'],
      default: 'active',
      description: 'Role lifecycle state - disabled roles cannot be newly assigned',
    },

    // Entity-specific fields
    description: { type: 'text' },
    priority: { type: 'integer', required: true, min: 1 },
  },
};
