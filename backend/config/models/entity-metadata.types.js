/**
 * Entity Metadata Type Definitions
 *
 * SINGLE SOURCE OF TRUTH for entity metadata type contracts.
 * These JSDoc typedefs provide IDE IntelliSense and type checking
 * for all entity metadata files.
 *
 * USAGE in metadata files:
 * ```javascript
 * /** @type {import('./entity-metadata.types').EntityMetadata} *\/
 * module.exports = {
 *   entityKey: 'customer',
 *   // ... IDE will autocomplete and validate
 * };
 * ```
 *
 * @module config/models/entity-metadata.types
 */

// ============================================================================
// FIELD ACCESS TYPES
// ============================================================================

/**
 * Role names that can be used for access control.
 * 'none' = no access, 'system' = backend-only access.
 * @typedef {'none' | 'system' | 'customer' | 'technician' | 'dispatcher' | 'manager' | 'admin'} AccessLevel
 */

/**
 * Field-level access control configuration.
 * Defines minimum role required for each CRUD operation on a field.
 * @typedef {Object} FieldAccessConfig
 * @property {AccessLevel} create - Minimum role to set field on CREATE
 * @property {AccessLevel} read - Minimum role to see field in responses
 * @property {AccessLevel} update - Minimum role to modify field
 * @property {AccessLevel} delete - Usually 'none' (field deletion not supported)
 */

// ============================================================================
// FIELD DEFINITION TYPES
// ============================================================================

/**
 * Supported field types that the data generator and validators can handle.
 * @typedef {'string' | 'text' | 'integer' | 'number' | 'decimal' | 'currency' | 'boolean' | 'date' | 'timestamp' | 'uuid' | 'email' | 'phone' | 'enum' | 'foreignKey' | 'json' | 'jsonb' | 'array'} FieldType
 */

/**
 * Field definition with type and validation constraints.
 * @typedef {Object} FieldDefinition
 * @property {FieldType} type - Field data type (REQUIRED)
 * @property {boolean} [required] - Whether field is required on CREATE
 * @property {boolean} [readonly] - Whether field is immutable after creation
 * @property {boolean} [readOnly] - Alias for readonly (both supported)
 * @property {number} [maxLength] - Maximum string length
 * @property {number} [minLength] - Minimum string length
 * @property {number} [min] - Minimum numeric value
 * @property {number} [max] - Maximum numeric value
 * @property {number} [precision] - Decimal precision
 * @property {*} [default] - Default value
 * @property {string[]} [values] - Allowed values for enum fields
 * @property {string} [pattern] - Regex pattern for validation
 * @property {string} [description] - Field documentation
 * @property {string} [relatedEntity] - For foreignKey: target entity name
 * @property {string} [displayField] - For foreignKey: field to show in dropdowns
 * @property {string[]} [displayFields] - For foreignKey: multiple fields to display
 * @property {string} [displayTemplate] - For foreignKey: template string for display
 * @property {boolean} [trim] - Auto-trim whitespace
 * @property {{valid: *[], invalid: *[]}} [examples] - Example values for testing
 * @property {Object.<string, string>} [errorMessages] - Custom validation messages
 */

/**
 * Enum definition with labels and optional colors.
 * @typedef {Object} EnumDefinition
 * @property {string[]} values - Allowed enum values
 * @property {Object.<string, string>} [labels] - Display labels per value
 * @property {Object.<string, string>} [colors] - Badge color per value (success, warning, error, info)
 */

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

/**
 * Relationship type enumeration.
 * @typedef {'belongsTo' | 'hasMany' | 'hasOne'} RelationshipType
 */

/**
 * Relationship definition for JOINs and data loading.
 * @typedef {Object} RelationshipDefinition
 * @property {RelationshipType} type - Relationship cardinality
 * @property {string} foreignKey - FK column name
 * @property {string} table - Target table name
 * @property {string[]} [fields] - Fields to include in JOIN
 * @property {string} [description] - Relationship documentation
 */

/**
 * Foreign key configuration for validation.
 * @typedef {Object} ForeignKeyConfig
 * @property {string} table - Referenced table name
 * @property {string} [displayName] - Human-readable name for error messages
 * @property {string} [displayField] - Field to show in dropdowns
 * @property {string[]} [displayFields] - Multiple fields for rich display
 * @property {string} [displayTemplate] - Template: "{company_name} - {email}"
 */

