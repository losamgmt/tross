/**
 * Preferences Model Metadata
 *
 * System table with shared-PK pattern (preferences.id = users.id).
 * Uses flat fields for individual preferences (not JSONB).
 */

const { FIELD_ACCESS_LEVELS: FAL } = require('../constants');
const {
  TIER1,
  withTraits,
  TRAITS,
  TRAIT_SETS,
} = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  // Entity key (singular, for API params and lookups)
  entityKey: 'preferences',

  // Table name in database (plural, also used for API URLs)
  tableName: 'preferences',

  primaryKey: 'id',
  icon: 'settings',
  identityField: 'id',
  identityFieldUnique: true,
  rlsResource: 'preferences',
  sharedPrimaryKey: true,
  uncountable: true, // 'preferences' doesn't pluralize to 'preferencess'
  namePattern: null,

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   * Note: preferences uses shared-PK pattern where preferences.id = users.id
   */
  rlsRules: [
    {
      id: 'user-own-preferences',
      description: 'Users see only their own preferences (shared PK with users)',
      roles: ['customer', 'technician', 'dispatcher', 'manager'],
      operations: '*',
      access: { type: 'direct', field: 'id', value: 'userId' },
    },
    {
      id: 'admin-full-access',
      description: 'Admin can see all preferences',
      roles: 'admin',
      operations: '*',
      access: null,
    },
  ],

  /**
   * Navigation configuration - consolidated
   * null = preferences accessed via Settings page, not nav
   */
  navigation: null,

  /**
   * Navigation visibility - null means not shown in nav menus
   * Preferences accessed via Settings page, not nav
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
   * File attachments - whether this entity supports file uploads
   * DEPRECATED: Use features.fileAttachments
   */
  supportsFileAttachments: false,

  /**
   * Summary endpoint configuration for aggregated analytics.
   * Null: Preferences are not aggregated.
   * DEPRECATED: Use features.summary
   */
  summaryConfig: null,

  entityPermissions: {
    create: 'customer',
    read: 'customer',
    update: 'customer',
    delete: 'admin',
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {
    appearance: {
      label: 'Appearance',
      fields: ['theme', 'density'],
      order: 1,
    },
    notifications: {
      label: 'Notifications',
      fields: ['notifications_enabled', 'notification_retention_days'],
      order: 2,
    },
    data: {
      label: 'Data & Performance',
      fields: ['items_per_page', 'auto_refresh_interval'],
      order: 3,
    },
  },

  // Legacy arrays removed - traits now on field definitions

  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  fieldAccess: {
    // For sharedPrimaryKey, users must provide their own id on create
    id: {
      create: 'customer', // Users create their own preferences (id = their userId)
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    theme: FAL.SELF_EDITABLE,
    density: FAL.SELF_EDITABLE,
    notifications_enabled: FAL.SELF_EDITABLE,
    items_per_page: FAL.SELF_EDITABLE,
    notification_retention_days: FAL.SELF_EDITABLE,
    auto_refresh_interval: FAL.SELF_EDITABLE,
    created_at: FAL.SYSTEM_READONLY,
    updated_at: FAL.SYSTEM_READONLY,
  },

  relationships: {
    user: {
      type: 'belongsTo',
      foreignKey: 'id',
      table: 'users',
      fields: ['id', 'email', 'first_name', 'last_name'],
    },
  },

  dependents: [],

  fields: {
    // Shared PK with users - id IS the user_id
    id: withTraits(
      { type: 'foreignKey', references: 'user' },
      TRAITS.REQUIRED,
      TRAITS.IMMUTABLE,
      TRAITS.READONLY,
      TRAIT_SETS.LOOKUP,
    ),

    // Appearance settings
    theme: withTraits(
      { type: 'enum', enumKey: 'theme', default: 'system' },
      TRAIT_SETS.FILTER_ONLY,
    ),
    density: withTraits(
      { type: 'enum', enumKey: 'density', default: 'comfortable' },
      TRAIT_SETS.FILTER_ONLY,
    ),

    // Notification settings
    notifications_enabled: { type: 'boolean', default: true },
    notification_retention_days: {
      type: 'integer',
      min: 1,
      max: 365,
      default: 30,
    },

    // Data settings
    items_per_page: {
      type: 'integer',
      min: 10,
      max: 100,
      default: 25,
    },
    auto_refresh_interval: {
      type: 'integer',
      min: 0,
      max: 300,
      default: 0,
    },

    // Timestamps
    created_at: TIER1.CREATED_AT,
    updated_at: TIER1.UPDATED_AT,
  },

  // ============================================================================
  // ENUM DEFINITIONS (SSOT - values are object keys)
  // ============================================================================

  enums: {
    theme: {
      system: { label: 'System' },
      light: { label: 'Light' },
      dark: { label: 'Dark' },
    },
    density: {
      compact: { label: 'Compact' },
      standard: { label: 'Standard' },
      comfortable: { label: 'Comfortable' },
    },
  },
};
