/**
 * Database Manager
 *
 * SRP LITERALISM: ONLY orchestrates database initialization and lifecycle operations.
 *
 * PHILOSOPHY:
 * - UNIFIED: Consolidates init-database.js and run-migrations.js
 * - MODE-AWARE: Auto-detects init vs migrate based on environment
 * - IDEMPOTENT: Safe to run multiple times (schema/seed errors tolerated)
 * - STATEFUL: Tracks initialization for health checks
 *
 * USAGE:
 *   const dbManager = require('./db/database-manager');
 *   await dbManager.initialize();           // Auto-detect mode
 *   await dbManager.initialize('init');     // Force schema init
 *   await dbManager.initialize('migrate');  // Force migration mode
 *   const status = await dbManager.getStatus();
 *
 * @module database-manager
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const db = require('./connection');
const { logger } = require('../config/logger');
const { DATABASE_MANAGER, ENVIRONMENTS } = require('../config/constants');
const AppError = require('../utils/app-error');

// =============================================================================
// CONSTANTS
// =============================================================================

// Import MODES from SSOT, alias for local clarity
const MODES = DATABASE_MANAGER.MODES;

// PATHS are module-specific (contain path.join operations, not reusable)
const PATHS = Object.freeze({
  SCHEMA: path.join(__dirname, '..', 'schema.sql'),
  SEED: path.join(__dirname, '..', 'seeds', 'seed-data.sql'),
  MIGRATIONS: path.join(__dirname, '..', 'migrations'),
});

// =============================================================================
// STATE
// =============================================================================

let isInitialized = false;
let initMode = null;
let initTimestamp = null;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate SHA-256 checksum of content
 * @param {string} content - File content
 * @returns {string} Hex-encoded checksum
 */
function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Parse migration filename
 * @param {string} filename - e.g., "003_add_role_priority.sql"
 * @returns {{version: string, name: string, filename: string}}
 */
function parseMigrationFilename(filename) {
  const match = filename.match(/^(\d{3})_(.+)\.sql$/);
  if (!match) {
    throw new AppError(`Invalid migration filename: ${filename}`, 400, 'BAD_REQUEST');
  }
  return { version: match[1], name: match[2], filename };
}

/**
 * Determine initialization mode from environment
 * @returns {string} 'init' or 'migrate'
 */
function determineMode() {
  // Explicit override via environment
  if (process.env.DB_MODE === MODES.MIGRATE) {
    return MODES.MIGRATE;
  }
  if (process.env.DB_MODE === MODES.INIT) {
    return MODES.INIT;
  }

  // Default: use init for development, migrate for production
  const env = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;
  if (env === ENVIRONMENTS.PRODUCTION) {
    return MODES.MIGRATE;
  }
  return MODES.INIT;
}

// =============================================================================
// SCHEMA INITIALIZATION (dev/pre-production)
// =============================================================================

/**
 * Apply schema.sql and seed-data.sql
 * Idempotent - safe to run multiple times
 * @returns {Promise<{schema: boolean, seed: boolean}>}
 */
async function applySchema() {
  const results = { schema: false, seed: false };

  try {
    logger.info('📦 Applying database schema...');
    const schemaSQL = await fs.readFile(PATHS.SCHEMA, 'utf8');
    await db.query(schemaSQL);
    results.schema = true;
    logger.info('✅ Schema applied successfully');
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Schema application failed',
        error: error.message,
        code: error.code,
        detail: error.detail,
      }),
    );
    // Don't throw - schema might already exist
  }

  try {
    logger.info('🌱 Applying seed data...');
    const seedSQL = await fs.readFile(PATHS.SEED, 'utf8');
    await db.query(seedSQL);
    results.seed = true;
    logger.info('✅ Seed data applied successfully');
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Seed application failed',
        error: error.message,
        code: error.code,
        detail: error.detail,
      }),
    );
    // Don't throw - seeds might already exist
  }

  return results;
}

