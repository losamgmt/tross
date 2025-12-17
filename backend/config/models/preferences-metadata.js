/**
 * Preferences Model Metadata
 *
 * SRP: ONLY defines preferences table structure and query capabilities
 * This is a simplified metadata for a 1:1 user relationship table
 *
 * DESIGN NOTES:
 * - Each user has exactly one preferences row (1:1 relationship)
 * - Preferences stored as JSONB for flexibility
 * - Preference keys/types validated at application layer
 * - RLS ensures users only access their own preferences
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
} = require('../constants');

module.exports = {
  // Table name in database (legacy name, may rename in future migration)
  tableName: 'user_preferences',

  // Primary key
  primaryKey: 'id',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * The human-readable identifier field
   * For preferences, this is the user_id since it's 1:1 with users
   */
  identityField: 'user_id',

  /**
   * RLS resource name for permission checks
   * Uses 'preferences' as the resource name in permissions
   */
  rlsResource: 'preferences',

  // ============================================================================
  // OUTPUT FILTERING
  // ============================================================================

  /**
   * No sensitive fields - preferences are user-facing data
   */
  sensitiveFields: [],

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  /**
   * Fields required when creating a new preferences row
   * user_id is required; preferences defaults to {}
   */
  requiredFields: ['user_id'],

  /**
   * Fields that cannot be modified after creation
   * user_id is immutable (1:1 relationship established at creation)
   */
  immutableFields: ['user_id'],

  // ============================================================================
  // FIELD ACCESS CONTROL
  // ============================================================================
  // Preferences are user-owned - users can only access their own
  // Admin can access any user's preferences

  fieldAccess: {
    // Primary key
    id: FAL.SYSTEM_ONLY,

    // User relationship (set at creation, immutable)
    user_id: {
      create: 'admin', // System creates on user's behalf
      read: 'customer', // Users see their own via RLS
      update: 'none', // Immutable
      delete: 'none',
    },

    // Preferences JSONB - user-editable for own data
    preferences: FAL.SELF_EDITABLE,

    // Timestamps
    created_at: FAL.SYSTEM_ONLY,
    updated_at: FAL.SYSTEM_ONLY,
  },

  // ============================================================================
  // FOREIGN KEY CONFIGURATION
  // ============================================================================

  foreignKeys: {
    user_id: {
      table: 'users',
      displayName: 'User',
      settableOnCreate: true,
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION
  // ============================================================================

  /**
   * No dependents - preferences are a leaf node
   * Database CASCADE handles deletion when user is deleted
   */
  dependents: [],

  // ============================================================================
  // SEARCH/FILTER/SORT CONFIGURATION
  // ============================================================================

  /**
   * Not searchable - preferences are fetched by user_id
   */
  searchableFields: [],

  /**
   * Filterable by user_id only
   */
  filterableFields: ['id', 'user_id', 'created_at', 'updated_at'],

  /**
   * Sortable fields
   */
  sortableFields: ['id', 'user_id', 'created_at', 'updated_at'],

  /**
   * Default sort
   */
  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  /**
   * No default includes - preferences are standalone
   */
  defaultIncludes: [],

  /**
   * Relationship to user
   */
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
    id: { type: 'integer', readonly: true },
    user_id: { type: 'integer', required: true, readonly: true },
    preferences: {
      type: 'jsonb',
      default: {},
      description: 'User preferences key-value storage',
    },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },
  },

  // ============================================================================
  // PREFERENCE SCHEMA (Application-level validation)
  // ============================================================================
  // These are validated by the PreferencesService, not the DB
  // JSONB allows flexibility; this documents expected structure

  preferenceSchema: {
    theme: {
      type: 'enum',
      values: ['system', 'light', 'dark'],
      default: 'system',
      description: 'UI color theme preference',
    },
    notificationsEnabled: {
      type: 'boolean',
      default: true,
      description: 'Whether to show notifications',
    },
    // Future preferences can be added here without migration
  },
};
