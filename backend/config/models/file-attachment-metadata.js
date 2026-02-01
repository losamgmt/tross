/**
 * File Attachment Model Metadata
 *
 * Category: SYSTEM (polymorphic child table, not a standalone entity)
 *
 * SRP: ONLY defines file_attachments table structure and access control
 *
 * DESIGN NOTES:
 * - POLYMORPHIC PATTERN: entity_type + entity_id (like audit_logs)
 * - Permissions derived from parent entity (no own RLS resource)
 * - Soft delete via is_active flag
 * - Cloud storage handled separately by StorageService
 *
 * WHY THIS EXISTS:
 * - Defines field access levels for response filtering
 * - Provides validation metadata for test generation
 * - Documents the table structure as single source of truth
 * - NOT used by GenericEntityService (specialized route/service)
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  RLS_RESOURCE_TYPES,
  // No NAME_TYPES - this is a system table
} = require('../constants');
const { FIELD } = require('../field-type-standards');

module.exports = {
  // Entity key (singular, for API params and lookups)
  entityKey: 'file_attachment',

  // Table name in database (plural, also used for API URLs)
  tableName: 'file_attachments',

  // Primary key
  primaryKey: 'id',

  // Material icon for navigation menus and entity displays
  icon: 'attach_file',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  /**
   * The human-readable identifier field
   * For files, original_filename is the most meaningful identifier
   */
  identityField: 'original_filename',

  /**
   * Whether the identity field has a UNIQUE constraint
   * Filenames are NOT unique (same file can be uploaded multiple times)
   */
  identityFieldUnique: false,

  /**
   * RLS resource: PARENT_DERIVED - permissions come from parent entity
   * Polymorphic child tables use this pattern instead of their own resource
   */
  rlsResource: RLS_RESOURCE_TYPES.PARENT_DERIVED,

  /**
   * Row-Level Security policy per role
   * Access controlled by parent entity - admin can see all
   */
  rlsPolicy: {
    customer: 'parent_entity_access',
    technician: 'parent_entity_access',
    dispatcher: 'parent_entity_access',
    manager: 'parent_entity_access',
    admin: 'all_records',
  },

  /**
   * Navigation visibility - null means not shown in nav menus
   * File attachments are child records, accessed from parent entity UI
   */
  navVisibility: null,

  /**
   * Entity-level permission overrides
   * Matches permissions.json - technician+ create/update, dispatcher+ delete
   */
  entityPermissions: {
    create: 'technician',
    read: 'customer',
    update: 'technician',
    delete: 'dispatcher',
  },

  /**
   * Route configuration - uses CUSTOM routes due to polymorphic attachment pattern
   * Requires parent entity context and streaming for file downloads
   */
  routeConfig: {
    useGenericRouter: false,
  },

  fieldGroups: {},

  nameType: null,

  // ============================================================================
  // FIELD ALIASING (for UI display names)
  // ============================================================================

  /**
   * Field aliases for UI display. Key = field name, Value = display label
   */
  fieldAliases: {
    original_filename: 'Filename',
    mime_type: 'File Type',
    file_size: 'Size',
    entity_type: 'Attached To',
    entity_id: 'Parent ID',
    uploaded_by: 'Uploaded By',
  },

  // ============================================================================
  // OUTPUT FILTERING
  // ============================================================================

  /**
   * Sensitive fields - never exposed in API responses
   * storage_key contains the cloud storage path (security-sensitive)
   */
  sensitiveFields: ['storage_key'],

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  /**
   * Fields required when creating a new file attachment
   * (handled by route/service, not GenericEntityService)
   */
  requiredFields: [
    'entity_type',
    'entity_id',
    'original_filename',
    'storage_key',
    'mime_type',
    'file_size',
  ],

  /**
   * Fields that cannot be modified after creation
   * - All file metadata is immutable (can only delete and re-upload)
   */
  immutableFields: [
    'entity_type',
    'entity_id',
    'original_filename',
    'storage_key',
    'mime_type',
    'file_size',
    'uploaded_by',
  ],

  /**
   * Default columns to display in table views (ordered)
   * Used by admin panel for viewing file attachments
   */
  displayColumns: ['original_filename', 'mime_type', 'file_size', 'entity_type', 'uploaded_by', 'created_at'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================
  // Access is derived from parent entity permissions

  fieldAccess: {
    // Note: id inherits from UNIVERSAL_FIELD_ACCESS (PUBLIC_READONLY)
    // Do NOT override with SYSTEM_ONLY - that blocks read access and breaks API responses

    // Polymorphic reference - set at creation, immutable
    entity_type: {
      create: 'none', // System sets from URL params
      read: 'customer', // Anyone with parent entity read access
      update: 'none', // Immutable
      delete: 'none',
    },
    entity_id: {
      create: 'none', // System sets from URL params
      read: 'customer', // Anyone with parent entity read access
      update: 'none', // Immutable
      delete: 'none',
    },

    // File metadata - set at upload, immutable
    original_filename: {
      create: 'customer', // Uploader provides via header
      read: 'customer', // Anyone with parent access
      update: 'none', // Immutable
      delete: 'none',
    },
    storage_key: {
      create: 'none', // System generates
      read: 'none', // Never exposed (use download URL)
      update: 'none', // Immutable
      delete: 'none',
    },
    mime_type: {
      create: 'none', // System detects from Content-Type
      read: 'customer', // Anyone with parent access
      update: 'none', // Immutable
      delete: 'none',
    },
    file_size: {
      create: 'none', // System calculates
      read: 'customer', // Anyone with parent access
      update: 'none', // Immutable
      delete: 'none',
    },

    // Categorization - can be set at upload
    category: {
      create: 'customer', // Uploader can specify
      read: 'customer', // Anyone with parent access
      update: 'dispatcher', // Can recategorize
      delete: 'none',
    },
    description: {
      create: 'customer', // Uploader can specify
      read: 'customer', // Anyone with parent access
      update: 'customer', // Owner can update description
      delete: 'none',
    },

    // Tracking
    uploaded_by: {
      create: 'none', // System sets from auth
      read: 'customer', // Anyone with parent access
      update: 'none', // Immutable
      delete: 'none',
    },

    // Soft delete flag
    is_active: {
      create: 'none', // Defaults to true
      read: 'dispatcher', // Dispatchers+ can see status
      update: 'dispatcher', // Dispatchers+ can soft delete
      delete: 'none',
    },

    // Timestamps
    created_at: FAL.SYSTEM_ONLY,
    updated_at: FAL.SYSTEM_ONLY,
  },

  // ============================================================================
  // QUERY CONFIGURATION
  // ============================================================================

  /**
   * Fields that can be used in filters
   */
  filterableFields: [
    'entity_type',
    'entity_id',
    'mime_type',
    'category',
    'is_active',
    'uploaded_by',
  ],

  /**
   * Fields that can be sorted by
   */
  sortableFields: [
    'original_filename',
    'file_size',
    'created_at',
    'category',
  ],

  /**
   * Fields included in search
   */
  searchableFields: [
    'original_filename',
    'description',
  ],

  /**
   * Default sort order
   */
  defaultSort: { field: 'created_at', order: 'desc' },

  // ============================================================================
  // FIELD DEFINITIONS
  // ============================================================================
  // Matches schema.sql file_attachments table structure

  fields: {
    // Primary key
    id: { type: 'integer', readonly: true },

    // Polymorphic reference fields
    entity_type: { type: 'string', required: true, maxLength: 50 },
    entity_id: { type: 'integer', required: true },

    // File metadata
    original_filename: { ...FIELD.NAME, required: true },
    storage_key: { type: 'string', required: true, maxLength: 500, readonly: true },
    mime_type: { type: 'string', required: true, maxLength: 100 },
    file_size: { type: 'integer', required: true },

    // Categorization
    category: { type: 'string', maxLength: 50, default: 'attachment' },
    description: FIELD.DESCRIPTION,

    // Upload tracking
    uploaded_by: {
      type: 'foreignKey',
      relatedEntity: 'user',
      readonly: true,
    },

    // Soft delete and timestamps
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },
  },

  // ============================================================================
  // ALLOWED VALUES
  // ============================================================================

  /**
   * Allowed MIME types for file uploads
   * Also defined in routes/files.js for validation
   */
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
  ],

  /**
   * Allowed categories for file attachments
   */
  allowedCategories: [
    'attachment',
    'photo',
    'document',
    'receipt',
    'contract',
    'signature',
  ],

  /**
   * Maximum file size in bytes (10MB)
   */
  maxFileSize: 10 * 1024 * 1024,
};
