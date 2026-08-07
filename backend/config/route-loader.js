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
 * - File sub-routes for entities with supportsFileAttachments: true
 *
 * WHAT THIS DOES NOT HANDLE (kept explicit in server.js):
 * - Infrastructure routes (auth, health, dev, schema)
 * - Utility routes (stats, export, audit, admin)
 * - Entity extensions (roles-extensions) - these are entity-specific customizations
 */

const allMetadata = require('./models');
const { createEntityRouter } = require('../routes/entities');
const { createFileSubRouter } = require('../routes/file-sub-router');
const { getFeatures } = require('./metadata-accessors');

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

    // Generic routing needs an rlsResource for requirePermission/enforceRLS to
    // resolve at request time; skip loudly on misconfiguration.
    if (!metadata.rlsResource) {
      console.error(
        `[route-loader] ❌ '${entityName}' sets routeConfig.useGenericRouter ` +
          'but has no rlsResource; skipping route mount.',
      );
      continue;
    }

    // Mount path: explicit in routeConfig, or derive from tableName
    const mountPath =
      metadata.routeConfig.mountPath || `/api/${metadata.tableName}`;

    routes.push({
      path: mountPath,
      router: createEntityRouter(entityName),
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

/**
 * Load file sub-routers for entities with supportsFileAttachments: true
 *
 * Returns an array of route configurations for entities that support file attachments.
 * Each entity gets a sub-router mounted at /api/:tableName/:id/files
 *
 * @returns {Array<{path: string, router: Router, entityName: string}>}
 */
function loadFileSubRoutes() {
  const routes = [];

  for (const [entityName, metadata] of Object.entries(allMetadata)) {
    // Only create file sub-routes for entities that support file attachments
    // Use getFeatures() accessor for consolidated features property
    const features = getFeatures(metadata);
    if (!features.fileAttachments) {
      continue;
    }

    // Create a file sub-router for this entity
    const fileRouter = createFileSubRouter(metadata);

    // Mount path: /api/:tableName/:id/files
    const mountPath = `/api/${metadata.tableName}/:id/files`;

    routes.push({
      path: mountPath,
      router: fileRouter,
      entityName, // Include for logging/debugging
    });
  }

  return routes;
}

/**
 * Get a summary of file sub-routes for logging
 * @param {Array} routes - Output from loadFileSubRoutes()
 * @returns {string} Formatted summary
 */
function getFileRouteSummary(routes) {
  return routes.map((r) => `  ${r.path} (${r.entityName})`).join('\n');
}

module.exports = {
  loadEntityRoutes,
  loadFileSubRoutes,
  getRouteSummary,
  getFileRouteSummary,
};
