/**
 * Invoice Entity - Factory-Generated Integration Tests
 *
 * Uses the test factory to run all applicable scenarios.
 * Scenarios self-select based on invoice metadata.
 */

const { runEntityTests } = require('../factory/runner');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/test-db');
const app = require('../../server');
const db = require('../../db/connection');

describe('Invoice Entity', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  runEntityTests('invoice', {
    app,
    db: db.pool
  });
});
