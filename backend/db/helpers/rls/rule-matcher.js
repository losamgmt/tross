/**
 * RLS Rule Matcher
 *
 * Matches rules by role and operation.
 * ADR-011: Rule-based RLS engine.
 *
 * @module db/helpers/rls/rule-matcher
 */

const { logger } = require('../../../config/logger');
const { RLS_ENGINE } = require('../../../config/constants');

/**
 * Match rules applicable for given role and operation
 *
 * @param {Array} rules - Array of RLS rules from entity metadata
 * @param {string} role - User's role
 * @param {string} operation - Operation being performed (read, summary, update, delete)
 * @returns {Array} Matching rules
 */
function matchRules(rules, role, operation) {
  if (!Array.isArray(rules) || !role || !operation) {
    return [];
  }

  const matched = rules.filter(rule => {
    // Check role match (support '*' wildcard)
    const roleMatches = Array.isArray(rule.roles)
      ? rule.roles.includes(role) || rule.roles.includes('*')
      : rule.roles === '*' || rule.roles === role;

    if (!roleMatches) {
      return false;
    }

    // Check operation match (support '*' wildcard)
    const opMatches = Array.isArray(rule.operations)
      ? rule.operations.includes(operation) || rule.operations.includes('*')
      : rule.operations === '*' || rule.operations === operation;

    return opMatches;
  });

  logger.debug('RLS rules matched', {
    role,
    operation,
    totalRules: rules.length,
    matchedCount: matched.length,
    matchedIds: matched.map(r => r.id),
  });

  return matched;
}

/**
 * Get context value from rlsContext by key
 *
 * Convention-based validation:
 * - 'userId' is always valid
 * - '*_profile_id' pattern matches profile columns from DB schema
 *
 * This is schema-driven: adding a new profile type to the users table
 * (e.g., vendor_profile_id) requires NO code changes here.
 *
 * @param {Object} rlsContext - Context containing userId, profile IDs, etc.
 * @param {string} valueKey - Key to retrieve (userId, customer_profile_id, etc.)
 * @returns {*} Context value or undefined
 */
function getContextValue(rlsContext, valueKey) {
  if (!rlsContext || !valueKey) {
    return undefined;
  }

  // Convention-based validation (no hardcoded list)
  const isValidKey = isValidContextKey(valueKey);

  if (!isValidKey) {
    logger.warn('RLS context key does not follow convention', {
      valueKey,
      hint: "Expected 'userId' or '*_profile_id' pattern",
    });
  }

  return rlsContext[valueKey];
}

/**
 * Check if a context key follows naming conventions
 *
 * Valid patterns:
 * - 'userId' - the user's ID
 * - '*_profile_id' - any profile foreign key (e.g., customer_profile_id)
 *
 * @param {string} key - Key to validate
 * @returns {boolean}
 */
function isValidContextKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  return key === 'userId' || key.endsWith('_profile_id');
}

/**
 * Check if access type is valid
 *
 * @param {string} type - Access type to check
 * @returns {boolean}
 */
function isValidAccessType(type) {
  return RLS_ENGINE.ACCESS_TYPES.includes(type);
}

module.exports = {
  matchRules,
  getContextValue,
  isValidAccessType,
  isValidContextKey,
};
