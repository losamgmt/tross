/**
 * Unit Model Metadata
 *
 * Category: SIMPLE (unit_identifier field for identity and display)
 *
 * SRP: ONLY defines Unit table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Unit model query and CRUD capabilities
 *
 * Units represent physical spaces within a property - both private (apartments,
 * offices) and common areas (lobby, parking, roof). The system makes no
 * assumptions about how properties are divided - this is 100% data-driven.
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const { FIELD } = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'unit',
  tableName: 'units',
  primaryKey: 'id',
  icon: 'meeting_room',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  // null namePattern = no auto-generated name columns; uses unit_identifier as identity
  namePattern: null,

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'unit_identifier',
  displayField: 'unit_identifier',
  identityFieldUnique: false, // Units can have same identifier at different properties

  rlsResource: 'units',

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    {
      id: 'customer-via-junction',
      description: 'Customers see units they own/occupy via customer_units',
      roles: 'customer',
      operations: 'read',
      access: {
        type: 'junction',
        junction: {
          table: 'customer_units',
          localKey: 'id',
          foreignKey: 'unit_id',
          filter: { customer_id: 'customer_profile_id' },
        },
      },
    },
    {
      id: 'staff-full-access',
      description: 'Staff see all units',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Units are in customers group (they're part of the property hierarchy)
   */
  navVisibility: 'technician',
  navGroup: 'customers',
  navOrder: 3,

  supportsFileAttachments: false,

  /**
   * Summary endpoint configuration for aggregated analytics.
   */
  summaryConfig: {
    groupableFields: ['property_id', 'ownership_type', 'unit_category'],
    summableFields: ['square_footage'],
  },

  entityPermissions: {
    create: 'dispatcher',
    read: 'customer', // Customers can see their units via junction RLS
    update: 'dispatcher',
    delete: 'manager',
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {
    identity: {
      label: 'Unit Details',
      fields: ['unit_identifier', 'property_id', 'ownership_type', 'unit_category'],
      rows: [['ownership_type', 'unit_category']],
      order: 1,
    },
    details: {
      label: 'Additional Details',
      fields: ['floor', 'square_footage', 'notes'],
      rows: [['floor', 'square_footage']],
      order: 2,
    },
  },

  fieldAliases: {
    unit_identifier: 'Unit ID',
  },

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  requiredFields: ['unit_identifier', 'property_id', 'ownership_type'],

  immutableFields: ['property_id'], // Cannot move unit to different property

  displayColumns: [
    'unit_identifier',
    'ownership_type',
    'unit_category',
    'floor',
    'status',
  ],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    unit_identifier: FAL.DISPATCHER_MANAGED,
    property_id: {
      create: 'dispatcher',
      read: 'technician',
      update: 'none', // Cannot reassign to different property
      delete: 'none',
    },
    ownership_type: FAL.DISPATCHER_MANAGED,
    unit_category: FAL.DISPATCHER_MANAGED,
    floor: FAL.DISPATCHER_MANAGED,
    square_footage: FAL.DISPATCHER_MANAGED,
    notes: FAL.DISPATCHER_MANAGED,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      active: { color: 'success', label: 'Active' },
      inactive: { color: 'secondary', label: 'Inactive' },
    },
    ownership_type: {
      private: { color: 'primary', label: 'Private' },
      common: { color: 'info', label: 'Common Area' },
    },
    unit_category: {
      residential: { color: 'primary', label: 'Residential' },
      commercial: { color: 'info', label: 'Commercial' },
      amenity: { color: 'success', label: 'Amenity' },
      utility: { color: 'warning', label: 'Utility' },
      parking: { color: 'secondary', label: 'Parking' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: ['property'],

  relationships: {
    // Unit belongs to a property (required)
    property: {
      type: 'belongsTo',
      foreignKey: 'property_id',
      table: 'properties',
      fields: ['id', 'name', 'address_city', 'address_state'],
      description: 'Property where this unit is located',
    },
    // Unit has many assets
    assets: {
      type: 'hasMany',
      foreignKey: 'unit_id',
      table: 'assets',
      fields: ['id', 'name', 'asset_type', 'status'],
      description: 'Assets located in this unit',
    },
    // Unit has many work orders
    workOrders: {
      type: 'hasMany',
      foreignKey: 'unit_id',
      table: 'work_orders',
      fields: ['id', 'work_order_number', 'name', 'status', 'priority'],
      description: 'Work orders for this unit',
    },
    // Unit belongs to many customers (through junction)
    customers: {
      type: 'manyToMany',
      foreignKey: 'unit_id',
      table: 'customers',
      through: 'customer_units',
      targetKey: 'customer_id',
      fields: ['id', 'first_name', 'last_name', 'email'],
      description: 'Customers who own or occupy this unit',
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION
  // ============================================================================

  dependents: [
    {
      table: 'assets',
      foreignKey: 'unit_id',
      onDelete: 'restrict', // Cannot delete unit with assets
    },
    {
      table: 'work_orders',
      foreignKey: 'unit_id',
      onDelete: 'restrict', // Cannot delete unit with work orders
    },
    {
      table: 'customer_units',
      foreignKey: 'unit_id',
      onDelete: 'cascade', // Remove junction records
    },
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'units' },
    },
  ],

  // ============================================================================
  // SEARCH CONFIGURATION
  // ============================================================================

  searchableFields: ['unit_identifier', 'notes'],

  // ============================================================================
  // FILTER CONFIGURATION
  // ============================================================================

  filterableFields: [
    'id',
    'unit_identifier',
    'property_id',
    'ownership_type',
    'unit_category',
    'floor',
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
    'unit_identifier',
    'ownership_type',
    'unit_category',
    'floor',
    'status',
    'created_at',
    'updated_at',
  ],

  defaultSort: {
    field: 'unit_identifier',
    order: 'ASC',
  },

  // ============================================================================
  // FIELD DEFINITIONS
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      enumKey: 'status',
      default: 'active',
    },

    // Parent reference
    property_id: {
      type: 'foreignKey',
      relatedEntity: 'property',
      required: true,
      displayFields: ['name'],
      displayTemplate: '{name}',
    },

    // Identity field
    unit_identifier: {
      ...FIELD.NAME,
      required: true,
      maxLength: 50,
      description: 'Unit number/name (e.g., "4A", "Lobby", "Parking-L1")',
    },

    // Ownership classification
    ownership_type: {
      type: 'enum',
      enumKey: 'ownership_type',
      required: true,
      description: 'Whether this is a private unit or common area',
    },

    // Optional category
    unit_category: {
      type: 'enum',
      enumKey: 'unit_category',
      description: 'Type of unit (residential, commercial, amenity, etc.)',
    },

    // Optional details
    floor: {
      type: 'integer',
      description: 'Floor number (can be negative for basement levels)',
    },
    square_footage: {
      type: 'integer',
      description: 'Square footage of the unit',
    },
    notes: { type: 'text' },
  },
};
