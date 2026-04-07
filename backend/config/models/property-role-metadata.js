/**
 * PropertyRole Junction Model Metadata
 *
 * Category: JUNCTION (M:M relationship table, no display name)
 *
 * SRP: ONLY defines PropertyRole junction table structure
 * Used by QueryBuilderService for M:M relationship queries
 * Used by GenericEntityService for junction record CRUD
 *
 * SINGLE SOURCE OF TRUTH for Customer-Property role relationship metadata
 *
 * This junction tracks property-level roles (board members, property managers).
 * It is SEPARATE from customer_unit (ownership) because:
 * - A board member may not own any unit at the property
 * - A unit owner may not be on the board
 * - Board membership grants access to common areas + anonymized unit summaries
 */

const { UNIVERSAL_FIELD_ACCESS } = require('../constants');
const {
  createJunctionFields,
  createJunctionUniqueConstraint,
  withTraits,
  TRAITS,
  TRAIT_SETS,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'property_role',
  tableName: 'property_roles',
  primaryKey: 'id',
  icon: 'admin_panel_settings',

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
    entity2: 'property',
  },

  /**
   * Composite unique constraint: one role per customer per property
   * (A customer could have multiple roles at different properties,
   * but only one role at each property)
   */
  uniqueConstraints: [createJunctionUniqueConstraint('customer', 'property')],

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * Junction tables have no identity field - they're identified by composite key
   */
  identityField: 'role',
  identityFieldUnique: false,

  rlsResource: 'property_roles',

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    {
      id: 'customer-own-property-roles',
      description: 'Customers see their own property role assignments',
      roles: 'customer',
      operations: '*',
      access: { type: 'direct', field: 'customer_id', value: 'customer_profile_id' },
    },
    {
      id: 'staff-full-access',
      description: 'Staff see all property role assignments',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  /**
   * Junction tables are not shown in navigation
   * They are managed through the property detail UI
   */
  navVisibility: null,

  supportsFileAttachments: false,

  /**
   * Summary endpoint configuration for aggregated analytics.
   * Null: Junction table for property-role relationships.
   */
  summaryConfig: null,

  entityPermissions: {
    create: 'manager', // Only managers can assign board roles
    read: 'customer', // Customers can see their own via RLS
    update: 'manager',
    delete: 'manager',
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  displayColumns: ['customer_id', 'property_id', 'role', 'is_active'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    // Junction FK fields - must be explicitly defined for Joi schema to include them
    customer_id: {
      create: 'manager',
      read: 'customer',
      update: 'none', // Cannot change the relationship
      delete: 'none',
    },
    property_id: {
      create: 'manager',
      read: 'customer',
      update: 'none', // Cannot change the relationship
      delete: 'none',
    },

    role: {
      create: 'manager',
      read: 'customer',
      update: 'manager',
      delete: 'none',
    },
    effective_date: {
      create: 'manager',
      read: 'technician',
      update: 'manager',
      delete: 'none',
    },
    end_date: {
      create: 'manager',
      read: 'technician',
      update: 'manager',
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
      board_chair: { color: 'primary', label: 'Board Chair' },
      board_member: { color: 'info', label: 'Board Member' },
      property_manager: { color: 'warning', label: 'Property Manager' },
      accountant: { color: 'secondary', label: 'Accountant' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: ['customer', 'property'],

  relationships: {
    customer: {
      type: 'belongsTo',
      foreignKey: 'customer_id',
      table: 'customers',
      fields: ['id', 'first_name', 'last_name', 'email'],
      description: 'Customer who holds this role',
    },
    property: {
      type: 'belongsTo',
      foreignKey: 'property_id',
      table: 'properties',
      fields: ['id', 'name', 'address_city', 'address_state'],
      description: 'Property where this role applies',
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

  fields: createJunctionFields('customer', 'property', {
    extraFields: {
      // Management/board role at this property (required)
      role: withTraits(
        {
          type: 'enum',
          enumKey: 'role',
          description: 'Management/board role at this property',
        },
        TRAITS.REQUIRED,
        TRAIT_SETS.LOOKUP,
      ),
      // Temporal validity
      effective_date: withTraits(
        {
          type: 'date',
          description: 'Date this role became effective',
        },
        TRAIT_SETS.LOOKUP,
      ),
      end_date: withTraits(
        {
          type: 'date',
          description: 'Date this role ended (null if active)',
        },
        TRAIT_SETS.LOOKUP,
      ),
    },
  }),
};
