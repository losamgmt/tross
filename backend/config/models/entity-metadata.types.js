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
 * @property {string} [enumKey] - Key referencing enums.[enumKey] for enum values
 * @property {string[]} [values] - DEPRECATED: Use enumKey. Direct enum values array
 * @property {string} [pattern] - Regex pattern for validation
 * @property {string} [description] - Field documentation
 * @property {string} [references] - For foreignKey: target entity name (aligns with SQL REFERENCES)
 * @property {string} [displayField] - For foreignKey: field to show in dropdowns
 * @property {string[]} [displayFields] - For foreignKey: multiple fields to display
 * @property {string} [displayTemplate] - For foreignKey: template string for display
 * @property {boolean} [trim] - Auto-trim whitespace
 * @property {{valid: *[], invalid: *[]}} [examples] - Example values for testing
 * @property {Object.<string, string>} [errorMessages] - Custom validation messages
 */

/**
 * Enum value definition with display metadata.
 * @typedef {Object} EnumValueDefinition
 * @property {string} label - Display label for the value
 * @property {string} [color] - Badge color (success, warning, error, info)
 * @property {string} [icon] - Optional icon name
 */

/**
 * Enum definition as value-keyed object.
 * Values are derived from Object.keys(enumDef).
 * Example: { active: { label: 'Active', color: 'success' }, inactive: { label: 'Inactive' } }
 * @typedef {Object.<string, EnumValueDefinition>} EnumDefinition
 */

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

/**
 * Relationship type enumeration.
 * - belongsTo: This entity has FK to the related entity (N:1)
 * - hasMany: Related entity has FK to this entity (1:N)
 * - hasOne: Related entity has FK to this entity, unique (1:1)
 * - manyToMany: Related through a junction table (M:N)
 * @typedef {'belongsTo' | 'hasMany' | 'hasOne' | 'manyToMany'} RelationshipType
 */

/**
 * Relationship definition for JOINs and data loading.
 * @typedef {Object} RelationshipDefinition
 * @property {RelationshipType} type - Relationship cardinality
 * @property {string} foreignKey - FK column name in related table (or sourceKey for manyToMany)
 * @property {string} table - Target table name (the entity we're relating TO)
 * @property {string[]} [fields] - Fields to include in JOIN
 * @property {string} [description] - Relationship documentation
 * @property {string} [through] - For manyToMany: junction table name (e.g., 'customer_properties')
 * @property {string} [targetKey] - For manyToMany: FK in junction pointing to target entity
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
 * @deprecated RLSFilterConfig is no longer used. Use rlsRules (ADR-011) instead.
 * Kept for documentation purposes only.
 * @typedef {Object} RLSFilterConfig
 * @property {string} [ownRecordField] - Field linking to user record (default: 'id')
 * @property {string} [customerField] - Field for customer ownership (default: 'customer_id')
 * @property {string} [assignedField] - Field for technician assignment (default: 'assigned_technician_id')
 */

// ============================================================================
// RLS RULES TYPES (ADR-011)
// ============================================================================

/**
 * Junction path configuration for junction-based RLS access.
 * Used in EXISTS subqueries for M:M relationship traversal.
 * @typedef {Object} RLSJunctionConfig
 * @property {string} table - Junction table name (e.g., 'customer_units')
 * @property {string} localKey - This entity's key for JOIN (usually 'id')
 * @property {string} foreignKey - Junction table's FK to this entity (e.g., 'unit_id')
 * @property {Object.<string, string>} [filter] - Conditions on junction: { customer_profile_id: 'customerProfileId' }
 * @property {RLSJunctionConfig} [through] - For multi-hop: next junction in path
 */

/**
 * Direct access configuration - field equals context value.
 * @typedef {Object} RLSDirectAccess
 * @property {'direct'} type - Access type discriminator
 * @property {string} field - Database column to match (e.g., 'customer_profile_id')
 * @property {string} [value] - Context key: 'userId' | 'customerProfileId' | 'technicianProfileId'. Defaults to 'userId'
 */

