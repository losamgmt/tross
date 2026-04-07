/**
 * CustomerUnit Junction Model Metadata
 *
 * Category: JUNCTION (M:M relationship table, no display name)
 *
 * SRP: ONLY defines CustomerUnit junction table structure
 * Used by QueryBuilderService for M:M relationship queries
 * Used by GenericEntityService for junction record CRUD
 *
 * SINGLE SOURCE OF TRUTH for Customer-Unit relationship metadata
 *
 * This junction tracks which customers own or occupy which units.
 * Combined with property_role, this enables the full access model:
 * - Customers see their units via this junction
 * - Board members get extra access via property_role
 */

const { UNIVERSAL_FIELD_ACCESS } = require('../constants');
const {
  createJunctionFields,
  createJunctionUniqueConstraint,
  withTraits,
  TRAIT_SETS,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'customer_unit',
  tableName: 'customer_units',
  primaryKey: 'id',
  icon: 'link',

  // ============================================================================
  // JUNCTION CONFIGURATION
  // ============================================================================

  /**
   * Junction entities have no display name pattern
   * They are referenced by their composite key, not a name field
   */
  namePattern: null,

  /**
   * Marks this as a junction entity for M:M relationships
   */
  isJunction: true,

  /**
   * The two entities this junction connects
   * entity1 is typically the "owner" side
   */
  junctionFor: {
    entity1: 'customer',
    entity2: 'unit',
  },

  /**
   * Composite unique constraint prevents duplicate relationships
   */
  uniqueConstraints: [createJunctionUniqueConstraint('customer', 'unit')],

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * Junction tables have no identity field - they're identified by composite key
   */
  identityField: 'role',
  identityFieldUnique: false,

  rlsResource: 'customer_units',

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    {
      id: 'customer-own-unit-associations',
      description: 'Customers see their own unit associations',
      roles: 'customer',
      operations: '*',
      access: { type: 'direct', field: 'customer_id', value: 'customer_profile_id' },
    },
    {
      id: 'staff-full-access',
      description: 'Staff see all customer-unit associations',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  /**
   * Junction tables are not shown in navigation
   * They are managed through the parent entities' UI
   */
  navVisibility: null,

  supportsFileAttachments: false,

  /**
   * Summary endpoint configuration for aggregated analytics.
   * Null: Junction table for customer-unit relationships.
   */
  summaryConfig: null,

  entityPermissions: {
    create: 'dispatcher',
    read: 'customer', // Customers can see their own via RLS
    update: 'dispatcher',
    delete: 'dispatcher',
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================


  displayColumns: ['customer_id', 'unit_id', 'role', 'is_active'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    // Junction FK fields - must be explicitly defined for Joi schema to include them
    customer_id: {
      create: 'dispatcher',
      read: 'customer',
      update: 'none', // Cannot change the relationship
      delete: 'none',
    },
    unit_id: {
      create: 'dispatcher',
      read: 'customer',
      update: 'none', // Cannot change the relationship
      delete: 'none',
    },

    role: {
      create: 'dispatcher',
      read: 'customer',
      update: 'dispatcher',
      delete: 'none',
    },
    effective_date: {
      create: 'dispatcher',
      read: 'technician',
      update: 'dispatcher',
      delete: 'none',
    },
    end_date: {
      create: 'dispatcher',
      read: 'technician',
      update: 'dispatcher',
      delete: 'none',
    },
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      active: { color: 'success', label: 'Active' },
      inactive: { color: 'secondary', label: 'Inactive' },
    },
    role: {
      owner: { color: 'primary', label: 'Owner' },
      authorized_occupant: { color: 'info', label: 'Authorized Occupant' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: ['customer', 'unit'],

  relationships: {
    customer: {
      type: 'belongsTo',
      foreignKey: 'customer_id',
      table: 'customers',
      fields: ['id', 'first_name', 'last_name', 'email'],
      description: 'Customer who owns or occupies the unit',
    },
    unit: {
      type: 'belongsTo',
      foreignKey: 'unit_id',
      table: 'units',
      fields: ['id', 'unit_identifier', 'property_id', 'ownership_type'],
      description: 'Unit owned or occupied by the customer',
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION
  // ============================================================================

  dependents: [],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  // ============================================================================
  // FIELD DEFINITIONS (Field-Centric: traits embedded in field definitions)
  // ============================================================================

  fields: createJunctionFields('customer', 'unit', {
    extraFields: {
      // Customer's role in relation to this unit
      role: withTraits(
        {
          type: 'enum',
          enumKey: 'role',
          default: 'owner',
          description: 'Customer role in relation to this unit',
        },
        TRAIT_SETS.LOOKUP,
      ),
      // Temporal validity
      effective_date: withTraits(
        {
          type: 'date',
          description: 'Date this association became effective',
        },
        TRAIT_SETS.LOOKUP,
      ),
      end_date: withTraits(
        {
          type: 'date',
          description: 'Date this association ended (null if active)',
        },
        TRAIT_SETS.LOOKUP,
      ),
    },
  }),
};
