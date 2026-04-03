/**
 * Maintenance Schedule Model Metadata
 *
 * Category: COMPUTED (auto-generated schedule_number identity)
 *
 * SRP: ONLY defines Maintenance Schedule table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Maintenance Schedule model query and CRUD capabilities
 *
 * Maintenance schedules define recurring service patterns for assets.
 * They auto-generate work orders based on frequency settings.
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const { NAME_PATTERNS } = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'maintenance_schedule',
  tableName: 'maintenance_schedules',
  primaryKey: 'id',
  icon: 'schedule',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.COMPUTED,
  displayField: 'schedule_number',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'schedule_number',
  identifierPrefix: 'MS',
  identityFieldUnique: true,

  rlsResource: 'maintenance_schedules',

  /**
   * Row-Level Security rules (ADR-011)
   * Phase 1: Basic rules - Phase 2 will add customer_id direct access
   */
  rlsRules: [
    {
      id: 'customer-own-schedules',
      description: 'Customers see their own maintenance schedules',
      roles: 'customer',
      operations: ['read'],
      access: { type: 'direct', field: 'customer_id', value: 'customer_profile_id' },
    },
    {
      id: 'staff-full-access',
      description: 'Dispatcher+ see all maintenance schedules',
      roles: ['dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  entityPermissions: {
    create: 'manager',
    read: 'customer',
    update: 'manager',
    delete: 'manager',
  },

  navVisibility: 'manager',
  navGroup: 'work',
  navOrder: 6,

  supportsFileAttachments: false,

  summaryConfig: {
    groupableFields: ['status', 'frequency', 'customer_id', 'asset_id'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {
    schedule: {
      label: 'Schedule Settings',
      fields: ['frequency', 'frequency_interval', 'next_due_date'],
      rows: [['frequency', 'frequency_interval'], ['next_due_date']],
      order: 1,
    },
  },

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  requiredFields: ['customer_id', 'frequency', 'next_due_date'],

  immutableFields: ['schedule_number'],

  displayColumns: ['schedule_number', 'customer_id', 'frequency', 'next_due_date', 'status'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    schedule_number: {
      create: 'none', // Auto-generated
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    customer_id: {
      create: 'manager',
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    asset_id: {
      create: 'manager',
      read: 'customer',
      update: 'manager',
      delete: 'none',
    },
    service_template_id: {
      create: 'manager',
      read: 'customer',
      update: 'manager',
      delete: 'none',
    },
    frequency: FAL.MANAGER_MANAGED,
    frequency_interval: FAL.MANAGER_MANAGED,
    next_due_date: FAL.MANAGER_MANAGED,
    last_generated_date: {
      create: 'none',
      read: 'customer',
      update: 'none', // System-managed
      delete: 'none',
    },
    notes: FAL.MANAGER_MANAGED,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      active: { label: 'Active', color: 'success' },
      paused: { label: 'Paused', color: 'warning' },
      cancelled: { label: 'Cancelled', color: 'secondary' },
    },
    frequency: {
      daily: { label: 'Daily', color: 'info' },
      weekly: { label: 'Weekly', color: 'info' },
      biweekly: { label: 'Bi-weekly', color: 'info' },
      monthly: { label: 'Monthly', color: 'info' },
      quarterly: { label: 'Quarterly', color: 'info' },
      semiannually: { label: 'Semi-annually', color: 'info' },
      annually: { label: 'Annually', color: 'info' },
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
      description: 'Customer this schedule is for',
    },
    asset: {
      type: 'belongsTo',
      foreignKey: 'asset_id',
      table: 'assets',
      fields: ['id', 'name', 'asset_type'],
      description: 'Asset being maintained',
    },
    serviceTemplate: {
      type: 'belongsTo',
      foreignKey: 'service_template_id',
      table: 'service_templates',
      fields: ['id', 'name'],
      description: 'Service template to use for generated work orders',
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

    schedule_number: {
      type: 'string',
      required: true,
      maxLength: 20,
      description: 'Auto-generated schedule identifier (MS-YYYY-NNNN)',
    },
    frequency: {
      type: 'enum',
      enumKey: 'frequency',
      required: true,
      description: 'Recurrence frequency',
    },
    frequency_interval: {
      type: 'integer',
      default: 1,
      description: 'Multiplier for frequency (e.g., 2 weeks = biweekly)',
    },
    next_due_date: {
      type: 'date',
      required: true,
      description: 'Next scheduled service date',
    },
    last_generated_date: {
      type: 'date',
      description: 'Date of last auto-generated work order',
    },
    notes: {
      type: 'text',
      description: 'Internal notes',
    },
    status: {
      type: 'enum',
      enumKey: 'status',
      default: 'active',
    },
    // FK fields
    customer_id: {
      type: 'foreignKey',
      references: 'customer',
      required: true,
      displayFields: ['first_name', 'last_name'],
      displayTemplate: '{first_name} {last_name}',
    },
    asset_id: {
      type: 'foreignKey',
      references: 'asset',
      displayFields: ['name', 'model'],
      displayTemplate: '{name}',
    },
    service_template_id: {
      type: 'foreignKey',
      references: 'service_template',
      displayFields: ['name'],
      displayTemplate: '{name}',
    },
  },
};
