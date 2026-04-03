/**
 * Service Agreement Model Metadata
 *
 * Category: COMPUTED (auto-generated agreement_number identity)
 *
 * SRP: ONLY defines Service Agreement table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Service Agreement model query and CRUD capabilities
 *
 * Service agreements are contracts with customers for recurring services.
 * They define scope, pricing, and link to service_templates via junction table.
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const { NAME_PATTERNS } = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'service_agreement',
  tableName: 'service_agreements',
  primaryKey: 'id',
  icon: 'handshake',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.COMPUTED,
  displayField: 'agreement_number',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'agreement_number',
  identifierPrefix: 'SA',
  identityFieldUnique: true,

  rlsResource: 'service_agreements',

  /**
   * Row-Level Security rules (ADR-011)
   * Phase 1: Basic rules - Phase 2 will add customer_id direct access
   */
  rlsRules: [
    {
      id: 'customer-own-agreements',
      description: 'Customers see their own service agreements',
      roles: 'customer',
      operations: ['read'],
      access: { type: 'direct', field: 'customer_id', value: 'customer_profile_id' },
    },
    {
      id: 'staff-full-access',
      description: 'Dispatcher+ see all service agreements',
      roles: ['dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  entityPermissions: {
    create: 'manager',
    read: 'customer',
    update: 'manager',
    delete: 'manager',
  },

  navVisibility: 'manager',
  navGroup: 'work',
  navOrder: 7,

  supportsFileAttachments: true,

  summaryConfig: {
    groupableFields: ['status', 'customer_id'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {
    contract: {
      label: 'Contract Details',
      fields: ['start_date', 'end_date', 'auto_renewal'],
      rows: [['start_date', 'end_date'], ['auto_renewal']],
      order: 1,
    },
  },

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  requiredFields: ['customer_id', 'start_date'],

  immutableFields: ['agreement_number'],

  displayColumns: ['agreement_number', 'customer_id', 'start_date', 'end_date', 'status'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    agreement_number: {
      create: 'none', // Auto-generated
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    customer_id: {
      create: 'manager',
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    start_date: FAL.MANAGER_MANAGED,
    end_date: FAL.MANAGER_MANAGED,
    auto_renewal: FAL.MANAGER_MANAGED,
    notes: FAL.MANAGER_MANAGED,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      draft: { label: 'Draft', color: 'secondary' },
      pending: { label: 'Pending', color: 'warning' },
      active: { label: 'Active', color: 'success' },
      expired: { label: 'Expired', color: 'error' },
      cancelled: { label: 'Cancelled', color: 'secondary' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: ['customer'],
  relationships: {
    customer: {
      type: 'belongsTo',
      foreignKey: 'customer_id',
      table: 'customers',
      fields: ['id', 'email', 'first_name', 'last_name'],
      description: 'Customer this agreement is with',
    },
  },

  // ============================================================================
  // FIELDS (Phase 1: Minimal - Phase 3: Full fields)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    agreement_number: {
      type: 'string',
      required: true,
      maxLength: 20,
      description: 'Auto-generated agreement identifier (SA-YYYY-NNNN)',
    },
    start_date: {
      type: 'date',
      required: true,
      description: 'Agreement start date',
    },
    end_date: {
      type: 'date',
      description: 'Agreement end date',
    },
    auto_renewal: {
      type: 'boolean',
      default: false,
      description: 'Whether agreement auto-renews',
    },
    notes: {
      type: 'text',
      description: 'Internal notes',
    },
    status: {
      type: 'enum',
      enumKey: 'status',
      default: 'draft',
    },
    // FK fields
    customer_id: {
      type: 'foreignKey',
      references: 'customer',
      required: true,
      displayFields: ['first_name', 'last_name', 'email'],
      displayTemplate: '{first_name} {last_name}',
    },
  },
};
