/**
 * Role Model Metadata
 *
 * SRP: ONLY defines Role table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Role model query and CRUD capabilities
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');

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
   * Whether the identity field has a UNIQUE constraint in the database
   * Used for duplicate rejection tests
   */
  identityFieldUnique: true,

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
   * Note: priority is optional - defaults to max + 1 via default-value-helper
   */
  requiredFields: ['name'],

  /**
   * Fields that CANNOT be modified during UPDATE (immutable after creation)
   * All other fields in the table are allowed.
   * Universal immutables (id, created_at) are always excluded automatically via ENTITY_FIELDS constant.
   *
   * Empty array = only universal immutables apply (all business fields are editable)
   */
  immutableFields: [],

  // ============================================================================
  // FIELD ACCESS CONTROL (role-based field-level CRUD permissions)
  // ============================================================================
  // Each field specifies the MINIMUM role required for each CRUD operation.
  // Permissions accumulate UPWARD: manager has all dispatcher + technician + customer permissions.
  // Universal fields (id, is_active, created_at, updated_at, status) are in UNIVERSAL_FIELD_ACCESS.
  // Use FAL shortcuts for common patterns, or define custom { create, read, update, delete }.

  fieldAccess: {
    // Entity Contract v2.0 fields (id, is_active, created_at, updated_at, status)
    ...UNIVERSAL_FIELD_ACCESS,

    // Name - the role identifier, admin-only management
    name: {
      create: 'admin',
      read: 'customer', // Everyone can see role names
      update: 'admin',
      delete: 'none',
    },

    // Description - role explanation, admin-only management
    description: {
      create: 'admin',
      read: 'customer', // Everyone can see role descriptions
      update: 'admin',
      delete: 'none',
    },

    // Priority - role hierarchy level, admin-only management
    priority: {
      create: 'admin',
      read: 'manager', // Only manager+ need to see priority
      update: 'admin',
      delete: 'none',
    },

    // Is system role flag - read-only indicator
    is_system_role: FAL.PUBLIC_READONLY,
  },

  // ============================================================================
  // DELETE CONFIGURATION (for GenericEntityService.delete)
  // ============================================================================

  /**
   * Dependent records that must be cascade-deleted before this entity
   * Only for relationships NOT handled by database ON DELETE CASCADE/SET NULL
   *
   * For audit_logs: polymorphic FK via resource_type + resource_id
   */
  dependents: [
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'roles' },
    },
  ],

  // ============================================================================
  // SYSTEM PROTECTION (Multi-Level Security)
  // ============================================================================

  /**
   * System-protected values that cannot be deleted or have critical fields modified.
   * This is the SINGLE SOURCE OF TRUTH for protection rules.
   *
   * Enforcement layers (defense in depth):
   *   1. Route layer: Fast-fail for UX (check before calling service)
   *   2. Service layer: GenericEntityService checks before DB operations
   *   3. Database layer: Trigger + is_system_role column (last line of defense)
   *
   * Protected roles are fundamental to the RBAC system and must not be
   * accidentally deleted or have their hierarchy (priority) changed.
   */
  systemProtected: {
    /**
     * Values of identityField ('name') that are protected
     */
    values: ['admin', 'manager', 'dispatcher', 'technician', 'customer'],

    /**
     * Fields that cannot be modified on protected records
     * Even if the field is in updateableFields, these are blocked for protected values
     */
    immutableFields: ['name', 'priority'],

    /**
     * Whether protected values can be deleted
     */
    preventDelete: true,
  },

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
  // FOREIGN KEY CONFIGURATION (for DB error handling)
  // ============================================================================

  /**
   * Outbound foreign keys (this table references other tables)
   * Used by buildDbErrorConfig() for user-friendly FK violation messages
   * Roles don't reference other tables - they ARE the referenced table
   */
  foreignKeys: {},

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  /**
   * Relationships to JOIN by default in all queries (findById, findAll, findByField)
   * These are included automatically without needing to specify 'include' option
   * Roles don't need any default includes (users/permissions are opt-in)
   */
  defaultIncludes: [],

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
      type: 'enum',
      values: ['active', 'disabled'],
      default: 'active',
      description: 'Role lifecycle state - disabled roles cannot be newly assigned',
    },

    // Entity-specific fields
    description: { type: 'text' },
    priority: { type: 'integer', required: true, min: 1 },
  },
};
