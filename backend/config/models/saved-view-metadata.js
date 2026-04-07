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

const { FIELD_ACCESS_LEVELS: FAL } = require('../constants');
const {
  FIELD,
  TIER1,
  withTraits,
  TRAITS,
  TRAIT_SETS,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  // Entity key (singular, for API params and lookups)
  entityKey: 'saved_view',

  // Table name in database (plural, also used for API URLs)
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
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    {
      id: 'user-own-saved-views',
      description: 'Users see only their own saved views',
      roles: ['customer', 'technician', 'dispatcher', 'manager'],
      operations: '*',
      access: { type: 'direct', field: 'user_id', value: 'userId' },
    },
    {
      id: 'admin-full-access',
      description: 'Admin can see all saved views',
      roles: 'admin',
      operations: '*',
      access: null,
    },
  ],

  /**
   * Navigation visibility - null means not shown in nav menus
   * Saved views are a system table, accessed via table UI not nav
   */
  navVisibility: null,

  /**
   * File attachments - whether this entity supports file uploads
   */
  supportsFileAttachments: false,

  /**
   * Summary endpoint configuration for aggregated analytics.
   * Null: Saved views are not aggregated.
   */
  summaryConfig: null,

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

  // rlsFilterConfig removed - ADR-008: filter field now in rlsPolicy directly

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  /**
   * Entity category: N/A - system table, not a business entity
   */
  namePattern: null,

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
   * Default columns to display in table views (ordered)
   * Used by admin panel for viewing saved views
   */
  displayColumns: [
    'view_name',
    'entity_name',
    'is_default',
    'user_id',
    'updated_at',
  ],

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
  // DELETE CONFIGURATION
  // ============================================================================

  dependents: [],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

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
  // FIELD DEFINITIONS (Field-Centric: traits embedded in field definitions)
  // ============================================================================

  fields: {
    id: TIER1.ID,

    // Owner - system-set, immutable
    user_id: withTraits(
      {
        type: 'foreignKey',
        references: 'user',
        description: 'Owner user ID (FK to users)',
      },
      TRAITS.REQUIRED,
      TRAITS.IMMUTABLE,
      TRAITS.READONLY,
      TRAIT_SETS.FILTER_ONLY,
    ),

    // View definition
    entity_name: withTraits(
      {
        type: 'string',
        maxLength: 50,
        description: 'Which entity this view applies to',
      },
      TRAITS.REQUIRED,
      TRAIT_SETS.LOOKUP,
    ),
    view_name: withTraits(
      {
        ...FIELD.NAME,
        maxLength: 100,
        description: 'User-defined name for this view',
      },
      TRAIT_SETS.IDENTITY,
    ),
    settings: withTraits(
      {
        type: 'jsonb',
        default: {},
        description: 'View configuration (hiddenColumns, density, filters, sort)',
      },
      TRAITS.REQUIRED,
    ),
    is_default: withTraits(
      {
        type: 'boolean',
        default: false,
        description: 'Whether this is the default view for this entity',
      },
      TRAIT_SETS.LOOKUP,
    ),

    // Timestamps
    created_at: TIER1.CREATED_AT,
    updated_at: TIER1.UPDATED_AT,
  },

  // ============================================================================
  // ENUM DEFINITIONS (SSOT - values are object keys)
  // ============================================================================

  enums: {
    density: {
      compact: { label: 'Compact' },
      standard: { label: 'Standard' },
      comfortable: { label: 'Comfortable' },
    },
    sort_direction: {
      asc: { label: 'Ascending' },
      desc: { label: 'Descending' },
    },
  },

  // ============================================================================
  // SETTINGS SCHEMA (Application-level documentation for JSONB)
  // ============================================================================

  settingsSchema: {
    hiddenColumns: {
      type: 'array',
      items: 'string',
      description: 'Column IDs to hide',
    },
    density: {
      type: 'enum',
      enumKey: 'density',
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
        direction: { type: 'enum', enumKey: 'sort_direction' },
      },
      description: 'Sort configuration',
    },
  },
};
