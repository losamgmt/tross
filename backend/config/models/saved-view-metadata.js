/**
 * User Saved View Model Metadata
 *
 * Category: N/A (system table, not a business entity)
 *
 * SRP: ONLY defines saved view table structure and query capabilities
 * This stores user's saved table views (filters, columns, sort, density)
 *
 * DESIGN NOTES:
 * - RLS by user_id: users only see their own saved views
 * - entity_name: which entity this view applies to
 * - settings JSONB: flexible storage for view configuration
 * - is_default: one default view per entity per user
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
} = require('../constants');
const { FIELD } = require('../field-type-standards');

module.exports = {
  // Table name in database (matches route: /api/saved_views)
  tableName: 'saved_views',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'bookmark',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * The human-readable identifier field
   */
  identityField: 'view_name',

  /**
   * Whether the identity field has a UNIQUE constraint
   * view_name is unique per user+entity combo (composite unique)
   */
  identityFieldUnique: false,

  /**
   * RLS resource name for permission checks
   */
  rlsResource: 'saved_views',

  /**
   * Row-Level Security policy per role
   * Users can only access their own saved views, admin can see all
   */
  rlsPolicy: {
    customer: 'own_record_only',
    technician: 'own_record_only',
    dispatcher: 'own_record_only',
    manager: 'own_record_only',
    admin: 'all_records',
  },

  /**   * Entity-level permission overrides
   * Matches permissions.json - all users can manage their own saved views
   */
  entityPermissions: {
    create: 'customer',
    read: 'customer',
    update: 'customer',
    delete: 'customer',
  },

  /**   * Route configuration - explicit opt-in for generic router
   */
  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},

  rlsFilterConfig: {
    ownRecordField: 'user_id',
  },

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  /**
   * Entity category: N/A - system table, not a business entity
   */
  nameType: null,

  // ============================================================================
  // FIELD ALIASING
  // ============================================================================

  fieldAliases: {
    view_name: 'Name',
    entity_name: 'Entity',
    is_default: 'Default',
  },

  // ============================================================================
  // OUTPUT FILTERING
  // ============================================================================

  sensitiveFields: [],

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  /**
   * Fields required when creating a new saved view
   */
  requiredFields: ['user_id', 'entity_name', 'view_name', 'settings'],

  /**
   * Fields that cannot be modified after creation
   */
  immutableFields: ['id', 'user_id'],

  /**
   * Default columns to display in table views (ordered)
   * Used by admin panel for viewing saved views
   */
  displayColumns: ['view_name', 'entity_name', 'is_default', 'user_id', 'updated_at'],

  // ============================================================================
  // FIELD ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    // Note: id inherits from UNIVERSAL_FIELD_ACCESS (PUBLIC_READONLY)
    // Do NOT override with SYSTEM_ONLY - that blocks read access and breaks API responses
    user_id: {
      create: 'system', // Set automatically from auth context
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    entity_name: FAL.SELF_EDITABLE,
    view_name: FAL.SELF_EDITABLE,
    settings: FAL.SELF_EDITABLE,
    is_default: FAL.SELF_EDITABLE,
    // Note: created_at, updated_at inherit from UNIVERSAL_FIELD_ACCESS (SYSTEM_READONLY)
  },

  // ============================================================================
  // FOREIGN KEY CONFIGURATION
  // ============================================================================

  foreignKeys: {
    user_id: {
      table: 'users',
      displayName: 'User',
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

  searchableFields: ['view_name'],

  filterableFields: ['user_id', 'entity_name', 'is_default', 'created_at', 'updated_at'],

  sortableFields: ['view_name', 'entity_name', 'is_default', 'created_at', 'updated_at'],

  defaultSort: {
    field: 'view_name',
    order: 'ASC',
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: [],

  relationships: {
    user: {
      type: 'belongsTo',
      foreignKey: 'user_id',
      table: 'users',
      fields: ['id', 'email', 'first_name', 'last_name'],
    },
  },

  // ============================================================================
  // FIELD DEFINITIONS
  // ============================================================================

  fields: {
    id: {
      type: 'integer',
      readonly: true,
      description: 'Primary key',
    },
    user_id: {
      type: 'foreignKey',
      relatedEntity: 'user',
      required: true,
      readonly: true,
      description: 'Owner user ID (FK to users)',
    },
    entity_name: {
      type: 'string',
      required: true,
      maxLength: 50,
      description: 'Which entity this view applies to',
    },
    view_name: {
      ...FIELD.NAME,
      required: true,
      maxLength: 100,
      description: 'User-defined name for this view',
    },
    settings: {
      type: 'jsonb',
      required: true,
      default: {},
      description: 'View configuration (hiddenColumns, density, filters, sort)',
    },
    is_default: {
      type: 'boolean',
      default: false,
      description: 'Whether this is the default view for this entity',
    },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },
  },

  // ============================================================================
  // SETTINGS SCHEMA (Application-level documentation)
  // ============================================================================

  settingsSchema: {
    hiddenColumns: {
      type: 'array',
      items: 'string',
      description: 'Column IDs to hide',
    },
    density: {
      type: 'enum',
      values: ['compact', 'standard', 'comfortable'],
      default: 'standard',
      description: 'Table row density',
    },
    filters: {
      type: 'object',
      description: 'Active filter values by field name',
    },
    sort: {
      type: 'object',
      properties: {
        field: { type: 'string' },
        direction: { type: 'enum', values: ['asc', 'desc'] },
      },
      description: 'Sort configuration',
    },
  },
};
