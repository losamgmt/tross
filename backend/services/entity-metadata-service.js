/**
 * Entity Metadata Service
 *
 * Provides comprehensive metadata views for admin panel.
 * Combines RLS policies, field access, and validation rules into
 * matrix-style views for per-entity administration.
 *
 * DESIGN NOTES:
 * - Generic matrix widget data format for frontend consumption
 * - Per-role permission matrices (RLS and field access)
 * - Validation rules in tabular format
 */

const path = require('path');
const fs = require('fs');
const { logger } = require('../config/logger');

// Load entity metadata registry
const entityMetadata = require('../config/models');

// Load config files
const permissionsPath = path.join(__dirname, '../../config/permissions.json');
const validationPath = path.join(__dirname, '../../config/validation-rules.json');

class EntityMetadataService {
  constructor() {
    this.permissions = null;
    this.validationRules = null;
    this.loadConfigs();
  }

  /**
   * Load configuration files (with caching)
   */
  loadConfigs() {
    try {
      this.permissions = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
      this.validationRules = JSON.parse(fs.readFileSync(validationPath, 'utf8'));
    } catch (error) {
      logger.error('Failed to load config files', { error: error.message });
      throw error;
    }
  }

  /**
   * Reload configs (useful if files change)
   */
  reloadConfigs() {
    this.loadConfigs();
  }

