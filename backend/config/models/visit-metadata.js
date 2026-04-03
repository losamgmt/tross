/**
 * Visit Model Metadata
 *
 * Category: COMPUTED (auto-generated visit_number identity)
 *
 * SRP: ONLY defines Visit table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Visit model query and CRUD capabilities
 *
 * Visits are scheduled appointments tied to work_orders.
 * One work_order can have multiple visits (multi-day jobs).
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const { NAME_PATTERNS } = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'visit',
  tableName: 'visits',
  primaryKey: 'id',
  icon: 'event',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.COMPUTED,
  displayField: 'visit_number',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'visit_number',
  identifierPrefix: 'VIS',
  identityFieldUnique: true,

  rlsResource: 'visits',

  /**
   * Row-Level Security rules (ADR-011)
   * Phase 1: Basic rules - Phase 2 will add parent:work_order access
   */
  rlsRules: [
    {
      id: 'customer-via-work-order',
      description: 'Customers see visits for their work orders',
      roles: 'customer',
      operations: '*',
      access: { type: 'parent', foreignKey: 'work_order_id', parentEntity: 'work_order' },
    },
    {
      id: 'technician-via-work-order',
      description: 'Technicians see visits for their assigned work orders',
      roles: 'technician',
      operations: '*',
      access: { type: 'parent', foreignKey: 'work_order_id', parentEntity: 'work_order' },
    },
    {
      id: 'staff-full-access',
      description: 'Dispatcher+ see all visits',
      roles: ['dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  entityPermissions: {
    create: 'dispatcher',
    read: 'customer',
    update: 'technician',
    delete: 'manager',
  },

  navVisibility: 'dispatcher',
  navGroup: 'work',
  navOrder: 3,

  supportsFileAttachments: true,

  summaryConfig: {
    groupableFields: ['status', 'work_order_id'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {
    scheduling: {
      label: 'Scheduling',
      fields: ['scheduled_start', 'scheduled_end'],
      rows: [['scheduled_start', 'scheduled_end']],
      order: 1,
    },
    actuals: {
      label: 'Actual Times',
      fields: ['actual_start', 'actual_end'],
      rows: [['actual_start', 'actual_end']],
      order: 2,
    },
  },

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  requiredFields: ['work_order_id', 'scheduled_start'],

  immutableFields: ['visit_number'],

  displayColumns: ['visit_number', 'work_order_id', 'status', 'scheduled_start', 'scheduled_end'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    visit_number: {
      create: 'none', // Auto-generated
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    work_order_id: {
      create: 'dispatcher',
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    // Scheduling fields - dispatcher manages
    scheduled_start: FAL.DISPATCHER_MANAGED,
    scheduled_end: FAL.DISPATCHER_MANAGED,
    // Actual times - technician records
    actual_start: {
      create: 'dispatcher',
      read: 'customer',
      update: 'technician',
      delete: 'none',
    },
    actual_end: {
      create: 'dispatcher',
      read: 'customer',
      update: 'technician',
      delete: 'none',
    },
    notes: {
      create: 'dispatcher',
      read: 'customer',
      update: 'technician',
      delete: 'none',
    },
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      scheduled: { label: 'Scheduled', color: 'info' },
      confirmed: { label: 'Confirmed', color: 'success' },
      in_progress: { label: 'In Progress', color: 'warning' },
      completed: { label: 'Completed', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'secondary' },
      no_show: { label: 'No Show', color: 'error' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: ['workOrder'],
  relationships: {
    workOrder: {
      type: 'belongsTo',
      foreignKey: 'work_order_id',
      table: 'work_orders',
      fields: ['id', 'work_order_number', 'name', 'customer_id'],
      description: 'Parent work order for this visit',
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

    visit_number: {
      type: 'string',
      required: true,
      maxLength: 20,
      description: 'Auto-generated visit identifier (VIS-YYYY-NNNN)',
    },
    scheduled_start: {
      type: 'timestamp',
      required: true,
      description: 'Scheduled start time',
    },
    scheduled_end: {
      type: 'timestamp',
      description: 'Scheduled end time',
    },
    actual_start: {
      type: 'timestamp',
      description: 'Actual start time (recorded by technician)',
    },
    actual_end: {
      type: 'timestamp',
      description: 'Actual end time (recorded by technician)',
    },
    notes: {
      type: 'text',
      description: 'Visit notes',
    },
    status: {
      type: 'enum',
      enumKey: 'status',
      default: 'scheduled',
    },
    // FK fields
    work_order_id: {
      type: 'foreignKey',
      references: 'work_order',
      required: true,
      displayFields: ['work_order_number', 'name'],
      displayTemplate: '{work_order_number}',
    },
  },
};
