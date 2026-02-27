/**
 * RLS Filter Helper
 *
 * SRP LITERALISM: ONLY builds RLS WHERE clauses based on filter configuration
 *
 * ARCHITECTURE: ADR-008 - Row-Level Security Field-Based Filtering
 *
 * PHILOSOPHY:
 * - DATA-DRIVEN: Filter configuration IS the data (field name, value key)
 * - ZERO DUPLICATION: One handler for all entities
 * - FAIL-CLOSED: Unknown/missing values deny access
 * - COMPOSABLE: Returns clause/params combinable with other WHERE conditions
 *
 * FILTER CONFIG VALUES (from rlsPolicy in entity metadata):
 *   - null: No filtering (all records)
 *   - false: Deny all access
 *   - '$parent': Access derived from parent entity (sub-entities)
 *   - 'field_name': Filter by field using userId (shorthand)
 *   - { field, value }: Filter by field using rlsContext[value]
 *
 * CONTEXT VALUES AVAILABLE:
 *   - userId: Current user's ID (users.id)
 *   - customerProfileId: User's customer profile (users.customer_profile_id)
 *   - technicianProfileId: User's technician profile (users.technician_profile_id)
 *
 * USAGE:
 *   const { clause, params, applied } = buildRLSFilter(rlsContext, metadata, paramOffset);
 *   // clause: 'customer_id = $3' or '' or '1=0'
 *   // params: [userId] or []
 *   // applied: true if RLS was processed
 */

const { logger } = require('../../config/logger');

/**
 * Build RLS filter clause based on request context and entity metadata
 *
 * ADR-008: Single generic handler interprets filterConfig as data.
 *
 * @param {Object} rlsContext - RLS context from middleware
 * @param {*} rlsContext.filterConfig - Filter configuration (null | false | string | object)
 * @param {number} rlsContext.userId - User's ID
 * @param {number|null} rlsContext.customerProfileId - User's customer profile ID
 * @param {number|null} rlsContext.technicianProfileId - User's technician profile ID
 * @param {Object} metadata - Entity metadata from config/models
 * @param {string} metadata.tableName - Table name for prefixing columns
 * @param {number} [paramOffset=0] - Starting parameter offset (for $N placeholders)
 * @returns {Object} { clause: string, params: array, applied: boolean }
 *
 * @example
 *   // Customer viewing work orders - filterConfig: { field: 'customer_id', value: 'customerProfileId' }
 *   const filter = buildRLSFilter(rlsContext, workOrderMetadata, 2);
 *   // Returns: { clause: 'work_orders.customer_id = $3', params: [45], applied: true }
 *
 * @example
 *   // Admin viewing anything - filterConfig: null
 *   const filter = buildRLSFilter(rlsContext, userMetadata, 0);
 *   // Returns: { clause: '', params: [], applied: true }
 */
