/**
 * Receipt Model Metadata
 *
 * Category: COMPUTED (auto-generated receipt_number identity)
 *
 * SRP: ONLY defines Receipt table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Receipt model query and CRUD capabilities
 *
 * Receipts are records of materials/expenses for work orders.
 * Used to track costs and can be attached to invoices.
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const { NAME_PATTERNS } = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'receipt',
  tableName: 'receipts',
  primaryKey: 'id',
  icon: 'receipt',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.COMPUTED,
  displayField: 'receipt_number',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'receipt_number',
  identifierPrefix: 'RCT',
  identityFieldUnique: true,

  rlsResource: 'receipts',

  /**
   * Row-Level Security rules (ADR-011)
   * Receipts are internal records - staff only
   */
  rlsRules: [
    {
      id: 'staff-full-access',
      description: 'Dispatcher+ see all receipts',
      roles: ['dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  entityPermissions: {
    create: 'dispatcher',
    read: 'dispatcher',
    update: 'manager',
    delete: 'admin',
  },

  navVisibility: 'dispatcher',
  navGroup: 'finance',
  navOrder: 3,

  supportsFileAttachments: true,

  summaryConfig: {
    groupableFields: ['status', 'work_order_id', 'purchase_order_id'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},
  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  requiredFields: ['amount'],

  immutableFields: ['receipt_number'],

  displayColumns: ['receipt_number', 'work_order_id', 'description', 'amount', 'receipt_date', 'status'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    receipt_number: {
      create: 'none', // Auto-generated
      read: 'dispatcher',
      update: 'none', // Immutable
      delete: 'none',
    },
    work_order_id: {
      create: 'dispatcher',
      read: 'dispatcher',
      update: 'dispatcher',
      delete: 'none',
    },
    purchase_order_id: {
      create: 'dispatcher',
      read: 'dispatcher',
      update: 'dispatcher',
      delete: 'none',
    },
    description: FAL.DISPATCHER_MANAGED,
    amount: FAL.DISPATCHER_MANAGED,
    receipt_date: FAL.DISPATCHER_MANAGED,
    notes: FAL.MANAGER_MANAGED,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      pending: { label: 'Pending', color: 'warning' },
      verified: { label: 'Verified', color: 'info' },
      approved: { label: 'Approved', color: 'success' },
      rejected: { label: 'Rejected', color: 'error' },
      invoiced: { label: 'Invoiced', color: 'success' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: [],
  relationships: {
    workOrder: {
      type: 'belongsTo',
      foreignKey: 'work_order_id',
      table: 'work_orders',
      fields: ['id', 'work_order_number', 'name'],
      description: 'Related work order',
    },
    purchaseOrder: {
      type: 'belongsTo',
      foreignKey: 'purchase_order_id',
      table: 'purchase_orders',
      fields: ['id', 'po_number'],
      description: 'Related purchase order',
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

    receipt_number: {
      type: 'string',
      required: true,
      maxLength: 20,
      description: 'Auto-generated receipt identifier (RCT-YYYY-NNNN)',
    },
    description: {
      type: 'text',
      description: 'Description of expense',
    },
    amount: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      required: true,
      description: 'Receipt amount',
    },
    receipt_date: {
      type: 'date',
      description: 'Date of receipt',
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
    work_order_id: {
      type: 'foreignKey',
      references: 'work_order',
      displayFields: ['work_order_number'],
      displayTemplate: '{work_order_number}',
    },
    purchase_order_id: {
      type: 'foreignKey',
      references: 'purchase_order',
      displayFields: ['po_number'],
      displayTemplate: '{po_number}',
    },
  },
};
