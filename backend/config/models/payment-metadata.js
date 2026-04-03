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
const { NAME_PATTERNS } = require('../field-types');

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

  requiredFields: ['amount', 'payment_date', 'customer_id'],

  immutableFields: ['payment_number'],

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
  // FIELDS (Phase 1: Minimal - Phase 3: Full fields)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    payment_number: {
      type: 'string',
      required: true,
      maxLength: 20,
      description: 'Auto-generated payment identifier (PMT-YYYY-NNNN)',
    },
    amount: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      required: true,
      description: 'Payment amount',
    },
    payment_date: {
      type: 'date',
      required: true,
      description: 'Date payment received',
    },
    payment_method: {
      type: 'enum',
      enumKey: 'payment_method',
      description: 'Payment method used',
    },
    reference_number: {
      type: 'string',
      maxLength: 50,
      description: 'External reference (check number, transaction ID)',
    },
    notes: {
      type: 'text',
      description: 'Internal notes',
    },
    status: {
      type: 'enum',
      enumKey: 'status',
      default: 'pending',
    },
    // FK fields
    customer_id: {
      type: 'foreignKey',
      references: 'customer',
      required: true,
      displayFields: ['display_name'],
      displayTemplate: '{display_name}',
    },
    invoice_id: {
      type: 'foreignKey',
      references: 'invoice',
      displayFields: ['invoice_number'],
      displayTemplate: '{invoice_number}',
    },
  },
};
