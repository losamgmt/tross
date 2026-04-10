/**
 * VisitSubcontractor Junction Model Metadata
 *
 * Category: JUNCTION (M:M relationship table, no display name)
 *
 * SRP: ONLY defines VisitSubcontractor junction table structure
 * Used by QueryBuilderService for M:M relationship queries
 * Used by GenericEntityService for junction record CRUD
 *
 * SINGLE SOURCE OF TRUTH for Visit-Subcontractor relationship metadata
 *
 * This junction assigns subcontractors to visits.
 * Enables tracking of external partners on jobs.
 */

const { UNIVERSAL_FIELD_ACCESS } = require('../constants');
const {
  createJunctionFields,
  createJunctionUniqueConstraint,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'visit_subcontractor',
  tableName: 'visit_subcontractors',
  primaryKey: 'id',
  icon: 'engineering',

  // Entity structure type (junction: many-to-many linking table)
  structureType: 'junction',

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
  // ============================================================================
  // CONSOLIDATED JUNCTION CONFIGURATION
  // ============================================================================

  junction: {
    entities: ['visit', 'subcontractor'],
    uniqueOn: [['visit_id', 'subcontractor_id']],
  },

  isJunction: true, // DEPRECATED: Use junction !== null

  /**
   * The two entities this junction connects
   */
  junctionFor: { // DEPRECATED: Use junction.entities
    entity1: 'visit',
    entity2: 'subcontractor',
  },

  /**
   * Composite unique constraint prevents duplicate assignments
   */
  uniqueConstraints: [createJunctionUniqueConstraint('visit', 'subcontractor')],

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * Junction tables use 'id' as identity (no separate identity field)
   */
  identityField: 'id',
  identityFieldUnique: true,

  rlsResource: 'visit_subcontractors',

  /**
   * Row-Level Security rules (ADR-011)
   * Subcontractors are not system users, so staff-only access
   */
  rlsRules: [
    {
      id: 'staff-full-access',
      description: 'Staff see all subcontractor assignments',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  /**
   * Navigation configuration - consolidated
   * null = junction tables are managed through the parent entities' UI
   */
  navigation: null,

  /**
   * Junction tables are not shown in navigation
   * They are managed through the parent entities' UI
   * DEPRECATED: Use navigation
   */
  navVisibility: null,

  /**
   * Features configuration - consolidated
   */
  features: {
    fileAttachments: false,
    summary: null,
  },

  /**
   * DEPRECATED: Use features.fileAttachments
   */
  supportsFileAttachments: false,

  /**
   * Summary endpoint configuration for aggregated analytics.
   * Null: Junction table for visit-subcontractor relationships.
   * DEPRECATED: Use features.summary
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

  displayColumns: ['visit_id', 'subcontractor_id'],

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
    subcontractor_id: {
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

  defaultIncludes: ['visit', 'subcontractor'],

  relationships: {
    visit: {
      type: 'belongsTo',
      foreignKey: 'visit_id',
      table: 'visits',
      fields: ['id', 'visit_number', 'scheduled_start', 'status'],
      description: 'Visit this subcontractor is assigned to',
    },
    subcontractor: {
      type: 'belongsTo',
      foreignKey: 'subcontractor_id',
      table: 'subcontractors',
      fields: ['id', 'company_name', 'contact_name', 'email'],
      description: 'Subcontractor assigned to this visit',
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

  fields: createJunctionFields('visit', 'subcontractor'),
};
