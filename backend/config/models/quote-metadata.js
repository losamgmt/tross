/**
 * Quote Model Metadata
 *
 * Category: COMPUTED (auto-generated quote_number identity, computed name)
 *
 * SRP: ONLY defines Quote table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Quote model query and CRUD capabilities
 *
 * Quotes are generated from recommendations or directly by staff.
 * When accepted, they can trigger work order creation.
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
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
  entityKey: 'quote',
  tableName: 'quotes',
  primaryKey: 'id',
  icon: 'request_quote',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.COMPUTED,
  displayField: 'quote_number',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'quote_number',
  identifierPrefix: 'QT',
  identityFieldUnique: true,

  rlsResource: 'quotes',

  /**
   * Row-Level Security rules (ADR-011)
   * Phase 1: Basic rules - Phase 2 will add customer_id direct access
   */
  rlsRules: [
    {
      id: 'customer-own-quotes',
      description: 'Customers see their own quotes',
      roles: 'customer',
      operations: '*',
      access: { type: 'direct', field: 'customer_id', value: 'customer_profile_id' },
    },
    {
      id: 'staff-full-access',
      description: 'Dispatcher+ see all quotes',
      roles: ['dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

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
    group: 'work',
    order: 2,
  },

  features: {
    fileAttachments: true,
    summary: {
      groupableFields: ['status', 'customer_id', 'property_id'],
    },
  },

  navVisibility: 'dispatcher', // DEPRECATED: Use navigation.visibility
  navGroup: 'work', // DEPRECATED: Use navigation.group
  navOrder: 2, // DEPRECATED: Use navigation.order

  supportsFileAttachments: true, // DEPRECATED: Use features.fileAttachments

  summaryConfig: { // DEPRECATED: Use features.summary
    groupableFields: ['status', 'customer_id', 'property_id'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},
  fieldAliases: {},

  // ============================================================================
  // COMPUTED NAME CONFIGURATION
  // ============================================================================

  computedName: {
    template: '{quote_number}: {description}',
    sources: ['quote_number', 'description'],
    readOnly: false,
  },

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  displayColumns: ['quote_number', 'customer_id', 'status', 'created_at'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    quote_number: {
      create: 'none', // Auto-generated
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    customer_id: {
      create: 'dispatcher',
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    property_id: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },
    description: FAL.DISPATCHER_MANAGED,
    notes: FAL.DISPATCHER_MANAGED,
    valid_until: FAL.DISPATCHER_MANAGED,
    total_amount: FAL.DISPATCHER_MANAGED,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      draft: { label: 'Draft', color: 'secondary' },
      sent: { label: 'Sent', color: 'info' },
      accepted: { label: 'Accepted', color: 'success' },
      rejected: { label: 'Rejected', color: 'error' },
      expired: { label: 'Expired', color: 'warning' },
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
      description: 'Customer this quote is for',
    },
    property: {
      type: 'belongsTo',
      foreignKey: 'property_id',
      table: 'properties',
      fields: ['id', 'name', 'address_city'],
      description: 'Property this quote relates to',
    },
  },

  // ============================================================================
  // FIELDS (with embedded traits for query capabilities)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields (field-centric)
    ...TIER1_FIELDS.WITH_STATUS,
    // Override status default (workflow entity - draft→sent→accepted, not active/inactive)
    status: withTraits(
      { type: 'enum', enumKey: 'status', default: 'draft' },
      TRAIT_SETS.LOOKUP,
    ),

    // Identity field - auto-generated, immutable
    quote_number: withTraits(
      { type: 'string', maxLength: 20, description: 'Auto-generated quote identifier (QT-YYYY-NNNN)' },
      TRAITS.IMMUTABLE, TRAIT_SETS.IDENTITY,
    ),

    // Content fields
    description: withTraits(
      { type: 'text', description: 'Quote description/summary' },
      TRAIT_SETS.FULLTEXT,
    ),
    notes: { type: 'text', description: 'Internal notes' },
    valid_until: withTraits(
      { type: 'date', description: 'Quote expiration date' },
      TRAIT_SETS.LOOKUP,
    ),
    total_amount: withTraits(
      { type: 'decimal', precision: 10, scale: 2, description: 'Total quote amount' },
      TRAIT_SETS.SORTABLE,
    ),

    // FK fields with embedded traits
    customer_id: createForeignKey('customer', {
      required: true,
      displayFields: ['first_name', 'last_name', 'email'],
      displayTemplate: '{first_name} {last_name}',
      traits: TRAIT_SETS.LOOKUP,
    }),
    property_id: createForeignKey('property', {
      displayFields: ['name', 'address_city'],
      displayTemplate: '{name}',
      traits: TRAIT_SETS.LOOKUP,
    }),
  },
};
