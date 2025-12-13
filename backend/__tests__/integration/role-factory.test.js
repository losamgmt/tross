/**
 * Role Entity - Factory-Generated Integration Tests
 * 
 * This file demonstrates the metadata-driven test factory pattern.
 * All test scenarios are generated from role-metadata.js
 */

const { runEntityTests } = require('../factory/runner');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/test-db');
const app = require('../../server');
const db = require('../../db/connection');

describe('Role Entity', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // Run all applicable scenarios for this entity
  runEntityTests('role', {
    app,
    db: db.pool
  });
});
