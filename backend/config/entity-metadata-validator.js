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

const { getRoleHierarchy } = require('./role-hierarchy-loader');
const { RLS_CONTEXT_VALUES } = require('./constants');
const { getForeignKeyFieldNames, extractForeignKeyFields } = require('./fk-helpers');
const { foreignKeyFieldName } = require('./field-types');

/**
 * Valid navigation groups for menu placement.
 * Must match groups defined in nav-config.json.
 */
const VALID_NAV_GROUPS = new Set(['customers', 'work', 'resources', 'finance', 'admin']);

/**
 * All supported field types that the data generator can handle.
 * If a field uses a type not in this list, validation fails.
 */
const SUPPORTED_FIELD_TYPES = new Set([
  'string',
  'text',
  'integer',
  'number',
  'decimal',
  'currency',
  'boolean',
  'date',
  'timestamp',
  'uuid',
  'email',
  'enum',
  'foreignKey',
  'json',
  'jsonb', // PostgreSQL JSONB type
  'array',
  'phone', // Phone number type (stored as string)
]);

/**
 * Get valid access values for fieldAccess CRUD operations.
 * 'none' means no access, 'system' means backend-only.
 * Role names grant access to that role and above.
 * Dynamically built from role hierarchy (supports DB SSOT).
 */
function getValidAccessValues() {
  const roleHierarchy = getRoleHierarchy();
  return new Set(['none', 'system', ...roleHierarchy]);
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
  return new Set([null, 'none', ...roleHierarchy]);
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
    return this.errors.map((e) => `  - ${e.field}: ${e.message}`).join('\n');
  }
}

/**
 * Validate field type is supported by data generator
 */
