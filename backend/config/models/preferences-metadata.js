/**
 * Preferences Model Metadata
 *
 * System table with shared-PK pattern (preferences.id = users.id).
 * Uses flat fields for individual preferences (not JSONB).
 */

const { FIELD_ACCESS_LEVELS: FAL } = require('../constants');

module.exports = {
  tableName: 'preferences',
  primaryKey: 'id',
  icon: 'settings',
  identityField: 'id',
  identityFieldUnique: true,
  rlsResource: 'preferences',
  sharedPrimaryKey: true,
  uncountable: true, // 'preferences' doesn't pluralize to 'preferencess'
  nameType: null,

  rlsPolicy: {
    customer: 'own_record_only',
    technician: 'own_record_only',
    dispatcher: 'own_record_only',
    manager: 'own_record_only',
    admin: 'all_records',
  },

  /**
   * Navigation visibility - null means not shown in nav menus
   * Preferences accessed via Settings page, not nav
   */
  navVisibility: null,

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

  requiredFields: ['id'],
  immutableFields: ['id'],
  searchableFields: [],
  filterableFields: ['id', 'created_at', 'updated_at'],
  sortableFields: ['id', 'created_at', 'updated_at'],

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

  foreignKeys: {
    id: {
      table: 'users',
      settableOnCreate: true,
    },
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
    id: {
      type: 'integer',
      required: true,
      readonly: true,
    },
    theme: {
      type: 'enum',
      values: ['system', 'light', 'dark'],
      default: 'system',
    },
    density: {
      type: 'enum',
      values: ['compact', 'standard', 'comfortable'],
      default: 'comfortable',
    },
    notifications_enabled: {
      type: 'boolean',
      default: true,
    },
    items_per_page: {
      type: 'integer',
      min: 10,
      max: 100,
      default: 25,
    },
    notification_retention_days: {
      type: 'integer',
      min: 1,
      max: 365,
      default: 30,
    },
    auto_refresh_interval: {
      type: 'integer',
      min: 0,
      max: 300,
      default: 0,
    },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },
  },
};