  /**
   * Get list of all available entities with basic info
   * @returns {Array} List of entity summaries
   */
  getEntityList() {
    const entities = [];

    for (const [name, metadata] of Object.entries(entityMetadata)) {
      entities.push({
        name,
        tableName: metadata.tableName,
        primaryKey: metadata.primaryKey,
        identityField: metadata.identityField,
        category: metadata.entityCategory || 'system',
        rlsResource: metadata.rlsResource || name,
      });
    }

    return entities.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get comprehensive metadata for a specific entity
   * @param {string} entityName - Entity name (e.g., 'customers', 'work_orders')
   * @returns {Object} Complete entity metadata including matrices
   */
  getEntityMetadata(entityName) {
    const metadata = entityMetadata[entityName];

    if (!metadata) {
      return null;
    }

    return {
      name: entityName,
      tableName: metadata.tableName,
      primaryKey: metadata.primaryKey,
      identityField: metadata.identityField,
      category: metadata.entityCategory,
      rlsResource: metadata.rlsResource || entityName,

      // Permission matrices
      rlsMatrix: this.buildRlsMatrix(metadata.rlsResource || entityName),
      fieldAccessMatrix: this.buildFieldAccessMatrix(entityName, metadata),

      // Validation rules
      validationRules: this.getEntityValidationRules(entityName, metadata),

      // Display configuration
      displayColumns: metadata.displayColumns || [],
      fieldAliases: metadata.fieldAliases || {},

      // Additional metadata
      immutableFields: metadata.immutableFields || [],
      requiredFields: metadata.requiredFields || [],
      sensitiveFields: metadata.sensitiveFields || [],
    };
  }

  /**
   * Build RLS permission matrix (role × operation)
   * @param {string} rlsResource - RLS resource name
   * @returns {Object} Matrix data for frontend widget
   */
  buildRlsMatrix(rlsResource) {
    // Convert roles object to array
    const rolesObj = this.permissions.roles || {};
    const roles = Object.entries(rolesObj).map(([name, config]) => ({
      name,
      level: config.priority || 0,
      description: config.description || '',
    }));

    const operations = ['create', 'read', 'update', 'delete'];

    // Build matrix rows (one per role)
    const rows = roles.map(role => {
      const resourceConfig = this.permissions.resources?.[rlsResource];
      const rolePerms = resourceConfig?.permissions || {};

      return {
        role: role.name,
        roleLevel: role.level,
        permissions: operations.reduce((acc, op) => {
          // Check if the role's priority meets the minimum for this operation
          const opConfig = rolePerms[op];
          if (opConfig?.minimumPriority) {
            acc[op] = role.level >= opConfig.minimumPriority;
          } else {
            acc[op] = false;
          }
          return acc;
        }, {}),
      };
    });

    return {
      title: 'RLS Permissions',
      description: `Role-based access control for ${rlsResource}`,
      columns: operations,
      rows: rows.sort((a, b) => b.roleLevel - a.roleLevel), // Sort by level descending
    };
  }

  /**
   * Build field access matrix (role × field)
   * @param {string} entityName - Entity name
   * @param {Object} metadata - Entity metadata
   * @returns {Object} Matrix data for frontend widget
   */
  buildFieldAccessMatrix(entityName, metadata) {
    // Convert roles object to array
    const rolesObj = this.permissions.roles || {};
    const roles = Object.entries(rolesObj).map(([name, config]) => ({
      name,
      level: config.priority || 0,
    }));
    const fieldAccess = metadata.fieldAccess || {};

    // Get all fields
    const fields = Object.keys(fieldAccess);

    if (fields.length === 0) {
      return {
        title: 'Field Access',
        description: 'No field-level access control defined',
        columns: [],
        rows: [],
      };
    }

    // Access level definitions
    const accessLevels = {
      SYSTEM_ONLY: { label: 'System Only', level: 0 },
      ADMIN_FULL: { label: 'Admin Full', level: 1 },
      ADMIN_READ: { label: 'Admin Read', level: 2 },
      MANAGER_FULL: { label: 'Manager Full', level: 3 },
      MANAGER_READ: { label: 'Manager Read', level: 4 },
      USER_FULL: { label: 'User Full', level: 5 },
      USER_READ: { label: 'User Read', level: 6 },
      PUBLIC_READ: { label: 'Public Read', level: 7 },
    };

    // Role level mapping
    const roleLevels = {
      admin: 1,
      manager: 3,
      user: 5,
      dev: 5, // Dev treated as user for field access
    };

    // Build matrix rows (one per role)
    const rows = roles.map(role => {
      const roleLevel = roleLevels[role.name] || 999;

      const permissions = fields.reduce((acc, field) => {
        const fieldLevel = fieldAccess[field];
        const levelInfo = accessLevels[fieldLevel];

        if (!levelInfo) {
          acc[field] = { read: false, write: false };
        } else if (levelInfo.level === 0) {
          // SYSTEM_ONLY - no access
          acc[field] = { read: false, write: false };
        } else {
          // Check if role can read (even levels or higher = read, odd levels = full)
          const canRead = roleLevel <= levelInfo.level;
          const canWrite = roleLevel <= levelInfo.level && levelInfo.level % 2 === 1;
          acc[field] = { read: canRead, write: canWrite };
        }

        return acc;
      }, {});

      return {
        role: role.name,
        roleLevel: role.level,
        permissions,
      };
    });

    return {
      title: 'Field Access',
      description: `Field-level permissions for ${entityName}`,
      columns: fields,
      columnAliases: metadata.fieldAliases || {},
      accessDefinitions: Object.entries(fieldAccess).map(([field, level]) => ({
        field,
        accessLevel: level,
        description: accessLevels[level]?.label || level,
      })),
      rows: rows.sort((a, b) => b.roleLevel - a.roleLevel),
    };
  }

  /**
   * Get validation rules for entity fields
   * @param {string} entityName - Entity name
   * @param {Object} metadata - Entity metadata
   * @returns {Array} Validation rules in tabular format
   */
  getEntityValidationRules(entityName, metadata) {
    const rules = [];
    const fieldAliases = metadata.fieldAliases || {};
    const validationFields = this.validationRules?.fields || {};

    // Map field names to validation rule names
    const fieldMapping = this._getFieldValidationMapping(entityName, metadata);

    for (const [field, ruleName] of Object.entries(fieldMapping)) {
      const rule = validationFields[ruleName];

      if (rule) {
        rules.push({
          field,
          alias: fieldAliases[field] || field,
          validationKey: ruleName,
          type: rule.type,
          required: rule.required || false,
          constraints: this._extractConstraints(rule),
          errorMessages: rule.errorMessages || {},
        });
      }
    }

    return rules.sort((a, b) => a.field.localeCompare(b.field));
  }

  /**
   * Map entity fields to validation rule names
   * @private
   */
  _getFieldValidationMapping(entityName, metadata) {
    const mapping = {};
    const fieldAccess = metadata.fieldAccess || {};

    // Common mappings based on field names
    for (const field of Object.keys(fieldAccess)) {
      // Direct field name match
      if (this.validationRules?.fields?.[field]) {
        mapping[field] = field;
        continue;
      }

      // Entity-prefixed match (e.g., customer_status for customers entity)
      const prefix = entityName.replace(/s$/, ''); // Remove trailing 's'
      const prefixedField = `${prefix}_${field}`;
      if (this.validationRules?.fields?.[prefixedField]) {
        mapping[field] = prefixedField;
        continue;
      }

      // Common field mappings
      const commonMappings = {
        'email': 'email',
        'phone': 'phone',
        'address': 'address',
        'city': 'city',
        'state': 'state',
        'zip_code': 'zip_code',
        'notes': 'notes',
        'description': 'description',
        'amount': 'amount',
        'created_at': null, // System fields, no validation
        'updated_at': null,
        'id': null,
      };

      if (commonMappings.hasOwnProperty(field)) {
        if (commonMappings[field]) {
          mapping[field] = commonMappings[field];
        }
      }
    }

    return mapping;
  }

  /**
   * Extract constraint summary from rule
   * @private
   */
  _extractConstraints(rule) {
    const constraints = [];

    if (rule.minLength) {
      constraints.push(`min length: ${rule.minLength}`);
    }
    if (rule.maxLength) {
      constraints.push(`max length: ${rule.maxLength}`);
    }
    if (rule.min !== undefined) {
      constraints.push(`min: ${rule.min}`);
    }
    if (rule.max !== undefined) {
      constraints.push(`max: ${rule.max}`);
    }
    if (rule.pattern) {
      constraints.push(`pattern: ${rule.pattern}`);
    }
    if (rule.format) {
      constraints.push(`format: ${rule.format}`);
    }
    if (rule.enum) {
      constraints.push(`values: ${rule.enum.join(', ')}`);
    }
    if (rule.trim) {
      constraints.push('trimmed');
    }
    if (rule.lowercase) {
      constraints.push('lowercase');
    }

    return constraints;
  }

  /**
   * Get RLS permissions for a specific resource (simplified view)
   * @param {string} resourceName - RLS resource name
   * @returns {Object} Permissions by role
   */
  getRlsPermissions(resourceName) {
    return this.permissions.resources?.[resourceName] || null;
  }

  /**
   * Get all role definitions
   * @returns {Array} Role definitions with levels
   */
  getRoles() {
    const rolesObj = this.permissions.roles || {};
    return Object.entries(rolesObj).map(([name, config]) => ({
      name,
      level: config.priority || 0,
      description: config.description || '',
    }));
  }
}

module.exports = new EntityMetadataService();