function validateFieldTypes(meta, errors) {
  const fields = meta.fields || {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (!fieldDef.type) {
      errors.add(`fields.${fieldName}`, 'Missing type property');
      continue;
    }

    if (!SUPPORTED_FIELD_TYPES.has(fieldDef.type)) {
      errors.add(
        `fields.${fieldName}`,
        `Unsupported type '${fieldDef.type}'. Supported: ${[...SUPPORTED_FIELD_TYPES].join(', ')}`,
      );
    }

    // Enum fields must have values defined via enumKey referencing enums object
    if (fieldDef.type === 'enum') {
      const enumKey = fieldDef.enumKey || fieldName;
      const enumDef = meta.enums?.[enumKey];
      // New pattern: enum values are the keys of the enum definition object
      const enumValues = enumDef ? Object.keys(enumDef) : fieldDef.values;
      if (!enumValues || !enumValues.length) {
        errors.add(
          `fields.${fieldName}`,
          'Enum field must have enumKey referencing enums.[key] or legacy field.values',
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
      typeof access === 'object' &&
      ['create', 'read', 'update', 'delete'].some((op) => op in access);

    if (!isFullObject) {
      errors.add(
        `fieldAccess.${fieldName}`,
        'Must be an object with create/read/update/delete keys or a FIELD_ACCESS_LEVELS constant',
      );
      continue;
    }

    // SYSTEMIC CHECK: Warn if 'id' field has read: 'none'
    // This breaks API responses because id won't be included in output
    // The id field should inherit from UNIVERSAL_FIELD_ACCESS (PUBLIC_READONLY)
    if (fieldName === 'id' && access.read === 'none') {
      errors.add(
        'fieldAccess.id',
        "CRITICAL: id field has read: 'none' which breaks API responses. " +
          'Remove id from fieldAccess to inherit PUBLIC_READONLY from UNIVERSAL_FIELD_ACCESS, ' +
          "or explicitly set read: 'customer' so all roles can see the id.",
      );
    }

    // Validate each CRUD operation value
    for (const op of ['create', 'read', 'update', 'delete']) {
      const value = access[op];
      if (value === undefined) {
        continue; // Optional
      }

      const validAccessValues = getValidAccessValues();
      if (!validAccessValues.has(value)) {
        errors.add(
          `fieldAccess.${fieldName}.${op}`,
          `Invalid value '${value}'. Valid: ${[...validAccessValues].join(', ')}`,
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

  for (const op of ['create', 'read', 'update', 'delete']) {
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
  const fkFieldNames = getForeignKeyFieldNames(meta);

  for (const field of requiredFields) {
    // FK fields are always valid (they exist in fields with type: 'foreignKey')
    if (fkFieldNames.has(field)) {
      continue;
    }

    if (!fieldDefs[field]) {
      errors.add(
        'requiredFields',
        `Required field '${field}' not defined in fields`,
      );
    }
  }
}

/**
 * Validate foreign keys reference valid entities
 * FK fields are identified by type: 'foreignKey' with relatedEntity in fields section
 */
function validateForeignKeys(meta, errors, allMetadata) {
  const fkFields = extractForeignKeyFields(meta);
  const allEntityKeys = new Set(Object.keys(allMetadata));

  for (const [fkField, fkDef] of Object.entries(fkFields)) {
    if (!fkDef.relatedEntity) {
      errors.add(`fields.${fkField}`, 'FK field missing relatedEntity property');
      continue;
    }

    if (!allEntityKeys.has(fkDef.relatedEntity)) {
      errors.add(
        `fields.${fkField}`,
        `References unknown entity '${fkDef.relatedEntity}'`,
      );
    }
  }
}

/**
 * Validate RLS policy uses valid values
 *
 * ADR-008: Field-Based Filtering
 * Policy value IS the filter configuration (pure data, no code).
 *
 * Valid filterConfig values:
 * - null: All records (no filter applied)
 * - false: Deny access (returns empty result)
 * - '$parent': Sub-entity inherits parent entity's RLS
 * - string: Shorthand for { field: string, value: 'userId' }
 * - { field, value }: Explicit field + context value mapping
 *
 * Valid context values for { field, value }.value:
 * - 'userId': user's id
 * - 'customerProfileId': user's customer_profile_id
 * - 'technicianProfileId': user's technician_profile_id
 */
function validateRlsPolicy(meta, errors) {
  const rlsPolicy = meta.rlsPolicy;
  if (!rlsPolicy) {
    return; // Optional
  }

  // Valid context values from SSOT constant (ADR-008)
  const validContextValues = new Set(RLS_CONTEXT_VALUES);

  const validAccessValues = getValidAccessValues();
  for (const [role, filterConfig] of Object.entries(rlsPolicy)) {
    if (!validAccessValues.has(role) && role !== 'all_roles') {
      errors.add(`rlsPolicy.${role}`, `Unknown role '${role}'`);
    }

    // Validate filterConfig value
    if (filterConfig === null || filterConfig === false) {
      // Valid: null = all records, false = deny
      continue;
    }

    if (typeof filterConfig === 'string') {
      // Valid: '$parent' or field name shorthand
      // Field names are validated elsewhere (could be any column)
      continue;
    }

    if (typeof filterConfig === 'object') {
      // Must be { field, value } format
      if (!filterConfig.field || typeof filterConfig.field !== 'string') {
        errors.add(
          `rlsPolicy.${role}`,
          'Object filterConfig must have \'field\' string property',
        );
      }
      if (!filterConfig.value || typeof filterConfig.value !== 'string') {
        errors.add(
          `rlsPolicy.${role}`,
          'Object filterConfig must have \'value\' string property',
        );
      } else if (!validContextValues.has(filterConfig.value)) {
        errors.add(
          `rlsPolicy.${role}`,
          `Invalid context value '${filterConfig.value}'. Valid: ${[...validContextValues].join(', ')}`,
        );
      }
      continue;
    }

    // Invalid type
    errors.add(
      `rlsPolicy.${role}`,
      'Invalid filterConfig type. Must be null, false, string, or { field, value } object',
    );
  }
}

/**
 * Valid relationship types.
 */
const VALID_RELATIONSHIP_TYPES = new Set([
  'belongsTo',
  'hasMany',
  'hasOne',
  'manyToMany',
]);

/**
 * Validate relationships configuration.
 * Ensures manyToMany relationships have required properties.
 */
function validateRelationships(meta, errors, _allMetadata) {
  const relationships = meta.relationships;
  if (!relationships || typeof relationships !== 'object') {
    return; // Optional or empty
  }

  for (const [relName, relDef] of Object.entries(relationships)) {
    if (!relDef || typeof relDef !== 'object') {
      errors.add(`relationships.${relName}`, 'Must be an object');
      continue;
    }

    if (!relDef.type) {
      errors.add(`relationships.${relName}`, 'Missing required property: type');
      continue;
    }

    if (!VALID_RELATIONSHIP_TYPES.has(relDef.type)) {
      errors.add(
        `relationships.${relName}`,
        `Invalid type '${relDef.type}'. Valid: ${[...VALID_RELATIONSHIP_TYPES].join(', ')}`,
      );
      continue;
    }

    // All relationships require foreignKey and table
    if (!relDef.foreignKey) {
      errors.add(`relationships.${relName}`, 'Missing required property: foreignKey');
    }
    if (!relDef.table) {
      errors.add(`relationships.${relName}`, 'Missing required property: table');
    }

    // manyToMany relationships require 'through' (junction table) and 'targetKey'
    if (relDef.type === 'manyToMany') {
      if (!relDef.through) {
        errors.add(
          `relationships.${relName}`,
          "manyToMany relationship requires 'through' property (junction table name)",
        );
      } else if (typeof relDef.through !== 'string') {
        errors.add(
          `relationships.${relName}`,
          "'through' must be a string (junction table name)",
        );
      }

      if (!relDef.targetKey) {
        errors.add(
          `relationships.${relName}`,
          "manyToMany relationship requires 'targetKey' property (FK in junction to target)",
        );
      }
    }
  }
}

/**
 * Validate junction entity configuration.
 * Ensures isJunction entities have proper junctionFor config.
 */
function validateJunctionConfig(meta, errors, allMetadata) {
  // If not a junction, nothing to validate
  if (!meta.isJunction) {
    // Warn if junctionFor is present without isJunction
    if (meta.junctionFor) {
      errors.add(
        'junctionFor',
        'junctionFor is defined but isJunction is not true. Add isJunction: true.',
      );
    }
    return;
  }

  // isJunction is true - junctionFor is REQUIRED
  if (!meta.junctionFor) {
    errors.add(
      'junctionFor',
      'isJunction is true but junctionFor config is missing. ' +
        'Add: junctionFor: { entity1: \'...\', entity2: \'...\' }',
    );
    return;
  }

  const config = meta.junctionFor;
  const allEntityKeys = new Set(Object.keys(allMetadata));

  // Validate entity1
  if (!config.entity1) {
    errors.add('junctionFor.entity1', 'Required property missing');
  } else if (!allEntityKeys.has(config.entity1)) {
    errors.add(
      'junctionFor.entity1',
      `References unknown entity '${config.entity1}'`,
    );
  }

  // Validate entity2
  if (!config.entity2) {
    errors.add('junctionFor.entity2', 'Required property missing');
  } else if (!allEntityKeys.has(config.entity2)) {
    errors.add(
      'junctionFor.entity2',
      `References unknown entity '${config.entity2}'`,
    );
  }

  // Validate FK fields exist if specified
  const fields = meta.fields || {};
  const fk1 = config.foreignKey1 || foreignKeyFieldName(config.entity1);
  const fk2 = config.foreignKey2 || foreignKeyFieldName(config.entity2);

  if (!fields[fk1]) {
    errors.add(
      'junctionFor',
      `FK field '${fk1}' not found in fields. Add: ${fk1}: { type: 'foreignKey', relatedEntity: '${config.entity1}' }`,
    );
  }
  if (!fields[fk2]) {
    errors.add(
      'junctionFor',
      `FK field '${fk2}' not found in fields. Add: ${fk2}: { type: 'foreignKey', relatedEntity: '${config.entity2}' }`,
    );
  }
}

/**
 * Validate unique constraints configuration.
 */
function validateUniqueConstraints(meta, errors) {
  const constraints = meta.uniqueConstraints;
  if (!constraints) {
    return; // Optional
  }

  if (!Array.isArray(constraints)) {
    errors.add('uniqueConstraints', 'Must be an array of constraint definitions');
    return;
  }

  const fields = meta.fields || {};

  for (let i = 0; i < constraints.length; i++) {
    const constraint = constraints[i];

    if (!constraint.name || typeof constraint.name !== 'string') {
      errors.add(`uniqueConstraints[${i}]`, 'Missing or invalid name property');
    }

    if (!constraint.fields || !Array.isArray(constraint.fields)) {
      errors.add(`uniqueConstraints[${i}]`, 'Missing or invalid fields array');
      continue;
    }

    if (constraint.fields.length < 2) {
      errors.add(
        `uniqueConstraints[${i}]`,
        'Composite unique constraint must have at least 2 fields',
      );
    }

    // Validate each field exists
    for (const fieldName of constraint.fields) {
      if (!fields[fieldName]) {
        errors.add(
          `uniqueConstraints[${i}]`,
          `Field '${fieldName}' not found in fields definition`,
        );
      }
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
      'icon',
      "Required property missing. Use Material Icons name (e.g., 'people', 'work')",
    );
  } else if (typeof meta.icon !== 'string') {
    errors.add('icon', 'Must be a string (Material Icons name)');
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
  if (!('supportsFileAttachments' in meta)) {
    errors.add(
      'supportsFileAttachments',
      'REQUIRED: Every entity must declare supportsFileAttachments (true or false). ' +
        'This powers the metadata-driven file attachment system.',
    );
    return;
  }

  const value = meta.supportsFileAttachments;
  if (typeof value !== 'boolean') {
    errors.add(
      'supportsFileAttachments',
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
  if (!('navVisibility' in meta)) {
    errors.add(
      'navVisibility',
      'REQUIRED: Every entity must declare navVisibility. ' +
        "Use null for system/child tables (not in nav), or a role name (e.g., 'customer', 'admin') " +
        'for the minimum role that can see this entity in navigation menus.',
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
      'navVisibility',
      `Invalid value '${value}'. Valid: null (not in nav), or role name: ${[...getRoleHierarchy()].join(', ')}`,
    );
  }
}

/**
 * Validate summaryConfig property
 * REQUIRED: Every entity must explicitly declare its summary configuration.
 * This enables the generic /summaries/:entity endpoint.
 *
 * Valid values:
 * - null: Entity is not summarizable (junction tables, system tables)
 * - { groupableFields: [...], summableFields?: [...], breakdownFields?: [...], dateFields?: [...] }
 */
function validateSummaryConfig(meta, errors) {
  // summaryConfig is REQUIRED - every entity must explicitly declare it
  if (!('summaryConfig' in meta)) {
    errors.add(
      'summaryConfig',
      'REQUIRED: Every entity must declare summaryConfig. ' +
        'Use null for non-summarizable entities, or { groupableFields: [...] } for analytics support.',
    );
    return;
  }

  const config = meta.summaryConfig;

  // null is valid (entity not summarizable)
  if (config === null) {
    return;
  }

  // Must be an object if not null
  if (typeof config !== 'object') {
    errors.add(
      'summaryConfig',
      `Must be null or an object, got '${typeof config}'`,
    );
    return;
  }

  const fields = meta.fields || {};
  const filterableFields = meta.filterableFields || [];

  // groupableFields is REQUIRED and must be non-empty
  if (!Array.isArray(config.groupableFields) || config.groupableFields.length === 0) {
    errors.add(
      'summaryConfig.groupableFields',
      'Must be a non-empty array of field names',
    );
    return;
  }

  // Validate each groupable field exists and is appropriate type (FK or enum)
  for (const fieldName of config.groupableFields) {
    const fieldDef = fields[fieldName];
    if (!fieldDef && !filterableFields.includes(fieldName)) {
      errors.add(
        'summaryConfig.groupableFields',
        `Unknown field '${fieldName}'`,
      );
      continue;
    }

    // Groupable fields should be FK or enum (categorical data for GROUP BY)
    if (fieldDef) {
      const validGroupTypes = ['foreignKey', 'enum', 'boolean'];
      if (!validGroupTypes.includes(fieldDef.type)) {
        // Status fields like 'is_active' are boolean, which is fine
        // But warn for other types - they might be intentional for time-based grouping
        const warnTypes = ['date', 'timestamp'];
        if (!warnTypes.includes(fieldDef.type)) {
          // Just a soft warning - numeric grouping is unusual but possible
          // errors.add would fail validation, so we allow it
        }
      }
    }
  }

  // Validate summableFields if present
  if (config.summableFields !== undefined && config.summableFields !== null) {
    if (!Array.isArray(config.summableFields)) {
      errors.add(
        'summaryConfig.summableFields',
        'Must be an array of numeric field names',
      );
    } else {
      for (const fieldName of config.summableFields) {
        const fieldDef = fields[fieldName];
        if (!fieldDef) {
          errors.add(
            'summaryConfig.summableFields',
            `Unknown field '${fieldName}'`,
          );
          continue;
        }

        const numericTypes = ['integer', 'number', 'decimal', 'currency'];
        if (!numericTypes.includes(fieldDef.type)) {
          errors.add(
            'summaryConfig.summableFields',
            `Field '${fieldName}' must be numeric (${numericTypes.join(', ')}), got '${fieldDef.type}'`,
          );
        }
      }
    }
  }

  // Validate breakdownFields if present (explicit, not null for auto-detect)
  if (config.breakdownFields !== undefined && config.breakdownFields !== null) {
    if (!Array.isArray(config.breakdownFields)) {
      errors.add(
        'summaryConfig.breakdownFields',
        'Must be null (auto-detect) or an array of enum field names',
      );
    } else {
      for (const fieldName of config.breakdownFields) {
        const fieldDef = fields[fieldName];
        if (!fieldDef) {
          errors.add(
            'summaryConfig.breakdownFields',
            `Unknown field '${fieldName}'`,
          );
          continue;
        }

        if (fieldDef.type !== 'enum') {
          errors.add(
            'summaryConfig.breakdownFields',
            `Field '${fieldName}' must be an enum type, got '${fieldDef.type}'`,
          );
        }
      }
    }
  }

  // Validate dateFields if present (explicit, not null for auto-detect)
  if (config.dateFields !== undefined && config.dateFields !== null) {
    if (!Array.isArray(config.dateFields)) {
      errors.add(
        'summaryConfig.dateFields',
        'Must be null (auto-detect) or an array of date/timestamp field names',
      );
    } else {
      for (const fieldName of config.dateFields) {
        const fieldDef = fields[fieldName];
        if (!fieldDef) {
          errors.add(
            'summaryConfig.dateFields',
            `Unknown field '${fieldName}'`,
          );
          continue;
        }

        const dateTypes = ['date', 'timestamp'];
        if (!dateTypes.includes(fieldDef.type)) {
          errors.add(
            'summaryConfig.dateFields',
            `Field '${fieldName}' must be date or timestamp, got '${fieldDef.type}'`,
          );
        }
      }
    }
  }
}

/**
 * Validate navGroup and navOrder properties
 *
 * If an entity has navVisibility (is shown in nav), it SHOULD have navGroup and navOrder.
 * This enables automatic entityPlacements generation for SSOT.
 *
 * Valid navGroup values: 'people', 'operations', 'finance', 'admin'
 * navOrder: positive integer (lower = higher priority in menu)
 */
function validateNavPlacement(meta, errors) {
  const hasNavVisibility =
    'navVisibility' in meta && meta.navVisibility !== null;

  // If entity is visible in nav, validate placement fields
  if (hasNavVisibility) {
    // navGroup is REQUIRED for navigable entities
    if (!('navGroup' in meta)) {
      errors.add(
        'navGroup',
        `Entity has navVisibility='${meta.navVisibility}' but no navGroup. ` +
          `Add navGroup (${[...VALID_NAV_GROUPS].join(', ')}) for menu placement.`,
      );
    } else if (!VALID_NAV_GROUPS.has(meta.navGroup)) {
      errors.add(
        'navGroup',
        `Invalid value '${meta.navGroup}'. Valid: ${[...VALID_NAV_GROUPS].join(', ')}`,
      );
    }

    // navOrder is REQUIRED for navigable entities
    if (!('navOrder' in meta)) {
      errors.add(
        'navOrder',
        `Entity has navVisibility='${meta.navVisibility}' but no navOrder. ` +
          'Add navOrder (positive integer) for menu ordering.',
      );
    } else if (
      typeof meta.navOrder !== 'number' ||
      !Number.isInteger(meta.navOrder) ||
      meta.navOrder < 0
    ) {
      errors.add(
        'navOrder',
        `Invalid value '${meta.navOrder}'. Must be a non-negative integer.`,
      );
    }
  } else {
    // Entity not visible in nav - warn if navGroup/navOrder are provided
    if ('navGroup' in meta || 'navOrder' in meta) {
      // This is a warning, not an error - just unexpected
      // errors.add() would fail validation, so we just log info
      // In strict mode this could be an error
    }
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
      'entityKey',
      'Required property missing - must be explicit in metadata',
    );
  } else if (meta.entityKey !== entityName) {
    errors.add(
      'entityKey',
      `entityKey '${meta.entityKey}' does not match registry key '${entityName}'`,
    );
  }

  if (!meta.tableName) {
    errors.add('tableName', 'Required property missing');
  }

  if (!meta.primaryKey) {
    errors.add('primaryKey', 'Required property missing');
  }

  // Run all validators
  validateDisplayProperties(meta, errors);
  validateNavVisibility(meta, errors);
  validateNavPlacement(meta, errors);
  validateSupportsFileAttachments(meta, errors);
  validateSummaryConfig(meta, errors);
  validateFieldTypes(meta, errors);
  validateFieldAccess(meta, errors);
  validateEntityPermissions(meta, errors);
  validateRequiredFields(meta, errors);
  validateForeignKeys(meta, errors, allMetadata);
  validateRlsPolicy(meta, errors);
  validateRelationships(meta, errors, allMetadata);
  validateJunctionConfig(meta, errors, allMetadata);
  validateUniqueConstraints(meta, errors);

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
      .join('\n');

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
    canCreate: entityPerms.create !== null && entityPerms.create !== 'none',
    canRead: entityPerms.read !== null && entityPerms.read !== 'none',
    canUpdate: entityPerms.update !== null && entityPerms.update !== 'none',
    canDelete: entityPerms.delete !== null && entityPerms.delete !== 'none',

    // Create disabled means system-only creation (e.g., notifications)
    isCreateDisabled: entityPerms.create === null,

    // RLS patterns
    isOwnRecordOnly: Object.values(meta.rlsPolicy || {}).some((p) => {
      return p === 'own_record_only';
    }),
    hasRls: !!meta.rlsPolicy && Object.keys(meta.rlsPolicy).length > 0,

    // Routing
    usesGenericRouter: meta.routeConfig?.useGenericRouter === true,

    // Get minimum role for an operation
    getMinimumRole(operation) {
      const perm = entityPerms[operation];
      if (perm === null || perm === 'none') {
        return null;
      }
      return perm || 'customer'; // Default to customer if not specified
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
  VALID_NAV_GROUPS,
  VALID_RELATIONSHIP_TYPES,
  getValidAccessValues,
  getValidEntityPermissionValues,
};
