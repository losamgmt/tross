/**
 * Contract Model Metadata
 *
 * Category: COMPUTED (auto-generated contract_number identity, computed name)
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
  entityKey: 'contract',

  // Table name in database (plural, also used for API URLs)
  tableName: 'contracts',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'description',

  // ============================================================================
  // ENTITY CATEGORY (determines name handling pattern)
  // ============================================================================

  /**
   * Name pattern: COMPUTED uses auto-generated identifier
   */
  namePattern: NAME_PATTERNS.COMPUTED,

  /**
   * Display field for UI rendering
   * COMPUTED entities use the identifier field (contract_number)
   */
  displayField: 'contract_number',

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The unique identifier field (auto-generated: CTR-YYYY-NNNN)
   * Used for: Unique references, search results, logging
   */
  identityField: 'contract_number',

  /**
   * Prefix for auto-generated identifiers (COMPUTED entities only)
   * Format: CTR-YYYY-NNNN
   */
  identifierPrefix: 'CTR',

  /**
   * Whether the identity field has a UNIQUE constraint in the database
   */
  identityFieldUnique: true,

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: 'contracts',

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    {
      id: 'customer-own-contracts',
      description: 'Customers see their own contracts',
      roles: 'customer',
      operations: '*',
      access: { type: 'direct', field: 'customer_id', value: 'customer_profile_id' },
    },
    // technician: no rule = deny
    {
      id: 'office-staff-full-access',
      description: 'Dispatcher, manager, admin see all contracts',
      roles: ['dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  /**
   * Entity-level permission overrides
   * Contracts require manager+ for CUD operations
   */
  entityPermissions: {
    create: 'manager',
    read: 'customer',
    update: 'manager',
    delete: 'manager',
  },

  // ============================================================================
  // CONSOLIDATED NAVIGATION & FEATURES
  // ============================================================================

  navigation: {
    visibility: 'dispatcher',
    group: 'finance',
    order: 1,
  },

  features: {
    fileAttachments: true,
    summary: {
      groupableFields: ['customer_id', 'status'],
      summableFields: ['value'],
    },
  },

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Separate from read permission because RLS may restrict actual data access
   * Contracts are financial docs - only dispatcher+ should see in nav
   */
  navVisibility: 'dispatcher', // DEPRECATED: Use navigation.visibility
  navGroup: 'finance', // DEPRECATED: Use navigation.group
  navOrder: 1, // DEPRECATED: Use navigation.order

  /**
   * File attachments - whether this entity supports file uploads
   * Contracts: signed contracts, amendments, supporting documents
   */
  supportsFileAttachments: true, // DEPRECATED: Use features.fileAttachments

  /**
   * Summary endpoint configuration for aggregated analytics.
   */
  summaryConfig: { // DEPRECATED: Use features.summary
    groupableFields: ['customer_id', 'status'],
    summableFields: ['value'],
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
   * Template: "{customer.fullName}: {summary}: {contract_number}"
   */
  computedName: {
    template: '{customer.fullName}: {summary}: {contract_number}',
    sources: ['customer_id', 'summary', 'contract_number'],
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
    'contract_number',
    'customer_id',
    'status',
    'start_date',
    'end_date',
    'value',
  ],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL (for field-access-controller.js)
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

    // Identity field - auto-generated, immutable
    contract_number: {
      create: 'none', // Auto-generated
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },

    // Computed name field (optional user override)
    name: {
      create: 'manager',
      read: 'customer',
      update: 'manager',
      delete: 'none',
    },

    // Brief description of this contract
    summary: {
      create: 'manager',
      read: 'customer',
      update: 'manager',
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
  // ENUM DEFINITIONS (SSOT - values are object keys)
  // ============================================================================

  enums: {
    status: {
      draft: { color: 'secondary', label: 'Draft' },
      active: { color: 'success', label: 'Active' },
      expired: { color: 'warning', label: 'Expired' },
      cancelled: { color: 'error', label: 'Cancelled' },
      terminated: { color: 'error', label: 'Terminated' },
    },
    billing_cycle: {
      monthly: { color: 'info', label: 'Monthly' },
      quarterly: { color: 'info', label: 'Quarterly' },
      annually: { color: 'info', label: 'Annually' },
      one_time: { color: 'secondary', label: 'One Time' },
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
      fields: [
        'id',
        'email',
        'first_name',
        'last_name',
        'organization_name',
        'phone',
      ],
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

    // Identity field - auto-generated, immutable
    contract_number: withTraits(
      {
        ...FIELD.IDENTIFIER,
        readonly: true,
        pattern: '^CTR-[0-9]{4}-[0-9]+$',
        errorMessages: { pattern: 'Contract number must be in format CTR-YYYY-NNNN' },
      },
      TRAITS.IMMUTABLE, TRAIT_SETS.IDENTITY,
    ),

    // COMPUTED entity name field - optional because computed from template
    name: withTraits(FIELD.NAME, TRAIT_SETS.SEARCHABLE_LOOKUP),
    summary: withTraits(FIELD.SUMMARY, TRAIT_SETS.FULLTEXT),

    // FK fields with embedded traits
    customer_id: createForeignKey('customer', { required: true, traits: TRAIT_SETS.LOOKUP }),

    // Date fields
    start_date: withTraits({ type: 'date', description: 'Contract start date' }, TRAITS.REQUIRED, TRAIT_SETS.LOOKUP),
    end_date: withTraits({ type: 'date', description: 'Contract end date' }, TRAIT_SETS.LOOKUP),

    // Contract terms
    terms: withTraits(FIELD.TERMS, TRAIT_SETS.FULLTEXT),
    value: withTraits(FIELD.CURRENCY, TRAIT_SETS.SORTABLE),
    billing_cycle: withTraits(
      { type: 'enum', enumKey: 'billing_cycle', description: 'Billing frequency' },
      TRAIT_SETS.LOOKUP,
    ),
  },
};
