/**
 * RLS Clause Builder
 *
 * Builds SQL clauses for each access type:
 * - null: Full access (no clause)
 * - direct: Field match against context value
 * - junction: EXISTS subquery through junction table
 * - parent: EXISTS subquery delegating to parent entity's RLS
 *
 * ADR-011: Rule-based RLS engine.
 *
 * @module db/helpers/rls/clause-builder
 */

const { parseFilter } = require('./filter-parser');
const { matchRules, resolveValue } = require('./rule-matcher');
const { sanitizeIdentifier } = require('../../../utils/sql-safety');
const AppError = require('../../../utils/app-error');
const { logger } = require('../../../config/logger');
const { RLS_ENGINE } = require('../../../config/constants');

/**
 * Build SQL clause for a single access rule
 *
 * @param {Object} access - Access configuration from rule
 * @param {Object} rlsContext - Context containing userId, profileIds, etc.
 * @param {string} tableAlias - Alias for the main table
 * @param {number} paramOffset - Starting parameter offset
 * @param {number} [aliasCounter=0] - Counter for generating unique aliases
 * @param {Object} [allMetadata=null] - All entity metadata (required for parent access)
 * @param {number} [depth=0] - Current recursion depth (for cycle prevention)
 * @returns {{ clause: string, params: Array, nextOffset: number, nextAliasCounter: number }}
 * @throws {AppError} Unknown access type
 * @throws {AppError} Direct access missing field
 * @throws {AppError} Junction depth limit exceeded
 * @throws {AppError} Junction missing required configuration
 * @throws {AppError} Parent entity not found in metadata
 */
function buildAccessClause(access, rlsContext, tableAlias, paramOffset, aliasCounter = 0, allMetadata = null, depth = 0) {
  // null = full access
  if (access === null) {
    logger.debug('RLS full access (null rule)');
    return { clause: 'TRUE', params: [], nextOffset: paramOffset, nextAliasCounter: aliasCounter };
  }

  const { type } = access;

  switch (type) {
    case 'direct':
      return buildDirectClause(access, rlsContext, tableAlias, paramOffset, aliasCounter);

    case 'junction':
      return buildJunctionClause(access, rlsContext, tableAlias, paramOffset, aliasCounter, depth);

    case 'parent':
      return buildParentClause(access, rlsContext, tableAlias, paramOffset, aliasCounter, allMetadata, depth);

    default:
      throw new AppError(`Unknown RLS access type: ${type}`, 500, 'INTERNAL_ERROR');
  }
}

/**
 * Build clause for direct field access
 *
 * Example: { type: 'direct', field: 'customer_profile_id', value: 'customerProfileId' }
 * Result: "t.customer_profile_id = $1" with [contextValue]
 *
 * Supports explicit syntax:
 *   value: { ref: 'userId' }      - context reference (preferred)
 *   value: { literal: 'active' }  - literal value (for static matches)
 *   value: 'userId'               - legacy string (context ref only, no fallback)
 */
function buildDirectClause(access, rlsContext, tableAlias, paramOffset, aliasCounter) {
  const { field, value = 'userId' } = access;

  if (!field) {
    throw new AppError('Direct access requires field', 400, 'BAD_REQUEST');
  }

  // Validate and sanitize field name
  const safeField = sanitizeIdentifier(field, 'access.field');

  // Resolve value using explicit or legacy syntax
  const resolved = resolveValue(value, rlsContext);

  // For direct access, legacy strings must resolve to context values (no literal fallback)
  // Only explicit { literal: ... } syntax allows non-context values
  const isLegacyString = typeof value === 'string';
  const isExplicitLiteral = value && typeof value === 'object' && 'literal' in value;

  if (!resolved.resolved) {
    // Explicit ref that didn't resolve
    logger.debug('RLS direct access denied - ref not in context', { field, value });
    return { clause: 'FALSE', params: [], nextOffset: paramOffset, nextAliasCounter: aliasCounter };
  }

  if (isLegacyString && !resolved.isRef) {
    // Legacy string that didn't match a context key - original behavior: deny
    logger.debug('RLS direct access denied - legacy string not in context', { field, value });
    return { clause: 'FALSE', params: [], nextOffset: paramOffset, nextAliasCounter: aliasCounter };
  }

  if (resolved.isRef && (resolved.value === undefined || resolved.value === null)) {
    // Context ref resolved but value is null/undefined
    logger.debug('RLS direct access denied - context value is null', { field, value });
    return { clause: 'FALSE', params: [], nextOffset: paramOffset, nextAliasCounter: aliasCounter };
  }

  const columnRef = tableAlias ? `${tableAlias}.${safeField}` : safeField;

  logger.debug('RLS direct access clause built', {
    field: safeField,
    isRef: resolved.isRef,
    isLiteral: isExplicitLiteral,
  });

  return {
    clause: `${columnRef} = $${paramOffset}`,
    params: [resolved.value],
    nextOffset: paramOffset + 1,
    nextAliasCounter: aliasCounter,
  };
}

