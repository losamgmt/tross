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

  // ============================================================================
  // CONSOLIDATED NAVIGATION & FEATURES
  // ============================================================================

  navigation: {
    visibility: 'dispatcher',
    group: 'finance',
    order: 3,
  },

  features: {
    fileAttachments: true,
    summary: {
      groupableFields: ['status', 'work_order_id', 'purchase_order_id'],
    },
  },

  navVisibility: 'dispatcher', // DEPRECATED: Use navigation.visibility
  navGroup: 'finance', // DEPRECATED: Use navigation.group
  navOrder: 3, // DEPRECATED: Use navigation.order

  supportsFileAttachments: true, // DEPRECATED: Use features.fileAttachments

  summaryConfig: { // DEPRECATED: Use features.summary
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
  // FIELDS (with embedded traits for query capabilities)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields (field-centric)
    ...TIER1_FIELDS.WITH_STATUS,
    // Override status default (workflow entity - pending→verified→approved, not active/inactive)
    status: withTraits(
      { type: 'enum', enumKey: 'status', default: 'pending' },
      TRAIT_SETS.LOOKUP,
    ),

    // Identity field - auto-generated, immutable
    receipt_number: withTraits(
      { type: 'string', maxLength: 20, description: 'Auto-generated receipt identifier (RCT-YYYY-NNNN)' },
      TRAITS.IMMUTABLE, TRAIT_SETS.IDENTITY,
    ),

    // Content fields
    description: withTraits(
      { type: 'text', description: 'Description of expense' },
      TRAIT_SETS.FULLTEXT,
    ),
    amount: withTraits(
      { type: 'decimal', precision: 10, scale: 2, description: 'Receipt amount' },
      TRAITS.REQUIRED, TRAIT_SETS.SORTABLE,
    ),
    receipt_date: withTraits(
      { type: 'date', description: 'Date of receipt' },
      TRAIT_SETS.LOOKUP,
    ),
    notes: { type: 'text', description: 'Internal notes' },

    // FK fields with embedded traits
    work_order_id: createForeignKey('work_order', {
      displayFields: ['work_order_number'],
      displayTemplate: '{work_order_number}',
      traits: TRAIT_SETS.LOOKUP,
    }),
    purchase_order_id: createForeignKey('purchase_order', {
      displayFields: ['po_number'],
      displayTemplate: '{po_number}',
      traits: TRAIT_SETS.LOOKUP,
    }),
  },
};
