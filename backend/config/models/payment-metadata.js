/**
 * Payment Model Metadata
 *
 * Category: COMPUTED (auto-generated payment_number identity)
 *
 * SRP: ONLY defines Payment table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Payment model query and CRUD capabilities
 *
 * Payments record money received from customers for invoices.
 * Created by dispatchers (not technicians), customers can view their own.
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
  entityKey: 'payment',
  tableName: 'payments',
  primaryKey: 'id',
  icon: 'payments',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.COMPUTED,
  displayField: 'payment_number',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'payment_number',
  identifierPrefix: 'PMT',
  identityFieldUnique: true,

  rlsResource: 'payments',

  /**
   * Row-Level Security rules (ADR-011)
   */
  rlsRules: [
    {
      id: 'customer-own-payments',
      description: 'Customers can view their own payments',
      roles: ['customer'],
      operations: ['read'],
      access: {
        type: 'direct',
        field: 'customer_id',
        value: 'customer_profile_id',
      },
    },
    {
      id: 'staff-full-access',
      description: 'Dispatcher+ see all payments',
      roles: ['dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  entityPermissions: {
    create: 'dispatcher',
    read: 'customer',
    update: 'manager',
    delete: 'admin',
  },

  navVisibility: 'dispatcher',
  navGroup: 'finance',
  navOrder: 2,

  supportsFileAttachments: true,

  summaryConfig: {
    groupableFields: ['status', 'payment_method', 'customer_id', 'invoice_id'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},
  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  displayColumns: ['payment_number', 'customer_id', 'invoice_id', 'amount', 'payment_date', 'payment_method', 'status'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    payment_number: {
      create: 'none', // Auto-generated
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    customer_id: {
      create: 'dispatcher',
      read: 'customer',
      update: 'manager',
      delete: 'none',
    },
    invoice_id: {
      create: 'dispatcher',
      read: 'customer',
      update: 'manager',
      delete: 'none',
    },
    amount: {
      create: 'dispatcher',
      read: 'customer',
      update: 'manager',
      delete: 'none',
    },
    payment_date: {
      create: 'dispatcher',
      read: 'customer',
      update: 'manager',
      delete: 'none',
    },
    payment_method: {
      create: 'dispatcher',
      read: 'customer',
      update: 'manager',
      delete: 'none',
    },
    reference_number: FAL.DISPATCHER_MANAGED,
    notes: FAL.MANAGER_MANAGED,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      pending: { label: 'Pending', color: 'warning' },
      completed: { label: 'Completed', color: 'success' },
      failed: { label: 'Failed', color: 'error' },
      refunded: { label: 'Refunded', color: 'secondary' },
      cancelled: { label: 'Cancelled', color: 'secondary' },
    },
    payment_method: {
      cash: { label: 'Cash', color: 'info' },
      check: { label: 'Check', color: 'info' },
      credit_card: { label: 'Credit Card', color: 'info' },
      debit_card: { label: 'Debit Card', color: 'info' },
      bank_transfer: { label: 'Bank Transfer', color: 'info' },
      online: { label: 'Online', color: 'info' },
      other: { label: 'Other', color: 'secondary' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: [],
  relationships: {
    customer: {
      type: 'belongsTo',
      foreignKey: 'customer_id',
      table: 'customers',
      fields: ['id', 'display_name'],
      description: 'Customer who made payment',
    },
    invoice: {
      type: 'belongsTo',
      foreignKey: 'invoice_id',
      table: 'invoices',
      fields: ['id', 'invoice_number', 'total_amount'],
      description: 'Invoice this payment applies to',
    },
  },

  // ============================================================================
  // FIELDS (with embedded traits for query capabilities)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields (field-centric)
    ...TIER1_FIELDS.WITH_STATUS,
    // Override status default (workflow entity - pending→completed, not active/inactive)
    status: withTraits(
      { type: 'enum', enumKey: 'status', default: 'pending' },
      TRAIT_SETS.LOOKUP,
    ),

    // Identity field - auto-generated, immutable
    payment_number: withTraits(
      { type: 'string', maxLength: 20, description: 'Auto-generated payment identifier (PMT-YYYY-NNNN)' },
      TRAITS.IMMUTABLE, TRAIT_SETS.IDENTITY,
    ),

    // Financial fields with traits
    amount: withTraits(
      { type: 'decimal', precision: 10, scale: 2, description: 'Payment amount' },
      TRAITS.REQUIRED, TRAIT_SETS.SORTABLE,
    ),
    payment_date: withTraits(
      { type: 'date', description: 'Date payment received' },
      TRAITS.REQUIRED, TRAIT_SETS.LOOKUP,
    ),
    payment_method: withTraits(
      { type: 'enum', enumKey: 'payment_method', description: 'Payment method used' },
      TRAIT_SETS.LOOKUP,
    ),
    reference_number: withTraits(
      { type: 'string', maxLength: 50, description: 'External reference (check number, transaction ID)' },
      TRAIT_SETS.SEARCHABLE_LOOKUP,
    ),
    notes: { type: 'text', description: 'Internal notes' },

    // FK fields with embedded traits
    customer_id: createForeignKey('customer', {
      required: true,
      displayFields: ['display_name'],
      displayTemplate: '{display_name}',
      traits: TRAIT_SETS.LOOKUP,
    }),
    invoice_id: createForeignKey('invoice', {
      displayFields: ['invoice_number'],
      displayTemplate: '{invoice_number}',
      traits: TRAIT_SETS.LOOKUP,
    }),
  },
};
