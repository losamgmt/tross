/**
 * Vendor Model Metadata
 *
 * Category: SIMPLE (name field for identity and display)
 *
 * SRP: ONLY defines Vendor table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Vendor model query and CRUD capabilities
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
  TRAITS,
  TRAIT_SETS,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'vendor',
  tableName: 'vendors',
  primaryKey: 'id',
  icon: 'business',

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

  rlsResource: 'vendors',

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    // customer: no rule = deny (internal resource)
    {
      id: 'staff-full-access',
      description: 'Staff see all vendors',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  // ============================================================================
  // CONSOLIDATED NAVIGATION & FEATURES
  // ============================================================================

  navigation: {
    visibility: 'dispatcher',
    group: 'resources',
    order: 3,
  },

  features: {
    fileAttachments: false,
    summary: {
      groupableFields: ['status'],
    },
  },

  navVisibility: 'dispatcher', // DEPRECATED: Use navigation.visibility
  navGroup: 'resources', // DEPRECATED: Use navigation.group
  navOrder: 3, // DEPRECATED: Use navigation.order

  supportsFileAttachments: false, // DEPRECATED: Use features.fileAttachments

  /**
   * Summary endpoint configuration for aggregated analytics.
   */
  summaryConfig: { // DEPRECATED: Use features.summary
    groupableFields: ['status'],
  },

  entityPermissions: {
    create: 'manager',
    read: 'technician',
    update: 'manager',
    delete: 'admin',
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},
  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  displayColumns: ['name', 'contact_email', 'phone', 'status'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    name: FAL.MANAGER_MANAGED,
    contact_email: FAL.MANAGER_MANAGED,
    phone: FAL.MANAGER_MANAGED,
    notes: FAL.MANAGER_MANAGED,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      active: { color: 'success', label: 'Active' },
      inactive: { color: 'secondary', label: 'Inactive' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: [],
  relationships: {},

  // ============================================================================
  // DELETE CONFIGURATION
  // ============================================================================

  dependents: [
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'vendors' },
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
      { ...FIELD.NAME, maxLength: 100 },
      TRAIT_SETS.IDENTITY,
    ),
    contact_email: withTraits(FIELD.EMAIL, TRAITS.SEARCHABLE, TRAIT_SETS.FILTER_ONLY),
    phone: FIELD.PHONE,
    notes: { type: 'text' },
  },
};
