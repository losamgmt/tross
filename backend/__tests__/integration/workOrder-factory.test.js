/**
 * Work Order Entity - Factory-Generated Integration Tests
 * 
 * Uses the test factory to run all applicable scenarios.
 * Scenarios self-select based on workOrder metadata.
 */

const { runEntityTests } = require('../factory/runner');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/test-db');
const app = require('../../server');
const db = require('../../db/connection');

describe('Work Order Entity', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  runEntityTests('workOrder', {
    app,
    db: db.pool
  });
});
