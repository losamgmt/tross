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

const { FIELD_ACCESS_LEVELS: FAL } = require("../constants");
const { FIELD } = require("../field-type-standards");

module.exports = {
  // Entity key (singular, for API params and lookups)
  entityKey: "notification",

  // Table name in database (plural, also used for API URLs)
  tableName: "notifications",

  // Primary key
  primaryKey: "id",

  // Material icon for navigation menus and entity displays
  icon: "notifications",

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * The human-readable identifier field
   */
  identityField: "title",

  /**
   * Whether the identity field has a UNIQUE constraint
   */
  identityFieldUnique: false,

  /**
   * RLS resource name for permission checks
   */
  rlsResource: "notifications",

  /**
   * Row-Level Security policy per role
   * Users can only access their own notifications
   */
  rlsPolicy: {
    customer: "own_record_only",
    technician: "own_record_only",
    dispatcher: "own_record_only",
    manager: "own_record_only",
    admin: "own_record_only", // Even admins only see their own notifications
  },

  /**
   * Navigation visibility - null means not shown in nav menus
   * Notifications accessed via bell icon tray, not nav
   */
  navVisibility: null,

  /**
   * File attachments - whether this entity supports file uploads
   */
  supportsFileAttachments: false,

  /**
   * Entity-level permission overrides
   * Users can read/delete their own notifications
   * Create is system-only (backend creates notifications, not users)
   */
  entityPermissions: {
    create: null, // System only - backend creates notifications
    read: "customer",
    update: "customer", // For marking as read
    delete: "customer", // For dismissing
  },

  /**
   * Route configuration - use generic router
   */
  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},

  rlsFilterConfig: {
    ownRecordField: "user_id",
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
    title: "Title",
    body: "Message",
    type: "Type",
    is_read: "Read",
    resource_type: "Related Entity",
  },

  // ============================================================================
  // OUTPUT FILTERING
  // ============================================================================

  sensitiveFields: [],

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  /**
   * Fields required when creating a new notification (system use only)
   */
  requiredFields: ["user_id", "title", "type"],

  /**
   * Fields that cannot be modified after creation
   */
  immutableFields: [
    "id",
    "user_id",
    "title",
    "body",
    "type",
    "resource_type",
    "resource_id",
    "created_at",
  ],

  /**
   * Default columns to display in table views (ordered)
   */
  displayColumns: ["title", "type", "is_read", "created_at"],

  // ============================================================================
  // FIELD ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    // Note: id inherits from UNIVERSAL_FIELD_ACCESS (PUBLIC_READONLY)
    // Do NOT override with SYSTEM_ONLY - that blocks read access and breaks API responses
    user_id: {
      create: "system", // Set by backend when creating notification
      read: "customer",
      update: "none",
      delete: "none",
    },
    title: {
      create: "system",
      read: "customer",
      update: "none",
      delete: "none",
    },
    body: {
      create: "system",
      read: "customer",
      update: "none",
      delete: "none",
    },
    type: {
      create: "system",
      read: "customer",
      update: "none",
      delete: "none",
    },
    resource_type: {
      create: "system",
      read: "customer",
      update: "none",
      delete: "none",
    },
    resource_id: {
      create: "system",
      read: "customer",
      update: "none",
      delete: "none",
    },
    is_read: {
      create: "system",
      read: "customer",
      update: "customer", // Users can mark as read
      delete: "none",
    },
    read_at: {
      create: "system",
      read: "customer",
      update: "system", // Set automatically when is_read changes
      delete: "none",
    },
    created_at: FAL.SYSTEM_ONLY,
    updated_at: FAL.SYSTEM_ONLY,
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    type: {
      values: ["info", "success", "warning", "error", "assignment", "reminder"],
      default: "info",
      labels: {
        info: "Info",
        success: "Success",
        warning: "Warning",
        error: "Error",
        assignment: "Assignment",
        reminder: "Reminder",
      },
    },
  },

  // ============================================================================
  // FOREIGN KEY CONFIGURATION
  // ============================================================================

  foreignKeys: {
    user_id: {
      table: "users",
      displayName: "User",
      settableOnCreate: false, // Set by backend
    },
  },

  // ============================================================================
  // DELETE CONFIGURATION
  // ============================================================================

  dependents: [],

  // ============================================================================
  // SEARCH/FILTER/SORT CONFIGURATION
  // ============================================================================

  searchableFields: ["title", "body"],

  filterableFields: [
    "user_id",
    "type",
    "is_read",
    "resource_type",
    "created_at",
  ],

  sortableFields: ["created_at", "is_read", "type"],

  defaultSort: {
    field: "created_at",
    order: "DESC",
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: [],

  relationships: {
    user: {
      type: "belongsTo",
      foreignKey: "user_id",
      table: "users",
      fields: ["id", "email", "first_name", "last_name"],
    },
  },

  // ============================================================================
  // FIELD DEFINITIONS
  // ============================================================================

  fields: {
    id: {
      type: "integer",
      readonly: true,
      description: "Primary key",
    },
    user_id: {
      type: "foreignKey",
      relatedEntity: "user",
      required: true,
      readonly: true,
      description: "Notification recipient (FK to users)",
    },
    title: {
      ...FIELD.TITLE,
      required: true,
      readonly: true,
      description: "Notification title/summary",
    },
    body: {
      type: "text",
      required: false,
      readonly: true,
      description: "Full notification message (optional)",
    },
    type: {
      type: "enum",
      required: true,
      readonly: true,
      description: "Notification type for UI styling",
    },
    resource_type: {
      type: "string",
      required: false,
      maxLength: 50,
      readonly: true,
      description: "Related entity type (work_order, invoice, etc.)",
    },
    resource_id: {
      type: "integer",
      required: false,
      readonly: true,
      description: "Related entity ID for navigation",
    },
    is_read: {
      type: "boolean",
      default: false,
      description: "Whether notification has been read",
    },
    read_at: {
      type: "timestamp",
      readonly: true,
      description: "When notification was marked as read",
    },
    created_at: {
      type: "timestamp",
      readonly: true,
      description: "When notification was created",
    },
    updated_at: {
      type: "timestamp",
      readonly: true,
      description: "Last update timestamp",
    },
  },
};
