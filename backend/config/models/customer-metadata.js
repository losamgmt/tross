/**
 * Customer Model Metadata
 *
 * Category: HUMAN (first_name + last_name, email identity)
 *
 * SRP: ONLY defines Customer table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Customer model query and CRUD capabilities
 */

const {
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const { NAME_TYPES } = require('../entity-types');
const { createAddressFields, createAddressFieldAccess } = require('../field-type-standards');

module.exports = {
  // Table name in database
  tableName: 'customers',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'people',

  // ============================================================================
  // ENTITY CATEGORY (determines name handling pattern)
  // ============================================================================

  /**
   * Entity category: HUMAN entities use first_name + last_name
   * Display name computed as fullName = "{first_name} {last_name}"
   */
  nameType: NAME_TYPES.HUMAN,

  /**
   * Display fields for UI rendering
   * HUMAN entities use [first_name, last_name] for full name display
   */
  displayFields: ['first_name', 'last_name'],

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

  /**
   * Row-Level Security policy per role
   * Customers see own record only, technician+ see all
   */
  rlsPolicy: {
    customer: 'own_record_only',
    technician: 'all_records',
    dispatcher: 'all_records',
    manager: 'all_records',
    admin: 'all_records',
  },

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Customers are visible to all authenticated users
   */
  navVisibility: 'customer',

  /**
   * Entity-level permission overrides
   * Matches permissions.json - dispatcher+ create, customer+ read/update, manager+ delete
   */
  entityPermissions: {
    create: 'dispatcher',
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

  fieldGroups: {
    identity: {
      label: 'Identity',
      fields: ['first_name', 'last_name'],
      rows: [['first_name', 'last_name']],
      order: 1,
    },
    contact: {
      label: 'Contact Information',
      fields: ['email', 'phone', 'organization_name'],
      order: 2,
    },
    billing_address: {
      label: 'Billing Address',
      fields: ['billing_line1', 'billing_line2', 'billing_city', 'billing_state', 'billing_postal_code', 'billing_country'],
      rows: [['billing_city', 'billing_state', 'billing_postal_code']],
      order: 3,
    },
    service_address: {
      label: 'Service Address',
      fields: ['service_line1', 'service_line2', 'service_city', 'service_state', 'service_postal_code', 'service_country'],
      rows: [['service_city', 'service_state', 'service_postal_code']],
      order: 4,
    },
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
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   */
  requiredFields: ['email', 'first_name', 'last_name'],

  /**
   * Fields that cannot be modified after creation (beyond universal immutables: id, created_at)
   */
  immutableFields: [],

  /**
   * Default columns to display in table views (ordered)
   * Used by admin panel and frontend table widgets
   */
  displayColumns: ['first_name', 'last_name', 'email', 'phone', 'organization_name', 'status'],

  // ============================================================================
  // FIELD ACCESS CONTROL (role-based field-level CRUD permissions)
  // ============================================================================

  fieldAccess: {
    // Entity Contract v2.0 fields (id, is_active, created_at, updated_at, status)
    ...UNIVERSAL_FIELD_ACCESS,

    // HUMAN entity name fields
    first_name: {
      create: 'dispatcher',
      read: 'customer',
      update: 'customer', // Self-editable with RLS
      delete: 'none',
    },
    last_name: {
      create: 'dispatcher',
      read: 'customer',
      update: 'customer', // Self-editable with RLS
      delete: 'none',
    },

    // Email - identity field, dispatcher+ can create, customer can read own
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

    // Organization name - customer can update their own
    organization_name: {
      create: 'dispatcher',
      read: 'customer',
      update: 'customer', // Self-editable with RLS
      delete: 'none',
    },

    // Flat address fields - customer can update their own, internal teams can view
    ...createAddressFieldAccess('billing', 'customer'),
    ...createAddressFieldAccess('service', 'customer'),
  },

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  defaultIncludes: [],

  relationships: {
    // Customers have many work orders
    workOrders: {
      type: 'hasMany',
      foreignKey: 'customer_id',
      table: 'work_orders',
      fields: ['id', 'work_order_number', 'name', 'status', 'priority', 'scheduled_start'],
      description: 'Work orders submitted by this customer',
    },
    // Customers have many invoices
    invoices: {
      type: 'hasMany',
      foreignKey: 'customer_id',
      table: 'invoices',
      fields: ['id', 'invoice_number', 'name', 'status', 'total', 'due_date'],
      description: 'Invoices billed to this customer',
    },
    // Customers have many contracts
    contracts: {
      type: 'hasMany',
      foreignKey: 'customer_id',
      table: 'contracts',
      fields: ['id', 'contract_number', 'name', 'status', 'start_date', 'end_date'],
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

  searchableFields: [
    'first_name',
    'last_name',
    'email',
    'phone',
    'organization_name',
  ],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  filterableFields: [
    'id',
    'email',
    'first_name',
    'last_name',
    'phone',
    'organization_name',
    'is_active',
    'status',
    'created_at',
    'updated_at',
  ],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  sortableFields: [
    'id',
    'email',
    'first_name',
    'last_name',
    'organization_name',
    'is_active',
    'status',
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
    email: { type: 'email', required: true, maxLength: 255 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    // SSOT: Must match User and Technician status values
    status: {
      type: 'enum',
      values: ['pending', 'active', 'suspended'],
      default: 'pending',
    },

    // HUMAN entity name fields
    first_name: { type: 'string', required: true, maxLength: 100 },
    last_name: { type: 'string', required: true, maxLength: 100 },

    // Entity-specific fields
    phone: { type: 'phone', maxLength: 50 },
    organization_name: { type: 'string', maxLength: 255 },

    // Flat address fields (using field-type-standards generators)
    ...createAddressFields('billing'),
    ...createAddressFields('service'),
  },
};
