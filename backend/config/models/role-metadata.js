/**
 * Role Model Metadata
 *
 * Category: SIMPLE (name field for display, priority as identity)
 *
 * SRP: ONLY defines Role table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Role model query and CRUD capabilities
 */

const {
  FIELD_ACCESS_LEVELS: FAL,
  UNIVERSAL_FIELD_ACCESS,
} = require("../constants");
const { getRoleHierarchy } = require("../role-hierarchy-loader");
const { NAME_TYPES } = require("../entity-types");
const { FIELD } = require("../field-type-standards");

module.exports = {
  // Entity key (singular, for API params and lookups)
  entityKey: "role",

  // Table name in database (plural, also used for API URLs)
  tableName: "roles",

  // Primary key
  primaryKey: "id",

  // Material icon for navigation menus and entity displays
  icon: "badge",

  // ============================================================================
  // ENTITY CATEGORY (determines name handling pattern)
  // ============================================================================

  /**
   * Entity category: SIMPLE entities have a direct name field
   * and a unique identifier field (priority for roles)
   */
  nameType: NAME_TYPES.SIMPLE,

  // ============================================================================
  // IDENTITY CONFIGURATION (Entity Contract v2.0)
  // ============================================================================

  /**
   * The unique identifier field - priority determines role hierarchy
   * Used for: Unique identification, role hierarchy enforcement
   */
  identityField: "priority",

  /**
   * The human-readable display field for relationships
   * Used when JOINing this entity - 'name' is what we show as 'role'
   * Distinct from identityField which is for uniqueness validation
   */
  displayField: "name",

  /**
   * Whether the identity field has a UNIQUE constraint in the database
   * Used for duplicate rejection tests
   */
  identityFieldUnique: true,

  /**
   * RLS resource name for permission checks
   * Maps to permissions.json resource names
   */
  rlsResource: "roles",

  /**
   * Row-Level Security policy per role
   * Roles are a public resource - all authenticated users can read
   */
  rlsPolicy: {
    customer: "public_resource",
    technician: "public_resource",
    dispatcher: "public_resource",
    manager: "public_resource",
    admin: "public_resource",
  },

  /**
   * Navigation visibility - minimum role to see this entity in nav menus
   * Roles are public for reading (dropdowns) but shouldn't appear in nav for non-admins
   */
  navVisibility: "admin",

  /**
   * File attachments - whether this entity supports file uploads
   */
  supportsFileAttachments: false,

  /**
   * Entity-level permission overrides
   * Roles are admin-only for CUD, but readable by all
   */
  entityPermissions: {
    create: "admin",
    read: "customer",
    update: "admin",
    delete: "admin",
  },

  /**
   * Route configuration - explicit opt-in for generic router
   */
  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {},

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION (for GenericEntityService)
  // ============================================================================

  /**
   * Fields required when creating a new entity
   * Note: priority is required at DB level (NOT NULL, no DEFAULT)
   */
  requiredFields: ["name", "priority"],

  /**
   * Fields that CANNOT be modified during UPDATE (immutable after creation)
   * All other fields in the table are allowed.
   * Universal immutables (id, created_at) are always excluded automatically via ENTITY_FIELDS constant.
   *
   * Empty array = only universal immutables apply (all business fields are editable)
   */
  immutableFields: [],

  /**
   * Default columns to display in table views (ordered)
   * Used by admin panel and frontend table widgets
   */
  displayColumns: ["name", "priority", "description"],

  // ============================================================================
  // FIELD ACCESS CONTROL (role-based field-level CRUD permissions)
  // ============================================================================
  // Each field specifies the MINIMUM role required for each CRUD operation.
  // Permissions accumulate UPWARD: manager has all dispatcher + technician + customer permissions.
  // Universal fields (id, is_active, created_at, updated_at, status) are in UNIVERSAL_FIELD_ACCESS.
  // Use FAL shortcuts for common patterns, or define custom { create, read, update, delete }.

  fieldAccess: {
    // Entity Contract v2.0 fields (id, is_active, created_at, updated_at, status)
    ...UNIVERSAL_FIELD_ACCESS,

    // Name - the role identifier, admin-only management
    name: {
      create: "admin",
      read: "customer", // Everyone can see role names
      update: "admin",
      delete: "none",
    },

    // Description - role explanation, admin-only management
    description: {
      create: "admin",
      read: "customer", // Everyone can see role descriptions
      update: "admin",
      delete: "none",
    },

    // Priority - role hierarchy level, admin-only management
    priority: {
      create: "admin",
      read: "manager", // Only manager+ need to see priority
      update: "admin",
      delete: "none",
    },

    // Is system role flag - read-only indicator
    is_system_role: FAL.PUBLIC_READONLY,
  },

  // ============================================================================
  // DELETE CONFIGURATION (for GenericEntityService.delete)
  // ============================================================================

  /**
   * Dependent records that must be cascade-deleted before this entity
   * Only for relationships NOT handled by database ON DELETE CASCADE/SET NULL
   *
   * For audit_logs: polymorphic FK via resource_type + resource_id
   */
  dependents: [
    {
      table: "audit_logs",
      foreignKey: "resource_id",
      polymorphicType: { column: "resource_type", value: "roles" },
    },
  ],

  // ============================================================================
  // SYSTEM PROTECTION (Multi-Level Security)
  // ============================================================================

  /**
   * System-protected values that cannot be deleted or have critical fields modified.
   * This is the SINGLE SOURCE OF TRUTH for protection rules.
   *
   * Enforcement layers (defense in depth):
   *   1. Route layer: Fast-fail for UX (check before calling service)
   *   2. Service layer: GenericEntityService checks before DB operations
   *   3. Database layer: Trigger + is_system_role column (last line of defense)
   *
   * Protected roles are fundamental to the RBAC system and must not be
   * accidentally deleted or have their hierarchy (priority) changed.
   */
  systemProtected: {
    /**
     * Field to check for protected values (may differ from identityField)
     * For roles: name is the protected identifier, even though priority is the identity field
     */
    protectedByField: "name",

    /**
     * Values of protectedByField that are protected
     * Derived dynamically from role-hierarchy-loader (DB SSOT at runtime)
     */
    get values() {
      return [...getRoleHierarchy()];
    },

    /**
     * Fields that cannot be modified on protected records
     * Even if the field is in updateableFields, these are blocked for protected values
     */
    immutableFields: ["name", "priority"],

    /**
     * Whether protected values can be deleted
     */
    preventDelete: true,
  },

  // ============================================================================
  // SEARCH CONFIGURATION (Text Search with ILIKE)
  // ============================================================================

  /**
   * Fields that support text search (ILIKE %term%)
   * These are concatenated with OR for full-text search
   */
  searchableFields: ["name", "description"],

  // ============================================================================
  // FILTER CONFIGURATION (Exact Match & Operators)
  // ============================================================================

  /**
   * Fields that can be used in WHERE clauses
   * Supports: exact match, gt, gte, lt, lte, in, not
   */
  filterableFields: [
    "id",
    "name",
    "description",
    "priority",
    "status",
    "is_active",
    "is_system_role",
    "created_at",
    "updated_at",
  ],

  // ============================================================================
  // SORT CONFIGURATION
  // ============================================================================

  /**
   * Fields that can be used in ORDER BY clauses
   * All fields are sortable by default
   */
  sortableFields: [
    "id",
    "name",
    "description",
    "priority",
    "status",
    "is_active",
    "is_system_role",
    "created_at",
    "updated_at",
  ],

  /**
   * Default sort when no sortBy specified
   * Roles sorted by priority (highest first) for logical display
   */
  defaultSort: {
    field: "priority",
    order: "DESC",
  },

  // ============================================================================
  // SECURITY CONFIGURATION
  // ============================================================================

  /**
   * Fields to EXCLUDE from SELECT statements (security)
   * Roles have no sensitive fields
   */
  excludedFields: [],

  /**
   * Fields that require special permissions to filter/sort
   * (Future: for admin-only fields)
   */
  restrictedFields: [],

  // ============================================================================
  // FOREIGN KEY CONFIGURATION (for DB error handling)
  // ============================================================================

  /**
   * Outbound foreign keys (this table references other tables)
   * Used by buildDbErrorConfig() for user-friendly FK violation messages
   * Roles don't reference other tables - they ARE the referenced table
   */
  foreignKeys: {},

  // ============================================================================
  // RELATIONSHIPS (for JOIN queries)
  // ============================================================================

  /**
   * Relationships to JOIN by default in all queries (findById, findAll, findByField)
   * These are included automatically without needing to specify 'include' option
   * Roles don't need any default includes (users/permissions are opt-in)
   */
  defaultIncludes: [],

  /**
   * Foreign key relationships
   * Used for JOIN generation and validation
   */
  relationships: {
    permissions: {
      type: "hasMany",
      foreignKey: "role_id",
      table: "role_permissions",
      through: "permissions",
      fields: ["id", "permission_name", "resource", "action"],
    },
    users: {
      type: "hasMany",
      foreignKey: "role_id",
      table: "users",
      fields: ["id", "email", "first_name", "last_name"],
    },
  },

  // ============================================================================
  // FIELD DEFINITIONS (for validation & documentation)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: "integer", readonly: true },
    // Role name - uses FIELD.NAME with custom validation for role-specific pattern
    name: {
      ...FIELD.NAME,
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: "^[a-zA-Z0-9\\s_-]+$",
      trim: true,
      errorMessages: {
        required: "Role name is required",
        minLength: "Role name must be at least 2 characters",
        maxLength: "Role name cannot exceed 100 characters",
        pattern:
          "Role name can only contain letters, numbers, spaces, underscores, and hyphens",
      },
    },
    is_active: { type: "boolean", default: true },
    created_at: { type: "timestamp", readonly: true },
    updated_at: { type: "timestamp", readonly: true },

    // TIER 2: Lifecycle status
    status: {
      type: "enum",
      values: ["active", "disabled"],
      default: "active",
      description:
        "Role lifecycle state - disabled roles cannot be newly assigned",
    },

    // Entity-specific fields
    description: FIELD.DESCRIPTION,
    // Priority starts at 10 in examples to avoid seed data (priorities 1-5)
    priority: {
      type: "integer",
      required: true,
      min: 1,
      examples: { valid: [10, 20, 30] },
    },
  },
};
