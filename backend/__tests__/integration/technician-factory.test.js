/**
 * Technician Entity Integration Tests
 *
 * Uses the test factory to run all applicable scenarios.
 * Scenarios self-select based on technician metadata.
 */

const { runEntityTests } = require('../factory/runner');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/test-db');
const app = require('../../server');
const db = require('../../db/connection');

describe('Technician Entity', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  runEntityTests('technician', {
    app,
    db: db.pool,
  });
});
