/**
 * Route Test Runner
 *
 * PRINCIPLE: Run all applicable scenarios for a route based on its registry metadata.
 * No if/else per route - scenarios self-select based on endpoint metadata.
 *
 * Usage:
 *   const { runRouteTests } = require('../../factory/route-runner');
 *   runRouteTests('admin', { app, db });
 *
 * Or test all routes:
 *   runAllRouteTests({ app, db });
 */

const routeRegistry = require('./route-registry');
const routeScenarios = require('./scenarios/route.scenarios');
const { buildTestContext } = require('./data/test-context');

/**
 * Run all test scenarios for a route
 *
 * @param {string} routeName - Route to test (e.g., 'admin', 'audit')
 * @param {Object} options - Configuration options
 * @param {Object} options.app - Express app instance (required)
 * @param {Object} options.db - Database pool (required)
 * @param {string[]} options.scenarios - Specific scenarios to run (default: all)
 * @param {string[]} options.skipEndpoints - Endpoint paths to skip
 */
function runRouteTests(routeName, options = {}) {
  const routeMeta = routeRegistry[routeName];

  if (!routeMeta) {
    throw new Error(`Unknown route: ${routeName}. Available: ${Object.keys(routeRegistry).join(', ')}`);
  }

  // Skip dynamic routes (tested via entity runner)
  if (routeMeta.isDynamic) {
    console.log(`Skipping dynamic route: ${routeName} (use entity runner instead)`);
    return;
  }

  const scenariosToRun = options.scenarios || Object.keys(routeScenarios);
  const skipEndpoints = options.skipEndpoints || [];

  describe(`${routeName} Route Tests`, () => {
    let ctx;

    beforeAll(async () => {
      if (!options.app || !options.db) {
        throw new Error('runRouteTests requires options.app and options.db');
      }
      ctx = buildTestContext(options.app, options.db);
    });

    afterEach(async () => {
      if (ctx?.cleanup) await ctx.cleanup();
    });

    // Run scenarios for each endpoint
    for (const endpoint of routeMeta.endpoints) {
      // Skip if in skipEndpoints list
      if (skipEndpoints.includes(endpoint.path)) continue;

      describe(`${endpoint.method} ${endpoint.path}`, () => {
        // Create lazy context that resolves at runtime
        const lazyCtx = {
          get request() {
            return ctx.request;
          },
          get db() {
            return ctx.db;
          },
          get factory() {
            return ctx.factory;
          },
          authHeader: async (role) => ctx.authHeader(role),
          it: (name, fn) => it(name, fn),
          expect: expect,
        };

        // Run each scenario
        for (const scenarioName of scenariosToRun) {
          const scenarioFn = routeScenarios[scenarioName];
          if (!scenarioFn) {
            console.warn(`Unknown route scenario: ${scenarioName}`);
            continue;
          }

          // Scenario self-selects based on metadata
          scenarioFn(routeMeta, endpoint, lazyCtx);
        }
      });
    }
  });
}

/**
 * Run tests for all registered routes
 *
 * @param {Object} options - Same as runRouteTests
 */
function runAllRouteTests(options = {}) {
  const routeNames = Object.keys(routeRegistry).filter(
    (name) => !routeRegistry[name].isDynamic,
  );

  for (const routeName of routeNames) {
    runRouteTests(routeName, options);
  }
}

/**
 * Get list of all registered route names
 */
function getRegisteredRoutes() {
  return Object.keys(routeRegistry);
}

/**
 * Get metadata for a specific route
 */
function getRouteMetadata(routeName) {
  return routeRegistry[routeName];
}

module.exports = {
  runRouteTests,
  runAllRouteTests,
  getRegisteredRoutes,
  getRouteMetadata,
};
