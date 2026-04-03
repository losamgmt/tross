/**
 * Department Model Metadata
 *
 * Category: SIMPLE (name field for identity and display)
 *
 * SRP: ONLY defines Department table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Department model query and CRUD capabilities
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require('../constants');
const { FIELD, NAME_PATTERNS } = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'department',
  tableName: 'departments',
  primaryKey: 'id',
  icon: 'groups',

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

  rlsResource: 'departments',

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    // customer: no rule = deny (internal resource)
    {
      id: 'staff-full-access',
      description: 'Staff see all departments',
      roles: ['technician', 'dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  navVisibility: 'manager',
  navGroup: 'admin',
  navOrder: 2,

  supportsFileAttachments: false,

  /**
   * Summary endpoint configuration for aggregated analytics.
   * Null: Departments are not aggregated.
   */
  summaryConfig: null,

  entityPermissions: {
    create: 'admin',
    read: 'dispatcher',
    update: 'admin',
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

  // NOTE: requiredFields, immutableFields now defined at field level
  // (see fields section below)

  displayColumns: ['name', 'description', 'manager_id', 'status'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    name: FAL.ADMIN_ONLY,
    description: FAL.ADMIN_ONLY,
    manager_id: FAL.ADMIN_ONLY,
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
  relationships: {
    manager: {
      type: 'belongsTo',
      foreignKey: 'manager_id',
      table: 'users',
      fields: ['id', 'first_name', 'last_name', 'email'],
      description: 'User who manages this department',
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION
  // ============================================================================

  dependents: [
    {
      table: 'audit_logs',
      foreignKey: 'resource_id',
      polymorphicType: { column: 'resource_type', value: 'departments' },
    },
  ],

  // ============================================================================
  // SEARCH CONFIGURATION
  // ============================================================================

  // NOTE: searchableFields now defined at field level
  // (see fields section below)

  // ============================================================================
  // FILTER CONFIGURATION
  // ============================================================================

  // NOTE: filterableFields now defined at field level
  // (see fields section below)

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  // NOTE: sortableFields now defined at field level
  // (see fields section below)

  defaultSort: {
    field: 'name',
    order: 'ASC',
  },

  // ============================================================================
  // FIELD DEFINITIONS (FIELD-CENTRIC: all properties on field itself)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: {
      type: 'integer',
      readonly: true,
      filterable: true,
      sortable: true,
    },
    name: {
      ...FIELD.NAME,
      required: true,
      maxLength: 100,
      searchable: true,
      filterable: true,
      sortable: true,
    },
    is_active: {
      type: 'boolean',
      default: true,
      filterable: true,
    },
    created_at: {
      type: 'timestamp',
      readonly: true,
      filterable: true,
      sortable: true,
    },
    updated_at: {
      type: 'timestamp',
      readonly: true,
      filterable: true,
      sortable: true,
    },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      enumKey: 'status',
      default: 'active',
      filterable: true,
      sortable: true,
    },

    // Entity-specific fields
    description: {
      type: 'text',
      searchable: true,
    },
    manager_id: {
      type: 'foreignKey',
      references: 'user',
      filterable: true,
    },
  },
};
