/**
 * Service Template Model Metadata
 *
 * Category: SIMPLE (name field for identity and display)
 *
 * SRP: ONLY defines Service Template table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Service Template model query and CRUD capabilities
 *
 * Service templates are reusable work package definitions.
 * They can be linked to service agreements to define recurring work.
 *
 * Phase 1: Core contract only
 * Phase 2: Add service_agreement_item junction
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const {
  NAME_PATTERNS,
  TIER1_FIELDS,
  withTraits,
  TRAITS,
  TRAIT_SETS,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'service_template',
  tableName: 'service_templates',
  primaryKey: 'id',
  icon: 'description',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.SIMPLE,

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'name',
  displayField: 'name',
  identityFieldUnique: true,

  rlsResource: 'service_templates',

  /**
   * Row-Level Security rules (ADR-011)
   * Service templates are reference data - staff can view, managers manage
   */
  rlsRules: [
    {
      id: 'staff-full-access',
      description: 'Technician+ see all service templates',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  entityPermissions: {
    create: 'manager',
    read: 'technician',
    update: 'manager',
    delete: 'manager',
  },

  navVisibility: 'manager',
  navGroup: 'work',
  navOrder: 5,

  supportsFileAttachments: false,

  summaryConfig: {
    groupableFields: ['status'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},
  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  displayColumns: ['name', 'description', 'estimated_duration', 'status'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    name: FAL.MANAGER_MANAGED,
    description: FAL.MANAGER_MANAGED,
    estimated_duration: FAL.MANAGER_MANAGED,
    notes: FAL.MANAGER_MANAGED,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      active: { label: 'Active', color: 'success' },
      inactive: { label: 'Inactive', color: 'secondary' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS (Phase 2)
  // ============================================================================

  defaultIncludes: [],
  relationships: {},

  // ============================================================================
  // FIELD DEFINITIONS (Field-Centric: traits embedded in field definitions)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    ...TIER1_FIELDS.WITH_STATUS,

    // Entity-specific fields
    name: withTraits(
      {
        type: 'string',
        maxLength: 200,
        description: 'Service template name (e.g., "Quarterly HVAC Inspection")',
      },
      TRAIT_SETS.IDENTITY,
    ),
    description: withTraits(
      {
        type: 'text',
        description: 'Detailed description of the service',
      },
      TRAITS.SEARCHABLE,
    ),
    estimated_duration: withTraits(
      {
        type: 'integer',
        description: 'Estimated duration in minutes',
      },
      TRAIT_SETS.LOOKUP,
    ),
    notes: {
      type: 'text',
      description: 'Internal notes',
    },
  },
};
