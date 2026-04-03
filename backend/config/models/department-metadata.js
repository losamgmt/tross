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

  requiredFields: ['name'],

  immutableFields: [],

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

  searchableFields: ['name', 'description'],

  // ============================================================================
  // FILTER CONFIGURATION
  // ============================================================================

  filterableFields: [
    'id',
    'name',
    'manager_id',
    'is_active',
    'status',
    'created_at',
    'updated_at',
  ],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  sortableFields: ['id', 'name', 'status', 'created_at', 'updated_at'],

  defaultSort: {
    field: 'name',
    order: 'ASC',
  },

  // ============================================================================
  // FIELD DEFINITIONS
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    name: { ...FIELD.NAME, required: true, maxLength: 100 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    // TIER 2: Entity-Specific Lifecycle Field
    status: {
      type: 'enum',
      enumKey: 'status',
      default: 'active',
    },

    // Entity-specific fields
    description: { type: 'text' },
    manager_id: {
      type: 'foreignKey',
      references: 'user',
    },
  },
};
