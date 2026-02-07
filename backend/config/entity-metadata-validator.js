/**
 * Entity Metadata Validator
 *
 * SRP: Validate all entity metadata at load time.
 * FAIL FAST: Catch configuration errors before runtime.
 *
 * SYSTEMIC SOLUTION: Instead of discovering issues during tests,
 * this validator ensures all metadata is complete and consistent
 * BEFORE any code uses it.
 *
 * Run at application startup and test suite initialization.
 */

const { getRoleHierarchy } = require("./role-hierarchy-loader");

/**
 * All supported field types that the data generator can handle.
 * If a field uses a type not in this list, validation fails.
 */
const SUPPORTED_FIELD_TYPES = new Set([
  "string",
  "text",
  "integer",
  "number",
  "decimal",
  "currency",
  "boolean",
  "date",
  "timestamp",
  "uuid",
  "email",
  "enum",
  "foreignKey",
  "json",
  "jsonb", // PostgreSQL JSONB type
  "array",
  "phone", // Phone number type (stored as string)
]);

/**
 * Get valid access values for fieldAccess CRUD operations.
 * 'none' means no access, 'system' means backend-only.
 * Role names grant access to that role and above.
 * Dynamically built from role hierarchy (supports DB SSOT).
 */
function getValidAccessValues() {
  const roleHierarchy = getRoleHierarchy();
  return new Set(["none", "system", ...roleHierarchy]);
}

/**
 * Get valid values for entityPermissions operations.
 * null means disabled (e.g., create: null = no API create)
 * 'none' means no role can perform the operation
 * Role names grant minimum role access
 * Dynamically built from role hierarchy (supports DB SSOT).
 */
function getValidEntityPermissionValues() {
  const roleHierarchy = getRoleHierarchy();
  return new Set([null, "none", ...roleHierarchy]);
}

/**
 * Validation error collector
 */
class ValidationErrors {
  constructor(entityName) {
    this.entityName = entityName;
    this.errors = [];
  }

