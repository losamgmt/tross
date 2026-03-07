/**
 * Asset Model Metadata
 *
 * Category: SIMPLE (name field for identity and display)
 *
 * SRP: ONLY defines Asset table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Asset model query and CRUD capabilities
 *
 * Assets belong to units (not directly to properties). The property_id is
 * auto-populated from the unit for efficient property-level filtering.
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const { FIELD, NAME_PATTERNS } = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'asset',
  tableName: 'assets',
  primaryKey: 'id',
  icon: 'precision_manufacturing',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.SIMPLE,

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'name',
  displayField: 'name',
  identityFieldUnique: false, // Assets can have same name at different units

  rlsResource: 'assets',

  /**
   * Row-Level Security policy per role
   * Assets follow unit RLS - customers access via relationship endpoints.
   */
  rlsPolicy: {
    customer: false,
    technician: null,
    dispatcher: null,
    manager: null,
    admin: null,
  },

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Assets are in customers group, visible to technician+
   */
  navVisibility: 'technician',
  navGroup: 'customers',
  navOrder: 4, // After unit

  supportsFileAttachments: true,

  /**
   * Summary endpoint configuration for aggregated analytics.
   */
  summaryConfig: {
    groupableFields: ['property_id', 'unit_id', 'asset_type', 'status'],
  },

  entityPermissions: {
    create: 'dispatcher',
    read: 'technician',
    update: 'dispatcher',
    delete: 'manager',
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {
    identity: {
      label: 'Asset Details',
      fields: ['name', 'asset_type', 'unit_id', 'status'],
      order: 1,
    },
    specifications: {
      label: 'Specifications',
      fields: ['manufacturer', 'model', 'serial_number', 'install_date'],
      rows: [['manufacturer', 'model']],
      order: 2,
    },
    maintenance: {
      label: 'Maintenance',
      fields: ['last_service_date', 'next_service_date', 'warranty_expiry'],
      order: 3,
    },
    notes: {
      label: 'Notes',
      fields: ['notes'],
      order: 4,
    },
  },

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  requiredFields: ['name', 'unit_id', 'asset_type'],

  immutableFields: ['unit_id', 'property_id'], // Cannot move asset to different unit

  displayColumns: [
    'name',
    'asset_type',
    'manufacturer',
    'model',
    'status',
  ],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    name: FAL.DISPATCHER_MANAGED,
    asset_type: FAL.DISPATCHER_MANAGED,
    unit_id: {
      create: 'dispatcher',
      read: 'technician',
      update: 'none', // Cannot reassign to different unit
      delete: 'none',
    },
    property_id: {
      create: 'none', // Auto-populated from unit
      read: 'technician',
      update: 'none', // Computed field
      delete: 'none',
    },
    manufacturer: FAL.DISPATCHER_MANAGED,
    model: FAL.DISPATCHER_MANAGED,
    serial_number: FAL.DISPATCHER_MANAGED,
    install_date: FAL.DISPATCHER_MANAGED,
    last_service_date: {
      create: 'dispatcher',
      read: 'technician',
      update: 'technician', // Technicians update after service
      delete: 'none',
    },
    next_service_date: FAL.DISPATCHER_MANAGED,
    warranty_expiry: FAL.DISPATCHER_MANAGED,
    notes: FAL.DISPATCHER_MANAGED,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      active: { color: 'success', label: 'Active' },
      inactive: { color: 'secondary', label: 'Inactive' },
      needs_repair: { color: 'warning', label: 'Needs Repair' },
      decommissioned: { color: 'error', label: 'Decommissioned' },
    },
    asset_type: {
      hvac: { color: 'primary', label: 'HVAC' },
      plumbing: { color: 'info', label: 'Plumbing' },
      electrical: { color: 'warning', label: 'Electrical' },
      appliance: { color: 'secondary', label: 'Appliance' },
      other: { color: 'default', label: 'Other' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: ['unit'],

  relationships: {
    // Asset belongs to a unit (required)
    unit: {
      type: 'belongsTo',
      foreignKey: 'unit_id',
      table: 'units',
      fields: ['id', 'unit_identifier', 'property_id', 'ownership_type'],
      description: 'Unit where this asset is located',
    },
    // Asset's property (denormalized for filtering)
    property: {
      type: 'belongsTo',
      foreignKey: 'property_id',
      table: 'properties',
      fields: ['id', 'name', 'address_city', 'address_state'],
      description: 'Property where this asset is located (via unit)',
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION
  // ============================================================================

  dependents: [
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'assets' },
    },
  ],

  // ============================================================================
  // SEARCH CONFIGURATION
  // ============================================================================

  searchableFields: ['name', 'manufacturer', 'model', 'serial_number'],

  // ============================================================================
  // FILTER CONFIGURATION
  // ============================================================================

  filterableFields: [
    'id',
    'name',
    'asset_type',
    'unit_id',
    'property_id', // Denormalized for efficient property-level filtering
    'manufacturer',
    'is_active',
    'status',
    'created_at',
    'updated_at',
  ],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  sortableFields: [
    'id',
    'name',
    'asset_type',
    'manufacturer',
    'status',
    'install_date',
    'created_at',
    'updated_at',
  ],

  defaultSort: {
    field: 'name',
    order: 'ASC',
  },

  // ============================================================================
  // FIELD DEFINITIONS
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    name: { ...FIELD.NAME, required: true, maxLength: 200 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      enumKey: 'status',
      default: 'active',
    },

    // Parent reference - the unit this asset belongs to
    unit_id: {
      type: 'foreignKey',
      relatedEntity: 'unit',
      required: true,
      displayFields: ['unit_identifier'],
      displayTemplate: '{unit_identifier}',
    },

    // Denormalized property_id - auto-populated from unit for efficient filtering
    property_id: {
      type: 'foreignKey',
      relatedEntity: 'property',
      computed: true,
      derivedFrom: 'unit_id',
      displayFields: ['name'],
      displayTemplate: '{name}',
    },

    // Entity-specific fields
    asset_type: {
      type: 'enum',
      enumKey: 'asset_type',
      required: true,
    },
    manufacturer: FIELD.NAME,
    model: FIELD.NAME,
    serial_number: {
      type: 'string',
      maxLength: 100,
      description: 'Manufacturer serial number',
    },
    install_date: { type: 'date' },
    last_service_date: { type: 'date' },
    next_service_date: { type: 'date' },
    warranty_expiry: { type: 'date' },
    notes: { type: 'text' },
  },
};