// =============================================================================
// MIGRATION RUNNER (production)
// =============================================================================

/**
 * Ensure schema_migrations table exists
 */
async function ensureMigrationsTable() {
  const migrationsTableSQL = await fs.readFile(
    path.join(PATHS.MIGRATIONS, '000_create_migrations_table.sql'),
    'utf8',
  );
  await db.query(migrationsTableSQL);
  logger.info('✅ Migration tracking table ready');
}

/**
 * Get list of applied migrations from database
 * @returns {Promise<Array<{version: string, checksum: string}>>}
 */
async function getAppliedMigrations() {
  const result = await db.query(
    'SELECT version, checksum FROM schema_migrations ORDER BY version',
  );
  return result.rows;
}

/**
 * Get list of migration files from disk
 * @returns {Promise<string[]>}
 */
async function getMigrationFiles() {
  const files = await fs.readdir(PATHS.MIGRATIONS);
  return files
    .filter((f) => f.endsWith('.sql') && f !== '000_create_migrations_table.sql')
    .filter((f) => !f.includes('rollback'))
    .sort();
}

/**
 * Apply a single migration within a transaction
 * @param {Object} migration - {version, name, filename}
 * @param {boolean} dryRun - If true, don't actually apply
 * @returns {Promise<{status: string, executionTime?: number}>}
 */
