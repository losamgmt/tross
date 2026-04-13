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
const {
  FIELD,
  NAME_PATTERNS,
  TIER1_FIELDS,
  withTraits,
  TRAITS,
  TRAIT_SETS,
  createForeignKey,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  // Entity key (singular, for API params and lookups)
  entityKey: 'invoice',

  // Table name in database (plural, also used for API URLs)
  tableName: 'invoices',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'receipt_long',

  // Entity traits (workflow: has status lifecycle, auditable: changes tracked)
  traits: ['workflow', 'auditable'],

  // ============================================================================
  // ENTITY CATEGORY (determines name handling pattern)
  // ============================================================================

  /**
   * Name pattern: COMPUTED uses auto-generated identifier
   */
  namePattern: NAME_PATTERNS.COMPUTED,

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
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    {
      id: 'customer-own-invoices',
      description: 'Customers see their own invoices',
      roles: 'customer',
      operations: '*',
      access: { type: 'direct', field: 'customer_id', value: 'customer_profile_id' },
    },
    // technician: no rule = deny
    {
      id: 'office-staff-full-access',
      description: 'Dispatcher, manager, admin see all invoices',
      roles: ['dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

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

  // ============================================================================
  // CONSOLIDATED NAVIGATION & FEATURES
  // ============================================================================

  navigation: {
    visibility: 'dispatcher',
    group: 'finance',
    order: 2,
  },

  features: {
    fileAttachments: true,
    summary: {
      groupableFields: ['customer_id', 'work_order_id', 'status'],
      summableFields: ['total', 'tax', 'amount'],
    },
  },

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Separate from read permission because RLS may restrict actual data access
   * Invoices are financial docs - only dispatcher+ should see in nav
   */
  navVisibility: 'dispatcher', // DEPRECATED: Use navigation.visibility
  navGroup: 'finance', // DEPRECATED: Use navigation.group
  navOrder: 2, // DEPRECATED: Use navigation.order

  /**
   * File attachments - whether this entity supports file uploads
   * Invoices: invoice PDFs, receipts, payment confirmations
   */
  supportsFileAttachments: true, // DEPRECATED: Use features.fileAttachments

  /**
   * Summary endpoint configuration for aggregated analytics.
   * Enables GET /summaries/invoices?group_by=customer_id
   */
  summaryConfig: { // DEPRECATED: Use features.summary
    groupableFields: ['customer_id', 'work_order_id', 'status'],
    summableFields: ['total', 'tax', 'amount'],
  },

  /**
   * Route configuration - explicit opt-in for generic router
   */
  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},

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
   * Default columns to display in table views (ordered)
   * Used by admin panel and frontend table widgets
   */
  displayColumns: [
    'invoice_number',
    'customer_id',
    'status',
    'total',
    'due_date',
    'created_at',
  ],

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

    // =========================================================================
    // QUICKBOOKS INTEGRATION FIELDS
    // =========================================================================

    // External ID from QuickBooks (DocNumber)
    qb_invoice_id: {
      create: 'admin',
      read: 'dispatcher',
      update: 'admin',
      delete: 'none',
    },
    // Sync status enum
    qb_sync_status: {
      create: 'admin',
      read: 'dispatcher',
      update: 'admin',
      delete: 'none',
    },
    // Last successful sync timestamp
    qb_synced_at: {
      create: 'admin',
      read: 'dispatcher',
      update: 'admin',
      delete: 'none',
    },
    // Last sync error (restricted - may contain sensitive details)
    qb_sync_error: {
      create: 'admin',
      read: 'admin',
      update: 'admin',
      delete: 'none',
    },
  },

  // ============================================================================
  // ENUM DEFINITIONS (SSOT - values are object keys)
  // ============================================================================

  enums: {
    status: {
      draft: { color: 'secondary', label: 'Draft' },
      sent: { color: 'primary', label: 'Sent' },
      paid: { color: 'success', label: 'Paid' },
      overdue: { color: 'warning', label: 'Overdue' },
      cancelled: { color: 'error', label: 'Cancelled' },
      void: { color: 'error', label: 'Void' },
    },
    // QuickBooks sync status enum
    qb_sync_status: {
      pending: { color: 'secondary', label: 'Pending' },
      synced: { color: 'success', label: 'Synced' },
      modified: { color: 'warning', label: 'Modified' },
      error: { color: 'error', label: 'Error' },
      skipped: { color: 'secondary', label: 'Skipped' },
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
      fields: [
        'id',
        'email',
        'first_name',
        'last_name',
        'organization_name',
        'phone',
      ],
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
  // SEARCH CONFIGURATION (Derived from field traits)
  // ============================================================================

  // ============================================================================
  // FILTER CONFIGURATION (Derived from field traits)
  // ============================================================================

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  /**
   * Default sort when no sortBy specified
   */
  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  // ============================================================================
  // FIELD DEFINITIONS (with embedded traits for query capabilities)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields (field-centric)
    ...TIER1_FIELDS.WITH_STATUS,
    // Override status default (workflow entity - draft→sent→paid, not active/inactive)
    // Includes lifecycle hooks for status transitions
    status: {
      ...withTraits(
        { type: 'enum', enumKey: 'status', default: 'draft' },
        TRAIT_SETS.LOOKUP,
      ),
      // Hooks: evaluated during status field changes
      beforeChange: [
        {
          description: 'High-value invoices require manager approval before sending',
          on: 'change',
          when: { field: 'total', operator: 'gt', value: 5000 },
          requiresApproval: { approver: 'manager', reason: 'high_value_invoice' },
        },
      ],
      afterChange: [
        {
          description: 'Notify customer when invoice is sent',
          on: 'draft→sent',
          do: 'notify',
        },
        {
          description: 'Log payment received',
          on: 'sent→paid',
          do: 'log',
        },
      ],
    },

    // Identity field - auto-generated, immutable, searchable
    invoice_number: withTraits(
      {
        ...FIELD.IDENTIFIER,
        readonly: true,
        pattern: '^INV-[0-9]{4}-[0-9]+$',
        errorMessages: { pattern: 'Invoice number must be in format INV-YYYY-NNNN' },
      },
      TRAITS.IMMUTABLE, TRAIT_SETS.IDENTITY,
    ),

    // COMPUTED entity name field - optional because computed from template
    name: withTraits(FIELD.NAME, TRAIT_SETS.SEARCHABLE_LOOKUP),
    summary: withTraits(FIELD.SUMMARY, TRAIT_SETS.FULLTEXT),

    // FK fields with embedded traits
    customer_id: createForeignKey('customer', { required: true, traits: TRAIT_SETS.LOOKUP }),
    work_order_id: createForeignKey('work_order', { traits: TRAIT_SETS.LOOKUP }),

    // Financial fields
    amount: withTraits({ ...FIELD.CURRENCY, description: 'Invoice amount' }, TRAITS.REQUIRED, TRAIT_SETS.SORTABLE),
    tax: withTraits({ ...FIELD.CURRENCY, default: 0, description: 'Tax amount' }, TRAIT_SETS.FILTER_ONLY),
    total: withTraits({ ...FIELD.CURRENCY, description: 'Total amount' }, TRAITS.REQUIRED, TRAIT_SETS.SORTABLE),

    // Date fields
    due_date: withTraits({ type: 'date', description: 'Payment due date' }, TRAIT_SETS.LOOKUP),
    paid_at: withTraits({ type: 'timestamp', description: 'Payment timestamp' }, TRAIT_SETS.LOOKUP),

    // =========================================================================
    // QUICKBOOKS INTEGRATION FIELDS
    // =========================================================================

    // External ID from QuickBooks (DocNumber)
    qb_invoice_id: withTraits(
      {
        type: 'string',
        maxLength: 50,
        description: 'QuickBooks Invoice DocNumber',
        pattern: '^[A-Za-z0-9-]+$',
      },
      TRAIT_SETS.FILTER_ONLY,
    ),

    // Sync status enum
    qb_sync_status: withTraits(
      {
        type: 'enum',
        enumKey: 'qb_sync_status',
        default: null,
        description: 'QuickBooks synchronization status',
      },
      TRAIT_SETS.FILTER_ONLY,
    ),

    // Last successful sync timestamp
    qb_synced_at: withTraits(
      {
        type: 'timestamp',
        description: 'Timestamp of last successful QuickBooks sync',
      },
      TRAIT_SETS.FILTER_ONLY,
    ),

    // Last sync error (cleared on success)
    // NOTE: Intentionally no traits - error messages should not be filterable/searchable
    // as they may contain sensitive details. Admin-only read access via fieldAccess.
    qb_sync_error: {
      type: 'text',
      maxLength: 500,
      description: 'Last QuickBooks sync error message',
    },
  },
};
