/**
 * Technician Model Metadata
 *
 * SRP: ONLY defines Technician table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Technician model query and CRUD capabilities
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');

module.exports = {
  // Table name in database
  tableName: 'technicians',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The human-readable identifier field (not the PK)
   * Used for: Display names, search results, logging
   */
  identityField: 'license_number',

  /**
   * Whether the identity field has a UNIQUE constraint in the database
   * Used for duplicate rejection tests
   */
  identityFieldUnique: true,

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'technicians',

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['license_number'],

  /**
   * Fields that cannot be modified after creation (beyond universal immutables: id, created_at)
   * Empty array = all fields are updateable
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

    // License number - internal identifier, manager+ can manage
    license_number: {
      create: 'manager',
      read: 'technician', // Technicians can see own and peers' license numbers
      update: 'manager',
      delete: 'none',
    },

    // Hourly rate - sensitive financial data, manager+ only
    hourly_rate: FAL.MANAGER_MANAGED,

    // Certifications - publicly visible, self-editable by technician
    certifications: FAL.SELF_EDITABLE,

    // Skills - publicly visible, self-editable by technician
    skills: FAL.SELF_EDITABLE,

    // Performance notes - manager internal notes, not visible to technician
    performance_notes: FAL.MANAGER_MANAGED,
  },

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  /**
   * Relationships to JOIN by default in all queries (findById, findAll, findByField)
   * These are included automatically without needing to specify 'include' option
   */
  defaultIncludes: [],

  /**
   * Foreign key relationships
   * Used for JOIN generation and validation
   */
  relationships: {
    // Technicians have many assigned work orders
    assignedWorkOrders: {
      type: 'hasMany',
      foreignKey: 'assigned_technician_id',
      table: 'work_orders',
      fields: ['id', 'title', 'status', 'priority', 'scheduled_start', 'customer_id'],
      description: 'Work orders assigned to this technician',
    },
    // Optional: User account linked to this technician profile
    userAccount: {
      type: 'hasOne',
      foreignKey: 'technician_profile_id',
      table: 'users',
      fields: ['id', 'email', 'first_name', 'last_name'],
      description: 'User account linked to this technician profile (if any)',
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION (for GenericEntityService.delete)
  // ============================================================================

  /**
   * Dependent records that must be cascade-deleted before this entity
   * Only for relationships NOT handled by database ON DELETE CASCADE/SET NULL
   *
   * Note: work_orders.assigned_technician_id has ON DELETE SET NULL (DB handles it)
   * For audit_logs: polymorphic FK via resource_type + resource_id
   */
  dependents: [
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'technicians' },
    },
  ],

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: ['license_number'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'license_number',
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
   */
  sortableFields: [
    'id',
    'license_number',
    'is_active',
    'status',
    'hourly_rate',
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
  // FIELD DEFINITIONS (for validation & documentation)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    license_number: { type: 'string', required: true, maxLength: 100 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['available', 'on_job', 'off_duty', 'suspended'],
      default: 'available',
    },

    // Entity-specific fields
    certifications: { type: 'jsonb' },
    skills: { type: 'jsonb' },
    hourly_rate: { type: 'decimal' },
  },
};
