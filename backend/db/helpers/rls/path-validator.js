/**
 * RLS Path Validator
 *
 * SEMANTIC validation for RLS rules at server startup:
 * - Cross-entity validation (parent entity exists in metadata)
 * - Junction/parent cycle detection
 * - Hop limit enforcement (MAX_HOPS)
 * - SQL identifier sanitization (prevents injection)
 *
 * NOTE: Schema shape validation (types, required fields) is handled by
 * entity-metadata-validator.validateRlsRules() at module load time.
 *
 * ADR-011: Rule-based RLS engine.
 *
 * @module db/helpers/rls/path-validator
 */

const { logger } = require('../../../config/logger');
const { RLS_ENGINE } = require('../../../config/constants');
const { isValidAccessType } = require('./rule-matcher');
const { sanitizeIdentifier } = require('../../../utils/sql-safety');

/**
 * Validate all RLS rules across all entities
 *
 * @param {Object} allMetadata - Map of entity type to metadata
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
function validateAllRules(allMetadata) {
  const errors = [];

  for (const [entityType, metadata] of Object.entries(allMetadata)) {
    const rules = metadata.rlsRules || [];

    // Validate rule count
    if (rules.length > RLS_ENGINE.MAX_RULES_PER_ENTITY) {
      errors.push(`${entityType}: exceeds max rules (${rules.length} > ${RLS_ENGINE.MAX_RULES_PER_ENTITY})`);
    }

    // Validate each rule
    for (const rule of rules) {
      const ruleErrors = validateRule(rule, entityType, allMetadata);
      errors.push(...ruleErrors);
    }

    // Detect parent cycles (only for entities with parent rules)
    const hasParentRules = rules.some(r => r.access?.type === 'parent');
    if (hasParentRules) {
      const cycleError = detectParentCycle(entityType, allMetadata);
      if (cycleError) {
        errors.push(`${entityType}: ${cycleError}`);
      }
    }
  }

  if (errors.length > 0) {
    logger.warn('RLS validation errors found', { errorCount: errors.length });
  } else {
    logger.debug('RLS validation passed', { entityCount: Object.keys(allMetadata).length });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single RLS rule
 *
 * @param {Object} rule
 * @param {string} entityType
 * @param {Object} allMetadata
 * @returns {Array<string>} Validation errors
 */
function validateRule(rule, entityType, allMetadata) {
  const errors = [];
  const prefix = `${entityType}/${rule.id || 'unnamed'}`;

  // Required fields
  if (!rule.id) {
    errors.push(`${prefix}: missing id`);
  }

  if (!rule.roles) {
    errors.push(`${prefix}: missing roles`);
  } else if (!Array.isArray(rule.roles) && typeof rule.roles !== 'string') {
    errors.push(`${prefix}: roles must be string or array`);
  }

  if (!rule.operations) {
    errors.push(`${prefix}: missing operations`);
  } else if (!Array.isArray(rule.operations) && typeof rule.operations !== 'string') {
    errors.push(`${prefix}: operations must be string or array`);
  }

  // Access validation
  if (rule.access !== null && rule.access !== undefined) {
    const accessErrors = validateAccess(rule.access, prefix, allMetadata);
    errors.push(...accessErrors);
  }

  return errors;
}

/**
 * Validate access configuration
 *
 * @param {Object} access
 * @param {string} prefix - Error prefix
 * @param {Object} _allMetadata
 * @returns {Array<string>}
 */
function validateAccess(access, prefix, _allMetadata) {
  const errors = [];

  if (typeof access !== 'object') {
    errors.push(`${prefix}: access must be object or null`);
    return errors;
  }

  const { type } = access;

  if (!type) {
    errors.push(`${prefix}: access missing type`);
    return errors;
  }

  if (!isValidAccessType(type)) {
    errors.push(`${prefix}: unknown access type '${type}' (valid: ${RLS_ENGINE.ACCESS_TYPES.join(', ')})`);
    return errors;
  }

  // Type-specific validation
  switch (type) {
    case 'direct':
      if (!access.field) {
        errors.push(`${prefix}: direct access missing field`);
      } else {
        // Validate field name
        try {
          sanitizeIdentifier(access.field, 'access.field');
        } catch {
          errors.push(`${prefix}: invalid direct access field '${access.field}'`);
        }
      }
      break;

    case 'junction':
      const junctionErrors = validateJunctionAccess(access, prefix);
      errors.push(...junctionErrors);
      break;

    case 'parent':
      const parentErrors = validateParentAccess(access, prefix, _allMetadata);
      errors.push(...parentErrors);
      break;
  }

  return errors;
}

