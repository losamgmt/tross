/**
 * Preferences Model Metadata
 *
 * SRP: ONLY defines preferences table structure and query capabilities
 * This is a simplified metadata for a 1:1 user relationship table
 *
 * DESIGN NOTES:
 * - SHARED PRIMARY KEY pattern: id = users.id (true 1:1 identifying relationship)
 * - No separate user_id column - id IS the user reference
 * - Preferences stored as JSONB for flexibility
 * - Preference keys/types validated at application layer
 * - RLS ensures users only access their own preferences (WHERE id = userId)
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
} = require('../constants');

module.exports = {
  // Table name in database
  tableName: 'user_preferences',

  // Primary key (shared with users.id)
  primaryKey: 'id',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * The human-readable identifier field
   * For preferences with shared PK, id IS the user reference
   */
  identityField: 'id',

  /**
   * Whether the identity field has a UNIQUE constraint
   * id is PK, so inherently unique
   */
  identityFieldUnique: true,

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
   * id must be provided (= user id, not auto-generated)
   */
  requiredFields: ['id'],

  /**
   * Fields that cannot be modified after creation
   * id is immutable (it's the PK and FK to users)
   */
  immutableFields: ['id'],

  // ============================================================================
  // FIELD ACCESS CONTROL
  // ============================================================================
  // Preferences are user-owned - users can only access their own
  // Admin can access any user's preferences

  fieldAccess: {
    // Primary key = user id (shared PK pattern)
    // Set at creation, immutable
    id: {
      create: 'admin', // System creates on user's behalf (provides user id)
      read: 'customer', // Users see their own via RLS
      update: 'none', // Immutable - it's the PK
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

  /**
   * Shared PK pattern: id references users.id
   * This is both PK and FK (identifying relationship)
   */
  foreignKeys: {
    id: {
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
   * Not searchable - preferences are fetched by id (= user id)
   */
  searchableFields: [],

  /**
   * Filterable by id only
   */
  filterableFields: ['id', 'created_at', 'updated_at'],

  /**
   * Sortable fields
   */
  sortableFields: ['id', 'created_at', 'updated_at'],

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
   * Relationship to user via shared PK
   */
  relationships: {
    user: {
      type: 'belongsTo',
      foreignKey: 'id', // Shared PK: preferences.id = users.id
      table: 'users',
      fields: ['id', 'email', 'first_name', 'last_name'],
    },
  },

  // ============================================================================
  // FIELD DEFINITIONS
  // ============================================================================

  fields: {
    // id = users.id (shared PK pattern)
    // NOT auto-generated - must be provided on creation
    id: {
      type: 'integer',
      required: true,
      readonly: true,
      description: 'Primary key = users.id (shared PK pattern)',
    },
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
