/**
 * Technician Model Metadata
 *
 * Category: HUMAN (first_name + last_name, email identity)
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
const { NAME_TYPES } = require('../entity-types');
const { FIELD } = require('../field-type-standards');

module.exports = {
  // Table name in database
  tableName: 'technicians',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'engineering',

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
  rlsResource: 'technicians',

  /**
   * Row-Level Security policy per role
   * Technicians are visible to all roles (customers see assigned tech)
   */
  rlsPolicy: {
    customer: 'all_records',
    technician: 'all_records',
    dispatcher: 'all_records',
    manager: 'all_records',
    admin: 'all_records',
  },

  /**
   * Entity-level permission overrides
   * Matches permissions.json - manager+ create/delete, technician+ update, customer+ read
   */
  entityPermissions: {
    create: 'manager',
    read: 'customer',
    update: 'technician',
    delete: 'manager',
  },

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Technicians can see other technicians (for scheduling), but not customers
   */
  navVisibility: 'technician',

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
      order: 1,
    },
  },

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
  displayColumns: ['first_name', 'last_name', 'email', 'phone', 'skills', 'status', 'availability'],

  // ============================================================================
  // FIELD ACCESS CONTROL (role-based field-level CRUD permissions)
  // ============================================================================

  fieldAccess: {
    // Entity Contract v2.0 fields (id, is_active, created_at, updated_at, status)
    ...UNIVERSAL_FIELD_ACCESS,

    // HUMAN entity name fields
    first_name: {
      create: 'manager',
      read: 'technician',
      update: 'technician', // Self-editable with RLS
      delete: 'none',
    },
    last_name: {
      create: 'manager',
      read: 'technician',
      update: 'technician', // Self-editable with RLS
      delete: 'none',
    },

    // Email - identity field, manager+ can create, technician can read own
    email: {
      create: 'manager',
      read: 'technician',
      update: 'none', // Immutable (synced from Auth0)
      delete: 'none',
    },

    // License number - informational field, manager+ can manage
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

    // Availability - operational state, self-editable by technician
    // (separate from lifecycle status which is manager-controlled)
    availability: FAL.SELF_EDITABLE,
  },

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  defaultIncludes: [],

  relationships: {
    // Technicians have many assigned work orders
    assignedWorkOrders: {
      type: 'hasMany',
      foreignKey: 'assigned_technician_id',
      table: 'work_orders',
      fields: ['id', 'work_order_number', 'name', 'status', 'priority', 'scheduled_start', 'customer_id'],
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

  searchableFields: ['first_name', 'last_name', 'email', 'license_number'],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  filterableFields: [
    'id',
    'email',
    'first_name',
    'last_name',
    'license_number',
    'is_active',
    'status',
    'availability',
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
    'license_number',
    'is_active',
    'status',
    'availability',
    'hourly_rate',
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
    email: { ...FIELD.EMAIL, required: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    // SSOT: Must match User and Customer status values
    status: {
      type: 'enum',
      values: ['pending', 'active', 'suspended'],
      default: 'pending',
    },

    // Operational availability (separate from lifecycle status)
    availability: {
      type: 'enum',
      values: ['available', 'on_job', 'off_duty'],
      default: 'available',
    },

    // HUMAN entity name fields
    first_name: { ...FIELD.FIRST_NAME, required: true },
    last_name: { ...FIELD.LAST_NAME, required: true },

    // Entity-specific fields
    license_number: FIELD.IDENTIFIER,
    hourly_rate: FIELD.CURRENCY,

    // Skills and certifications as comma-separated text (flat, no JSONB)
    certifications: { type: 'text', maxLength: 1000 },
    skills: { type: 'text', maxLength: 500 },
  },
};
