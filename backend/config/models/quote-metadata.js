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
const { NAME_PATTERNS } = require('../field-types');

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

  navVisibility: 'dispatcher',
  navGroup: 'work',
  navOrder: 2,

  supportsFileAttachments: true,

  summaryConfig: {
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

  requiredFields: ['customer_id'],

  immutableFields: ['quote_number'],

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
  // FIELDS (Phase 1: Minimal - Phase 3: Full fields)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    quote_number: {
      type: 'string',
      required: true,
      maxLength: 20,
      description: 'Auto-generated quote identifier (QT-YYYY-NNNN)',
    },
    description: {
      type: 'text',
      description: 'Quote description/summary',
    },
    notes: {
      type: 'text',
      description: 'Internal notes',
    },
    valid_until: {
      type: 'date',
      description: 'Quote expiration date',
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
    property_id: {
      type: 'foreignKey',
      references: 'property',
      displayFields: ['name', 'address_city'],
      displayTemplate: '{name}',
    },
    total_amount: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      description: 'Total quote amount',
    },
  },
};
