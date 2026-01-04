/**
 * Audit Routes - Integration Tests
 *
 * Uses the route runner pattern to test all audit endpoints.
 * Tests are generated from route-registry.js metadata.
 *
 * PRINCIPLE: No hardcoded tests - all derived from route metadata.
 */

const { runRouteTests } = require('../factory/route-runner');
const app = require('../../server');
const db = require('../../db/connection');

// Run all route scenarios for audit
runRouteTests('audit', { app, db });
