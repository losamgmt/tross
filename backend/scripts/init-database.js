/**
 * Database Schema Initializer
 *
 * ============================================================================
 * PRE-PRODUCTION STRATEGY (current)
 * ============================================================================
 * Simple, idempotent schema and seed runner.
 * Runs schema.sql (structure) and seed-data.sql (core data) on startup.
 *
 * Both files are idempotent - safe to run multiple times:
 * - CREATE TABLE IF NOT EXISTS
 * - CREATE INDEX IF NOT EXISTS
 * - INSERT ... ON CONFLICT DO UPDATE
 *
 * ============================================================================
 * POST-PRODUCTION STRATEGY (future - when live data exists)
 * ============================================================================
 * Switch to run-migrations.js for incremental changes.
 * In server.js, change:
 *   FROM: const { initializeDatabase } = require('./scripts/init-database');
 *   TO:   const { runMigrations } = require('./scripts/run-migrations');
 *
 * And in startup:
 *   FROM: await initializeDatabase();
 *   TO:   await runMigrations();
 *
 * The migration runner is ready and tested - just swap when needed.
 * ============================================================================
 */

const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../config/logger');

// Use the standard db connection module
const db = require('../db/connection');

const SCHEMA_FILE = path.join(__dirname, '..', 'schema.sql');
const SEED_FILE = path.join(__dirname, '..', 'seeds', 'seed-data.sql');

/**
 * Initialize database schema and seed data
 * @returns {Promise<{schema: boolean, seed: boolean}>} Success status
 */
async function initializeDatabase() {
  const results = { schema: false, seed: false };

  try {
    // Run schema.sql
    logger.info('📦 Applying database schema...');
    const schemaSQL = await fs.readFile(SCHEMA_FILE, 'utf8');
    await db.query(schemaSQL);
    results.schema = true;
    logger.info('✅ Schema applied successfully');
  } catch (error) {
    // Use console.error for Railway visibility (single-line JSON)
    console.error(JSON.stringify({ level: 'error', message: 'Schema failed', error: error.message, code: error.code, detail: error.detail }));
    // Don't throw - schema might already exist
  }

  try {
    // Run seed data
    logger.info('🌱 Applying seed data...');
    const seedSQL = await fs.readFile(SEED_FILE, 'utf8');
    await db.query(seedSQL);
    results.seed = true;
    logger.info('✅ Seed data applied successfully');
  } catch (error) {
    // Use console.error for Railway visibility (single-line JSON)
    console.error(JSON.stringify({ level: 'error', message: 'Seed failed', error: error.message, code: error.code, detail: error.detail }));
    // Don't throw - seeds might already exist
  }

  return results;
}

module.exports = { initializeDatabase };
