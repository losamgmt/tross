/**
 * Route Loader - Metadata-Driven Entity Route Registration
 *
 * Extracts route loading logic from server.js for SRP.
 * Dynamically loads entity routes based on metadata configuration.
 *
 * WHY THIS EXISTS:
 * - server.js should orchestrate, not enumerate every entity
 * - Route configuration lives in metadata, not hardcoded lists
 * - Adding a new entity should NOT require editing server.js
 *
 * WHAT THIS HANDLES:
 * - Entity CRUD routes (users, customers, work_orders, etc.)
 *
 * WHAT THIS DOES NOT HANDLE (kept explicit in server.js):
 * - Infrastructure routes (auth, health, dev, schema)
 * - Utility routes (stats, export, audit, admin)
 * - Entity extensions (roles-extensions) - these are entity-specific customizations
 * - Custom entity routes (preferences, files) - these have specialized logic
 */

const allMetadata = require('./models');
const entityRouters = require('../routes/entities');

// Derive uncountable entity names from metadata at load time (no hardcoding!)
const UNCOUNTABLE_ENTITIES = Object.entries(allMetadata)
  .filter(([, meta]) => meta.uncountable === true)
  .map(([key]) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()));

/**
 * Maps entity name to router export name.
 * Must match the naming convention in routes/entities.js
 *
 * @param {string} entityName - Snake_case entity name (e.g., 'work_order')
 * @returns {string} Router export name (e.g., 'workOrdersRouter')
 */
function toRouterName(entityName) {
  // Convert snake_case to camelCase
  const camelCase = entityName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

  // Uncountable nouns derived from metadata (no plural form)
  if (UNCOUNTABLE_ENTITIES.includes(camelCase)) {
    return `${camelCase}Router`;
  }

  // Simple pluralization: 'y' -> 'ies' for consonant+y, otherwise add 's'
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const plural = camelCase.endsWith('y') && !vowels.includes(camelCase.slice(-2, -1))
    ? camelCase.slice(0, -1) + 'ies'
    : camelCase + 's';

  return `${plural}Router`;
}

/**
 * Load all entity routes for dynamic mounting in server.js
 *
 * Reads metadata to determine which entities should use generic CRUD routes,
 * then returns an array of route configurations ready for app.use().
 *
 * @returns {Array<{path: string, router: Router, entityName: string}>}
 */
function loadEntityRoutes() {
  const routes = [];

  for (const [entityName, metadata] of Object.entries(allMetadata)) {
    // Only load routes for entities that opt-in to generic routing
    if (!metadata.routeConfig?.useGenericRouter) {
      continue;
    }

    // Get the router by its export name
    const routerName = toRouterName(entityName);
    const router = entityRouters[routerName];

    if (!router) {
      // This is a configuration error - routeConfig says use generic, but no router exists
      console.error(
        `[route-loader] ❌ Router not found for entity '${entityName}' ` +
        `(expected export: '${routerName}'). Check routes/entities.js exports.`,
      );
      continue;
    }

    // Mount path: explicit in routeConfig, or derive from tableName
    const mountPath = metadata.routeConfig.mountPath || `/api/${metadata.tableName}`;

    routes.push({
      path: mountPath,
      router,
      entityName, // Include for logging/debugging
    });
  }

  return routes;
}

/**
 * Get a summary of loaded routes for logging
 * @param {Array} routes - Output from loadEntityRoutes()
 * @returns {string} Formatted summary
 */
function getRouteSummary(routes) {
  return routes.map((r) => `  ${r.path} (${r.entityName})`).join('\n');
}

module.exports = {
  loadEntityRoutes,
  toRouterName,
  getRouteSummary,
};
