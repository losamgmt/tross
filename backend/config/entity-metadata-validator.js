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
const { RLS_ENGINE } = require('./constants');
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
 * Check if a context value key follows naming conventions
 *
 * Convention-based validation (schema-driven, no hardcoded list):
 * - 'userId' - the user's ID (always valid)
 * - '*_profile_id' - any profile foreign key from users table
 *
 * Adding a new profile type (e.g., vendor_profile_id) requires
 * only a DB migration — NO code changes here.
 *
 * @param {string} value - Context value key to validate
 * @returns {boolean}
 */
function isValidContextValue(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return value === 'userId' || value.endsWith('_profile_id');
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
 * FK fields are identified by type: 'foreignKey' with references in fields section
 */
function validateForeignKeys(meta, errors, allMetadata) {
  const fkFields = extractForeignKeyFields(meta);
  const allEntityKeys = new Set(Object.keys(allMetadata));

  for (const [fkField, fkDef] of Object.entries(fkFields)) {
    if (!fkDef.references) {
      errors.add(`fields.${fkField}`, 'FK field missing references property');
      continue;
    }

    if (!allEntityKeys.has(fkDef.references)) {
      errors.add(
        `fields.${fkField}`,
        `References unknown entity '${fkDef.references}'`,
      );
    }
  }
}

/**
 * Validate RLS policy uses valid values
 *
 * ADR-008: Field-Based Filtering (LEGACY - being replaced by rlsRules)
 * Policy value IS the filter configuration (pure data, no code).
 *
 * Valid filterConfig values:
 * - null: All records (no filter applied)
 * - false: Deny access (returns empty result)
 * - '$parent': Sub-entity inherits parent entity's RLS
 * - string: Shorthand for { field: string, value: 'userId' }
 * - { field, value }: Explicit field + context value mapping
 *
 * @deprecated rlsPolicy is REMOVED. All entities now use rlsRules (ADR-011).
 * This function is kept as a no-op for backward compatibility.
 */
function validateRlsPolicy(_meta, _errors) {
  // No-op: rlsPolicy has been removed from all entity metadata.
  // rlsRules (ADR-011) is now the only RLS configuration method.
  // TODO: Remove this function entirely in next major version.
}

/**
 * Validate RLS rules (ADR-011: Rule-Based RLS Engine)
 *
 * NOTE: This validates SCHEMA SHAPE at module load time.
 * Semantic validation (cycles, cross-entity refs, SQL identifiers)
 * is done by path-validator.validateAllRules() at server startup.
 *
 * Valid access configurations:
 * - null: Full access (no filter applied)
 * - { type: 'direct', field, value }: Direct field match
 * - { type: 'parent', foreignKey, parentEntity }: Inherit from parent RLS
 * - { type: 'junction', junction: {...} }: Access via junction table
 */
function validateRlsRules(meta, errors) {
  const rlsRules = meta.rlsRules;
  if (!rlsRules) {
    return; // Optional for now (during migration)
  }

  if (!Array.isArray(rlsRules)) {
    errors.add('rlsRules', 'Must be an array of rule objects');
    return;
  }

  if (rlsRules.length > RLS_ENGINE.MAX_RULES_PER_ENTITY) {
    errors.add(
      'rlsRules',
      `Exceeds maximum of ${RLS_ENGINE.MAX_RULES_PER_ENTITY} rules per entity`,
    );
  }

  // Valid roles include all role hierarchy + wildcard
  const roleHierarchy = getRoleHierarchy();
  const validRoles = new Set([...roleHierarchy, '*']);

  // Valid operations for RLS rules
  const validOperations = new Set(['read', 'summary', 'update', 'delete', '*']);

  // Valid access types from RLS_ENGINE (direct, junction, parent)
  const validAccessTypes = new Set(RLS_ENGINE.ACCESS_TYPES);

  // Track rule IDs for uniqueness
  const seenIds = new Set();

  for (let i = 0; i < rlsRules.length; i++) {
    const rule = rlsRules[i];
    const prefix = `rlsRules[${i}]`;

    if (!rule || typeof rule !== 'object') {
      errors.add(prefix, 'Must be an object');
      continue;
    }

    // Validate id (required, unique)
    if (!rule.id || typeof rule.id !== 'string') {
      errors.add(`${prefix}.id`, 'Required string property');
    } else if (seenIds.has(rule.id)) {
      errors.add(`${prefix}.id`, `Duplicate rule id '${rule.id}'`);
    } else {
      seenIds.add(rule.id);
    }

    // Validate roles (required: string or array)
    if (!rule.roles) {
      errors.add(`${prefix}.roles`, 'Required property');
    } else {
      const roles = Array.isArray(rule.roles) ? rule.roles : [rule.roles];
      for (const role of roles) {
        if (!validRoles.has(role)) {
          errors.add(
            `${prefix}.roles`,
            `Invalid role '${role}'. Valid: ${[...validRoles].join(', ')}`,
          );
        }
      }
    }

    // Validate operations (required: string or array)
    if (!rule.operations) {
      errors.add(`${prefix}.operations`, 'Required property');
    } else {
      const ops = Array.isArray(rule.operations) ? rule.operations : [rule.operations];
      for (const op of ops) {
        if (!validOperations.has(op)) {
          errors.add(
            `${prefix}.operations`,
            `Invalid operation '${op}'. Valid: ${[...validOperations].join(', ')}`,
          );
        }
      }
    }

    // Validate access (required: null or object)
    if (!('access' in rule)) {
      errors.add(`${prefix}.access`, 'Required property (use null for full access)');
      continue;
    }

    const access = rule.access;

    // null = full access (valid)
    if (access === null) {
      continue;
    }

    if (typeof access !== 'object') {
      errors.add(`${prefix}.access`, 'Must be null or an object with type property');
      continue;
    }

    // Validate access type
    if (!access.type || typeof access.type !== 'string') {
      errors.add(`${prefix}.access.type`, 'Required string property');
      continue;
    }

    if (!validAccessTypes.has(access.type)) {
      errors.add(
        `${prefix}.access.type`,
        `Invalid type '${access.type}'. Valid: ${[...validAccessTypes].join(', ')}`,
      );
      continue;
    }

    // Type-specific validation
    if (access.type === 'direct') {
      // Direct access requires field
      if (!access.field || typeof access.field !== 'string') {
        errors.add(`${prefix}.access.field`, 'Required string property for direct access');
      }

      // value is optional (defaults to 'userId')
      if (access.value !== undefined) {
        if (typeof access.value !== 'string') {
          errors.add(`${prefix}.access.value`, 'Must be a string');
        } else if (!isValidContextValue(access.value)) {
          errors.add(
            `${prefix}.access.value`,
            `Invalid context value '${access.value}'. Expected 'userId' or '*_profile_id' pattern.`,
          );
        }
      }
    } else if (access.type === 'parent') {
      // Parent access requires foreignKey (parentEntity optional for polymorphic)
      if (!access.foreignKey || typeof access.foreignKey !== 'string') {
        errors.add(`${prefix}.access.foreignKey`, 'Required string property for parent access');
      }
      if (access.parentEntity !== undefined && typeof access.parentEntity !== 'string') {
        errors.add(`${prefix}.access.parentEntity`, 'Must be a string (entity key)');
      }
    } else if (access.type === 'junction') {
      // Junction access requires junction configuration
      if (!access.junction || typeof access.junction !== 'object') {
        errors.add(
          `${prefix}.access.junction`,
          'Required object property for junction access',
        );
      } else {
        const junction = access.junction;

        // Required junction properties
        if (!junction.table || typeof junction.table !== 'string') {
          errors.add(`${prefix}.access.junction.table`, 'Required string property');
        }
        if (!junction.localKey || typeof junction.localKey !== 'string') {
          errors.add(`${prefix}.access.junction.localKey`, 'Required string property');
        }
        if (!junction.foreignKey || typeof junction.foreignKey !== 'string') {
          errors.add(`${prefix}.access.junction.foreignKey`, 'Required string property');
        }

        // Validate filter if present
        if (junction.filter !== undefined) {
          if (typeof junction.filter !== 'object' || junction.filter === null) {
            errors.add(`${prefix}.access.junction.filter`, 'Must be an object');
          } else {
            // Each filter value should be a valid context value
            for (const [filterField, filterValue] of Object.entries(junction.filter)) {
              if (typeof filterValue !== 'string') {
                errors.add(
                  `${prefix}.access.junction.filter.${filterField}`,
                  'Must be a string (context value)',
                );
              } else if (!isValidContextValue(filterValue)) {
                errors.add(
                  `${prefix}.access.junction.filter.${filterField}`,
                  `Invalid context value '${filterValue}'. Expected 'userId' or '*_profile_id' pattern.`,
                );
              }
            }
          }
        }

        // Validate through (nested junction) if present
        if (junction.through !== undefined) {
          // Basic structure check - deep validation could recurse
          if (typeof junction.through !== 'object' || junction.through === null) {
            errors.add(`${prefix}.access.junction.through`, 'Must be a junction config object');
          }
        }
      }
    }
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
      `FK field '${fk1}' not found in fields. Add: ${fk1}: { type: 'foreignKey', references: '${config.entity1}' }`,
    );
  }
  if (!fields[fk2]) {
    errors.add(
      'junctionFor',
      `FK field '${fk2}' not found in fields. Add: ${fk2}: { type: 'foreignKey', references: '${config.entity2}' }`,
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

// ============================================================================
// FIELD-CENTRIC VALIDATION (Phase 2A Migration Support)
// ============================================================================

/**
 * Valid field-level boolean properties.
 * These are being migrated from entity-level arrays to field-level properties.
 */
const VALID_FIELD_BOOLEAN_PROPS = new Set([
  'required',
  'immutable',
  'searchable',
  'filterable',
  'sortable',
  'readonly',
]);

/**
 * Validate field-level boolean properties.
 * Accepts both legacy arrays and new field-level properties (migration support).
 *
 * @param {Object} meta - Entity metadata
 * @param {Object} errors - ValidationErrors collector
 */
function validateFieldLevelBooleans(meta, errors) {
  const fields = meta.fields || {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    for (const prop of VALID_FIELD_BOOLEAN_PROPS) {
      if (prop in fieldDef && typeof fieldDef[prop] !== 'boolean') {
        errors.add(
          `fields.${fieldName}.${prop}`,
          `Must be a boolean, got '${typeof fieldDef[prop]}'`,
        );
      }
    }
  }
}

/**
 * Validate field-level role-based access properties (Phase 2A migration).
 *
 * NOTE: fields.*.access can have TWO different formats:
 * 1. UI mode access: { create: 'required', edit: 'editable', view: 'read' }
 * 2. Role-based access: { create: 'customer', read: 'any', update: 'dispatcher', delete: 'none' }
 *
 * This validator only checks format #2 (role-based). We detect it by looking for
 * `read` or `update` or `delete` keys (which don't exist in UI mode format).
 *
 * @param {Object} meta - Entity metadata
 * @param {Object} errors - ValidationErrors collector
 */
function validateFieldLevelAccess(meta, errors) {
  const fields = meta.fields || {};
  const validAccessValues = getValidAccessValues();

  // Keys that indicate NEW role-based access format (vs legacy UI mode format)
  const roleBasedKeys = ['read', 'update', 'delete'];

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (!fieldDef.access) { continue; }

    const access = fieldDef.access;
    if (typeof access !== 'object' || access === null) {
      // Skip if it's not an object - could be legacy format
      continue;
    }

    // Check if this looks like role-based access (has read/update/delete keys)
    const isRoleBasedAccess = roleBasedKeys.some((key) => key in access);
    if (!isRoleBasedAccess) {
      // This is UI mode access format, skip validation
      continue;
    }

    // Validate role-based access format
    for (const op of ['create', 'read', 'update', 'delete']) {
      const value = access[op];
      if (value === undefined) { continue; }

      if (!validAccessValues.has(value)) {
        errors.add(
          `fields.${fieldName}.access.${op}`,
          `Invalid value '${value}'. Valid: ${[...validAccessValues].join(', ')}`,
        );
      }
    }
  }
}

/**
 * Valid hook event patterns.
 */
const VALID_HOOK_EVENTS = new Set(['create', 'change', 'delete']);

/**
 * Validate beforeChange hooks on fields.
 *
 * @param {Object} meta - Entity metadata
 * @param {Object} errors - ValidationErrors collector
 */
function validateBeforeChangeHooks(meta, errors) {
  const fields = meta.fields || {};
  const roleHierarchy = getRoleHierarchy();
  const validBypassRoles = new Set([...roleHierarchy, '*']);

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const hooks = fieldDef.beforeChange;
    if (!hooks) { continue; }

    if (!Array.isArray(hooks)) {
      errors.add(`fields.${fieldName}.beforeChange`, 'Must be an array');
      continue;
    }

    for (let i = 0; i < hooks.length; i++) {
      const hook = hooks[i];
      const prefix = `fields.${fieldName}.beforeChange[${i}]`;

      if (!hook || typeof hook !== 'object') {
        errors.add(prefix, 'Must be an object');
        continue;
      }

      // 'on' is required
      if (!hook.on) {
        errors.add(`${prefix}.on`, 'Required property');
      } else if (typeof hook.on !== 'string') {
        errors.add(`${prefix}.on`, 'Must be a string');
      } else {
        // Validate event pattern: 'create', 'change', 'delete', or 'value→value'
        const isSimpleEvent = VALID_HOOK_EVENTS.has(hook.on);
        const isTransition = hook.on.includes('→');
        if (!isSimpleEvent && !isTransition) {
          errors.add(
            `${prefix}.on`,
            `Invalid event '${hook.on}'. Use 'create', 'change', 'delete', or 'oldValue→newValue'`,
          );
        }
      }

      // Validate 'when' condition if present
      if (hook.when !== undefined) {
        if (typeof hook.when !== 'object' || hook.when === null) {
          errors.add(`${prefix}.when`, 'Must be an object with field, operator, value');
        } else {
          if (!hook.when.field) {
            errors.add(`${prefix}.when.field`, 'Required when using condition');
          }
          if (!hook.when.operator) {
            errors.add(`${prefix}.when.operator`, 'Required when using condition');
          }
        }
      }

      // Validate 'blocked' if present
      if (hook.blocked !== undefined && typeof hook.blocked !== 'boolean') {
        errors.add(`${prefix}.blocked`, 'Must be a boolean');
      }

      // Validate 'bypassRoles' if present
      if (hook.bypassRoles !== undefined) {
        if (!Array.isArray(hook.bypassRoles)) {
          errors.add(`${prefix}.bypassRoles`, 'Must be an array of roles');
        } else {
          for (const role of hook.bypassRoles) {
            if (!validBypassRoles.has(role)) {
              errors.add(
                `${prefix}.bypassRoles`,
                `Invalid role '${role}'. Valid: ${[...validBypassRoles].join(', ')}`,
              );
            }
          }
        }
      }

      // Validate 'requiresApproval' if present
      if (hook.requiresApproval !== undefined) {
        if (typeof hook.requiresApproval !== 'object' || hook.requiresApproval === null) {
          errors.add(`${prefix}.requiresApproval`, 'Must be an object');
        } else if (!hook.requiresApproval.approver) {
          errors.add(`${prefix}.requiresApproval.approver`, 'Required property');
        }
      }

      // beforeChange cannot have 'do' (that's for afterChange)
      if (hook.do !== undefined) {
        errors.add(
          `${prefix}.do`,
          "'do' is forbidden in beforeChange hooks (use afterChange for actions)",
        );
      }
    }
  }
}

/**
 * Validate afterChange hooks on fields.
 *
 * @param {Object} meta - Entity metadata
 * @param {Object} errors - ValidationErrors collector
 */
function validateAfterChangeHooks(meta, errors) {
  const fields = meta.fields || {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const hooks = fieldDef.afterChange;
    if (!hooks) { continue; }

    if (!Array.isArray(hooks)) {
      errors.add(`fields.${fieldName}.afterChange`, 'Must be an array');
      continue;
    }

    for (let i = 0; i < hooks.length; i++) {
      const hook = hooks[i];
      const prefix = `fields.${fieldName}.afterChange[${i}]`;

      if (!hook || typeof hook !== 'object') {
        errors.add(prefix, 'Must be an object');
        continue;
      }

      // 'on' is required
      if (!hook.on) {
        errors.add(`${prefix}.on`, 'Required property');
      } else if (typeof hook.on !== 'string') {
        errors.add(`${prefix}.on`, 'Must be a string');
      }

      // 'do' is required for afterChange
      if (!hook.do) {
        errors.add(`${prefix}.do`, 'Required property (action ID or inline action)');
      } else if (typeof hook.do !== 'string' && typeof hook.do !== 'object') {
        errors.add(`${prefix}.do`, 'Must be a string (action ID) or object (inline action)');
      }

      // afterChange cannot have blocking properties
      if (hook.blocked !== undefined) {
        errors.add(
          `${prefix}.blocked`,
          "'blocked' is forbidden in afterChange hooks (change already committed)",
        );
      }
      if (hook.requiresApproval !== undefined) {
        errors.add(
          `${prefix}.requiresApproval`,
          "'requiresApproval' is forbidden in afterChange hooks (use beforeChange)",
        );
      }
      if (hook.bypassRoles !== undefined) {
        errors.add(
          `${prefix}.bypassRoles`,
          "'bypassRoles' is forbidden in afterChange hooks (use beforeChange)",
        );
      }
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
  validateRlsRules(meta, errors);
  validateRelationships(meta, errors, allMetadata);
  validateJunctionConfig(meta, errors, allMetadata);
  validateUniqueConstraints(meta, errors);

  // Field-centric validation (Phase 2A migration support)
  validateFieldLevelBooleans(meta, errors);
  validateFieldLevelAccess(meta, errors);
  validateBeforeChangeHooks(meta, errors);
  validateAfterChangeHooks(meta, errors);

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

    // RLS patterns (ADR-011: uses rlsRules)
    isOwnRecordOnly: (meta.rlsRules || []).some((rule) => {
      return rule.access?.type === 'direct' && rule.access?.value === 'userId';
    }),
    hasRls: Array.isArray(meta.rlsRules) && meta.rlsRules.length > 0,

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
