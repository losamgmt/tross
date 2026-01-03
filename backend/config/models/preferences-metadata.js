/**
 * Preferences Model Metadata
 *
 * Category: N/A (system table, not a business entity)
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
 *
 * PREFERENCE KEYS (schema-on-read, validated at application layer):
 * - theme: 'system' | 'light' | 'dark' (UI theme preference)
 * - notificationsEnabled: boolean (notification preferences)
 * - pageSize: integer (default table page size: 10, 25, 50, 100)
 * - tableDensity: 'compact' | 'standard' | 'comfortable' (table row spacing)
 *
 * UI Settings vs Entity Metadata:
 * - pageSize/tableDensity are USER preferences (accessibility, personal comfort)
 * - displayColumns are ENTITY metadata (defined in entity files, not user-specific)
 * - This separation follows the architecture audit recommendations
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  // ENTITY_CATEGORIES not used - preferences is a system table
} = require('../constants');

module.exports = {
  // Table name in database (matches route: /api/preferences)
  tableName: 'preferences',

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
  // ENTITY CATEGORY
  // ============================================================================

  /**
   * Entity category: N/A - preferences is a system table, not a business entity
   * It uses SYSTEM category for consistency but doesn't participate in name patterns
   */
  entityCategory: null,

  // ============================================================================
  // FIELD ALIASING (for UI display names)
  // ============================================================================

  /**
   * Field aliases for UI display. Key = field name, Value = display label
   * Empty object = use field names as-is
   */
  fieldAliases: {},

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

  /**
   * Default columns to display in table views (ordered)
   * Used by admin panel for viewing user preferences
   */
  displayColumns: ['id', 'theme', 'notifications_enabled', 'updated_at'],

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
      label: 'Theme',
      description: 'Choose your preferred color theme',
      displayLabels: {
        system: 'System Default',
        light: 'Light',
        dark: 'Dark',
      },
      order: 0,
    },
    notificationsEnabled: {
      type: 'boolean',
      default: true,
      label: 'Notifications',
      description: 'Receive notifications about updates',
      order: 1,
    },
    defaultPageSize: {
      type: 'enum',
      values: ['10', '25', '50', '100'],
      default: '25',
      label: 'Default Page Size',
      description: 'Number of rows to display in tables',
      displayLabels: {
        '10': '10 rows',
        '25': '25 rows',
        '50': '50 rows',
        '100': '100 rows',
      },
      order: 2,
    },
    tableDensity: {
      type: 'enum',
      values: ['compact', 'standard', 'comfortable'],
      default: 'standard',
      label: 'Table Density',
      description: 'Spacing between table rows',
      displayLabels: {
        compact: 'Compact',
        standard: 'Standard',
        comfortable: 'Comfortable',
      },
      order: 3,
    },
    // Future preferences can be added here without migration
  },
};
