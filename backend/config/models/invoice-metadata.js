/**
 * Invoice Model Metadata
 *
 * Category: COMPUTED (auto-generated invoice_number identity, computed name)
 *
 * SRP: ONLY defines Invoice table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Invoice model query and CRUD capabilities
 */

const {
  FIELD_ACCESS_LEVELS: _FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const { NAME_TYPES } = require('../entity-types');

module.exports = {
  // Table name in database
  tableName: 'invoices',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'receipt',

  // ============================================================================
  // ENTITY CATEGORY (determines name handling pattern)
  // ============================================================================

  /**
   * Entity category: COMPUTED entities have auto-generated identifiers
   * and computed name from template: "{customer.fullName}: {summary}: {identifier}"
   */
  nameType: NAME_TYPES.COMPUTED,

  /**
   * Display field for UI rendering
   * COMPUTED entities use the identifier field (invoice_number)
   */
  displayField: 'invoice_number',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The unique identifier field (auto-generated: INV-YYYY-NNNN)
   * Used for: Unique references, search results, logging
   */
  identityField: 'invoice_number',

  /**
   * Prefix for auto-generated identifiers (COMPUTED entities only)
   * Format: INV-YYYY-NNNN
   */
  identifierPrefix: 'INV',

  /**
   * Whether the identity field has a UNIQUE constraint in the database
   */
  identityFieldUnique: true,

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'invoices',

  /**
   * Row-Level Security policy per role
   * Customers see own invoices, technicians denied, dispatcher+ see all
   */
  rlsPolicy: {
    customer: 'own_invoices_only',
    technician: 'deny_all',
    dispatcher: 'all_records',
    manager: 'all_records',
    admin: 'all_records',
  },

  /**
   * Entity-level permission overrides
   * Matches permissions.json - dispatcher+ create/update, manager+ delete
   */
  entityPermissions: {
    create: 'dispatcher',
    read: 'customer',
    update: 'dispatcher',
    delete: 'manager',
  },

  /**
   * Route configuration - explicit opt-in for generic router
   */
  routeConfig: {
    useGenericRouter: true,
  },

  // ============================================================================
  // FIELD ALIASING (for UI display names)
  // ============================================================================

  /**
   * Field aliases for UI display. Key = field name, Value = display label
   * Empty object = use field names as-is
   */
  fieldAliases: {},

  // ============================================================================
  // COMPUTED NAME CONFIGURATION
  // ============================================================================

  /**
   * Configuration for computing the human-readable name
   * Template: "{customer.fullName}: {summary}: {invoice_number}"
   */
  computedName: {
    template: '{customer.fullName}: {summary}: {invoice_number}',
    sources: ['customer_id', 'summary', 'invoice_number'],
    readOnly: false,
  },

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   * invoice_number is auto-generated
   */
  requiredFields: ['customer_id', 'amount', 'total'],

  /**
   * Fields that cannot be modified after creation (beyond universal immutables: id, created_at)
   * - invoice_number: Audit trail identity, cannot change
   */
  immutableFields: ['invoice_number'],

  /**
   * Default columns to display in table views (ordered)
   * Used by admin panel and frontend table widgets
   */
  displayColumns: ['invoice_number', 'customer_id', 'status', 'total', 'due_date', 'created_at'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL (for field-access-controller.js)
  // ============================================================================

  /**
   * Per-field CRUD permissions using FIELD_ACCESS_LEVELS shortcuts
   * Entity Contract fields use UNIVERSAL_FIELD_ACCESS spread
   *
   * Invoice access (RLS applies):
   * - Customers: See their own invoices (read only)
   * - Technicians: Deny all (no invoice access per permissions)
   * - Dispatchers+: CREATE/UPDATE
   * - Managers+: DELETE
   */
  fieldAccess: {
    // Entity Contract v2.0 fields
    ...UNIVERSAL_FIELD_ACCESS,

    // Identity field - auto-generated, immutable
    invoice_number: {
      create: 'none', // Auto-generated
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },

    // Computed name field (optional user override)
    name: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },

    // Brief description of this invoice
    summary: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },

    // FK to customers - required, set on create
    customer_id: {
      create: 'dispatcher',
      read: 'customer',
      update: 'none', // Cannot reassign invoice to different customer
      delete: 'none',
    },

    // FK to work_orders - optional, can be updated
    work_order_id: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },

    // Financial fields - dispatcher+ manages, customer can read
    amount: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },
    tax: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },
    total: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },

    // Due date - dispatcher+ manages
    due_date: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },

    // Payment timestamp - system managed on payment
    paid_at: {
      create: 'none',
      read: 'customer',
      update: 'dispatcher', // Set when payment received
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
    work_order_id: {
      table: 'work_orders',
      displayName: 'Work Order',
    },
  },

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  /**
   * Relationships to JOIN by default in all queries (findById, findAll, findByField)
   * These are included automatically without needing to specify 'include' option
   * Invoices almost always need customer info displayed
   */
  defaultIncludes: ['customer'],

  /**
   * Foreign key relationships
   * Used for JOIN generation and validation
   */
  relationships: {
    // Invoice belongs to a customer (required)
    customer: {
      type: 'belongsTo',
      foreignKey: 'customer_id',
      table: 'customers',
      fields: ['id', 'email', 'first_name', 'last_name', 'organization_name', 'phone'],
      description: 'Customer billed by this invoice',
    },
    // Invoice may be linked to a work order (optional)
    workOrder: {
      type: 'belongsTo',
      foreignKey: 'work_order_id',
      table: 'work_orders',
      fields: ['id', 'work_order_number', 'name', 'status'],
      description: 'Work order this invoice is for',
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
      polymorphicType: { column: 'resource_type', value: 'invoices' },
    },
  ],

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: ['invoice_number', 'name', 'summary'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    'id',
    'invoice_number',
    'customer_id',
    'work_order_id',
    'is_active',
    'status',
    'due_date',
    'paid_at',
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
    'invoice_number',
    'status',
    'amount',
    'total',
    'due_date',
    'paid_at',
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
    invoice_number: {
      type: 'string',
      readonly: true, // Auto-generated: INV-YYYY-NNNN
      maxLength: 100,
      pattern: '^INV-[0-9]{4}-[0-9]+$',
      errorMessages: {
        pattern: 'Invoice number must be in format INV-YYYY-NNNN',
      },
    },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'void'],
      default: 'draft',
    },

    // COMPUTED entity name field - optional because computed from template
    name: { type: 'string', maxLength: 255 },
    summary: { type: 'string', maxLength: 255 },

    // Entity-specific fields
    work_order_id: { type: 'integer' },
    customer_id: { type: 'integer', required: true },
    amount: { type: 'decimal', required: true },
    tax: { type: 'decimal', default: 0 },
    total: { type: 'decimal', required: true },
    due_date: { type: 'date' },
    paid_at: { type: 'timestamp' },
  },
};
