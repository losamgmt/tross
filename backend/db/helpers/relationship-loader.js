/**
 * Relationship Loader Helper
 *
 * SRP: Load related entities via junction tables and foreign keys using batch queries.
 * Implements post-query loading pattern to avoid SQL row multiplication.
 *
 * PHILOSOPHY:
 * - BATCH: Load all related records in minimal queries (avoid N+1)
 * - METADATA-DRIVEN: Uses relationship definitions from entity metadata
 * - PURE: No side effects, returns new data structures
 * - SECURE: Uses parameterized queries throughout
 * - RLS-AWARE: Applies row-level security to related entities
 *
 * USAGE:
 *   const loaded = await loadRelationships(entityName, ['units', 'invoices'], parentRecords, { rlsContext });
 *   // Returns parentRecords with units: [...] and invoices: [...] attached (RLS-filtered)
 *
 * @module relationship-loader
 */

const db = require('../connection');
const { logger } = require('../../config/logger');
const allMetadata = require('../../config/models');
const { buildRLSFilter } = require('./rls');

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for regex
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find entity metadata by table name
 * @param {string} tableName - Database table name (e.g., 'work_orders')
 * @returns {Object|null} Entity metadata or null
 */
function _findMetadataByTable(tableName) {
  for (const [_entityKey, metadata] of Object.entries(allMetadata)) {
    if (metadata.tableName === tableName) {
      return metadata;
    }
  }
  return null;
}

/**
 * Build RLS clause for a related entity
 * @param {string} tableName - Target table name
 * @param {string} tableAlias - Alias used in query
 * @param {Object} rlsContext - RLS context from request
 * @param {number} paramOffset - Starting param index
 * @returns {{ clause: string, params: array, nextOffset: number }}
 */
function _buildRelatedRLS(tableName, tableAlias, rlsContext, paramOffset) {
  if (!rlsContext) {
    return { clause: '', params: [], nextOffset: paramOffset };
  }

  const targetMetadata = _findMetadataByTable(tableName);
  if (!targetMetadata || !targetMetadata.rlsRules || targetMetadata.rlsRules.length === 0) {
    return { clause: '', params: [], nextOffset: paramOffset };
  }

  const rlsResult = buildRLSFilter(rlsContext, targetMetadata, 'read', paramOffset, allMetadata);

  if (!rlsResult.applied || !rlsResult.clause) {
    return { clause: '', params: [], nextOffset: paramOffset };
  }

  // Replace table alias in clause (buildRLSFilter uses tableName as alias)
  // Escape tableName for regex to handle special characters safely
  const adjustedClause = rlsResult.clause.replace(
    new RegExp(`\\b${escapeRegExp(targetMetadata.tableName)}\\.`, 'g'),
    `${tableAlias}.`,
  );

  return {
    clause: adjustedClause,
    params: rlsResult.params,
    nextOffset: paramOffset + rlsResult.params.length,
  };
}

/**
 * Build SELECT clause from fields array
 * @param {string[]} fields - Field names to select
 * @param {string} [tableAlias] - Optional table alias for prefixing
 * @returns {string} SELECT clause (e.g., 'id, name, status')
 */
function _buildSelectClause(fields, tableAlias = null) {
  if (!fields || fields.length === 0) {
    return '*';
  }
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return fields.map((f) => `${prefix}${f}`).join(', ');
}

/**
 * Group records by a key field
 * @param {Object[]} records - Array of records
 * @param {string} keyField - Field to group by
 * @returns {Map<number, Object[]>} Map of key -> records
 */
