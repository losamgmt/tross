/**
 * Contract Entity - Factory-Generated Integration Tests
 *
 * Uses the test factory to run all applicable scenarios.
 * Scenarios self-select based on contract metadata.
 */

const { runEntityTests } = require('../factory/runner');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/test-db');
const app = require('../../server');
const db = require('../../db/connection');

describe('Contract Entity', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  runEntityTests('contract', {
    app,
    db: db.pool
  });
});
