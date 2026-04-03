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

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  // Entity key (singular, for API params and lookups)
  entityKey: 'audit_log',

  // Table name in database (plural, also used for API URLs)
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
   * Row-Level Security rules (ADR-011)
   * Declarative grant-based rules. No match = deny.
   */
  rlsRules: [
    // customer, technician, dispatcher, manager: no rule = deny
    {
      id: 'admin-full-access',
      description: 'Only admin can access audit logs',
      roles: 'admin',
      operations: '*',
      access: null,
    },
  ],

  /**
   * Navigation visibility - null means not shown in entity nav
   * Audit logs are accessed via admin Logs section, not entity list
   */
  navVisibility: null,

  /**
   * File attachments - whether this entity supports file uploads
   */
  supportsFileAttachments: false,

  /**
   * Summary endpoint configuration for aggregated analytics.
   */
  summaryConfig: {
    groupableFields: ['resource_type', 'action', 'user_id'],
  },

  /**
   * Entity-level permission overrides
   * Only admin can read audit logs. No create/update/delete via API.
   * This is the SSOT for "admin only" access control.
   */
  entityPermissions: {
    read: 'admin',
    create: null,
    update: null,
    delete: null,
  },

  fieldGroups: {},

  /**
   * Entity category: N/A - system table, not a business entity
   */
  namePattern: null,

  // Field definitions

  fields: {
    id: {
      type: 'integer',
      required: false, // Auto-generated
      readOnly: true,
    },
    action: {
      type: 'string',
      maxLength: 50,
      required: true,
      readOnly: true,
    },
    resource_type: {
      type: 'string',
      maxLength: 100,
      required: true,
      readOnly: true,
    },
    resource_id: {
      type: 'integer',
      required: false,
      readOnly: true,
    },
    user_id: {
      type: 'foreignKey',
      references: 'user',
      required: false,
      readOnly: true,
    },
    ip_address: {
      type: 'string',
      maxLength: 45,
      required: false,
      readOnly: true,
    },
    user_agent: {
      type: 'text',
      required: false,
      readOnly: true,
    },
    old_values: {
      type: 'jsonb',
      required: false,
      readOnly: true,
    },
    new_values: {
      type: 'jsonb',
      required: false,
      readOnly: true,
    },
    result: {
      type: 'string',
      maxLength: 20,
      required: false,
      readOnly: true,
    },
    error_message: {
      type: 'text',
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
    old_values: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    new_values: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    result: {
      create: 'none',
      read: 'admin',
      update: 'none',
      delete: 'none',
    },
    error_message: {
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
  filterableFields: [
    'action',
    'resource_type',
    'resource_id',
    'user_id',
    'created_at',
  ],

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
  displayColumns: [
    'id',
    'action',
    'resource_type',
    'resource_id',
    'user_id',
    'created_at',
  ],

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