function groupByKey(records, keyField) {
  const map = new Map();
  for (const record of records) {
    const key = record[keyField];
    if (key === null || key === undefined) {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(record);
  }
  return map;
}

// ============================================================================
// CORE LOADERS
// ============================================================================

/**
 * Load manyToMany related records via junction table
 *
 * Query pattern:
 *   SELECT t.id, t.field1, t.field2
 *   FROM target_table t
 *   INNER JOIN junction_table j ON t.id = j.target_key
 *   WHERE j.source_key IN ($1, $2, ...)
 *   AND (RLS clause)
 *
 * @param {string} relationshipName - Name of relationship (for logging)
 * @param {Object} relDef - Relationship definition from metadata
 * @param {number[]} parentIds - Array of parent entity IDs
 * @param {Object} [rlsContext] - RLS context for filtering
 * @returns {Promise<Map<number, Object[]>>} Map of parentId -> related records
 */
async function loadManyToMany(relationshipName, relDef, parentIds, rlsContext = null) {
  if (!parentIds || parentIds.length === 0) {
    return new Map();
  }

  const { table, through, foreignKey, targetKey, fields = [] } = relDef;

  // Validate required M:M properties
  if (!through || !targetKey) {
    logger.warn('loadManyToMany: Missing through or targetKey', {
      relationship: relationshipName,
      through,
      targetKey,
    });
    return new Map();
  }

  // Build query
  // Join junction to target, select target fields + junction's source FK for grouping
  const selectFields = fields.length > 0
    ? fields.map((f) => `t.${f}`).join(', ')
    : 't.*';

  // Build params and RLS
  const params = [...parentIds];
  const placeholders = parentIds.map((_, i) => `$${i + 1}`).join(', ');

  // Apply RLS to the target entity
  const rls = _buildRelatedRLS(table, 't', rlsContext, parentIds.length + 1);
  const rlsClause = rls.clause ? `AND ${rls.clause}` : '';
  params.push(...rls.params);

  const query = `
    SELECT ${selectFields}, j.${foreignKey} as _parent_id
    FROM ${table} t
    INNER JOIN ${through} j ON t.id = j.${targetKey}
    WHERE j.${foreignKey} IN (${placeholders})
      AND j.is_active = true
      ${rlsClause}
    ORDER BY t.id
  `;

  logger.debug('loadManyToMany query', {
    relationship: relationshipName,
    parentCount: parentIds.length,
    rlsApplied: !!rls.clause,
  });

  try {
    const result = await db.query(query, params);

    // Group by parent ID
    const grouped = groupByKey(result.rows, '_parent_id');

    // Remove _parent_id from each record
    for (const records of grouped.values()) {
      for (const record of records) {
        delete record._parent_id;
      }
    }

    return grouped;
  } catch (error) {
    logger.error('loadManyToMany failed', {
      relationship: relationshipName,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Load hasMany related records via foreign key
 *
 * Query pattern:
 *   SELECT id, field1, field2, parent_fk
 *   FROM child_table
 *   WHERE parent_fk IN ($1, $2, ...)
 *   AND (RLS clause)
 *
 * @param {string} relationshipName - Name of relationship (for logging)
 * @param {Object} relDef - Relationship definition from metadata
 * @param {number[]} parentIds - Array of parent entity IDs
 * @param {Object} [rlsContext] - RLS context for filtering
 * @returns {Promise<Map<number, Object[]>>} Map of parentId -> related records
 */
async function loadHasMany(relationshipName, relDef, parentIds, rlsContext = null) {
  if (!parentIds || parentIds.length === 0) {
    return new Map();
  }

  const { table, foreignKey, fields = [] } = relDef;

  // Build select - always include FK for grouping
  const selectFields = fields.length > 0
    ? [...new Set([...fields, foreignKey])].map((f) => f).join(', ')
    : '*';

  // Build params and RLS
  const params = [...parentIds];
  const placeholders = parentIds.map((_, i) => `$${i + 1}`).join(', ');

  // Apply RLS to the related entity
  const rls = _buildRelatedRLS(table, table, rlsContext, parentIds.length + 1);
  const rlsClause = rls.clause ? `AND ${rls.clause}` : '';
  params.push(...rls.params);

  const query = `
    SELECT ${selectFields}
    FROM ${table}
    WHERE ${foreignKey} IN (${placeholders})
      AND is_active = true
      ${rlsClause}
    ORDER BY id
  `;

  logger.debug('loadHasMany query', {
    relationship: relationshipName,
    parentCount: parentIds.length,
    rlsApplied: !!rls.clause,
  });

  try {
    const result = await db.query(query, params);

    // Group by foreign key
    const grouped = groupByKey(result.rows, foreignKey);

    // Optionally remove FK from records if not in requested fields
    if (fields.length > 0 && !fields.includes(foreignKey)) {
      for (const records of grouped.values()) {
        for (const record of records) {
          delete record[foreignKey];
        }
      }
    }

    return grouped;
  } catch (error) {
    logger.error('loadHasMany failed', {
      relationship: relationshipName,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Load hasOne related record via foreign key
 * Same as hasMany but expects single record per parent
 *
 * @param {string} relationshipName - Name of relationship
 * @param {Object} relDef - Relationship definition
 * @param {number[]} parentIds - Array of parent entity IDs
 * @param {Object} [rlsContext] - RLS context for filtering
 * @returns {Promise<Map<number, Object>>} Map of parentId -> single related record
 */
async function loadHasOne(relationshipName, relDef, parentIds, rlsContext = null) {
  // Load as hasMany, then flatten to single record
  const hasManyResult = await loadHasMany(relationshipName, relDef, parentIds, rlsContext);

  const result = new Map();
  for (const [parentId, records] of hasManyResult) {
    // Take first record only (hasOne = single relationship)
    result.set(parentId, records[0] || null);
  }

  return result;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load specified relationships for parent records
 *
 * @param {string} entityName - Parent entity name (e.g., 'customer')
 * @param {string[]} includeRelationships - Relationship names to load (e.g., ['units', 'invoices'])
 * @param {Object[]} parentRecords - Array of parent records (must have primary key)
 * @param {Object} [options={}] - Options
 * @param {Object} [options.rlsContext] - RLS context to apply to related entities
 * @returns {Promise<Object[]>} Parent records with relationships attached (RLS-filtered)
 *
 * @example
 *   const customers = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
 *   const result = await loadRelationships('customer', ['units'], customers, { rlsContext });
 *   // Returns: [
 *   //   { id: 1, name: 'Alice', units: [{ id: 10, unit_identifier: '4A' }] },
 *   //   { id: 2, name: 'Bob', units: [] }
 *   // ]
 */
async function loadRelationships(entityName, includeRelationships, parentRecords, options = {}) {
  const { rlsContext = null } = options;

  if (!includeRelationships || includeRelationships.length === 0) {
    return parentRecords;
  }

  if (!parentRecords || parentRecords.length === 0) {
    return parentRecords;
  }

  // Get entity metadata
  const metadata = allMetadata[entityName];
  if (!metadata) {
    logger.warn('loadRelationships: Unknown entity', { entityName });
    return parentRecords;
  }

  const { relationships = {}, primaryKey = 'id' } = metadata;

  // Extract parent IDs
  const parentIds = parentRecords.map((r) => r[primaryKey]).filter((id) => id !== null && id !== undefined);
  if (parentIds.length === 0) {
    return parentRecords;
  }

  // Load each requested relationship
  const relationshipData = new Map();

  for (const relName of includeRelationships) {
    const relDef = relationships[relName];
    if (!relDef) {
      logger.warn('loadRelationships: Unknown relationship', {
        entityName,
        relationship: relName,
        available: Object.keys(relationships),
      });
      continue;
    }

    let loaded;
    switch (relDef.type) {
      case 'manyToMany':
        loaded = await loadManyToMany(relName, relDef, parentIds, rlsContext);
        break;
      case 'hasMany':
        loaded = await loadHasMany(relName, relDef, parentIds, rlsContext);
        break;
      case 'hasOne':
        loaded = await loadHasOne(relName, relDef, parentIds, rlsContext);
        break;
      case 'belongsTo':
        // belongsTo is already handled by buildDefaultIncludesClauses JOINs
        // Skip here to avoid duplicate data
        logger.debug('loadRelationships: Skipping belongsTo (handled by JOIN)', {
          relationship: relName,
        });
        continue;
      default:
        logger.warn('loadRelationships: Unknown relationship type', {
          relationship: relName,
          type: relDef.type,
        });
        continue;
    }

    relationshipData.set(relName, loaded);
  }

  // Attach relationship data to parent records
  const result = parentRecords.map((record) => {
    const parentId = record[primaryKey];
    const enriched = { ...record };

    for (const [relName, dataMap] of relationshipData) {
      const relDef = relationships[relName];
      if (relDef.type === 'hasOne') {
        // Single record or null
        enriched[relName] = dataMap.get(parentId) || null;
      } else {
        // Array of records (manyToMany, hasMany)
        enriched[relName] = dataMap.get(parentId) || [];
      }
    }

    return enriched;
  });

  logger.debug('loadRelationships complete', {
    entityName,
    relationships: includeRelationships,
    parentCount: parentRecords.length,
  });

  return result;
}

/**
 * Validate relationship names against entity metadata
 *
 * @param {string} entityName - Entity name
 * @param {string[]} relationshipNames - Relationship names to validate
 * @returns {{ valid: string[], invalid: string[] }} Validation result
 */
function validateRelationshipNames(entityName, relationshipNames) {
  const metadata = allMetadata[entityName];
  if (!metadata) {
    return { valid: [], invalid: relationshipNames };
  }

  const available = Object.keys(metadata.relationships || {});
  // Filter out belongsTo since those are handled by JOINs
  const loadable = available.filter((name) => {
    const rel = metadata.relationships[name];
    return rel.type !== 'belongsTo';
  });

  const valid = [];
  const invalid = [];

  for (const name of relationshipNames) {
    if (loadable.includes(name)) {
      valid.push(name);
    } else if (available.includes(name)) {
      // belongsTo - not an error, just skip
      logger.debug('validateRelationshipNames: belongsTo skipped', { name });
    } else {
      invalid.push(name);
    }
  }

  return { valid, invalid };
}

module.exports = {
  loadRelationships,
  validateRelationshipNames,
  // Expose for testing
  loadManyToMany,
  loadHasMany,
  loadHasOne,
  groupByKey,
};
