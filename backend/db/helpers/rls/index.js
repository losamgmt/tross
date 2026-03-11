/**
 * RLS Engine - Rule-Based Row-Level Security
 *
 * ADR-011: Declarative grant rules for row-level access control.
 *
 * Supports:
 * - Direct field matching (WHERE table.field = $value)
 * - Junction table access (WHERE EXISTS subquery)
 * - Parent entity delegation (WHERE EXISTS subquery to parent's RLS)
 * - Multi-hop access (through junction or parent chains)
 * - Multiple rules combined with OR
 *
 * Grant-only model: No matching grant = implicit deny.
 *
 * @module db/helpers/rls
 */

const { matchRules, getContextValue, isValidAccessType } = require('./rule-matcher');
const { buildAccessClause, buildParentClause, combineClausesOr } = require('./clause-builder');
const { getCachedClause, cacheClause, clearCache, invalidateEntity } = require('./sql-cache');
const { validateAllRules: validateAllMetadataRules } = require('./path-validator');
const AppError = require('../../../utils/app-error');
const { logger } = require('../../../config/logger');

/**
 * Build RLS filter clause using rule-based engine
 *
 * @param {Object} rlsContext - Context from enforceRLS middleware
 * @param {string} rlsContext.role - User's role
 * @param {number} rlsContext.userId - User's ID
 * @param {number|null} rlsContext.customerProfileId - Customer profile ID
 * @param {number|null} rlsContext.technicianProfileId - Technician profile ID
 * @param {Object} metadata - Entity metadata
 * @param {string} [operation='read'] - Operation being performed
 * @param {number} [paramOffset=1] - Starting parameter offset (1-indexed)
 * @param {Object} [allMetadata=null] - All entity metadata (required for parent access)
 * @returns {Object} { clause: string, params: array, applied: boolean }
 */
function buildRLSFilter(rlsContext, metadata, operation = 'read', paramOffset = 1, allMetadata = null) {
  if (!rlsContext || !metadata) {
    logger.warn('RLS buildRLSFilter called with missing context or metadata');
    return { clause: '', params: [], applied: false };
  }

  const { role } = rlsContext;
  const tableName = metadata.tableName;
  const tableAlias = tableName;
  const entityType = metadata.entityType;

  // Only use rlsRules (no legacy fallback)
  const rules = metadata.rlsRules;

  if (!rules || rules.length === 0) {
    // No rules defined = no RLS applied
    logger.debug('RLS no rules defined', { entity: entityType, operation });
    return { clause: '', params: [], applied: false };
  }

  // Match applicable rules
  const matchedRules = matchRules(rules, role, operation);

  if (matchedRules.length === 0) {
    // No matching rules = deny
    logger.debug('RLS access denied - no matching rules', { entity: entityType, role, operation });
    return { clause: '1=0', params: [], applied: true };
  }

  // Check for null access (full access)
  const hasFullAccess = matchedRules.some(r => r.access === null);
  if (hasFullAccess) {
    logger.debug('RLS full access granted', { entity: entityType, role, operation });
    return { clause: '', params: [], applied: true, noFilter: true };
  }

  // Build clauses for each rule with unique alias tracking
  const clauseResults = [];
  let currentOffset = paramOffset;
  let aliasCounter = 0;

  for (const rule of matchedRules) {
    const result = buildAccessClause(rule.access, rlsContext, tableAlias, currentOffset, aliasCounter, allMetadata);
    clauseResults.push(result);
    currentOffset = result.nextOffset;
    aliasCounter = result.nextAliasCounter;
  }

  // Combine with OR
  const combined = combineClausesOr(clauseResults);

  if (combined.clause === 'TRUE') {
    logger.debug('RLS full access via TRUE clause', { entity: entityType, role, operation });
    return { clause: '', params: [], applied: true, noFilter: true };
  }

  if (combined.clause === 'FALSE') {
    logger.debug('RLS access denied via FALSE clause', { entity: entityType, role, operation });
    return { clause: '1=0', params: [], applied: true };
  }

  logger.debug('RLS filter applied', {
    entity: entityType,
    role,
    operation,
    clauseCount: clauseResults.length,
    paramCount: combined.params.length,
  });

  return {
    clause: `(${combined.clause})`,
    params: combined.params,
    applied: true,
  };
}

/**
 * Validate all entity RLS rules at startup
 * Call this during server initialization
 *
 * @param {Object} allMetadata - Map of entity type to metadata
 * @throws {AppError} If validation fails
 */
function validateAllRules(allMetadata) {
  const result = validateAllMetadataRules(allMetadata);

  if (!result.valid) {
    const errorMessage = `RLS validation failed:\n${result.errors.join('\n')}`;
    logger.error('RLS validation failed', { errors: result.errors });
    throw new AppError(errorMessage, 500, 'INTERNAL_ERROR');
  }

  logger.info('✅ RLS rules validated', { entityCount: Object.keys(allMetadata).length });
}

module.exports = {
  buildRLSFilter,
  validateAllRules,
  // Re-export for direct use
  matchRules,
  getContextValue,
  isValidAccessType,
  buildAccessClause,
  buildParentClause,
  combineClausesOr,
  // Cache management
  clearCache,
  invalidateEntity,
  getCachedClause,
  cacheClause,
};
