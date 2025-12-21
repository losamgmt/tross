/**
 * Entity Settings Model Metadata
 *
 * Category: N/A (system table, not a business entity)
 *
 * SRP: ONLY defines entity settings table structure and query capabilities
 * This stores admin-level default settings for each entity (applies to all users)
 *
 * DESIGN NOTES:
 * - One record per entity (entity_name is unique)
 * - Admin-only write access (managers can read)
 * - settings JSONB: flexible storage for entity configuration
 * - updated_by: tracks who last modified the settings
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
} = require('../constants');

module.exports = {
  // Table name in database
  tableName: 'entity_settings',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * The human-readable identifier field
   */
  identityField: 'entity_name',

  /**
   * Whether the identity field has a UNIQUE constraint
   */
  identityFieldUnique: true,

  /**
   * RLS resource name for permission checks
   */
  rlsResource: 'entity_settings',

  // ============================================================================
  // RLS FILTER CONFIGURATION
  // ============================================================================

  /**
   * No RLS filter - entity settings are shared across all users
   * Access controlled by role permissions only
   */
  rlsFilterConfig: null,

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  /**
   * Entity category: N/A - system table, not a business entity
   */
  entityCategory: null,

  // ============================================================================
  // FIELD ALIASING
  // ============================================================================

  fieldAliases: {
    entity_name: 'Entity',
    settings: 'Settings',
    updated_by: 'Updated By',
  },

  // ============================================================================
  // OUTPUT FILTERING
  // ============================================================================

  sensitiveFields: [],

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  /**
   * Fields required when creating new entity settings
   */
  requiredFields: ['entity_name'],

  /**
   * Fields that cannot be modified after creation
   */
  immutableFields: ['id', 'entity_name'],

  // ============================================================================
  // FIELD ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    id: FAL.SYSTEM_ONLY,
    entity_name: FAL.ADMIN_ONLY,
    settings: FAL.ADMIN_ONLY,
    updated_by: {
      create: 'system', // Set automatically from auth context
      read: 'manager',
      update: 'system',
      delete: 'none',
    },
    created_at: FAL.SYSTEM_ONLY,
    updated_at: FAL.SYSTEM_ONLY,
  },

  // ============================================================================
  // FOREIGN KEY CONFIGURATION
  // ============================================================================

  foreignKeys: {
    updated_by: {
      table: 'users',
      displayName: 'Updated By',
      settableOnCreate: false, // Set from auth context
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION
  // ============================================================================

  dependents: [],

  // ============================================================================
  // SEARCH/FILTER/SORT CONFIGURATION
  // ============================================================================

  searchableFields: ['entity_name'],

  filterableFields: ['entity_name', 'updated_by', 'created_at', 'updated_at'],

  sortableFields: ['entity_name', 'created_at', 'updated_at'],

  defaultSort: {
    field: 'entity_name',
    order: 'ASC',
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: [],

  relationships: {
    updatedByUser: {
      type: 'belongsTo',
      foreignKey: 'updated_by',
      target: 'users',
      displayField: 'email',
    },
  },

  // ============================================================================
  // FIELD DEFINITIONS
  // ============================================================================

  fields: {
    id: {
      type: 'integer',
      label: 'ID',
      column: 'id',
    },
    entity_name: {
      type: 'string',
      label: 'Entity Name',
      column: 'entity_name',
    },
    settings: {
      type: 'json',
      label: 'Settings',
      column: 'settings',
    },
    updated_by: {
      type: 'integer',
      label: 'Updated By',
      column: 'updated_by',
    },
    created_at: {
      type: 'timestamp',
      label: 'Created',
      column: 'created_at',
    },
    updated_at: {
      type: 'timestamp',
      label: 'Updated',
      column: 'updated_at',
    },
  },

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validation: {
    entity_name: {
      maxLength: 50,
      pattern: '^[a-z_]+$',
    },
  },

  // ============================================================================
  // PAGINATION
  // ============================================================================

  defaultPageSize: 20,
  maxPageSize: 100,
};
