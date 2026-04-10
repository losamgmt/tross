/**
 * User Model Metadata
 *
 * Category: HUMAN (first_name + last_name, email as identity)
 *
 * SRP: ONLY defines User table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for User model query and CRUD capabilities
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
  createForeignKey,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  // Entity key (singular, for API params and lookups)
  entityKey: 'user',

  // Table name in database (plural, also used for API URLs)
  tableName: 'users',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'person',

  // ============================================================================
  // AUTH0 CONFIGURATION
  // ============================================================================

  /**
   * Default role name for new users created via Auth0 SSO
   * Used when JWT token doesn't include a role claim
   * CONFIGURABLE - no hardcoding in User model!
   */
  defaultRoleName: 'customer',

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
  rlsResource: 'users',

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    {
      id: 'customer-own-record',
      description: 'Customers see only their own user record',
      roles: 'customer',
      operations: '*',
      access: { type: 'direct', field: 'id', value: 'userId' },
    },
    {
      id: 'staff-full-access',
      description: 'Staff see all user records',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  // ============================================================================
  // CONSOLIDATED NAVIGATION & FEATURES
  // ============================================================================

  navigation: {
    visibility: 'admin',
    group: 'admin',
    order: 1,
  },

  features: {
    fileAttachments: false,
    summary: null,
  },

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Separate from read permission (users can read own record, but shouldn't see Users in nav)
   */
  navVisibility: 'admin', // DEPRECATED: Use navigation.visibility
  navGroup: 'admin', // DEPRECATED: Use navigation.group
  navOrder: 1, // DEPRECATED: Use navigation.order

  /**
   * File attachments - whether this entity supports file uploads
   */
  supportsFileAttachments: false, // DEPRECATED: Use features.fileAttachments

  /**
   * Summary endpoint configuration for aggregated analytics.
   * Null: Users are not aggregated.
   */
  summaryConfig: null, // DEPRECATED: Use features.summary

  /**
   * Entity-level permission overrides
   * When entity-level access differs from field-level minimums
   * (e.g., only admin can call PATCH /users/:id even if some fields are self-editable)
   */
  entityPermissions: {
    create: 'admin',
    read: 'customer',
    update: 'admin',
    delete: 'admin',
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

  namePattern: NAME_PATTERNS.HUMAN,

  /**
   * Display fields for UI rendering
   * HUMAN entities use [first_name, last_name] for full name display
   */
  displayFields: ['first_name', 'last_name'],

  // ============================================================================
  // FIELD ALIASING (for UI display names)
  // ============================================================================

  /**
   * Field aliases for UI display. Key = field name, Value = display label
   * Empty object = use field names as-is
   */
  fieldAliases: {},

  // ============================================================================
  // OUTPUT FILTERING (for API responses)
  // ============================================================================

  /**
   * Fields that should NEVER be returned in API responses
   * These are filtered out by output-filter-helper in addition to
   * the global ALWAYS_SENSITIVE list.
   *
   * NOTE: auth0_id is already in ALWAYS_SENSITIVE, but listed here
   * for clarity that it's the only sensitive field on users.
   * We use Auth0 for auth - we do NOT store passwords.
   */
  sensitiveFields: ['auth0_id'],

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
    'role_id',
    'status',
    'created_at',
  ],

  // ============================================================================
  // FIELD ACCESS CONTROL (role-based field-level CRUD permissions)
  // ============================================================================
  // Each field specifies the MINIMUM role required for each CRUD operation.
  // Permissions accumulate UPWARD: admin has all manager + dispatcher + technician + customer permissions.
  // Universal fields (id, is_active, created_at, updated_at, status) are in UNIVERSAL_FIELD_ACCESS.
  // Use FAL shortcuts for common patterns, or define custom { create, read, update, delete }.

  fieldAccess: {
    // Entity Contract v2.0 fields (id, is_active, created_at, updated_at, status)
    ...UNIVERSAL_FIELD_ACCESS,

    // Email - identity field, readable by all authenticated, only admin can set
    email: {
      create: 'admin',
      read: 'customer', // Users can see own email, admin sees all
      update: 'none', // Immutable
      delete: 'none',
    },

    // Auth0 ID - internal auth binding, admin only
    auth0_id: {
      create: 'admin', // Set during Auth0 SSO flow
      read: 'none', // Never exposed in API (also in sensitiveFields)
      update: 'none', // Immutable
      delete: 'none',
    },

    // Name fields - self-editable, admin can manage
    first_name: FAL.SELF_EDITABLE,
    last_name: FAL.SELF_EDITABLE,

    // Role assignment - admin only, but readable by all authenticated users
    role_id: {
      create: 'admin',
      read: 'customer',
      update: 'admin',
      delete: 'none',
    },

    // Role name from JOIN - readonly, publicly readable
    role: FAL.PUBLIC_READONLY,

    // Profile links - admin managed (set via profile creation flows)
    customer_profile_id: FAL.ADMIN_ONLY,
    technician_profile_id: FAL.ADMIN_ONLY,
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
  },

  // ============================================================================
  // DELETE CONFIGURATION (for GenericEntityService.delete)
  // ============================================================================

  /**
   * Dependent records that must be cascade-deleted before this entity
   * Only for relationships NOT handled by database ON DELETE CASCADE/SET NULL
   *
   * Note: refresh_tokens has ON DELETE CASCADE (DB handles it)
   * For audit_logs: Two cascades needed:
   *   1. Logs ABOUT this user (polymorphic: resource_type='users')
   *   2. Logs BY this user (simple FK: user_id)
   */
  dependents: [
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'users' },
    },
    {
      table: 'audit_logs',
      foreignKey: 'user_id',
    },
  ],

  /**
   * Default sort when no sortBy specified
   */
  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  // ============================================================================
  // SECURITY CONFIGURATION
  // ============================================================================

  /**
   * Fields to EXCLUDE from SELECT statements (security)
   * These should never be returned to clients
   */
  excludedFields: [
    // Users table doesn't store passwords (Auth0 handles that)
    // But this is where we'd list sensitive fields
  ],

  /**
   * Fields that require special permissions to filter/sort
   * (Future: for admin-only fields)
   */
  restrictedFields: [],

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  /**
   * Relationships to JOIN by default in all queries (findById, findAll, findByField)
   * These are included automatically without needing to specify 'include' option
   * Use this for relationships that are almost always needed (like role for user)
   */
  defaultIncludes: ['role'],

  /**
   * Foreign key relationships
   * Used for JOIN generation and validation
   */
  relationships: {
    role: {
      type: 'belongsTo',
      foreignKey: 'role_id',
      table: 'roles',
      fields: ['id', 'name', 'description', 'priority'],
    },
    // Multi-profile support: User can have BOTH customer AND technician profiles
    // These are independent of role_id (RBAC) - they link to profile data
    customerProfile: {
      type: 'belongsTo',
      foreignKey: 'customer_profile_id',
      table: 'customers',
      fields: [
        'id',
        'email',
        'first_name',
        'last_name',
        'organization_name',
        'status',
      ],
      description: 'Optional customer profile (service recipient data)',
    },
    technicianProfile: {
      type: 'belongsTo',
      foreignKey: 'technician_profile_id',
      table: 'technicians',
      fields: [
        'id',
        'email',
        'first_name',
        'last_name',
        'license_number',
        'status',
      ],
      description: 'Optional technician profile (worker certification data)',
    },
  },

  // ============================================================================
  // FIELD DEFINITIONS (for validation & documentation)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields (id, is_active, created_at, updated_at, status)
    ...TIER1_FIELDS.WITH_STATUS,
    // Override is_active to add sortable (entity-specific requirement)
    is_active: withTraits({ type: 'boolean', default: true }, TRAITS.FILTERABLE, TRAITS.SORTABLE),

    // Primary identity field - required, immutable, fully queryable
    email: withTraits(FIELD.EMAIL, TRAITS.REQUIRED, TRAITS.IMMUTABLE, TRAIT_SETS.IDENTITY),

    // Auth0 binding - immutable, filterable only (not searchable/sortable), readonly
    auth0_id: withTraits(
      { type: 'string', maxLength: 255, readonly: true },
      TRAITS.IMMUTABLE,
      TRAITS.FILTERABLE,
    ),

    // Human name fields - required, fully queryable
    first_name: withTraits(FIELD.FIRST_NAME, TRAITS.REQUIRED, TRAIT_SETS.IDENTITY),
    last_name: withTraits(FIELD.LAST_NAME, TRAITS.REQUIRED, TRAIT_SETS.IDENTITY),

    // Role assignment - lookupable (filterable + sortable)
    role_id: createForeignKey('role', { traits: TRAIT_SETS.LOOKUP }),

    // Multi-profile FKs - admin managed, no query traits
    customer_profile_id: createForeignKey('customer', {
      traits: {},
      description: 'FK to customers table - links user to customer profile',
    }),
    technician_profile_id: createForeignKey('technician', {
      traits: {},
      description: 'FK to technicians table - links user to technician profile',
    }),
  },
};
