/**
 * Recommendation Model Metadata
 *
 * Category: COMPUTED (auto-generated recommendation_number identity)
 *
 * SRP: ONLY defines Recommendation table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Recommendation model query and CRUD capabilities
 *
 * Recommendations are service suggestions from technicians to customers.
 * Approval workflow is handled via the generic approval_request entity.
 */

const { UNIVERSAL_FIELD_ACCESS } = require('../constants');
const {
  NAME_PATTERNS,
  TIER1_FIELDS,
  withTraits,
  TRAITS,
  TRAIT_SETS,
  createForeignKey,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'recommendation',
  tableName: 'recommendations',
  primaryKey: 'id',
  icon: 'lightbulb',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.COMPUTED,
  displayField: 'recommendation_number',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'recommendation_number',
  identifierPrefix: 'REC',
  identityFieldUnique: true,

  rlsResource: 'recommendations',

  /**
   * Row-Level Security rules (ADR-011)
   * Phase 1: Basic rules - Phase 2 will add customer_id and created_by access
   */
  rlsRules: [
    {
      id: 'customer-own-recommendations',
      description: 'Customers see their own recommendations',
      roles: 'customer',
      operations: '*',
      access: { type: 'direct', field: 'customer_id', value: 'customer_profile_id' },
    },
    {
      id: 'staff-full-access',
      description: 'Dispatcher+ see all recommendations',
      roles: ['dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  entityPermissions: {
    create: 'technician',
    read: 'customer',
    update: 'technician',
    delete: 'manager',
  },

  navVisibility: 'technician',
  navGroup: 'work',
  navOrder: 4,

  supportsFileAttachments: true,

  summaryConfig: {
    groupableFields: ['status', 'customer_id', 'asset_id'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},
  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  displayColumns: ['recommendation_number', 'customer_id', 'title', 'status', 'created_at'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    recommendation_number: {
      create: 'none', // Auto-generated
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    customer_id: {
      create: 'technician',
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    asset_id: {
      create: 'technician',
      read: 'customer',
      update: 'technician',
      delete: 'none',
    },
    title: {
      create: 'technician',
      read: 'customer',
      update: 'technician',
      delete: 'none',
    },
    description: {
      create: 'technician',
      read: 'customer',
      update: 'technician',
      delete: 'none',
    },
    priority: {
      create: 'technician',
      read: 'customer',
      update: 'technician',
      delete: 'none',
    },
    notes: {
      create: 'dispatcher',
      read: 'dispatcher',
      update: 'dispatcher',
      delete: 'none',
    },
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      draft: { label: 'Draft', color: 'secondary' },
      open: { label: 'Open', color: 'info' },
      approved: { label: 'Approved', color: 'success' },
      rejected: { label: 'Rejected', color: 'error' },
      converted: { label: 'Converted', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'secondary' },
    },
    priority: {
      low: { label: 'Low', color: 'secondary' },
      normal: { label: 'Normal', color: 'info' },
      high: { label: 'High', color: 'warning' },
      urgent: { label: 'Urgent', color: 'error' },
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
      description: 'Customer this recommendation is for',
    },
    asset: {
      type: 'belongsTo',
      foreignKey: 'asset_id',
      table: 'assets',
      fields: ['id', 'name', 'asset_type'],
      description: 'Asset this recommendation relates to',
    },
  },

  // ============================================================================
  // FIELDS (with embedded traits for query capabilities)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields (field-centric)
    ...TIER1_FIELDS.WITH_STATUS,
    // Override status default (workflow entity - draft→open→approved, not active/inactive)
    status: withTraits(
      { type: 'enum', enumKey: 'status', default: 'draft' },
      TRAIT_SETS.LOOKUP,
    ),

    // Identity field - auto-generated, immutable
    recommendation_number: withTraits(
      { type: 'string', maxLength: 20, description: 'Auto-generated recommendation identifier (REC-YYYY-NNNN)' },
      TRAITS.IMMUTABLE, TRAIT_SETS.IDENTITY,
    ),

    // Content fields
    title: withTraits(
      { type: 'string', maxLength: 200, description: 'Recommendation title' },
      TRAITS.REQUIRED, TRAIT_SETS.SEARCHABLE_LOOKUP,
    ),
    description: withTraits(
      { type: 'text', description: 'Detailed recommendation description' },
      TRAIT_SETS.FULLTEXT,
    ),
    priority: withTraits(
      { type: 'enum', enumKey: 'priority', default: 'normal' },
      TRAIT_SETS.LOOKUP,
    ),
    notes: { type: 'text', description: 'Internal notes' },

    // FK fields with embedded traits
    customer_id: createForeignKey('customer', {
      required: true,
      displayFields: ['first_name', 'last_name'],
      displayTemplate: '{first_name} {last_name}',
      traits: TRAIT_SETS.LOOKUP,
    }),
    asset_id: createForeignKey('asset', {
      displayFields: ['name', 'asset_type'],
      displayTemplate: '{name}',
      traits: TRAIT_SETS.LOOKUP,
    }),
  },
};
