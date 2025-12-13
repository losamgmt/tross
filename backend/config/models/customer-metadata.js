/**
 * Customer Model Metadata
 *
 * SRP: ONLY defines Customer table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Customer model query and CRUD capabilities
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');

module.exports = {
  // Table name in database
  tableName: 'customers',

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
   * Whether the identity field has a UNIQUE constraint in the database
   * Used for duplicate rejection tests
   */
  identityFieldUnique: true,

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'customers',

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['email'],

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

    // Email - identity field, dispatcher+ can create, customer can read own, immutable after create
    email: {
      create: 'dispatcher',
      read: 'customer', // RLS ensures customers only see own
      update: 'none', // Immutable (synced from Auth0)
      delete: 'none',
    },

    // Phone - customer can update their own, dispatcher+ can see all
    phone: {
      create: 'dispatcher',
      read: 'customer',
      update: 'customer', // Self-editable with RLS
      delete: 'none',
    },

    // Company name - customer can update their own
    company_name: {
      create: 'dispatcher',
      read: 'customer',
      update: 'customer', // Self-editable with RLS
      delete: 'none',
    },

    // Billing address - customer can update their own, internal teams can view
    billing_address: {
      create: 'dispatcher',
      read: 'customer',
      update: 'customer',
      delete: 'none',
    },

    // Notes - internal notes by staff, not visible to customer
    notes: FAL.MANAGER_MANAGED,
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
    // Customers have many work orders
    workOrders: {
      type: 'hasMany',
      foreignKey: 'customer_id',
      table: 'work_orders',
      fields: ['id', 'title', 'status', 'priority', 'scheduled_start'],
      description: 'Work orders submitted by this customer',
    },
    // Customers have many invoices
    invoices: {
      type: 'hasMany',
      foreignKey: 'customer_id',
      table: 'invoices',
      fields: ['id', 'invoice_number', 'status', 'total', 'due_date'],
      description: 'Invoices billed to this customer',
    },
    // Customers have many contracts
    contracts: {
      type: 'hasMany',
      foreignKey: 'customer_id',
      table: 'contracts',
      fields: ['id', 'contract_number', 'status', 'start_date', 'end_date'],
      description: 'Service contracts with this customer',
    },
    // Optional: User account linked to this customer profile
    userAccount: {
      type: 'hasOne',
      foreignKey: 'customer_profile_id',
      table: 'users',
      fields: ['id', 'email', 'first_name', 'last_name'],
      description: 'User account linked to this customer profile (if any)',
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION (for GenericEntityService.delete)
  // ============================================================================

  /**
   * Dependent records that must be cascade-deleted before this entity
   * Only for relationships NOT handled by database ON DELETE CASCADE/SET NULL
   *
   * Note: work_orders, invoices, contracts have ON DELETE RESTRICT
   *       (deletion blocked if dependents exist - business rule, not cascade)
   * For audit_logs: polymorphic FK via resource_type + resource_id
   */
  dependents: [
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'customers' },
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
    'email',
    'phone',
    'company_name',
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
    'phone',
    'company_name',
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
    'email',
    'company_name',
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
  // FIELD DEFINITIONS (for validation & documentation)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    email: { type: 'email', required: true, maxLength: 255 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['pending', 'active', 'suspended'],
      default: 'pending',
    },

    // Entity-specific fields
    phone: { type: 'phone', maxLength: 50 },
    company_name: { type: 'string', maxLength: 255 },
    billing_address: { type: 'jsonb' },
    service_address: { type: 'jsonb' },
  },
};