/**
 * Build clause for junction-based access
 *
 * Example:
 * {
 *   type: 'junction',
 *   junction: {
 *     table: 'customer_units',
 *     localKey: 'id',
 *     foreignKey: 'unit_id',
 *     filter: { customer_profile_id: 'customerProfileId' }
 *   }
 * }
 *
 * Result:
 * EXISTS (
 *   SELECT 1 FROM customer_units j0
 *   WHERE j0.unit_id = t.id
 *   AND j0.customer_profile_id = $1
 * )
 *
 * @param {number} [depth=0] - Current recursion depth (for nested through chains)
 */
function buildJunctionClause(access, rlsContext, tableAlias, paramOffset, aliasCounter = 0, depth = 0) {
  const { junction } = access;

  // Runtime depth check for nested junctions (through chains)
  if (depth >= RLS_ENGINE.MAX_HOPS) {
    logger.error('RLS junction depth limit exceeded at runtime', {
      depth,
      maxHops: RLS_ENGINE.MAX_HOPS,
      junction: junction?.table,
    });
    throw new AppError(
      `RLS junction chain exceeds maximum depth of ${RLS_ENGINE.MAX_HOPS}`,
      500,
      'INTERNAL_ERROR',
    );
  }

  if (!junction) {
    throw new AppError('Junction access requires junction config', 400, 'BAD_REQUEST');
  }

  const { table, localKey, foreignKey, filter, through } = junction;

  if (!table || !localKey || !foreignKey) {
    throw new AppError(
      'Junction requires table, localKey, and foreignKey',
      400,
      'BAD_REQUEST',
    );
  }

  // Sanitize all identifiers
  const safeTable = sanitizeIdentifier(table, 'junction.table');
  const safeLocalKey = sanitizeIdentifier(localKey, 'junction.localKey');
  const safeForeignKey = sanitizeIdentifier(foreignKey, 'junction.foreignKey');

  // Generate unique alias
  const junctionAlias = `${RLS_ENGINE.JUNCTION_ALIAS_PREFIX}${aliasCounter}`;
  let nextAliasCounter = aliasCounter + 1;

  const mainRef = tableAlias ? `${tableAlias}.${safeLocalKey}` : safeLocalKey;

  // Build filter conditions
  let filterSql = '';
  let filterParams = [];
  let currentOffset = paramOffset;

  if (filter) {
    // Process filter - replace context references with actual values
    const resolvedFilter = resolveFilterValues(filter, rlsContext);

    const filterResult = parseFilter(resolvedFilter, junctionAlias, currentOffset);
    if (filterResult.sql) {
      filterSql = ` AND ${filterResult.sql}`;
      filterParams = filterResult.params;
      currentOffset = filterResult.nextOffset;
    }
  }

  // Handle nested junction (through)
  let throughSql = '';
  let throughParams = [];
  if (through) {
    // Build nested junction clause recursively
    // The nested junction uses the current junction table's pk as its reference
    const nestedAccess = { junction: through };
    const nestedResult = buildJunctionClause(
      nestedAccess,
      rlsContext,
      junctionAlias,
      currentOffset,
      nextAliasCounter,
      depth + 1, // Increment depth for nested through
    );

    // Handle denial from nested junction
    if (nestedResult.clause === 'FALSE') {
      return { clause: 'FALSE', params: [], nextOffset: currentOffset, nextAliasCounter };
    }

    throughSql = ` AND ${nestedResult.clause}`;
    throughParams = nestedResult.params;
    currentOffset = nestedResult.nextOffset;
    nextAliasCounter = nestedResult.nextAliasCounter;
  }

  const clause = `EXISTS (SELECT 1 FROM ${safeTable} ${junctionAlias} WHERE ${junctionAlias}.${safeForeignKey} = ${mainRef}${filterSql}${throughSql})`;

  logger.debug('RLS junction clause built', {
    table: safeTable,
    alias: junctionAlias,
    filterConditions: filterParams.length,
    hasThrough: !!through,
  });

  return {
    clause,
    params: [...filterParams, ...throughParams],
    nextOffset: currentOffset,
    nextAliasCounter,
  };
}

