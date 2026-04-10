/**
 * Notification Model Metadata
 *
 * Category: N/A (system table, not a business entity)
 *
 * SRP: ONLY defines notification table structure and query capabilities
 * This stores user notifications for the notification tray (bell icon)
 *
 * DESIGN NOTES:
 * - RLS by user_id: users only see their own notifications
 * - Backend creates notifications; users only read/mark-read/delete
 * - Follows saved_views pattern for per-user data
 * - type field for UI styling (info, success, warning, error, assignment, reminder)
 * - resource_type + resource_id for navigation on click
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
  entityKey: 'notification',

  // Table name in database (plural, also used for API URLs)
  tableName: 'notifications',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'notifications',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * The human-readable identifier field
   */
  identityField: 'title',

  /**
   * Whether the identity field has a UNIQUE constraint
   */
  identityFieldUnique: false,

  /**
   * RLS resource name for permission checks
   */
  rlsResource: 'notifications',

  /**
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    {
      id: 'user-own-notifications',
      description: 'All users see only their own notifications',
      roles: '*',
      operations: '*',
      access: { type: 'direct', field: 'user_id', value: 'userId' },
    },
  ],

  /**
   * Navigation configuration - consolidated
   * null = notifications accessed via bell icon tray, not nav
   */
  navigation: null,

  /**
   * Navigation visibility - null means not shown in nav menus
   * Notifications accessed via bell icon tray, not nav
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
   * Null: Notifications are not aggregated.
   * DEPRECATED: Use features.summary
   */
  summaryConfig: null,

  /**
   * Entity-level permission overrides
   * Users can read/delete their own notifications
   * Create is system-only (backend creates notifications, not users)
   */
  entityPermissions: {
    create: null, // System only - backend creates notifications
    read: 'customer',
    update: 'customer', // For marking as read
    delete: 'customer', // For dismissing
  },

  /**
   * Route configuration - use generic router
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
   * Name pattern: null for system tables
   */
  namePattern: null,

  // ============================================================================
  // FIELD ALIASING
  // ============================================================================

  fieldAliases: {
    title: 'Title',
    body: 'Message',
    type: 'Type',
    is_read: 'Read',
    resource_type: 'Related Entity',
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
   */
  displayColumns: ['title', 'type', 'is_read', 'created_at'],

  // ============================================================================
  // FIELD ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    // Note: id inherits from UNIVERSAL_FIELD_ACCESS (PUBLIC_READONLY)
    // Do NOT override with SYSTEM_ONLY - that blocks read access and breaks API responses
    user_id: {
      create: 'system', // Set by backend when creating notification
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    title: {
      create: 'system',
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    body: {
      create: 'system',
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    type: {
      create: 'system',
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    resource_type: {
      create: 'system',
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    resource_id: {
      create: 'system',
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    is_read: {
      create: 'system',
      read: 'customer',
      update: 'customer', // Users can mark as read
      delete: 'none',
    },
    read_at: {
      create: 'system',
      read: 'customer',
      update: 'system', // Set automatically when is_read changes
      delete: 'none',
    },
    created_at: FAL.SYSTEM_ONLY,
    updated_at: FAL.SYSTEM_ONLY,
  },

  // ============================================================================
  // ENUM DEFINITIONS (SSOT - values are object keys)
  // ============================================================================

  enums: {
    type: {
      info: { color: 'info', label: 'Info' },
      success: { color: 'success', label: 'Success' },
      warning: { color: 'warning', label: 'Warning' },
      error: { color: 'error', label: 'Error' },
      assignment: { color: 'primary', label: 'Assignment' },
      reminder: { color: 'warning', label: 'Reminder' },
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION
  // ============================================================================

  dependents: [],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  defaultSort: {
    field: 'created_at',
    order: 'DESC',
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
    // Primary key
    id: TIER1.ID,

    // Owner - system-set FK, immutable
    user_id: withTraits(
      {
        type: 'foreignKey',
        references: 'user',
        description: 'Notification recipient (FK to users)',
      },
      TRAITS.REQUIRED,
      TRAITS.IMMUTABLE,
      TRAITS.READONLY,
      TRAIT_SETS.FILTER_ONLY,
    ),

    // Content fields - system-created, immutable
    title: withTraits(
      {
        ...FIELD.TITLE,
        description: 'Notification title/summary',
      },
      TRAITS.REQUIRED,
      TRAITS.IMMUTABLE,
      TRAITS.READONLY,
      TRAITS.SEARCHABLE,
    ),
    body: withTraits(
      {
        type: 'text',
        description: 'Full notification message (optional)',
      },
      TRAITS.IMMUTABLE,
      TRAITS.READONLY,
      TRAITS.SEARCHABLE,
    ),
    type: withTraits(
      {
        type: 'enum',
        enumKey: 'type',
        default: 'info',
        description: 'Notification type for UI styling',
      },
      TRAITS.REQUIRED,
      TRAITS.IMMUTABLE,
      TRAITS.READONLY,
      TRAIT_SETS.LOOKUP,
    ),

    // Navigation context - system-set, immutable
    resource_type: withTraits(
      {
        type: 'string',
        maxLength: 50,
        description: 'Related entity type (for navigation)',
      },
      TRAITS.IMMUTABLE,
      TRAITS.READONLY,
      TRAIT_SETS.FILTER_ONLY,
    ),
    resource_id: withTraits(
      {
        type: 'integer',
        description: 'Related entity ID (for navigation)',
      },
      TRAITS.IMMUTABLE,
      TRAITS.READONLY,
    ),

    // Read status - user-updatable
    is_read: withTraits(
      {
        type: 'boolean',
        default: false,
        description: 'Whether user has read this notification',
      },
      TRAIT_SETS.LOOKUP,
    ),
    read_at: {
      type: 'timestamp',
      description: 'When notification was marked as read',
    },

    // Timestamps
    created_at: withTraits(TIER1.CREATED_AT, TRAIT_SETS.FILTER_ONLY),
    updated_at: TIER1.UPDATED_AT,
  },
};