/**
 * Validate junction access configuration
 *
 * @param {Object} access
 * @param {string} prefix
 * @returns {Array<string>}
 */
function validateJunctionAccess(access, prefix) {
  const errors = [];
  const { junction } = access;

  if (!junction) {
    errors.push(`${prefix}: junction access missing junction config`);
    return errors;
  }

  // Required junction fields with identifier validation
  const requiredFields = ['table', 'localKey', 'foreignKey'];
  for (const fieldName of requiredFields) {
    const value = junction[fieldName];
    if (!value) {
      errors.push(`${prefix}: junction missing ${fieldName}`);
    } else {
      try {
        sanitizeIdentifier(value, `junction.${fieldName}`);
      } catch {
        errors.push(`${prefix}: invalid junction ${fieldName} '${value}'`);
      }
    }
  }

  // Filter validation
  if (junction.filter) {
    const filterKeys = Object.keys(junction.filter);
    if (filterKeys.length > RLS_ENGINE.MAX_FILTER_CONDITIONS) {
      errors.push(`${prefix}: junction filter exceeds ${RLS_ENGINE.MAX_FILTER_CONDITIONS} conditions`);
    }

    // Validate field names using sanitizeIdentifier
    for (const field of filterKeys) {
      try {
        sanitizeIdentifier(field, 'filter.field');
      } catch {
        errors.push(`${prefix}: invalid filter field name '${field}'`);
      }
    }
  }

  // Through validation (multi-hop)
  if (junction.through) {
    const hopCount = countHops(junction);
    if (hopCount > RLS_ENGINE.MAX_HOPS) {
      errors.push(`${prefix}: junction path exceeds ${RLS_ENGINE.MAX_HOPS} hops (has ${hopCount})`);
    }

    // Cycle detection
    const visited = new Set();
    const cycleError = detectCycle(junction, visited);
    if (cycleError) {
      errors.push(`${prefix}: ${cycleError}`);
    }
  }

  return errors;
}

/**
 * Count hops in a junction path
 *
 * @param {Object} junction
 * @returns {number}
 */
function countHops(junction) {
  let hops = 1;
  let current = junction.through;

  while (current) {
    hops++;
    current = current.through;
  }

  return hops;
}

/**
 * Detect cycles in junction paths
 *
 * @param {Object} junction
 * @param {Set} visited - Visited table names
 * @returns {string|null} Error message or null
 */
function detectCycle(junction, visited = new Set()) {
  if (visited.has(junction.table)) {
    return `cycle detected at table '${junction.table}'`;
  }

  visited.add(junction.table);

  if (junction.through) {
    return detectCycle(junction.through, visited);
  }

  return null;
}

/**
 * Validate parent access configuration
 *
 * Supports both static parents (parentEntity) and polymorphic parents (polymorphic.typeColumn).
 * Exactly one of parentEntity or polymorphic must be specified.
 *
 * @param {Object} access
 * @param {string} prefix
 * @param {Object} allMetadata - All entity metadata for parent lookup
 * @returns {Array<string>}
 */
function validateParentAccess(access, prefix, allMetadata) {
  const errors = [];
  const { foreignKey, parentEntity, polymorphic } = access;

  // foreignKey is required for all parent access
  if (!foreignKey) {
    errors.push(`${prefix}: parent access missing foreignKey`);
  } else {
    try {
      sanitizeIdentifier(foreignKey, 'parent.foreignKey');
    } catch {
      errors.push(`${prefix}: invalid parent foreignKey '${foreignKey}'`);
    }
  }

  // Must have exactly one of: parentEntity OR polymorphic
  if (parentEntity && polymorphic) {
    errors.push(`${prefix}: cannot have both parentEntity and polymorphic`);
  }
  if (!parentEntity && !polymorphic) {
    errors.push(`${prefix}: requires parentEntity or polymorphic config`);
  }

  // Static parent validation
  if (parentEntity !== undefined && parentEntity !== null) {
    if (typeof parentEntity !== 'string') {
      errors.push(`${prefix}: parentEntity must be a string`);
    } else {
      // Validate parent entity exists in metadata
      if (allMetadata && !allMetadata[parentEntity]) {
        errors.push(`${prefix}: parentEntity '${parentEntity}' not found in metadata`);
      }
    }
  }

  // Polymorphic parent validation
  if (polymorphic) {
    const polyErrors = validatePolymorphicConfig(polymorphic, prefix, allMetadata);
    errors.push(...polyErrors);
  }

  return errors;
}