/**
 * Resolve filter values that reference context
 *
 * Supports explicit syntax:
 *   { customer_profile_id: { ref: 'customerProfileId' } }  - explicit reference
 *   { status: { literal: 'active' } }                      - explicit literal
 *   { customer_profile_id: 'customerProfileId' }           - legacy string
 *
 * Legacy format: tries context lookup first, falls back to literal.
 */
function resolveFilterValues(filter, rlsContext) {
  const resolved = {};

  for (const [field, value] of Object.entries(filter)) {
    const result = resolveValue(value, rlsContext);
    resolved[field] = result.value;
  }

  return resolved;
}

/**
 * Combine multiple access clauses with OR
 *
 * @param {Array<{ clause: string, params: Array }>} clauses
 * @returns {{ clause: string, params: Array }}
 */
function combineClausesOr(clauses) {
  if (clauses.length === 0) {
    return { clause: 'FALSE', params: [] };
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  // Filter out FALSE clauses (they don't contribute to OR)
  const validClauses = clauses.filter(c => c.clause !== 'FALSE');

  if (validClauses.length === 0) {
    return { clause: 'FALSE', params: [] };
  }

  // If only one valid clause after filtering, return it as-is
  if (validClauses.length === 1) {
    return validClauses[0];
  }

  // If any clause is TRUE, the whole thing is TRUE
  if (validClauses.some(c => c.clause === 'TRUE')) {
    return { clause: 'TRUE', params: [] };
  }

  const combinedSql = validClauses.map(c => `(${c.clause})`).join(' OR ');
  const combinedParams = validClauses.flatMap(c => c.params);

  logger.debug('RLS clauses combined with OR', { clauseCount: validClauses.length });

  return {
    clause: combinedSql,
    params: combinedParams,
  };
}

/**
 * Build clause for parent-based access
 *
 * Recursively evaluates the parent entity's RLS rules.
 * The child record is accessible if the parent record is accessible.
 *
 * STATIC PARENT example:
 * { type: 'parent', parentEntity: 'unit', foreignKey: 'unit_id' }
 *
 * Result:
 * EXISTS (
 *   SELECT 1 FROM units p0
 *   WHERE p0.id = assets.unit_id
 *   AND (parent's RLS clause)
 * )
 *
 * POLYMORPHIC PARENT example:
 * { type: 'parent', foreignKey: 'entity_id', polymorphic: { typeColumn: 'entity_type' } }
 *
 * Requires rlsContext.polymorphic.parentType to be set by route/middleware.
 * Result:
 * t.entity_type = 'work_order' AND EXISTS (
 *   SELECT 1 FROM work_orders p0
 *   WHERE p0.id = t.entity_id
 *   AND (work_order's RLS clause)
 * )
 *
 * @param {Object} access - Parent access configuration
 * @param {Object} rlsContext - Context containing userId, profileIds, polymorphic info
 * @param {string} tableAlias - Alias for the main (child) table
 * @param {number} paramOffset - Starting parameter offset
 * @param {number} aliasCounter - Counter for generating unique aliases
 * @param {Object} allMetadata - All entity metadata for parent lookup
 * @param {number} [depth=0] - Current recursion depth (for cycle prevention)
 * @returns {{ clause: string, params: Array, nextOffset: number, nextAliasCounter: number }}
 */
function buildParentClause(access, rlsContext, tableAlias, paramOffset, aliasCounter, allMetadata, depth = 0) {
  const { parentEntity, foreignKey, polymorphic } = access;

  // Runtime depth check - prevents infinite recursion from cycles
  if (depth >= RLS_ENGINE.MAX_HOPS) {
    logger.error('RLS parent chain depth limit exceeded at runtime', {
      depth,
      maxHops: RLS_ENGINE.MAX_HOPS,
      parentEntity: parentEntity || 'polymorphic',
    });
    throw new AppError(
      `RLS parent chain exceeds maximum depth of ${RLS_ENGINE.MAX_HOPS}. ` +
      'Check for circular parent references in entity metadata.',
      500,
      'INTERNAL_ERROR',
    );
  }

  // foreignKey is required for all parent access
  if (!foreignKey) {
    throw new AppError('Parent access requires foreignKey', 400, 'BAD_REQUEST');
  }

  // Validate foreignKey
  const safeForeignKey = sanitizeIdentifier(foreignKey, 'parent.foreignKey');

  // Determine which path: static parent or polymorphic
  if (polymorphic) {
    return buildPolymorphicParentClause(access, rlsContext, tableAlias, paramOffset, aliasCounter, allMetadata, depth);
  }

  if (!parentEntity) {
    throw new AppError('Parent access requires either parentEntity or polymorphic config', 400, 'BAD_REQUEST');
  }

  // Static parent - pass depth for chain tracking
  return buildStaticParentClause(parentEntity, safeForeignKey, rlsContext, tableAlias, paramOffset, aliasCounter, allMetadata, depth);
}

/**
 * Build clause for static (non-polymorphic) parent access
 *
 * @param {string} parentEntity - Parent entity key
 * @param {string} safeForeignKey - Sanitized foreign key column
 * @param {Object} rlsContext - RLS context
 * @param {string} tableAlias - Child table alias
 * @param {number} paramOffset - Parameter offset
 * @param {number} aliasCounter - Alias counter
 * @param {Object} allMetadata - All entity metadata
 * @param {number} [depth=0] - Current recursion depth (for cycle prevention)
 * @returns {{ clause: string, params: Array, nextOffset: number, nextAliasCounter: number }}
 */
function buildStaticParentClause(parentEntity, safeForeignKey, rlsContext, tableAlias, paramOffset, aliasCounter, allMetadata, depth = 0) {
  // Get parent metadata
  if (!allMetadata || !allMetadata[parentEntity]) {
    throw new AppError(`Parent entity '${parentEntity}' not found in metadata`, 500, 'INTERNAL_ERROR');
  }

  const parentMetadata = allMetadata[parentEntity];
  const parentTable = parentMetadata.tableName;
  const parentPrimaryKey = parentMetadata.primaryKey || 'id';

  // Generate unique alias for parent table
  const parentAlias = `${RLS_ENGINE.PARENT_ALIAS_PREFIX}${aliasCounter}`;
  let nextAliasCounter = aliasCounter + 1;

  // Get parent's RLS rules
  const parentRules = parentMetadata.rlsRules || [];
  const { role, operation = 'read' } = rlsContext;

  // Match parent rules for this role/operation
  const matchedParentRules = matchRules(parentRules, role, operation);

  // Build parent RLS conditions
  let parentCondition = '';
  let params = [];
  let currentOffset = paramOffset;

  if (matchedParentRules.length === 0) {
    // No matching rules on parent = deny
    logger.debug('RLS parent access denied - no matching parent rules', {
      parentEntity,
      role,
      operation,
    });
    return { clause: 'FALSE', params: [], nextOffset: paramOffset, nextAliasCounter };
  }

  // Check for null access (full access on parent)
  const hasFullAccess = matchedParentRules.some(r => r.access === null);

  if (!hasFullAccess) {
    // Build clauses for each parent rule
    const clauseResults = [];

    for (const rule of matchedParentRules) {
      const result = buildAccessClause(
        rule.access,
        rlsContext,
        parentAlias,
        currentOffset,
        nextAliasCounter,
        allMetadata,
        depth + 1, // Increment depth for parent chain tracking
      );
      clauseResults.push(result);
      currentOffset = result.nextOffset;
      nextAliasCounter = result.nextAliasCounter;
    }

    // Combine parent rules with OR
    const combined = combineClausesOr(clauseResults);

    if (combined.clause === 'FALSE') {
      logger.debug('RLS parent access denied - all parent rules FALSE', { parentEntity });
      return { clause: 'FALSE', params: [], nextOffset: currentOffset, nextAliasCounter };
    }

    if (combined.clause !== 'TRUE') {
      parentCondition = ` AND ${combined.clause}`;
      params = combined.params;
    }
  }

  // Build child reference
  const childRef = tableAlias ? `${tableAlias}.${safeForeignKey}` : safeForeignKey;

  // Build EXISTS subquery
  const clause = `EXISTS (SELECT 1 FROM ${parentTable} ${parentAlias} WHERE ${parentAlias}.${parentPrimaryKey} = ${childRef}${parentCondition})`;

  logger.debug('RLS parent clause built', {
    parentEntity,
    parentTable,
    parentAlias,
    foreignKey: safeForeignKey,
    hasParentCondition: parentCondition.length > 0,
  });

  return {
    clause,
    params,
    nextOffset: currentOffset,
    nextAliasCounter,
  };
}

/**
 * Build clause for polymorphic parent access
 *
 * Uses runtime-resolved parent type from rlsContext.polymorphic.
 * This avoids compile-time enumeration of all possible parent types,
 * enabling scalability to hundreds of entity types.
 *
 * @param {Object} access - Access config with polymorphic
 * @param {Object} rlsContext - Must contain polymorphic.parentType
 * @param {string} tableAlias - Child table alias
 * @param {number} paramOffset - Parameter offset
 * @param {number} aliasCounter - Alias counter
 * @param {Object} allMetadata - All entity metadata
 * @param {number} [depth=0] - Current recursion depth (for cycle prevention)
 * @returns {{ clause: string, params: Array, nextOffset: number, nextAliasCounter: number }}
 */
function buildPolymorphicParentClause(access, rlsContext, tableAlias, paramOffset, aliasCounter, allMetadata, depth = 0) {
  const { foreignKey, polymorphic } = access;
  const { typeColumn, allowedTypes } = polymorphic;

  // Validate typeColumn
  const safeTypeColumn = sanitizeIdentifier(typeColumn, 'polymorphic.typeColumn');
  const safeForeignKey = sanitizeIdentifier(foreignKey, 'parent.foreignKey');

  // Get parent type from runtime context
  const polymorphicContext = rlsContext.polymorphic;
  if (!polymorphicContext || !polymorphicContext.parentType) {
    // No parentType in context - this happens when:
    // 1. Direct query to /files without ?entity_type filter
    // 2. Missing route middleware setup
    logger.debug('RLS polymorphic access denied - no parentType in context');
    throw new AppError(
      'Polymorphic parent access requires parent type in context (use route params or entity_type filter)',
      400,
      'BAD_REQUEST',
    );
  }

  const { parentType, parentId } = polymorphicContext;

  // Validate parentType against allowlist if specified
  if (allowedTypes && !allowedTypes.includes(parentType)) {
    logger.debug('RLS polymorphic access denied - parentType not in allowedTypes', {
      parentType,
      allowedTypes,
    });
    return { clause: 'FALSE', params: [], nextOffset: paramOffset, nextAliasCounter: aliasCounter };
  }

  // Validate parentType exists in metadata
  if (!allMetadata || !allMetadata[parentType]) {
    logger.debug('RLS polymorphic access denied - parentType not found in metadata', { parentType });
    return { clause: 'FALSE', params: [], nextOffset: paramOffset, nextAliasCounter: aliasCounter };
  }

  // Build the parent clause using static parent logic
  // Pass depth through - it was already checked/incremented in buildParentClause
  const result = buildStaticParentClause(
    parentType,
    safeForeignKey,
    rlsContext,
    tableAlias,
    paramOffset,
    aliasCounter,
    allMetadata,
    depth,
  );

  // If parent clause is FALSE, return immediately
  if (result.clause === 'FALSE') {
    return result;
  }

  // Build type column reference
  const typeRef = tableAlias ? `${tableAlias}.${safeTypeColumn}` : safeTypeColumn;

  // Combine type check with parent EXISTS clause
  // Result: (entity_type = 'work_order' AND EXISTS (...))
  const clause = `(${typeRef} = '${parentType}' AND ${result.clause})`;

  logger.debug('RLS polymorphic parent clause built', {
    parentType,
    typeColumn: safeTypeColumn,
    foreignKey: safeForeignKey,
    hasParentId: !!parentId,
  });

  return {
    clause,
    params: result.params,
    nextOffset: result.nextOffset,
    nextAliasCounter: result.nextAliasCounter,
  };
}

module.exports = {
  buildAccessClause,
  buildDirectClause,
  buildJunctionClause,
  buildParentClause,
  buildStaticParentClause,
  buildPolymorphicParentClause,
  combineClausesOr,
  resolveFilterValues,
};
