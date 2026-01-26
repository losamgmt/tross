/**
 * Health Routes - Integration Tests
 *
 * Uses the route runner pattern to test all health endpoints.
 * Tests are generated from route-registry.js metadata.
 *
 * PRINCIPLE: No hardcoded tests - all derived from route metadata.
 */

const { runRouteTests } = require('../factory/route-runner');
const app = require('../../server');
const db = require('../../db/connection');
const { clearCache } = require('../../routes/health');

// Clear health cache before each test to prevent cross-test contamination
// (health cache is a module-level singleton that persists across tests)
beforeEach(() => {
  clearCache();
});

// Run all route scenarios for health
runRouteTests('health', { app, db });
