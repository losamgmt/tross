/**
 * Audit Log Model Metadata
 *
 * Category: N/A (system table, not a business entity)
 *
 * SRP: ONLY defines audit_logs table structure for permission checks
 * This is a read-only system table - no create/update/delete via API.
 *
 * DESIGN NOTES:
 * - Audit logs are written internally by audit-service, not via API
 * - API provides read-only access for admin users
 * - No RLS filtering - admins see all, others see nothing
 */

module.exports = {
  // Table name in database
  tableName: 'audit_logs',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'history',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * The human-readable identifier field
   */
  identityField: 'id',

  /**
   * Whether the identity field has a UNIQUE constraint
   */
  identityFieldUnique: true,

  /**
   * RLS resource name for permission checks
   */
  rlsResource: 'audit_logs',

  /**
   * Row-Level Security policy per role
   * Only admin can access audit logs
   */
  rlsPolicy: {
    customer: 'deny_all',
    technician: 'deny_all',
    dispatcher: 'deny_all',
    manager: 'deny_all',
    admin: 'all_records',
  },

  /**
   * Navigation visibility - null means not shown in entity nav
   * Audit logs are accessed via admin Logs section, not entity list
   */
  navVisibility: null,

  /**
   * Entity-level permission overrides
   * Only admin can read audit logs. No create/update/delete via API.
   * This is the SSOT for "admin only" access control.
   */
  permissionOverrides: {
    read: 'admin',
    create: null,
    update: null,
    delete: null,
  },

  fieldGroups: {},

  // Field definitions

  fields: {
    id: {
      type: 'integer',
      required: false, // Auto-generated
      readOnly: true,
    },
    action: {
      type: 'string',
      required: true,
      readOnly: true,
    },
    resource_type: {
      type: 'string',
      required: false,
      readOnly: true,
    },
    resource_id: {
      type: 'integer',
      required: false,
      readOnly: true,
    },
    user_id: {
      type: 'foreignKey',
      relatedEntity: 'user',
      required: false,
      readOnly: true,
    },
    ip_address: {
      type: 'string',
      required: false,
      readOnly: true,
    },
    user_agent: {
      type: 'string',
      required: false,
      readOnly: true,
    },
    details: {
      type: 'jsonb',
      required: false,
      readOnly: true,
    },
    created_at: {
      type: 'timestamp',
      required: false,
      readOnly: true,
    },
  },

  // ============================================================================
  // FIELD ACCESS CONTROL
  // ============================================================================

  /**
   * Field-level access control
   * All fields are read-only - no create/update/delete via API
   */
  fieldAccess: {
    id: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    action: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    resource_type: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    resource_id: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    user_id: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    ip_address: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    user_agent: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    details: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    created_at: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
  },

  // ============================================================================
  // QUERY CONFIGURATION
  // ============================================================================

  /**
   * Fields that can be used for filtering
   */
  filterableFields: ['action', 'resource_type', 'resource_id', 'user_id', 'created_at'],

  /**
   * Fields that can be used for sorting
   */
  sortableFields: ['id', 'action', 'created_at'],

  /**
   * Default sort configuration
   */
  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  /**
   * Columns to display in list views
   */
  displayColumns: ['id', 'action', 'resource_type', 'resource_id', 'user_id', 'created_at'],

  // ============================================================================
  // API CONFIGURATION
  // ============================================================================

  /**
   * Read-only entity - no create/update/delete via API
   */
  requiredFields: [],
  updateableFields: [],

  /**
   * This is a system table - writes happen internally via audit-service
   */
  isSystemTable: true,
};
