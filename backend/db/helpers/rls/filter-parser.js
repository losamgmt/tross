/**
 * RLS Filter Parser
 *
 * Converts filter objects to parameterized SQL conditions.
 * Simple object → SQL clause conversion with operator support.
 *
 * ADR-011: Rule-based RLS engine filter syntax.
 *
 * @module db/helpers/rls/filter-parser
 */

const { sanitizeIdentifier } = require('../../../utils/sql-safety');
const AppError = require('../../../utils/app-error');
const { logger } = require('../../../config/logger');
const { RLS_ENGINE } = require('../../../config/constants');

/**
 * SQL operators mapped from filter syntax
 * Supports equality and comparison operations
 */
const OPERATORS = Object.freeze({
  $eq: '=',
  $ne: '!=',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $in: 'IN',
  $nin: 'NOT IN',
  $null: 'IS NULL',
});

/**
 * Parse filter object into SQL condition with parameters
 *
 * Simple syntax:
 *   { role: 'board' } → "role = $1"
 *   { status: 'active', type: 'premium' } → "status = $1 AND type = $2"
 *
 * Operator syntax:
 *   { role: { $ne: 'board' } } → "role != $1"
 *   { count: { $gt: 5 } } → "count > $1"
 *   { status: { $in: ['a', 'b'] } } → "status IN ($1, $2)"
 *
 * @param {Object} filter - Filter object
 * @param {string} alias - Table alias for column prefixing
 * @param {number} paramOffset - Starting parameter offset (1-indexed)
 * @returns {{ sql: string, params: Array, nextOffset: number }}
 */
function parseFilter(filter, alias = '', paramOffset = 1) {
  if (!filter || typeof filter !== 'object') {
    return { sql: '', params: [], nextOffset: paramOffset };
  }

  const entries = Object.entries(filter);

  if (entries.length === 0) {
    return { sql: '', params: [], nextOffset: paramOffset };
  }

  if (entries.length > RLS_ENGINE.MAX_FILTER_CONDITIONS) {
    logger.warn('RLS filter exceeds max conditions', {
      count: entries.length,
      max: RLS_ENGINE.MAX_FILTER_CONDITIONS,
    });
    throw new AppError(
      `Filter exceeds maximum of ${RLS_ENGINE.MAX_FILTER_CONDITIONS} conditions`,
      400,
      'BAD_REQUEST',
    );
  }

  const conditions = [];
  const params = [];
  let currentParam = paramOffset;

  for (const [field, value] of entries) {
    // Use existing sql-safety validation
    const safeField = sanitizeIdentifier(field, 'filter field');
    const columnRef = alias ? `${alias}.${safeField}` : safeField;

    // Simple equality (null, primitives, arrays)
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      const result = parseSimpleValue(columnRef, value, currentParam);
      conditions.push(result.sql);
      params.push(...result.params);
      currentParam = result.nextOffset;
      continue;
    }

    // Operator syntax
    const result = parseOperatorValue(columnRef, value, currentParam);
    conditions.push(result.sql);
    params.push(...result.params);
    currentParam = result.nextOffset;
  }

  logger.debug('RLS filter parsed', {
    conditionCount: conditions.length,
    paramCount: params.length,
  });

  return {
    sql: conditions.join(' AND '),
    params,
    nextOffset: currentParam,
  };
}

/**
 * Parse simple value (null, primitive, array)
 */
function parseSimpleValue(columnRef, value, paramOffset) {
  if (value === null) {
    return { sql: `${columnRef} IS NULL`, params: [], nextOffset: paramOffset };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new AppError('IN clause requires non-empty array', 400, 'BAD_REQUEST');
    }
    const placeholders = value.map((_, i) => `$${paramOffset + i}`).join(', ');
    return {
      sql: `${columnRef} IN (${placeholders})`,
      params: value,
      nextOffset: paramOffset + value.length,
    };
  }

  return {
    sql: `${columnRef} = $${paramOffset}`,
    params: [value],
    nextOffset: paramOffset + 1,
  };
}

/**
 * Parse operator syntax value
 * { $ne: 'x' }, { $gt: 5 }, etc.
 */
function parseOperatorValue(columnRef, value, paramOffset) {
  const entries = Object.entries(value);

  if (entries.length !== 1) {
    throw new AppError(
      'Operator object must have exactly one key',
      400,
      'BAD_REQUEST',
    );
  }

  const [op, val] = entries[0];
  const sqlOp = OPERATORS[op];

  if (!sqlOp) {
    throw new AppError(`Unknown filter operator: ${op}`, 400, 'BAD_REQUEST');
  }

  // IS NULL / IS NOT NULL
  if (op === '$null') {
    const sql = val ? `${columnRef} IS NULL` : `${columnRef} IS NOT NULL`;
    return { sql, params: [], nextOffset: paramOffset };
  }

  // IN / NOT IN
  if (op === '$in' || op === '$nin') {
    if (!Array.isArray(val) || val.length === 0) {
      throw new AppError(`${op} requires non-empty array`, 400, 'BAD_REQUEST');
    }
    const placeholders = val.map((_, i) => `$${paramOffset + i}`).join(', ');
    return {
      sql: `${columnRef} ${sqlOp} (${placeholders})`,
      params: val,
      nextOffset: paramOffset + val.length,
    };
  }

  // Standard comparison
  return {
    sql: `${columnRef} ${sqlOp} $${paramOffset}`,
    params: [val],
    nextOffset: paramOffset + 1,
  };
}

module.exports = {
  parseFilter,
  OPERATORS,
};