/**
 * Polymorphic parent configuration for type discriminator + foreign key patterns.
 * Used when a child entity can reference multiple parent types (e.g., file_attachments).
 *
 * At RUNTIME, the parent type is resolved from:
 * - Route context (e.g., /work_orders/:id/files → parentType = 'work_order')
 * - Query parameter (e.g., /files?entity_type=work_order)
 *
 * @typedef {Object} RLSPolymorphicConfig
 * @property {string} typeColumn - Column containing parent entity type (e.g., 'entity_type')
 * @property {string[]} [allowedTypes] - Optional allowlist of valid parent entity keys. If omitted, any entity with RLS rules is valid.
 */

/**
 * Parent access configuration - delegates to parent entity's RLS.
 * Recursively applies the parent entity's RLS rules to filter this entity.
 *
 * For STATIC parents: Specify parentEntity (e.g., asset → unit).
 * For POLYMORPHIC parents: Specify polymorphic config (e.g., file_attachments → work_order|asset|etc).
 * Exactly one of parentEntity or polymorphic must be specified.
 *
 * Polymorphic resolution uses RUNTIME context from routes/queries, not compile-time enumeration.
 * This scales to hundreds of entity types without SQL complexity.
 *
 * @typedef {Object} RLSParentAccess
 * @property {'parent'} type - Access type discriminator
 * @property {string} foreignKey - Column referencing parent's primary key (e.g., 'unit_id', 'entity_id')
 * @property {string} [parentEntity] - Entity name for static parents (mutually exclusive with polymorphic)
 * @property {RLSPolymorphicConfig} [polymorphic] - Config for polymorphic parents (mutually exclusive with parentEntity)
 */

/**
 * Junction access configuration - EXISTS subquery through junction table.
 * @typedef {Object} RLSJunctionAccess
 * @property {'junction'} type - Access type discriminator
 * @property {RLSJunctionConfig} junction - Junction path configuration
 */

/**
 * Access configuration for an RLS rule.
 * null = full access (no filtering).
 * @typedef {null | RLSDirectAccess | RLSParentAccess | RLSJunctionAccess} RLSAccessConfig
 */

/**
 * RLS rule definition (ADR-011).
 * Declarative rule specifying who can access what records via which path.
 * @typedef {Object} RLSRule
 * @property {string} id - Unique rule identifier within entity (e.g., 'customer-own-records')
 * @property {string} [description] - Human-readable rule description
 * @property {string | string[]} roles - Role(s) this rule applies to
 * @property {string | string[]} operations - Operation(s): 'read' | 'summary' | 'update' | 'delete' | '*'
 * @property {RLSAccessConfig} access - How records are filtered for matched role/operation
 */

// ============================================================================
// UI CONFIGURATION TYPES
// ============================================================================

/**
 * Navigation group for menu placement.
 * - 'customers': Customer management (customers, properties, assets)
 * - 'work': Work operations (work orders, quotes, visits)
 * - 'resources': Resources (technicians, inventory, vendors)
 * - 'finance': Finance (contracts, invoices, payments)
 * - 'admin': Admin (users, roles, departments)
 * @typedef {'customers' | 'work' | 'resources' | 'finance' | 'admin'} NavGroup
 */

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
// JUNCTION ENTITY TYPES
// ============================================================================

/**
 * Unique constraint definition for composite keys.
 * Used primarily in junction tables but available for any entity.
 * @typedef {Object} UniqueConstraint
 * @property {string} name - Constraint name (e.g., 'uq_customer_property')
 * @property {string[]} fields - Fields forming the composite unique key
 * @property {string} [description] - Constraint documentation
 */

