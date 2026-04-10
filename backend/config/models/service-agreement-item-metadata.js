/**
 * ServiceAgreementItem Junction Model Metadata
 *
 * Category: JUNCTION (M:M relationship table, no display name)
 *
 * SRP: ONLY defines ServiceAgreementItem junction table structure
 * Used by QueryBuilderService for M:M relationship queries
 * Used by GenericEntityService for junction record CRUD
 *
 * SINGLE SOURCE OF TRUTH for ServiceAgreement-ServiceTemplate relationship metadata
 *
 * This junction links service templates to service agreements.
 * Defines which service packages are included in an agreement.
 */

const { UNIVERSAL_FIELD_ACCESS } = require('../constants');
const {
  createJunctionFields,
  createJunctionUniqueConstraint,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'service_agreement_item',
  tableName: 'service_agreement_items',
  primaryKey: 'id',
  icon: 'checklist',

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
    entities: ['service_agreement', 'service_template'],
    uniqueOn: [['service_agreement_id', 'service_template_id']],
  },

  isJunction: true, // DEPRECATED: Use junction !== null

  /**
   * The two entities this junction connects
   */
  junctionFor: { // DEPRECATED: Use junction.entities
    entity1: 'service_agreement',
    entity2: 'service_template',
  },

  /**
   * Composite unique constraint prevents duplicate items
   */
  uniqueConstraints: [createJunctionUniqueConstraint('service_agreement', 'service_template')],

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * Junction tables use 'id' as identity (no separate identity field)
   */
  identityField: 'id',
  identityFieldUnique: true,

  rlsResource: 'service_agreement_items',

  /**
   * Row-Level Security rules (ADR-011)
   * Customers see items via their service agreement (parent access)
   */
  rlsRules: [
    {
      id: 'customer-via-agreement',
      description: 'Customers see items via their service agreement',
      roles: 'customer',
      operations: ['read'],
      access: { type: 'parent', foreignKey: 'service_agreement_id', parentEntity: 'service_agreement' },
    },
    {
      id: 'staff-full-access',
      description: 'Staff see all agreement items',
      roles: ['dispatcher', 'manager', 'admin'],
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
   * Null: Junction table for service agreement items.
   * DEPRECATED: Use features.summary
   */
  summaryConfig: null,

  entityPermissions: {
    create: 'manager',
    read: 'customer',
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

  displayColumns: ['service_agreement_id', 'service_template_id'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    // Junction FK fields
    service_agreement_id: {
      create: 'manager',
      read: 'customer',
      update: 'none', // Cannot change the relationship
      delete: 'none',
    },
    service_template_id: {
      create: 'manager',
      read: 'customer',
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

  defaultIncludes: ['serviceAgreement', 'serviceTemplate'],

  relationships: {
    serviceAgreement: {
      type: 'belongsTo',
      foreignKey: 'service_agreement_id',
      table: 'service_agreements',
      fields: ['id', 'agreement_number', 'start_date', 'status'],
      description: 'Service agreement this item belongs to',
    },
    serviceTemplate: {
      type: 'belongsTo',
      foreignKey: 'service_template_id',
      table: 'service_templates',
      fields: ['id', 'name', 'description'],
      description: 'Service template included in this agreement',
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

  fields: createJunctionFields('service_agreement', 'service_template'),
};