async function applyMigration(migration, dryRun = false) {
  const filePath = path.join(PATHS.MIGRATIONS, migration.filename);
  const content = await fs.readFile(filePath, 'utf8');
  const checksum = calculateChecksum(content);

  logger.info(`📄 Migration ${migration.version}: ${migration.name}`);

  if (dryRun) {
    logger.info('   [DRY RUN] Would execute migration');
    return { status: 'dry-run' };
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const startTime = Date.now();
    await client.query(content);
    const executionTime = Date.now() - startTime;

    await client.query(
      `INSERT INTO schema_migrations (version, name, execution_time_ms, checksum)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (version) DO NOTHING`,
      [migration.version, migration.name, executionTime, checksum],
    );

    await client.query('COMMIT');
    logger.info(`   ✅ Applied in ${executionTime}ms`);
    return { status: 'applied', executionTime };
  } catch (error) {
    await client.query('ROLLBACK');

    // Handle idempotent errors (already applied)
    const isIdempotentError =
      error.message.includes('already exists') ||
      error.message.includes('duplicate key') ||
      error.message.includes('violates unique constraint');

    if (isIdempotentError) {
      logger.info(`   ⏭️  Skipped (already applied): ${error.message.split('\n')[0]}`);

      // Record as applied if not already
      try {
        await db.query(
          `INSERT INTO schema_migrations (version, name, execution_time_ms, checksum)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (version) DO NOTHING`,
          [migration.version, migration.name, 0, checksum],
        );
      } catch {
        // Ignore - already recorded
      }
      return { status: 'skipped' };
    }

    logger.error(`   ❌ Failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, don't actually apply
 * @returns {Promise<{applied: number, pending: number}>}
 */
async function runMigrations(options = {}) {
  const { dryRun = false } = options;

  logger.info('🔄 Starting migration check...');

  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const appliedVersions = new Set(applied.map((m) => m.version));
  const allFiles = await getMigrationFiles();
  const allMigrations = allFiles.map(parseMigrationFilename);

  const pending = allMigrations.filter((m) => !appliedVersions.has(m.version));

  if (pending.length === 0) {
    logger.info('✅ Database is up to date - no pending migrations');
    return { applied: 0, pending: 0 };
  }

  logger.info(`📋 Found ${pending.length} pending migration(s):`);
  pending.forEach((m) => {
    logger.info(`   - ${m.version}: ${m.name}`);
  });

  if (dryRun) {
    logger.info('\n🔍 DRY RUN - No changes will be made\n');
  }

  for (const migration of pending) {
    await applyMigration(migration, dryRun);
  }

  if (!dryRun) {
    logger.info(`\n✅ Successfully applied ${pending.length} migration(s)`);
  }

  return {
    applied: dryRun ? 0 : pending.length,
    pending: pending.length,
  };
}

// =============================================================================
// VERIFICATION
// =============================================================================

/**
 * Verify migration integrity (detect modified files)
 * @returns {Promise<boolean>} True if all migrations intact
 */
async function verifyMigrations() {
  logger.info('🔍 Verifying migration integrity...');

  const applied = await getAppliedMigrations();
  const issues = [];

  for (const migration of applied) {
    const files = await fs.readdir(PATHS.MIGRATIONS);
    const matchingFile = files.find((f) => f.startsWith(migration.version));

    if (!matchingFile) {
      issues.push({
        version: migration.version,
        issue: 'Migration file deleted from disk',
      });
      continue;
    }

    const content = await fs.readFile(
      path.join(PATHS.MIGRATIONS, matchingFile),
      'utf8',
    );
    const currentChecksum = calculateChecksum(content);

    if (migration.checksum && currentChecksum !== migration.checksum) {
      issues.push({
        version: migration.version,
        issue: 'Migration file modified after being applied',
        expected: migration.checksum,
        actual: currentChecksum,
      });
    }
  }

  if (issues.length > 0) {
    logger.warn('⚠️  Migration integrity issues found:');
    issues.forEach((issue) => {
      logger.warn(`   - ${issue.version}: ${issue.issue}`);
    });
    return false;
  }

  logger.info('✅ All migrations verified - integrity intact');
  return true;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize database (auto-detects mode or accepts override)
 * @param {string} [mode] - 'init' or 'migrate' (auto-detect if omitted)
 * @param {Object} [options] - Options for migration mode
 * @param {boolean} [options.dryRun] - Don't apply changes (migrate mode only)
 * @returns {Promise<Object>} Result object with mode and details
 */
async function initialize(mode, options = {}) {
  const effectiveMode = mode || determineMode();

  logger.info(`🔧 Database Manager: Initializing in "${effectiveMode}" mode`);

  let result;

  if (effectiveMode === MODES.INIT) {
    result = await applySchema();
  } else if (effectiveMode === MODES.MIGRATE) {
    result = await runMigrations(options);
  } else {
    throw new AppError(`Unknown database mode: ${effectiveMode}`, 400, 'BAD_REQUEST');
  }

  isInitialized = true;
  initMode = effectiveMode;
  initTimestamp = new Date();

  return {
    mode: effectiveMode,
    ...result,
    timestamp: initTimestamp,
  };
}

/**
 * Get current status
 * @returns {Promise<Object>} Status information
 */
async function getStatus() {
  // Check connection
  let connectionOk = false;
  try {
    await db.testConnection();
    connectionOk = true;
  } catch {
    connectionOk = false;
  }

  // Get migration status if in migrate mode or if table exists
  let migrationStatus = null;
  try {
    const applied = await getAppliedMigrations();
    const allFiles = await getMigrationFiles();
    const allMigrations = allFiles.map(parseMigrationFilename);
    const appliedVersions = new Set(applied.map((m) => m.version));
    const pending = allMigrations.filter((m) => !appliedVersions.has(m.version));

    migrationStatus = {
      applied: applied.length,
      pending: pending.length,
      versions: applied.map((m) => m.version),
    };
  } catch {
    // Migration table doesn't exist
    migrationStatus = null;
  }

  return {
    initialized: isInitialized,
    mode: initMode,
    timestamp: initTimestamp,
    connectionOk,
    migrations: migrationStatus,
  };
}

/**
 * Reset initialization state (for testing)
 */
function reset() {
  isInitialized = false;
  initMode = null;
  initTimestamp = null;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  MODES,
  initialize,
  getStatus,
  verifyMigrations,
  reset,

  // Expose for direct use if needed
  applySchema,
  runMigrations,
};
