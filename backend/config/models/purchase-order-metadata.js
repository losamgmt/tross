/**
 * Purchase Order Model Metadata
 *
 * Category: COMPUTED (auto-generated po_number identity)
 *
 * SRP: ONLY defines Purchase Order table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Purchase Order model query and CRUD capabilities
 *
 * Purchase orders track material/equipment purchases for work.
 * Technicians can create POs, but require approval workflow.
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
  entityKey: 'purchase_order',
  tableName: 'purchase_orders',
  primaryKey: 'id',
  icon: 'shopping_cart',

  // Entity traits (workflow: has status lifecycle, auditable: changes tracked)
  traits: ['workflow', 'auditable'],

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.COMPUTED,
  displayField: 'po_number',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'po_number',
  identifierPrefix: 'PO',
  identityFieldUnique: true,

  rlsResource: 'purchase_orders',

  /**
   * Row-Level Security rules (ADR-011)
   * Phase 1: Basic rules - Phase 2 will add created_by direct access
   */
  rlsRules: [
    {
      id: 'staff-full-access',
      description: 'Technician+ see all purchase orders',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  entityPermissions: {
    create: 'technician',
    read: 'technician',
    update: 'technician',
    delete: 'manager',
  },

  // ============================================================================
  // CONSOLIDATED NAVIGATION & FEATURES
  // ============================================================================

  navigation: {
    visibility: 'technician',
    group: 'resources',
    order: 4,
  },

  features: {
    fileAttachments: true,
    summary: {
      groupableFields: ['status', 'vendor_id', 'work_order_id'],
    },
  },

  navVisibility: 'technician', // DEPRECATED: Use navigation.visibility
  navGroup: 'resources', // DEPRECATED: Use navigation.group
  navOrder: 4, // DEPRECATED: Use navigation.order

  supportsFileAttachments: true, // DEPRECATED: Use features.fileAttachments

  summaryConfig: { // DEPRECATED: Use features.summary
    groupableFields: ['status', 'vendor_id', 'work_order_id'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},
  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  displayColumns: ['po_number', 'vendor_id', 'description', 'total_amount', 'status'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    po_number: {
      create: 'none', // Auto-generated
      read: 'technician',
      update: 'none', // Immutable
      delete: 'none',
    },
    vendor_id: {
      create: 'technician',
      read: 'technician',
      update: 'technician',
      delete: 'none',
    },
    work_order_id: {
      create: 'technician',
      read: 'technician',
      update: 'technician',
      delete: 'none',
    },
    description: {
      create: 'technician',
      read: 'technician',
      update: 'technician',
      delete: 'none',
    },
    total_amount: {
      create: 'technician',
      read: 'technician',
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
      submitted: { label: 'Submitted', color: 'info' },
      approved: { label: 'Approved', color: 'success' },
      rejected: { label: 'Rejected', color: 'error' },
      ordered: { label: 'Ordered', color: 'warning' },
      received: { label: 'Received', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'secondary' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: ['vendor'],
  relationships: {
    vendor: {
      type: 'belongsTo',
      foreignKey: 'vendor_id',
      table: 'vendors',
      fields: ['id', 'name', 'contact_email'],
      description: 'Vendor for this purchase order',
    },
    workOrder: {
      type: 'belongsTo',
      foreignKey: 'work_order_id',
      table: 'work_orders',
      fields: ['id', 'work_order_number', 'name'],
      description: 'Related work order',
    },
  },

  // ============================================================================
  // FIELDS (with embedded traits for query capabilities)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields (field-centric)
    ...TIER1_FIELDS.WITH_STATUS,
    // Override status default (workflow entity - draft→submitted→approved, not active/inactive)
    status: withTraits(
      { type: 'enum', enumKey: 'status', default: 'draft' },
      TRAIT_SETS.LOOKUP,
    ),

    // Identity field - auto-generated, immutable
    po_number: withTraits(
      { type: 'string', maxLength: 20, description: 'Auto-generated PO identifier (PO-YYYY-NNNN)' },
      TRAITS.IMMUTABLE, TRAIT_SETS.IDENTITY,
    ),

    // Content fields
    description: withTraits(
      { type: 'text', description: 'Description of items being ordered' },
      TRAITS.REQUIRED, TRAIT_SETS.FULLTEXT,
    ),
    total_amount: withTraits(
      { type: 'decimal', precision: 10, scale: 2, description: 'Total order amount' },
      TRAIT_SETS.SORTABLE,
    ),
    notes: { type: 'text', description: 'Internal notes' },

    // FK fields with embedded traits
    vendor_id: createForeignKey('vendor', {
      required: true,
      displayFields: ['company_name'],
      displayTemplate: '{company_name}',
      traits: TRAIT_SETS.LOOKUP,
    }),
    work_order_id: createForeignKey('work_order', {
      displayFields: ['work_order_number'],
      displayTemplate: '{work_order_number}',
      traits: TRAIT_SETS.LOOKUP,
    }),
  },
};