  add(field, message) {
    this.errors.push({ field, message });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  toString() {
    return this.errors.map((e) => `  - ${e.field}: ${e.message}`).join("\n");
  }
}

/**
 * Validate field type is supported by data generator
 */
function validateFieldTypes(meta, errors) {
  const fields = meta.fields || {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (!fieldDef.type) {
      errors.add(`fields.${fieldName}`, "Missing type property");
      continue;
    }

    if (!SUPPORTED_FIELD_TYPES.has(fieldDef.type)) {
      errors.add(
        `fields.${fieldName}`,
        `Unsupported type '${fieldDef.type}'. Supported: ${[...SUPPORTED_FIELD_TYPES].join(", ")}`,
      );
    }

    // Enum fields must have values defined (either in field or in enums)
    if (fieldDef.type === "enum") {
      const enumValues = fieldDef.values || meta.enums?.[fieldName]?.values;
      if (!enumValues || !enumValues.length) {
        errors.add(
          `fields.${fieldName}`,
          "Enum field must have values defined in field.values or enums.[fieldName].values",
        );
      }
    }
  }
}

/**
 * Validate fieldAccess uses valid access levels
 */
function validateFieldAccess(meta, errors) {
  const fieldAccess = meta.fieldAccess || {};

  for (const [fieldName, access] of Object.entries(fieldAccess)) {
    // Check if it's a reference to a FAL constant (has all CRUD keys)
    const isFullObject =
      access &&
      typeof access === "object" &&
      ["create", "read", "update", "delete"].some((op) => op in access);

    if (!isFullObject) {
      errors.add(
        `fieldAccess.${fieldName}`,
        "Must be an object with create/read/update/delete keys or a FIELD_ACCESS_LEVELS constant",
      );
      continue;
    }

    // SYSTEMIC CHECK: Warn if 'id' field has read: 'none'
    // This breaks API responses because id won't be included in output
    // The id field should inherit from UNIVERSAL_FIELD_ACCESS (PUBLIC_READONLY)
    if (fieldName === "id" && access.read === "none") {
      errors.add(
        "fieldAccess.id",
        "CRITICAL: id field has read: 'none' which breaks API responses. " +
          "Remove id from fieldAccess to inherit PUBLIC_READONLY from UNIVERSAL_FIELD_ACCESS, " +
          "or explicitly set read: 'customer' so all roles can see the id.",
      );
    }

    // Validate each CRUD operation value
    for (const op of ["create", "read", "update", "delete"]) {
      const value = access[op];
      if (value === undefined) {
        continue; // Optional
      }

      const validAccessValues = getValidAccessValues();
      if (!validAccessValues.has(value)) {
        errors.add(
          `fieldAccess.${fieldName}.${op}`,
          `Invalid value '${value}'. Valid: ${[...validAccessValues].join(", ")}`,
        );
      }
    }
  }
}

/**
 * Validate entityPermissions uses valid values
 */
function validateEntityPermissions(meta, errors) {
  const perms = meta.entityPermissions;
  if (!perms) {
    return; // Optional
  }

  for (const op of ["create", "read", "update", "delete"]) {
    const value = perms[op];
    if (value === undefined) {
      continue; // Optional
    }

    const validEntityPermissionValues = getValidEntityPermissionValues();
    if (!validEntityPermissionValues.has(value)) {
      errors.add(
        `entityPermissions.${op}`,
        `Invalid value '${value}'. Valid: null (disabled), 'none', or role name`,
      );
    }
  }
}

/**
 * Validate required fields exist in fields definition
 */
function validateRequiredFields(meta, errors) {
  const requiredFields = meta.requiredFields || [];
  const fieldDefs = meta.fields || {};
  const fkFields = Object.keys(meta.foreignKeys || {});

  for (const field of requiredFields) {
    // FK fields are valid even if not in fields definition
    if (fkFields.includes(field)) {
      continue;
    }

    if (!fieldDefs[field]) {
      errors.add(
        "requiredFields",
        `Required field '${field}' not defined in fields`,
      );
    }
  }
}

/**
 * Validate foreign keys reference valid entities
 */
function validateForeignKeys(meta, errors, allMetadata) {
  const foreignKeys = meta.foreignKeys || {};
  const allTables = new Set(Object.values(allMetadata).map((m) => m.tableName));

  for (const [fkField, fkDef] of Object.entries(foreignKeys)) {
    if (!fkDef.table) {
      errors.add(`foreignKeys.${fkField}`, "Missing table property");
      continue;
    }

    if (!allTables.has(fkDef.table)) {
      errors.add(
        `foreignKeys.${fkField}`,
        `References unknown table '${fkDef.table}'`,
      );
    }
  }
}

/**
 * Validate RLS policy uses valid values
 */
function validateRlsPolicy(meta, errors) {
  const rlsPolicy = meta.rlsPolicy;
  if (!rlsPolicy) {
    return; // Optional
  }

  // All valid RLS policy values used in the codebase
  const validPolicies = new Set([
    // Core patterns
    "all", // Full access to all records
    "all_records", // Same as 'all' (legacy/verbose)
    "own_record_only", // Can only access own records (by user_id)
    "own_or_assigned", // Own records or assigned to them
    "none", // No access
    "deny_all", // No access (legacy/verbose)

    // Entity-specific patterns
    "own_work_orders_only", // Customer sees their work orders
    "assigned_work_orders_only", // Technician sees assigned work orders
    "own_contracts_only", // Customer sees their contracts
    "own_invoices_only", // Customer sees their invoices

    // Resource patterns
    "public_resource", // Readable by all authenticated users
    "parent_entity_access", // Access based on parent entity permissions
  ]);

  const validAccessValues = getValidAccessValues();
  for (const [role, policy] of Object.entries(rlsPolicy)) {
    if (!validAccessValues.has(role) && role !== "all_roles") {
      errors.add(`rlsPolicy.${role}`, `Unknown role '${role}'`);
    }

    if (!validPolicies.has(policy)) {
      errors.add(
        `rlsPolicy.${role}`,
        `Invalid policy '${policy}'. Valid: ${[...validPolicies].join(", ")}`,
      );
    }
  }
}

/**
 * Validate UI display properties
 * These are required for frontend rendering (navigation, headers, etc.)
 */
function validateDisplayProperties(meta, errors) {
  // icon is required for navigation menus and entity displays
  // Uses Material Icons naming (e.g., 'people', 'work', 'notifications')
  if (!meta.icon) {
    errors.add(
      "icon",
      "Required property missing. Use Material Icons name (e.g., 'people', 'work')",
    );
  } else if (typeof meta.icon !== "string") {
    errors.add("icon", "Must be a string (Material Icons name)");
  }
}

/**
 * Validate supportsFileAttachments property
 * REQUIRED: Every entity must explicitly declare whether it supports file attachments.
 * This ensures intentional decisions and powers metadata-driven file attachment UI.
 *
 * Valid values:
 * - true: Entity supports file attachments (shows file UI on detail page)
 * - false: Entity does not support file attachments
 */
function validateSupportsFileAttachments(meta, errors) {
  if (!("supportsFileAttachments" in meta)) {
    errors.add(
      "supportsFileAttachments",
      "REQUIRED: Every entity must declare supportsFileAttachments (true or false). " +
        "This powers the metadata-driven file attachment system.",
    );
    return;
  }

  const value = meta.supportsFileAttachments;
  if (typeof value !== "boolean") {
    errors.add(
      "supportsFileAttachments",
      `Must be a boolean (true or false), got '${typeof value}'`,
    );
  }
}

/**
 * Validate navVisibility property
 * REQUIRED: Every entity must explicitly declare its navigation visibility.
 * This ensures intentional decisions about which entities appear in nav menus.
 *
 * Valid values:
 * - null: Entity is not shown in navigation (system tables, child tables)
 * - Role name: Minimum role required to see entity in nav (e.g., 'admin', 'dispatcher')
 */
function validateNavVisibility(meta, errors) {
  // navVisibility is REQUIRED - every entity must explicitly declare it
  if (!("navVisibility" in meta)) {
    errors.add(
      "navVisibility",
      "REQUIRED: Every entity must declare navVisibility. " +
        "Use null for system/child tables (not in nav), or a role name (e.g., 'customer', 'admin') " +
        "for the minimum role that can see this entity in navigation menus.",
    );
    return;
  }

  const value = meta.navVisibility;

  // null is valid (entity not shown in nav)
  if (value === null) {
    return;
  }

  // Must be a valid role name
  const validRoles = getValidEntityPermissionValues();
  if (!validRoles.has(value)) {
    errors.add(
      "navVisibility",
      `Invalid value '${value}'. Valid: null (not in nav), or role name: ${[...getRoleHierarchy()].join(", ")}`,
    );
  }
}

/**
 * Validate a single entity's metadata
 */
function validateEntity(entityName, meta, allMetadata) {
  const errors = new ValidationErrors(entityName);

  // Required top-level properties
  if (!meta.entityKey) {
    errors.add(
      "entityKey",
      "Required property missing - must be explicit in metadata",
    );
  } else if (meta.entityKey !== entityName) {
    errors.add(
      "entityKey",
      `entityKey '${meta.entityKey}' does not match registry key '${entityName}'`,
    );
  }

  if (!meta.tableName) {
    errors.add("tableName", "Required property missing");
  }

  if (!meta.primaryKey) {
    errors.add("primaryKey", "Required property missing");
  }

  // Run all validators
  validateDisplayProperties(meta, errors);
  validateNavVisibility(meta, errors);
  validateSupportsFileAttachments(meta, errors);
  validateFieldTypes(meta, errors);
  validateFieldAccess(meta, errors);
  validateEntityPermissions(meta, errors);
  validateRequiredFields(meta, errors);
  validateForeignKeys(meta, errors, allMetadata);
  validateRlsPolicy(meta, errors);

  return errors;
}

/**
 * Validate all entity metadata
 *
 * @param {Object} allMetadata - Map of entityName → metadata
 * @param {Object} options - Validation options
 * @param {boolean} options.throwOnError - Throw error if validation fails (default: true)
 * @returns {Object} Validation result { valid: boolean, errors: { entityName: [...] } }
 */
function validateAllMetadata(allMetadata, options = {}) {
  const { throwOnError = true } = options;
  const allErrors = {};
  let hasErrors = false;

  for (const [entityName, meta] of Object.entries(allMetadata)) {
    const errors = validateEntity(entityName, meta, allMetadata);
    if (errors.hasErrors()) {
      allErrors[entityName] = errors;
      hasErrors = true;
    }
  }

  if (hasErrors && throwOnError) {
    const errorMessages = Object.entries(allErrors)
      .map(([name, errors]) => `\n${name}:\n${errors.toString()}`)
      .join("\n");

    throw new Error(`Entity metadata validation failed:${errorMessages}`);
  }

  return { valid: !hasErrors, errors: allErrors };
}

/**
 * Derive entity capabilities from metadata
 * SINGLE SOURCE OF TRUTH for what operations an entity supports
 *
 * @param {Object} meta - Entity metadata
 * @returns {Object} Capabilities object
 */
function deriveCapabilities(meta) {
  const entityPerms = meta.entityPermissions || {};

  return {
    // API operation availability
    canCreate: entityPerms.create !== null && entityPerms.create !== "none",
    canRead: entityPerms.read !== null && entityPerms.read !== "none",
    canUpdate: entityPerms.update !== null && entityPerms.update !== "none",
    canDelete: entityPerms.delete !== null && entityPerms.delete !== "none",

    // Create disabled means system-only creation (e.g., notifications)
    isCreateDisabled: entityPerms.create === null,

    // RLS patterns
    isOwnRecordOnly: Object.values(meta.rlsPolicy || {}).some((p) => {
      return p === "own_record_only";
    }),
    hasRls: !!meta.rlsPolicy && Object.keys(meta.rlsPolicy).length > 0,

    // Routing
    usesGenericRouter: meta.routeConfig?.useGenericRouter === true,

    // Get minimum role for an operation
    getMinimumRole(operation) {
      const perm = entityPerms[operation];
      if (perm === null || perm === "none") {
        return null;
      }
      return perm || "customer"; // Default to customer if not specified
    },

    // Field-level checks
    hasSearchableFields: (meta.searchableFields || []).length > 0,
    hasSortableFields: (meta.sortableFields || []).length > 0,
    hasFilterableFields: (meta.filterableFields || []).length > 0,
  };
}

module.exports = {
  // Core validation
  validateAllMetadata,
  validateEntity,

  // Capabilities derivation
  deriveCapabilities,

  // Constants for reference
  SUPPORTED_FIELD_TYPES,
  getValidAccessValues,
  getValidEntityPermissionValues,
};
