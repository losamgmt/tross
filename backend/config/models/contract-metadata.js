/**
 * Contract Model Metadata
 *
 * SRP: ONLY defines Contract table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Contract model query and CRUD capabilities
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');

module.exports = {
  // Table name in database
  tableName: 'contracts',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The human-readable identifier field (not the PK)
   * Used for: Display names, search results, logging
   */
  identityField: 'contract_number',

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'contracts',

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['contract_number', 'customer_id', 'start_date'],

  /**
   * Fields that cannot be modified after creation (beyond universal immutables: id, created_at)
   * - contract_number: Audit trail identity, cannot change
   */
  immutableFields: ['contract_number'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL (for response-transform.js)
  // ============================================================================

  /**
   * Per-field CRUD permissions using FIELD_ACCESS_LEVELS shortcuts
   * Entity Contract fields use UNIVERSAL_FIELD_ACCESS spread
   *
   * Contract access (RLS applies):
   * - Customers: See their own contracts (read only)
   * - Technicians: Deny all (no contract access per permissions)
   * - Dispatchers+: Full read access
   * - Managers+: CREATE/UPDATE/DELETE
   */
  fieldAccess: {
    // Entity Contract v2.0 fields
    ...UNIVERSAL_FIELD_ACCESS,

    // Identity field - audit trail, immutable after creation
    contract_number: {
      create: 'manager',
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },

    // FK to customers - required, set on create
    customer_id: {
      create: 'manager',
      read: 'customer',
      update: 'none', // Cannot reassign contract to different customer
      delete: 'none',
    },

    // Contract dates - manager+ manages
    start_date: FAL.MANAGER_MANAGED_PUBLIC_READ,
    end_date: FAL.MANAGER_MANAGED_PUBLIC_READ,

    // Contract terms - manager+ manages, customer can read
    terms: FAL.MANAGER_MANAGED_PUBLIC_READ,

    // Financial field - sensitive, manager+ only
    value: FAL.MANAGER_MANAGED,

    // Billing cycle - manager+ manages, customer can read
    billing_cycle: FAL.MANAGER_MANAGED_PUBLIC_READ,
  },

  // ============================================================================
  // FOREIGN KEY CONFIGURATION (for db-error-handler.js)
  // ============================================================================

  /**
   * Foreign key relationships for error message generation
   * Maps FK field -> { table, displayName }
   */
  foreignKeys: {
    customer_id: {
      table: 'customers',
      displayName: 'Customer',
    },
  },

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  /**
   * Relationships to JOIN by default in all queries (findById, findAll, findByField)
   * These are included automatically without needing to specify 'include' option
   * Contracts almost always need customer info displayed
   */
  defaultIncludes: ['customer'],

  /**
   * Foreign key relationships
   * Used for JOIN generation and validation
   */
  relationships: {
    // Contract belongs to a customer (required)
    customer: {
      type: 'belongsTo',
      foreignKey: 'customer_id',
      table: 'customers',
      fields: ['id', 'email', 'company_name', 'phone'],
      description: 'Customer this contract is with',
    },
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
      polymorphicType: { column: 'resource_type', value: 'contracts' },
    },
  ],

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: ['contract_number'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'contract_number',
    'customer_id',
    'is_active',
    'status',
    'start_date',
    'end_date',
    'billing_cycle',
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
    'contract_number',
    'status',
    'value',
    'start_date',
    'end_date',
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
    contract_number: { type: 'string', required: true, maxLength: 100 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['draft', 'active', 'expired', 'cancelled'],
      default: 'draft',
    },

    // Entity-specific fields
    customer_id: { type: 'integer', required: true },
    start_date: { type: 'date', required: true },
    end_date: { type: 'date' },
    terms: { type: 'text' },
    value: { type: 'decimal' },
    billing_cycle: {
      type: 'enum',
      values: ['monthly', 'quarterly', 'annually', 'one_time'],
    },
  },
};