// ============================================================================
// SECURITY TYPES
// ============================================================================

/**
 * Row-level security filter configuration object.
 * Used when the filter value comes from a profile ID rather than userId.
 * @typedef {Object} RLSFilterConfig
 * @property {string} field - Database column to filter on
 * @property {string} value - Context key to get filter value from: 'userId', 'customerProfileId', 'technicianProfileId'
 */

/**
 * Row-level security policy values (ADR-008).
 * - null: All records (no filter)
 * - false: Deny all access
 * - '$parent': Access controlled by parent entity
 * - string: Field name (shorthand for { field: string, value: 'userId' })
 * - RLSFilterConfig: Full config with field and context value key
 * @typedef {null | false | '$parent' | string | RLSFilterConfig} RLSPolicyValue
 */

/**
 * RLS policy configuration per role.
 * @typedef {Object} RLSPolicy
 * @property {RLSPolicyValue} [customer] - Policy for customer role
 * @property {RLSPolicyValue} [technician] - Policy for technician role
 * @property {RLSPolicyValue} [dispatcher] - Policy for dispatcher role
 * @property {RLSPolicyValue} [manager] - Policy for manager role
 * @property {RLSPolicyValue} [admin] - Policy for admin role
 */

/**
 * Entity-level permission configuration.
 * null = operation disabled (system-only), 'none' = no role has access.
 * @typedef {Object} EntityPermissions
 * @property {AccessLevel | null} [create] - Minimum role for CREATE
 * @property {AccessLevel | null} [read] - Minimum role for READ
 * @property {AccessLevel | null} [update] - Minimum role for UPDATE
 * @property {AccessLevel | null} [delete] - Minimum role for DELETE
 */

/**
 * RLS filter configuration for own-record patterns.
 * Used by rls-filter-helper.js to build WHERE clauses for row-level security.
 * @typedef {Object} RLSFilterConfig
 * @property {string} [ownRecordField] - Field linking to user record (default: 'id')
 * @property {string} [customerField] - Field for customer ownership (default: 'customer_id')
 * @property {string} [assignedField] - Field for technician assignment (default: 'assigned_technician_id')
 */

// ============================================================================
// UI CONFIGURATION TYPES
// ============================================================================

/**
 * Field group for form layout.
 * @typedef {Object} FieldGroup
 * @property {string} label - Display label for the group
 * @property {string[]} fields - Field names in this group
 * @property {number} [order] - Display order (lower = first)
 * @property {string[][]} [rows] - Row layout hints: [['city', 'state', 'postal']]
 * @property {string} [copyFrom] - Source group for "Same as" functionality
 * @property {string} [copyFromLabel] - Button label: "Same as Billing"
 */

/**
 * Sort configuration.
 * @typedef {Object} SortConfig
 * @property {string} field - Field to sort by
 * @property {'ASC' | 'DESC'} order - Sort direction
 */

/**
 * System protection rules for seed data.
 * @typedef {Object} SystemProtected
 * @property {string} protectedByField - Field that identifies protected records
 * @property {string[] | (() => string[])} values - Protected values (or getter function)
 * @property {string[]} [immutableFields] - Fields that cannot be changed on protected records
 * @property {boolean} [preventDelete] - Whether protected records can be deleted
 */

/**
 * Route configuration for API routing.
 * @typedef {Object} RouteConfig
 * @property {boolean} useGenericRouter - Whether to use GenericEntityService for CRUD
 * @property {string} [mountPath] - Custom API mount path
 */

/**
 * Computed name configuration for COMPUTED entities.
 * @typedef {Object} ComputedNameConfig
 * @property {string} template - Name template: "{customer.fullName}: {summary}"
 * @property {string[]} sources - Fields used in template
 * @property {boolean} [readOnly] - Whether users can override computed name
 */

/**
 * Dependent entity for cascade operations.
 * @typedef {Object} DependentConfig
 * @property {string} table - Dependent table name
 * @property {string} foreignKey - FK column in dependent table
 * @property {{column: string, value: string}} [polymorphicType] - For polymorphic relationships
 */

// ============================================================================
// ENTITY NAME TYPES
// ============================================================================

