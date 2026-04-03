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
const { NAME_PATTERNS } = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'purchase_order',
  tableName: 'purchase_orders',
  primaryKey: 'id',
  icon: 'shopping_cart',

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

  navVisibility: 'technician',
  navGroup: 'resources',
  navOrder: 4,

  supportsFileAttachments: true,

  summaryConfig: {
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

  requiredFields: ['vendor_id', 'description'],

  immutableFields: ['po_number'],

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
  // FIELDS (Phase 1: Minimal - Phase 3: Full fields)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    po_number: {
      type: 'string',
      required: true,
      maxLength: 20,
      description: 'Auto-generated PO identifier (PO-YYYY-NNNN)',
    },
    description: {
      type: 'text',
      required: true,
      description: 'Description of items being ordered',
    },
    total_amount: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      description: 'Total order amount',
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
    vendor_id: {
      type: 'foreignKey',
      references: 'vendor',
      required: true,
      displayFields: ['company_name'],
      displayTemplate: '{company_name}',
    },
    work_order_id: {
      type: 'foreignKey',
      references: 'work_order',
      displayFields: ['work_order_number'],
      displayTemplate: '{work_order_number}',
    },
  },
};
