/**
 * Property Model Metadata
 *
 * Category: SIMPLE (name field for identity and display)
 *
 * SRP: ONLY defines Property table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Property model query and CRUD capabilities
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const {
  FIELD,
  NAME_PATTERNS,
  TIER1_FIELDS,
  withTraits,
  TRAIT_SETS,
  createAddressFields,
  createAddressFieldAccess,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'property',
  tableName: 'properties',
  primaryKey: 'id',
  icon: 'home',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.SIMPLE,

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'name',
  displayField: 'name',
  identityFieldUnique: false, // Multiple properties can have same name

  rlsResource: 'properties',

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    {
      id: 'customer-via-property-role',
      description: 'Customers see properties where they have a board/manager role',
      roles: 'customer',
      operations: 'read',
      access: {
        type: 'junction',
        junction: {
          table: 'property_roles',
          localKey: 'id',
          foreignKey: 'property_id',
          filter: { customer_id: 'customer_profile_id' },
        },
      },
    },
    {
      id: 'customer-via-unit-ownership',
      description: 'Customers see properties containing units they own/occupy',
      roles: 'customer',
      operations: 'read',
      access: {
        type: 'junction',
        junction: {
          // Join through units: properties.id = units.property_id, then units.id = customer_units.unit_id
          table: 'units',
          localKey: 'id',
          foreignKey: 'property_id',
          through: {
            table: 'customer_units',
            localKey: 'id',
            foreignKey: 'unit_id',
            filter: { customer_id: 'customer_profile_id' },
          },
        },
      },
    },
    {
      id: 'staff-full-access',
      description: 'Staff see all properties',
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
    order: 2,
  },

  features: {
    fileAttachments: true,
    summary: {
      groupableFields: ['property_type', 'status'],
    },
  },

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Properties are in customers group, visible to technician+
   */
  navVisibility: 'technician', // DEPRECATED: Use navigation.visibility
  navGroup: 'customers', // DEPRECATED: Use navigation.group
  navOrder: 2, // DEPRECATED: Use navigation.order

  supportsFileAttachments: true, // DEPRECATED: Use features.fileAttachments

  /**
   * Summary endpoint configuration for aggregated analytics.
   */
  summaryConfig: { // DEPRECATED: Use features.summary
    groupableFields: ['property_type', 'status'],
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
      label: 'Property Details',
      fields: ['name', 'property_type', 'status'],
      order: 1,
    },
    address: {
      label: 'Address',
      fields: [
        'address_line1',
        'address_line2',
        'address_city',
        'address_state',
        'address_postal_code',
        'address_country',
      ],
      rows: [['address_city', 'address_state', 'address_postal_code']],
      order: 2,
    },
    details: {
      label: 'Additional Details',
      fields: ['access_instructions', 'notes'],
      order: 3,
    },
  },

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  displayColumns: [
    'name',
    'property_type',
    'address_city',
    'address_state',
    'status',
  ],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    name: FAL.DISPATCHER_MANAGED,
    property_type: FAL.DISPATCHER_MANAGED,
    access_instructions: {
      create: 'dispatcher',
      read: 'technician', // Technicians need access instructions
      update: 'dispatcher',
      delete: 'none',
    },
    notes: FAL.DISPATCHER_MANAGED,

    // Address fields - dispatcher+ manages, technician+ reads
    ...createAddressFieldAccess('address', 'dispatcher', { readRole: 'technician' }),
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      active: { color: 'success', label: 'Active' },
      inactive: { color: 'secondary', label: 'Inactive' },
    },
    property_type: {
      residential: { color: 'primary', label: 'Residential' },
      commercial: { color: 'info', label: 'Commercial' },
      industrial: { color: 'warning', label: 'Industrial' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: [],

  relationships: {
    // Property has many units (the primary subdivision)
    units: {
      type: 'hasMany',
      foreignKey: 'property_id',
      table: 'units',
      fields: ['id', 'unit_identifier', 'ownership_type', 'unit_category', 'status'],
      description: 'Units within this property (apartments, common areas, etc.)',
    },
    // Property has many property roles (board/management assignments)
    propertyRoles: {
      type: 'hasMany',
      foreignKey: 'property_id',
      table: 'property_roles',
      fields: ['id', 'customer_id', 'role', 'effective_date', 'end_date'],
      description: 'Board members and managers assigned to this property',
    },
    // Property has many work orders (denormalized for filtering)
    workOrders: {
      type: 'hasMany',
      foreignKey: 'property_id',
      table: 'work_orders',
      fields: ['id', 'work_order_number', 'name', 'status', 'priority'],
      description: 'Work orders at this property',
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION
  // ============================================================================

  dependents: [
    {
      table: 'units',
      foreignKey: 'property_id',
      onDelete: 'restrict', // Cannot delete property with units
    },
    {
      table: 'property_roles',
      foreignKey: 'property_id',
      onDelete: 'cascade', // Remove role assignments
    },
    {
      table: 'work_orders',
      foreignKey: 'property_id',
      onDelete: 'restrict', // Cannot delete property with work orders
    },
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'properties' },
    },
  ],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  defaultSort: {
    field: 'name',
    order: 'ASC',
  },

  // ============================================================================
  // FIELD DEFINITIONS (Field-Centric: traits embedded in field definitions)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    ...TIER1_FIELDS.WITH_STATUS,

    // Entity-specific fields
    name: withTraits(
      { ...FIELD.NAME, maxLength: 200 },
      TRAIT_SETS.IDENTITY,
    ),
    property_type: withTraits(
      {
        type: 'enum',
        enumKey: 'property_type',
        default: 'residential',
      },
      TRAIT_SETS.LOOKUP,
    ),
    access_instructions: {
      type: 'text',
      maxLength: 2000,
      description: 'Instructions for accessing the property (gate codes, etc.)',
    },
    notes: { type: 'text' },

    // Address fields (using flat structure)
    ...createAddressFields('address', {
      citySearchable: true,
      stateSearchable: true,
    }),
  },
};
