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
const {
  FIELD,
  NAME_PATTERNS,
  TIER1_FIELDS,
  withTraits,
  TRAITS,
  TRAIT_SETS,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  // Entity key (singular, for API params and lookups)
  entityKey: 'technician',

  // Table name in database (plural, also used for API URLs)
  tableName: 'technicians',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'engineering',

  // ============================================================================
  // ENTITY CATEGORY (determines name handling pattern)
  // ============================================================================

  /**
   * Name pattern: HUMAN uses first_name + last_name for display
   */
  namePattern: NAME_PATTERNS.HUMAN,

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
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   *
   * Technician records are staff-only. Customers cannot see
   * technician details (only see assigned tech name on work orders).
   */
  rlsRules: [
    {
      id: 'staff-full-access',
      description: 'Staff (technician+) have full access to technician records',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  /**
   * Entity-level permission overrides
   * Matches permissions.json - manager+ create/delete, technician+ read/update
   */
  entityPermissions: {
    create: 'manager',
    read: 'technician',
    update: 'technician',
    delete: 'manager',
  },

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Technicians can see other technicians (for scheduling), but not customers
   */
  navVisibility: 'technician',
  navGroup: 'resources',
  navOrder: 1,

  /**
   * File attachments - whether this entity supports file uploads
   */
  supportsFileAttachments: false,

  /**
   * Summary endpoint configuration for aggregated analytics.
   */
  summaryConfig: {
    groupableFields: ['status'],
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
      order: 1,
    },
  },

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Default columns to display in table views (ordered)
   * Used by admin panel and frontend table widgets
   */
  displayColumns: [
    'first_name',
    'last_name',
    'email',
    'skills',
    'status',
    'availability',
  ],

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
  // ENUM DEFINITIONS (SSOT - values are object keys)
  // ============================================================================

  enums: {
    status: {
      pending: { color: 'warning', label: 'Pending' },
      active: { color: 'success', label: 'Active' },
      suspended: { color: 'error', label: 'Suspended' },
    },
    availability: {
      available: { color: 'success', label: 'Available' },
      on_job: { color: 'primary', label: 'On Job' },
      off_duty: { color: 'secondary', label: 'Off Duty' },
    },
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
      fields: [
        'id',
        'work_order_number',
        'name',
        'status',
        'priority',
        'scheduled_start',
        'customer_id',
      ],
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
  // Derived from field traits - see fields section
  // ============================================================================

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // Derived from field traits - see fields section
  // ============================================================================

  // ============================================================================
  // SORT CONFIGURATION
  // Derived from field traits - see fields section
  // ============================================================================

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

    // Operational availability (separate from lifecycle status)
    availability: withTraits(
      { type: 'enum', enumKey: 'availability', default: 'available' },
      TRAIT_SETS.LOOKUP,
    ),

    // HUMAN entity identity fields - REQUIRED + IDENTITY traits
    email: withTraits(
      { ...FIELD.EMAIL, description: 'Technician email (identity field)' },
      TRAITS.REQUIRED, TRAIT_SETS.IDENTITY,
    ),
    first_name: withTraits(
      { ...FIELD.FIRST_NAME, description: 'Technician first name' },
      TRAITS.REQUIRED, TRAIT_SETS.SEARCHABLE_LOOKUP,
    ),
    last_name: withTraits(
      { ...FIELD.LAST_NAME, description: 'Technician last name' },
      TRAITS.REQUIRED, TRAIT_SETS.SEARCHABLE_LOOKUP,
    ),

    // Entity-specific fields with embedded traits
    license_number: withTraits(
      { ...FIELD.IDENTIFIER, description: 'License number' },
      TRAIT_SETS.SEARCHABLE_LOOKUP,
    ),
    hourly_rate: withTraits(
      { ...FIELD.CURRENCY, description: 'Hourly rate' },
      TRAIT_SETS.SORTABLE,
    ),

    // Skills and certifications - text fields with search
    certifications: withTraits(
      { type: 'text', maxLength: 1000, description: 'Certifications (comma-separated)' },
      TRAIT_SETS.FULLTEXT,
    ),
    skills: withTraits(
      { type: 'text', maxLength: 500, description: 'Skills (comma-separated)' },
      TRAIT_SETS.FULLTEXT,
    ),
  },
};