/**
 * Junction entity configuration for M:M relationships.
 * Junction entities connect two entities with optional relationship attributes.
 * @typedef {Object} JunctionConfig
 * @property {string} entity1 - First related entity key (e.g., 'customer')
 * @property {string} entity2 - Second related entity key (e.g., 'property')
 * @property {string} [foreignKey1] - FK field for entity1 (defaults to 'entity1_id')
 * @property {string} [foreignKey2] - FK field for entity2 (defaults to 'entity2_id')
 */

// ============================================================================
// SUMMARY CONFIGURATION TYPES
// ============================================================================

/**
 * Summary endpoint configuration for aggregated/analytics queries.
 *
 * Enables the generic /summaries/:entity endpoint with GROUP BY support.
 * null = entity not summarizable (junction tables, system tables, etc.)
 *
 * @typedef {Object} SummaryConfigObject
 * @property {string[]} groupableFields - REQUIRED: Fields that can be used with group_by parameter.
 *   Must be FK fields (references) or enum fields. Defines valid grouping dimensions.
 * @property {string[]} [summableFields] - Numeric fields that can be summed (e.g., totals, amounts).
 *   Must be integer, decimal, number, or currency type. Defaults to [].
 * @property {string[] | null} [breakdownFields] - Enum fields that get automatic count_by_X breakdowns.
 *   null = auto-detect from enum fields in groupableFields. Defaults to null.
 * @property {string[] | null} [dateFields] - Date/timestamp fields for time bucketing.
 *   null = auto-detect from date/timestamp fields. Defaults to null.
 */

/**
 * Summary configuration for an entity.
 * null = entity should not have a summary endpoint.
 * @typedef {SummaryConfigObject | null} SummaryConfig
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
 * @typedef {'human' | 'simple' | 'computed' | null} NamePattern
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
 * @property {NavGroup} [navGroup] - Navigation group for menu placement (people, operations, finance, admin)
 * @property {number} [navOrder] - Order within navigation group (lower = higher priority)
 *
 * @property {NamePattern} [namePattern] - Entity naming pattern (HUMAN/SIMPLE/COMPUTED/null)
 * @property {string} [identityField] - Human-readable unique field (e.g., 'email', 'work_order_number')
 * @property {boolean} [identityFieldUnique] - Whether identity field has UNIQUE constraint
 * @property {string} [displayField] - Field to show in FK dropdowns (defaults to identityField)
 * @property {string[]} [displayFields] - Multiple fields for display: ['first_name', 'last_name']
 * @property {string} [identifierPrefix] - Auto-ID prefix for COMPUTED entities (e.g., 'WO')
 *
 * @property {string} [rlsResource] - Resource name for permission checks (defaults to tableName)
 * @property {RLSPolicy} [rlsPolicy] - DEPRECATED: Legacy row-level security rules per role. Use rlsRules.
 * @property {RLSRule[]} [rlsRules] - Row-level security rules array (ADR-011). Preferred over rlsPolicy.
 * @property {RLSFilterConfig} [rlsFilterConfig] - Custom RLS filter configuration
 * @property {EntityPermissions} [entityPermissions] - Entity-level CRUD overrides
 * @property {Object.<string, FieldAccessConfig>} [fieldAccess] - Per-field CRUD access levels
 *
 * @property {Object.<string, FieldDefinition>} [fields] - Field definitions with types/validation
 *   FK fields use type: 'foreignKey' with references, displayField, displayFields, displayTemplate
 * @property {Object.<string, EnumDefinition>} [enums] - Enum definitions with labels/colors
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
 *
 * @property {boolean} [isJunction] - Whether this entity is a junction table for M:M
 * @property {JunctionConfig} [junctionFor] - Junction entity configuration (required if isJunction=true)
 * @property {UniqueConstraint[]} [uniqueConstraints] - Composite unique constraints (common in junctions)
 *
 * @property {SummaryConfig} summaryConfig - REQUIRED: Summary endpoint configuration (null if not summarizable)
 */

// Export empty object - this file is for types only
module.exports = {};
