/**
 * Subcontractor Model Metadata
 *
 * Category: Custom (company_name field for identity and display, no namePattern)
 *
 * SRP: ONLY defines Subcontractor table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Subcontractor model query and CRUD capabilities
 *
 * Subcontractors are external partners who can be assigned to visits.
 * They are separate from employees but can perform work.
 *
 * Phase 1: Core contract only
 * Phase 2: Add visit_subcontractors junction table for assignments
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
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'subcontractor',
  tableName: 'subcontractors',
  primaryKey: 'id',
  icon: 'handyman',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: null,  // Uses company_name, not standard 'name' field

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'company_name',
  displayField: 'company_name',
  identityFieldUnique: true,

  rlsResource: 'subcontractors',

  /**
   * Row-Level Security rules (ADR-011)
   * Subcontractors are reference data - technicians can view, managers manage
   */
  rlsRules: [
    {
      id: 'staff-full-access',
      description: 'Technician+ see all subcontractors',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  entityPermissions: {
    create: 'manager',
    read: 'technician',
    update: 'manager',
    delete: 'admin',
  },

  // ============================================================================
  // CONSOLIDATED NAVIGATION & FEATURES
  // ============================================================================

  navigation: {
    visibility: 'manager',
    group: 'resources',
    order: 3,
  },

  features: {
    fileAttachments: true,
    summary: {
      groupableFields: ['status'],
    },
  },

  navVisibility: 'manager', // DEPRECATED: Use navigation.visibility
  navGroup: 'resources', // DEPRECATED: Use navigation.group
  navOrder: 3, // DEPRECATED: Use navigation.order

  supportsFileAttachments: true, // DEPRECATED: Use features.fileAttachments

  summaryConfig: { // DEPRECATED: Use features.summary
    groupableFields: ['status'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {
    contact: {
      label: 'Contact Information',
      fields: ['contact_name', 'email', 'phone'],
      rows: [['contact_name'], ['email', 'phone']],
      order: 1,
    },
  },

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  displayColumns: ['company_name', 'contact_name', 'email', 'status'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    company_name: FAL.MANAGER_MANAGED,
    contact_name: FAL.MANAGER_MANAGED,
    email: FAL.MANAGER_MANAGED,
    phone: FAL.MANAGER_MANAGED,
    notes: FAL.MANAGER_MANAGED,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      active: { label: 'Active', color: 'success' },
      inactive: { label: 'Inactive', color: 'secondary' },
      suspended: { label: 'Suspended', color: 'error' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS (Phase 2)
  // ============================================================================

  defaultIncludes: [],
  relationships: {},

  // ============================================================================
  // FIELDS (with embedded traits for query capabilities)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields (field-centric)
    ...TIER1_FIELDS.WITH_STATUS,

    // Identity field - company_name with REQUIRED + IDENTITY traits
    company_name: withTraits(
      { type: 'string', maxLength: 200, description: 'Subcontractor company name' },
      TRAITS.REQUIRED, TRAIT_SETS.IDENTITY,
    ),

    // Contact fields with searchable traits
    contact_name: withTraits(
      { type: 'string', maxLength: 100, description: 'Primary contact person' },
      TRAIT_SETS.SEARCHABLE_LOOKUP,
    ),
    email: withTraits(FIELD.EMAIL, TRAIT_SETS.SEARCHABLE_LOOKUP),
    phone: withTraits(FIELD.PHONE, TRAIT_SETS.FULLTEXT),

    // Notes - no query traits (internal only)
    notes: { type: 'text', description: 'Internal notes' },
  },
};
