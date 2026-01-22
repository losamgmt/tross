/**
 * Work Order Model Metadata
 *
 * Category: COMPUTED (auto-generated work_order_number identity, computed name)
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
const { NAME_TYPES } = require('../entity-types');

module.exports = {
  // Table name in database
  tableName: 'work_orders',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'build',

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
   * COMPUTED entities use the identifier field (work_order_number)
   */
  displayField: 'work_order_number',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The unique identifier field (auto-generated: WO-YYYY-NNNN)
   * Used for: Unique references, search results, logging
   */
  identityField: 'work_order_number',

  /**
   * Prefix for auto-generated identifiers (COMPUTED entities only)
   * Format: WO-YYYY-NNNN
   */
  identifierPrefix: 'WO',

  /**
   * Whether the identity field has a UNIQUE constraint in the database
   */
  identityFieldUnique: true,

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'work_orders',

  /**
   * Row-Level Security policy per role
   * Customers see own work orders, technicians see assigned, dispatcher+ see all
   */
  rlsPolicy: {
    customer: 'own_work_orders_only',
    technician: 'assigned_work_orders_only',
    dispatcher: 'all_records',
    manager: 'all_records',
    admin: 'all_records',
  },

  /**
   * Entity-level permission overrides
   * Matches permissions.json - customer+ create/read/update, manager+ delete
   */
  entityPermissions: {
    create: 'customer',
    read: 'customer',
    update: 'customer',
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
   * work_order.name is displayed as "Title" in the UI
   */
  fieldAliases: {
    name: 'Title',
  },

  // ============================================================================
  // COMPUTED NAME CONFIGURATION
  // ============================================================================

  /**
   * Configuration for computing the human-readable name
   * Template: "{customer.fullName}: {summary}: {work_order_number}"
   */
  computedName: {
    template: '{customer.fullName}: {summary}: {work_order_number}',
    sources: ['customer_id', 'summary', 'work_order_number'],
    readOnly: false, // Users can override the computed name
  },

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   * work_order_number is auto-generated, name is computed
   */
  requiredFields: ['customer_id'],

  /**
   * Fields that cannot be modified after creation
   */
  immutableFields: ['work_order_number'],

  /**
   * Default columns to display in table views (ordered)
   * Used by admin panel and frontend table widgets
   */
  displayColumns: ['work_order_number', 'name', 'customer_id', 'status', 'priority', 'assigned_technician_id', 'scheduled_start'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL (for field-access-controller.js)
  // ============================================================================

  fieldAccess: {
    // Entity Contract v2.0 fields
    ...UNIVERSAL_FIELD_ACCESS,

    // Identity field - auto-generated, immutable
    work_order_number: {
      create: 'none', // Auto-generated
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },

    // Computed name field (aliased as "Title" in UI)
    name: {
      create: 'customer', // Customers can provide initial title
      read: 'customer',
      update: 'dispatcher', // Dispatchers+ can edit
      delete: 'none',
    },

    // Summary - brief description for computed name
    summary: {
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

  foreignKeys: {
    customer_id: {
      table: 'customers',
      displayName: 'Customer',
      // FK dropdown display config
      relatedEntity: 'customer',
      displayFields: ['first_name', 'last_name', 'email'],
      displayTemplate: '{first_name} {last_name} - {email}',
    },
    assigned_technician_id: {
      table: 'technicians',
      displayName: 'Technician',
      // FK dropdown display config
      relatedEntity: 'technician',
      displayFields: ['first_name', 'last_name', 'email'],
      displayTemplate: '{first_name} {last_name} - {email}',
    },
  },

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  defaultIncludes: ['customer'],

  relationships: {
    // Work order belongs to a customer (required)
    customer: {
      type: 'belongsTo',
      foreignKey: 'customer_id',
      table: 'customers',
      fields: ['id', 'email', 'first_name', 'last_name', 'organization_name', 'phone'],
      description: 'Customer who requested this work order',
    },
    // Work order may be assigned to a technician (optional)
    assignedTechnician: {
      type: 'belongsTo',
      foreignKey: 'assigned_technician_id',
      table: 'technicians',
      fields: ['id', 'email', 'first_name', 'last_name', 'license_number', 'status'],
      description: 'Technician assigned to this work order',
    },
    // Work order may have invoices
    invoices: {
      type: 'hasMany',
      foreignKey: 'work_order_id',
      table: 'invoices',
      fields: ['id', 'invoice_number', 'name', 'status', 'total'],
      description: 'Invoices generated from this work order',
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION (for GenericEntityService.delete)
  // ============================================================================

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

  searchableFields: ['work_order_number', 'name', 'summary'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  filterableFields: [
    'id',
    'work_order_number',
    'name',
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

  sortableFields: [
    'id',
    'work_order_number',
    'name',
    'priority',
    'status',
    'scheduled_start',
    'scheduled_end',
    'completed_at',
    'created_at',
    'updated_at',
  ],

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
    work_order_number: {
      type: 'string',
      readonly: true, // Auto-generated: WO-YYYY-NNNN
      maxLength: 100,
      pattern: '^WO-[0-9]{4}-[0-9]+$',
      errorMessages: {
        pattern: 'Work order number must be in format WO-YYYY-NNNN',
      },
    },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      values: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },

    // COMPUTED entity name field (aliased as "Title" in UI)
    // Optional because it's computed from template: {customer}: {summary}: {work_order_number}
    name: { type: 'string', maxLength: 255 },
    summary: { type: 'string', maxLength: 255 },

    // Entity-specific fields
    priority: {
      type: 'enum',
      values: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    customer_id: {
      type: 'foreignKey',
      relatedEntity: 'customer',
      displayFields: ['first_name', 'last_name', 'email'],
      displayTemplate: '{first_name} {last_name} - {email}',
      required: true,
    },
    assigned_technician_id: {
      type: 'foreignKey',
      relatedEntity: 'technician',
      displayFields: ['first_name', 'last_name', 'email'],
      displayTemplate: '{first_name} {last_name} - {email}',
    },
    scheduled_start: { type: 'timestamp' },
    scheduled_end: { type: 'timestamp' },
    completed_at: { type: 'timestamp' },
  },
};