/**
 * Entity naming pattern type.
 * - 'human': Uses first_name + last_name (user, customer, technician)
 * - 'simple': Has direct name field with unique identity (role, inventory)
 * - 'computed': Auto-generated ID + computed name (work_order, invoice)
 * - null: System table, not a business entity (notification, audit_log)
 * @typedef {'human' | 'simple' | 'computed' | null} NameType
 */

// ============================================================================
// MAIN ENTITY METADATA TYPE
// ============================================================================

/**
 * Complete entity metadata definition.
 *
 * This is the contract that all *-metadata.js files must follow.
 * Properties marked as REQUIRED will cause validation errors if missing.
 *
 * @typedef {Object} EntityMetadata
 *
 * @property {string} entityKey - REQUIRED: Unique snake_case identifier (e.g., 'work_order')
 * @property {string} tableName - REQUIRED: Database table name, plural (e.g., 'work_orders')
 * @property {string} primaryKey - REQUIRED: Primary key column (usually 'id')
 * @property {string} icon - REQUIRED: Material Icons name (e.g., 'build', 'people')
 * @property {string | null} navVisibility - REQUIRED: Min role for nav menu, or null for system tables
 * @property {boolean} supportsFileAttachments - REQUIRED: Whether entity supports file uploads
 *
 * @property {NameType} [nameType] - Entity naming pattern (HUMAN/SIMPLE/COMPUTED/null)
 * @property {string} [identityField] - Human-readable unique field (e.g., 'email', 'work_order_number')
 * @property {boolean} [identityFieldUnique] - Whether identity field has UNIQUE constraint
 * @property {string} [displayField] - Field to show in FK dropdowns (defaults to identityField)
 * @property {string[]} [displayFields] - Multiple fields for display: ['first_name', 'last_name']
 * @property {string} [identifierPrefix] - Auto-ID prefix for COMPUTED entities (e.g., 'WO')
 *
 * @property {string} [rlsResource] - Resource name for permission checks (defaults to tableName)
 * @property {RLSPolicy} [rlsPolicy] - Row-level security rules per role
 * @property {RLSFilterConfig} [rlsFilterConfig] - Custom RLS filter configuration
 * @property {EntityPermissions} [entityPermissions] - Entity-level CRUD overrides
 * @property {Object.<string, FieldAccessConfig>} [fieldAccess] - Per-field CRUD access levels
 *
 * @property {Object.<string, FieldDefinition>} [fields] - Field definitions with types/validation
 * @property {Object.<string, EnumDefinition>} [enums] - Enum definitions with labels/colors
 * @property {Object.<string, ForeignKeyConfig>} [foreignKeys] - FK validation config
 * @property {Object.<string, RelationshipDefinition>} [relationships] - JOIN configuration
 * @property {string[]} [defaultIncludes] - Relationships to auto-include in queries
 *
 * @property {string[]} [requiredFields] - Fields required on CREATE
 * @property {string[]} [immutableFields] - Fields that cannot be updated
 * @property {string[]} [sensitiveFields] - Fields excluded from API responses (blacklist)
 * @property {string[]} [searchableFields] - Fields for text search (ILIKE)
 * @property {string[]} [filterableFields] - Fields for WHERE clauses
 * @property {string[]} [sortableFields] - Fields for ORDER BY
 * @property {SortConfig} [defaultSort] - Default sort configuration
 * @property {string[]} [displayColumns] - Default columns for table views
 * @property {string[]} [exportableFields] - Fields included in CSV exports
 *
 * @property {string} [displayName] - Human-readable entity name (singular)
 * @property {string} [displayNamePlural] - Human-readable entity name (plural)
 *
 * @property {Object.<string, FieldGroup>} [fieldGroups] - UI field grouping for forms
 * @property {Object.<string, string>} [fieldAliases] - UI label overrides: {name: 'Title'}
 *
 * @property {RouteConfig} [routeConfig] - API routing configuration
 * @property {ComputedNameConfig} [computedName] - Name computation for COMPUTED entities
 * @property {SystemProtected} [systemProtected] - Protection for seed data records
 * @property {DependentConfig[]} [dependents] - Cascade delete configuration
 *
 * @property {boolean} [sharedPrimaryKey] - Whether PK is FK to another table (preferences)
 * @property {boolean} [uncountable] - Whether entity name is uncountable (inventory)
 * @property {boolean} [isSystemTable] - Whether this is a system table (audit_log)
 */

// Export empty object - this file is for types only
module.exports = {};
