/**
 * User Model Metadata
 *
 * SRP: ONLY defines User table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for User model query and CRUD capabilities
 */

module.exports = {
  // Table name in database
  tableName: 'users',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // AUTH0 CONFIGURATION
  // ============================================================================

  /**
   * Default role name for new users created via Auth0 SSO
   * Used when JWT token doesn't include a role claim
   * CONFIGURABLE - no hardcoding in User model!
   */
  defaultRoleName: 'customer',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The human-readable identifier field (not the PK)
   * Used for: Display names, search results, logging
   */
  identityField: 'email',

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'users',

  // ============================================================================
  // OUTPUT FILTERING (for API responses)
  // ============================================================================

  /**
   * Fields that should NEVER be returned in API responses
   * These are filtered out by output-filter-helper in addition to
   * the global ALWAYS_SENSITIVE list.
   *
   * NOTE: auth0_id is already in ALWAYS_SENSITIVE, but listed here
   * for clarity that it's the only sensitive field on users.
   * We use Auth0 for auth - we do NOT store passwords.
   */
  sensitiveFields: ['auth0_id'],

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['email', 'first_name', 'last_name'],

  /**
   * Fields that can be set during CREATE
   * Excludes: id, created_at, updated_at (system-managed)
   */
  createableFields: ['email', 'auth0_id', 'first_name', 'last_name', 'role_id', 'status'],

  /**
   * Fields that can be modified during UPDATE
   * Excludes: id, email (immutable), auth0_id (immutable), created_at
   */
  updateableFields: ['first_name', 'last_name', 'role_id', 'status', 'is_active'],

  // ============================================================================
  // DELETE CONFIGURATION (for GenericEntityService.delete)
  // ============================================================================

  /**
   * Dependent records that must be cascade-deleted before this entity
   * Only for relationships NOT handled by database ON DELETE CASCADE/SET NULL
   *
   * Note: refresh_tokens has ON DELETE CASCADE (DB handles it)
   * For audit_logs: Two cascades needed:
   *   1. Logs ABOUT this user (polymorphic: resource_type='users')
   *   2. Logs BY this user (simple FK: user_id)
   */
  dependents: [
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'users' },
    },
    {
      table: 'audit_logs',
      foreignKey: 'user_id',
    },
  ],

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
   * Relationships to JOIN by default in all queries (findById, findAll, findByField)
   * These are included automatically without needing to specify 'include' option
   * Use this for relationships that are almost always needed (like role for user)
   */
  defaultIncludes: ['role'],

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
    // Multi-profile support: User can have BOTH customer AND technician profiles
    // These are independent of role_id (RBAC) - they link to profile data
    customerProfile: {
      type: 'belongsTo',
      foreignKey: 'customer_profile_id',
      table: 'customers',
      fields: ['id', 'email', 'company_name', 'status'],
      description: 'Optional customer profile (service recipient data)',
    },
    technicianProfile: {
      type: 'belongsTo',
      foreignKey: 'technician_profile_id',
      table: 'technicians',
      fields: ['id', 'license_number', 'status'],
      description: 'Optional technician profile (worker certification data)',
    },
  },

  // ============================================================================
  // FIELD DEFINITIONS (for validation & documentation)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    email: { type: 'string', required: true, maxLength: 255 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['pending_activation', 'active', 'suspended'],
      default: 'active',
    },

    // Entity-specific fields
    auth0_id: { type: 'string', maxLength: 255, readonly: true },
    first_name: { type: 'string', maxLength: 100 },
    last_name: { type: 'string', maxLength: 100 },
    role_id: { type: 'integer' },

    // Multi-profile FKs (readonly - managed via profile creation flows)
    customer_profile_id: {
      type: 'integer',
      readonly: true,
      description: 'FK to customers table - set when user becomes a customer',
    },
    technician_profile_id: {
      type: 'integer',
      readonly: true,
      description: 'FK to technicians table - set when user becomes a technician',
    },
  },
};
