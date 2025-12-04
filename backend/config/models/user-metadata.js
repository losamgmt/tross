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
