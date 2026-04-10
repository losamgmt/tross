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
const {
  FIELD,
  TIER1_FIELDS,
  withTraits,
  TRAITS,
  TRAIT_SETS,
  createForeignKey,
} = require('../field-types');

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

  // ============================================================================
  // CONSOLIDATED NAVIGATION & FEATURES
  // ============================================================================

  navigation: {
    visibility: 'technician',
    group: 'customers',
    order: 3,
  },

  features: {
    fileAttachments: false,
    summary: {
      groupableFields: ['property_id', 'ownership_type', 'unit_category'],
      summableFields: ['square_footage'],
    },
  },

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Units are in customers group (they're part of the property hierarchy)
   */
  navVisibility: 'technician', // DEPRECATED: Use navigation.visibility
  navGroup: 'customers', // DEPRECATED: Use navigation.group
  navOrder: 3, // DEPRECATED: Use navigation.order

  supportsFileAttachments: false, // DEPRECATED: Use features.fileAttachments

  /**
   * Summary endpoint configuration for aggregated analytics.
   */
  summaryConfig: { // DEPRECATED: Use features.summary
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
  // SEARCH CONFIGURATION (Derived from field traits)
  // ============================================================================

  // ============================================================================
  // FILTER CONFIGURATION (Derived from field traits)
  // ============================================================================

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  defaultSort: {
    field: 'unit_identifier',
    order: 'ASC',
  },

  // ============================================================================
  // FIELD DEFINITIONS (with embedded traits for query capabilities)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields (field-centric)
    ...TIER1_FIELDS.WITH_STATUS,

    // Parent reference - immutable
    property_id: createForeignKey('property', {
      required: true,
      immutable: true,
      displayFields: ['name'],
      displayTemplate: '{name}',
      traits: TRAIT_SETS.LOOKUP,
    }),

    // Identity field - searchable, filterable, sortable
    unit_identifier: withTraits(
      { ...FIELD.NAME, maxLength: 50, description: 'Unit number/name (e.g., "4A", "Lobby", "Parking-L1")' },
      TRAITS.REQUIRED, TRAIT_SETS.SEARCHABLE_LOOKUP,
    ),

    // Ownership classification
    ownership_type: withTraits(
      { type: 'enum', enumKey: 'ownership_type', description: 'Whether this is a private unit or common area' },
      TRAITS.REQUIRED, TRAIT_SETS.LOOKUP,
    ),

    // Optional category
    unit_category: withTraits(
      { type: 'enum', enumKey: 'unit_category', description: 'Type of unit (residential, commercial, amenity, etc.)' },
      TRAIT_SETS.LOOKUP,
    ),

    // Optional details
    floor: withTraits(
      { type: 'integer', description: 'Floor number (can be negative for basement levels)' },
      TRAIT_SETS.LOOKUP,
    ),
    square_footage: withTraits(
      { type: 'integer', description: 'Square footage of the unit' },
      TRAIT_SETS.SORTABLE,
    ),
    notes: withTraits({ type: 'text' }, TRAIT_SETS.FULLTEXT),
  },
};
