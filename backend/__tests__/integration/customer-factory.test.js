/**
 * Customer Entity Integration Tests
 *
 * Uses the test factory to run all applicable scenarios.
 * Scenarios self-select based on customer metadata.
 *
 * NO ENTITY-SPECIFIC CODE HERE - just configuration.
 */

const { runEntityTests } = require('../factory/runner');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/test-db');
const app = require('../../server');
const db = require('../../db/connection');

describe('Customer Entity', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // Run ALL scenario categories for customer
  // Each scenario checks customer metadata and runs if applicable
  runEntityTests('customer', {
    app,
    db: db.pool,
  });
});
