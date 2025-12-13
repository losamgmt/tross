/**
 * Work Order Model Metadata
 *
 * SRP: ONLY defines Work Order table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Work Order model query and CRUD capabilities
 */

const {
  FIELD_ACCESS_LEVELS: _FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');

module.exports = {
  // Table name in database
  tableName: 'work_orders',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The human-readable identifier field (not the PK)
   * Used for: Display names, search results, logging
   */
  identityField: 'title',

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'work_orders',

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['title', 'customer_id'],

  /**
   * Fields that cannot be modified after creation (beyond universal immutables: id, created_at)
   * Empty array = all fields are updateable
   */
  immutableFields: [],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL (for response-transform.js)
  // ============================================================================

  /**
   * Per-field CRUD permissions using FIELD_ACCESS_LEVELS shortcuts
   * Entity Contract fields use UNIVERSAL_FIELD_ACCESS spread
   *
   * Work Order access (RLS applies):
   * - Customers: See their own work orders (limited fields)
   * - Technicians: See assigned work orders (operational fields)
   * - Dispatchers+: Full read access, can assign technicians
   * - Managers+: Full CRUD
   */
  fieldAccess: {
    // Entity Contract v2.0 fields
    ...UNIVERSAL_FIELD_ACCESS,

    // Identity field - title is the display name
    title: {
      create: 'customer', // Customers can create work orders
      read: 'customer',
      update: 'dispatcher', // Dispatchers+ can edit
      delete: 'none',
    },

    // Description - customer provides, dispatcher+ can edit
    description: {
      create: 'customer',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },

    // FK to customers - set on create, dispatcher+ can view
    customer_id: {
      create: 'customer',
      read: 'technician', // Technicians need to see customer
      update: 'none', // Cannot reassign to different customer
      delete: 'none',
    },

    // FK to technicians - dispatcher+ assigns
    assigned_technician_id: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },

    // Priority - customer sets, dispatcher+ can override
    priority: {
      create: 'customer',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },

    // Scheduling - dispatcher+ manages, all can read
    scheduled_start: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },
    scheduled_end: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },

    // Completion timestamp - system/technician sets
    completed_at: {
      create: 'none',
      read: 'customer',
      update: 'technician',
      delete: 'none',
    },
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
    assigned_technician_id: {
      table: 'technicians',
      displayName: 'Technician',
    },
  },

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  /**
   * Relationships to JOIN by default in all queries (findById, findAll, findByField)
   * These are included automatically without needing to specify 'include' option
   * Work orders almost always need customer info displayed
   */
  defaultIncludes: ['customer'],

  /**
   * Foreign key relationships
   * Used for JOIN generation and validation
   */
  relationships: {
    // Work order belongs to a customer (required)
    customer: {
      type: 'belongsTo',
      foreignKey: 'customer_id',
      table: 'customers',
      fields: ['id', 'email', 'company_name', 'phone'],
      description: 'Customer who requested this work order',
    },
    // Work order may be assigned to a technician (optional)
    assignedTechnician: {
      type: 'belongsTo',
      foreignKey: 'assigned_technician_id',
      table: 'technicians',
      fields: ['id', 'license_number', 'status'],
      description: 'Technician assigned to this work order',
    },
    // Work order may have invoices
    invoices: {
      type: 'hasMany',
      foreignKey: 'work_order_id',
      table: 'invoices',
      fields: ['id', 'invoice_number', 'status', 'total'],
      description: 'Invoices generated from this work order',
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION (for GenericEntityService.delete)
  // ============================================================================

  /**
   * Dependent records that must be cascade-deleted before this entity
   * Only for relationships NOT handled by database ON DELETE CASCADE/SET NULL
   *
   * Note: invoices.work_order_id has ON DELETE SET NULL (DB handles it)
   * For audit_logs: polymorphic FK via resource_type + resource_id
   */
  dependents: [
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'work_orders' },
    },
  ],

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: ['title', 'description'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'title',
    'customer_id',
    'assigned_technician_id',
    'is_active',
    'status',
    'priority',
    'scheduled_start',
    'scheduled_end',
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
    'title',
    'priority',
    'status',
    'scheduled_start',
    'scheduled_end',
    'completed_at',
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
    title: { type: 'string', required: true, maxLength: 255 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },

    // Entity-specific fields
    description: { type: 'text' },
    priority: {
      type: 'enum',
      values: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    customer_id: { type: 'integer', required: true },
    assigned_technician_id: { type: 'integer' },
    scheduled_start: { type: 'timestamp' },
    scheduled_end: { type: 'timestamp' },
    completed_at: { type: 'timestamp' },
  },
};