function buildRLSFilter(rlsContext, metadata, paramOffset = 0) {
  // If no RLS context, return unapplied (caller must decide if this is OK)
  if (!rlsContext) {
    logger.debug('buildRLSFilter: No RLS context provided', {
      entity: metadata?.tableName,
    });
    return {
      clause: '',
      params: [],
      applied: false,
    };
  }

  const { filterConfig } = rlsContext;
  const tableName = metadata?.tableName || '';

  // Handle null: All records (no filter)
  if (filterConfig === null) {
    logger.debug('buildRLSFilter: All records (filterConfig=null)', {
      entity: tableName,
    });
    return {
      clause: '',
      params: [],
      applied: true,
      noFilter: true,
    };
  }

  // Handle false: Deny all access
  if (filterConfig === false) {
    logger.debug('buildRLSFilter: Deny all (filterConfig=false)', {
      entity: tableName,
    });
    return {
      clause: '1=0',
      params: [],
      applied: true,
    };
  }

  // Handle '$parent': Parent entity access (sub-entity pattern)
  // This should only reach here if misconfigured - sub-entities use custom middleware
  // Fail closed for security
  if (filterConfig === '$parent') {
    logger.warn(
      'buildRLSFilter: $parent policy reached generic filter - denying (misconfiguration)',
      { entity: tableName },
    );
    return {
      clause: '1=0',
      params: [],
      applied: true,
    };
  }

  // Normalize shorthand string to object form
  // 'user_id' → { field: 'user_id', value: 'userId' }
  const config =
    typeof filterConfig === 'string'
      ? { field: filterConfig, value: 'userId' }
      : filterConfig;

  // Validate config shape
  if (!config || typeof config !== 'object' || !config.field) {
    logger.warn('buildRLSFilter: Invalid filterConfig, denying access', {
      entity: tableName,
      filterConfig,
    });
    return {
      clause: '1=0',
      params: [],
      applied: true,
    };
  }

  const { field, value = 'userId' } = config;

  // Get the actual filter value from context
  const filterValue = rlsContext[value];

  // If filter value is undefined or null, deny access (fail closed)
  // This handles cases like technicians without technician_profile_id
  if (filterValue === undefined || filterValue === null) {
    logger.debug(
      'buildRLSFilter: Missing filter value in context, denying access',
      {
        entity: tableName,
        field,
        valueKey: value,
        availableKeys: Object.keys(rlsContext).filter(
          (k) => rlsContext[k] !== null,
        ),
      },
    );
    return {
      clause: '1=0',
      params: [],
      applied: true,
    };
  }

  // Build the WHERE clause
  const prefix = tableName ? `${tableName}.` : '';
  const clause = `${prefix}${field} = $${paramOffset + 1}`;

  logger.debug('buildRLSFilter: Applied field filter', {
    entity: tableName,
    field,
    valueKey: value,
    clause,
  });

  return {
    clause,
    params: [filterValue],
    applied: true,
  };
}

/**
 * Build RLS filter for findById operations
 *
 * For findById, we need to verify the user can access the specific record.
 * This returns an additional WHERE condition that should be ANDed with id = $1.
 *
 * @param {Object} rlsContext - RLS context from middleware
 * @param {Object} metadata - Entity metadata
 * @param {number} [paramOffset=1] - Starting offset (1 because $1 is the ID)
 * @returns {Object} { clause: string, params: array, applied: boolean }
 *
 * @example
 *   // Customer accessing their own customer record
 *   // filterConfig: { field: 'id', value: 'customerProfileId' }
 *   const filter = buildRLSFilterForFindById(rlsContext, customerMetadata);
 *   // Final query: SELECT * FROM customers WHERE id = $1 AND id = $2
 *   // With params: [requestedId, 45]
 */
function buildRLSFilterForFindById(rlsContext, metadata, paramOffset = 1) {
  return buildRLSFilter(rlsContext, metadata, paramOffset);
}

/**
 * Check if an RLS filter config allows access to any records
 *
 * Utility function to quickly check if a config will deny all access.
 *
 * @param {*} filterConfig - RLS filter configuration
 * @returns {boolean} True if config allows any access, false if deny_all
 */
function filterConfigAllowsAccess(filterConfig) {
  // false explicitly denies
  if (filterConfig === false) {return false;}
  // null allows all
  if (filterConfig === null) {return true;}
  // String or object config may allow (depends on context values)
  return true;
}

/**
 * Get description of filter config for logging/debugging
 *
 * @param {*} filterConfig - RLS filter configuration
 * @returns {string} Human-readable description
 */
function describeFilterConfig(filterConfig) {
  if (filterConfig === null) {return 'all_records';}
  if (filterConfig === false) {return 'deny_all';}
  if (filterConfig === '$parent') {return 'parent_entity_access';}
  if (typeof filterConfig === 'string') {return `filter_by_${filterConfig}`;}
  if (filterConfig?.field) {
    return `filter_by_${filterConfig.field}_via_${filterConfig.value || 'userId'}`;
  }
  return 'unknown';
}

module.exports = {
  buildRLSFilter,
  buildRLSFilterForFindById,
  filterConfigAllowsAccess,
  describeFilterConfig,
};
