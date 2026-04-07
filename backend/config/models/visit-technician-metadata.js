/**
 * VisitTechnician Junction Model Metadata
 *
 * Category: JUNCTION (M:M relationship table, no display name)
 *
 * SRP: ONLY defines VisitTechnician junction table structure
 * Used by QueryBuilderService for M:M relationship queries
 * Used by GenericEntityService for junction record CRUD
 *
 * SINGLE SOURCE OF TRUTH for Visit-Technician relationship metadata
 *
 * This junction assigns technicians to visits.
 * Enables multi-technician assignments for complex jobs.
 */

const { UNIVERSAL_FIELD_ACCESS } = require('../constants');
const {
  createJunctionFields,
  createJunctionUniqueConstraint,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'visit_technician',
  tableName: 'visit_technicians',
  primaryKey: 'id',
  icon: 'group',

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
   */
  junctionFor: {
    entity1: 'visit',
    entity2: 'technician',
  },

  /**
   * Composite unique constraint prevents duplicate assignments
   */
  uniqueConstraints: [createJunctionUniqueConstraint('visit', 'technician')],

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * Junction tables use 'id' as identity (no separate identity field)
   */
  identityField: 'id',
  identityFieldUnique: true,

  rlsResource: 'visit_technicians',

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    {
      id: 'technician-own-assignments',
      description: 'Technicians see visits they are assigned to',
      roles: 'technician',
      operations: '*',
      access: { type: 'direct', field: 'technician_id', value: 'technician_profile_id' },
    },
    {
      id: 'staff-full-access',
      description: 'Dispatcher+ see all assignments',
      roles: ['dispatcher', 'manager', 'admin'],
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
   * Null: Junction table for visit-technician relationships.
   */
  summaryConfig: null,

  entityPermissions: {
    create: 'dispatcher',
    read: 'technician',
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

  displayColumns: ['visit_id', 'technician_id'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    // Junction FK fields
    visit_id: {
      create: 'dispatcher',
      read: 'technician',
      update: 'none', // Cannot change the relationship
      delete: 'none',
    },
    technician_id: {
      create: 'dispatcher',
      read: 'technician',
      update: 'none', // Cannot change the relationship
      delete: 'none',
    },
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {},

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: ['visit', 'technician'],

  relationships: {
    visit: {
      type: 'belongsTo',
      foreignKey: 'visit_id',
      table: 'visits',
      fields: ['id', 'visit_number', 'scheduled_start', 'status'],
      description: 'Visit this technician is assigned to',
    },
    technician: {
      type: 'belongsTo',
      foreignKey: 'technician_id',
      table: 'technicians',
      fields: ['id', 'first_name', 'last_name', 'email'],
      description: 'Technician assigned to this visit',
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

  fields: createJunctionFields('visit', 'technician'),
};