/**
 * Validate polymorphic parent configuration
 *
 * @param {Object} polymorphic - Polymorphic config
 * @param {string} prefix - Error prefix
 * @param {Object} allMetadata - All entity metadata
 * @returns {Array<string>}
 */
function validatePolymorphicConfig(polymorphic, prefix, allMetadata) {
  const errors = [];
  const { typeColumn, allowedTypes } = polymorphic;

  // typeColumn is required
  if (!typeColumn) {
    errors.push(`${prefix}: polymorphic missing typeColumn`);
  } else {
    try {
      sanitizeIdentifier(typeColumn, 'polymorphic.typeColumn');
    } catch {
      errors.push(`${prefix}: invalid polymorphic typeColumn '${typeColumn}'`);
    }
  }

  // allowedTypes is optional, but if present must be valid
  if (allowedTypes !== undefined) {
    if (!Array.isArray(allowedTypes)) {
      errors.push(`${prefix}: polymorphic allowedTypes must be an array`);
    } else if (allowedTypes.length === 0) {
      errors.push(`${prefix}: polymorphic allowedTypes cannot be empty (omit to allow any)`);
    } else {
      // Validate each allowed type exists in metadata
      for (const entityKey of allowedTypes) {
        if (typeof entityKey !== 'string') {
          errors.push(`${prefix}: polymorphic allowedTypes entry must be string`);
        } else if (allMetadata && !allMetadata[entityKey]) {
          errors.push(`${prefix}: polymorphic allowedTypes entity '${entityKey}' not found in metadata`);
        }
      }
    }
  }

  return errors;
}

/**
 * Detect cycles in parent chain
 *
 * Follows parent references through metadata to detect infinite loops.
 * Example: A -> B -> C -> A would be a cycle.
 *
 * @param {string} startEntity - Entity to start checking from
 * @param {Object} allMetadata - All entity metadata
 * @param {Set} [visited] - Visited entity names
 * @returns {string|null} Error message or null
 */
function detectParentCycle(startEntity, allMetadata, visited = new Set()) {
  if (!allMetadata || !allMetadata[startEntity]) {
    return null; // Can't detect without metadata
  }

  if (visited.has(startEntity)) {
    return `parent cycle detected at entity '${startEntity}'`;
  }

  visited.add(startEntity);

  const metadata = allMetadata[startEntity];
  const rules = metadata.rlsRules || [];

  // Check each parent access rule
  for (const rule of rules) {
    if (rule.access?.type === 'parent' && rule.access.parentEntity) {
      const cycleError = detectParentCycle(rule.access.parentEntity, allMetadata, new Set(visited));
      if (cycleError) {
        return cycleError;
      }
    }
  }

  // Check hop count
  const hopCount = countParentHops(startEntity, allMetadata);
  if (hopCount > RLS_ENGINE.MAX_HOPS) {
    return `parent chain exceeds ${RLS_ENGINE.MAX_HOPS} hops (has ${hopCount})`;
  }

  return null;
}

/**
 * Count hops in a parent chain
 *
 * @param {string} entityName - Starting entity
 * @param {Object} allMetadata - All entity metadata
 * @param {Set} [visited] - To prevent infinite loops
 * @returns {number}
 */
function countParentHops(entityName, allMetadata, visited = new Set()) {
  if (!allMetadata || !allMetadata[entityName] || visited.has(entityName)) {
    return 0;
  }

  visited.add(entityName);

  const metadata = allMetadata[entityName];
  const rules = metadata.rlsRules || [];

  let maxHops = 0;
  for (const rule of rules) {
    if (rule.access?.type === 'parent' && rule.access.parentEntity) {
      const parentHops = 1 + countParentHops(rule.access.parentEntity, allMetadata, new Set(visited));
      maxHops = Math.max(maxHops, parentHops);
    }
  }

  return maxHops;
}

module.exports = {
  validateAllRules,
  validateRule,
  validateAccess,
  validateJunctionAccess,
  validateParentAccess,
  validatePolymorphicConfig,
  countHops,
  detectCycle,
  detectParentCycle,
  countParentHops,
};
