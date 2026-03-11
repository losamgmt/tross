/**
 * RLS SQL Cache
 *
 * Memoization for compiled SQL shapes.
 * Caches generated clauses by entity + operation + role combination.
 * Parameters are NOT cached (they vary per request).
 *
 * ADR-011: Rule-based RLS engine.
 *
 * @module db/helpers/rls/sql-cache
 */

const { logger } = require('../../../config/logger');
const { RLS_ENGINE } = require('../../../config/constants');

// In-memory cache: Map<cacheKey, { clauseTemplate, createdAt }>
const cache = new Map();

/**
 * Generate cache key for RLS clause lookup
 *
 * @param {string} entity - Entity type
 * @param {string} operation - Operation (read, summary, etc.)
 * @param {string} role - User role
 * @returns {string} Cache key
 */
function getCacheKey(entity, operation, role) {
  return `${entity}:${operation}:${role}`;
}

/**
 * Get cached clause template
 *
 * @param {string} entity
 * @param {string} operation
 * @param {string} role
 * @returns {Object|null} Cached clause template or null
 */
function getCachedClause(entity, operation, role) {
  const key = getCacheKey(entity, operation, role);
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  logger.debug('RLS cache hit', { entity, operation, role });
  return cached.clauseTemplate;
}

/**
 * Cache a clause template
 *
 * @param {string} entity
 * @param {string} operation
 * @param {string} role
 * @param {Object} clauseTemplate - The clause template to cache
 */
function cacheClause(entity, operation, role, clauseTemplate) {
  // Evict oldest entries if cache is full
  if (cache.size >= RLS_ENGINE.CACHE_MAX_SIZE) {
    const evictCount = Math.floor(RLS_ENGINE.CACHE_MAX_SIZE * RLS_ENGINE.CACHE_EVICT_PERCENT);
    evictOldest(evictCount);
    logger.debug('RLS cache evicted entries', { count: evictCount });
  }

  const key = getCacheKey(entity, operation, role);
  cache.set(key, {
    clauseTemplate,
    createdAt: Date.now(),
  });
}

/**
 * Evict oldest cache entries
 *
 * @param {number} count - Number of entries to evict
 */
function evictOldest(count) {
  const entries = Array.from(cache.entries())
    .sort((a, b) => a[1].createdAt - b[1].createdAt)
    .slice(0, count);

  for (const [key] of entries) {
    cache.delete(key);
  }
}

/**
 * Clear all cached clauses
 * Useful for testing or when metadata changes
 */
function clearCache() {
  const previousSize = cache.size;
  cache.clear();
  if (previousSize > 0) {
    logger.debug('RLS cache cleared', { previousSize });
  }
}

/**
 * Get cache statistics
 * @returns {{ size: number, maxSize: number }}
 */
function getCacheStats() {
  return {
    size: cache.size,
    maxSize: RLS_ENGINE.CACHE_MAX_SIZE,
  };
}

/**
 * Invalidate cache for a specific entity
 * Call when entity metadata changes
 *
 * @param {string} entity - Entity type to invalidate
 */
function invalidateEntity(entity) {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(`${entity}:`)) {
      cache.delete(key);
      count++;
    }
  }
  if (count > 0) {
    logger.debug('RLS cache invalidated entity', { entity, entriesRemoved: count });
  }
}

module.exports = {
  getCacheKey,
  getCachedClause,
  cacheClause,
  clearCache,
  getCacheStats,
  invalidateEntity,
};
