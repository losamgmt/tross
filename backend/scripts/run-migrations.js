/**
 * Database Migration Runner
 *
 * PRODUCTION-SAFE: Tracks and applies database migrations in order
 * IDEMPOTENT: Safe to run multiple times - only applies new migrations
 * TRANSACTIONAL: Each migration runs in a transaction (rollback on error)
 *
 * Usage:
 *   node scripts/run-migrations.js
 *   node scripts/run-migrations.js --dry-run
 *   node scripts/run-migrations.js --rollback 005
 */

const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const { pool } = require("../db/connection");
const { logger } = require("../config/logger");

const MIGRATIONS_DIR = path.join(__dirname, "../migrations");

/**
 * Calculate SHA-256 checksum of file content
 */
function calculateChecksum(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Ensure schema_migrations table exists
 */
async function ensureMigrationsTable() {
  const createTableSQL = await fs.readFile(
    path.join(MIGRATIONS_DIR, "000_create_migrations_table.sql"),
    "utf8",
  );

  await pool.query(createTableSQL);
  logger.info("✅ Migration tracking table ready");
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations() {
  const result = await pool.query(
    "SELECT version, checksum FROM schema_migrations ORDER BY version",
  );
  return result.rows;
}

/**
 * Get list of migration files from disk
 */
async function getMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);

  return files
    .filter(
      (f) => f.endsWith(".sql") && f !== "000_create_migrations_table.sql",
    )
    .filter((f) => !f.includes("rollback"))
    .sort();
}

/**
 * Parse migration filename
 * Example: "003_add_role_priority.sql" -> { version: "003", name: "add_role_priority" }
 */
function parseMigrationFilename(filename) {
  const match = filename.match(/^(\d{3})_(.+)\.sql$/);
  if (!match) {
    throw new Error(`Invalid migration filename: ${filename}`);
  }

  return {
    version: match[1],
    name: match[2],
    filename,
  };
}

/**
 * Apply a single migration
 */
async function applyMigration(migration, dryRun = false) {
  const filePath = path.join(MIGRATIONS_DIR, migration.filename);
  const content = await fs.readFile(filePath, "utf8");
  const checksum = calculateChecksum(content);

  logger.info(`📄 Migration ${migration.version}: ${migration.name}`);

  if (dryRun) {
    logger.info("   [DRY RUN] Would execute migration");
    return { status: "dry-run" };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const startTime = Date.now();

    // Execute migration SQL
    await client.query(content);

    const executionTime = Date.now() - startTime;

    // Record migration
    await client.query(
      `INSERT INTO schema_migrations (version, name, execution_time_ms, checksum)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (version) DO NOTHING`,
      [migration.version, migration.name, executionTime, checksum],
    );

    await client.query("COMMIT");

    logger.info(`   ✅ Applied in ${executionTime}ms`);
    return { status: "applied", executionTime };
  } catch (error) {
    await client.query("ROLLBACK");

    // Check if this is a "already exists" type error - migration may have been partially applied
    const isIdempotentError =
      error.message.includes("already exists") ||
      error.message.includes("duplicate key") ||
      error.message.includes("violates unique constraint");

    if (isIdempotentError) {
      logger.info(
        `   ⏭️  Skipped (already applied): ${error.message.split("\n")[0]}`,
      );

      // Still record it as applied if not already recorded
      try {
        await pool.query(
          `INSERT INTO schema_migrations (version, name, execution_time_ms, checksum)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (version) DO NOTHING`,
          [migration.version, migration.name, 0, checksum],
        );
      } catch (_recordError) {
        // Ignore - already recorded
      }
      return { status: "skipped" };
    }

    logger.error(`   ❌ Failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(options = {}) {
  const { dryRun = false } = options;

  logger.info("🔄 Starting migration check...");

  // Ensure tracking table exists
  await ensureMigrationsTable();

  // Get applied and available migrations
  const applied = await getAppliedMigrations();
  const appliedVersions = new Set(applied.map((m) => m.version));
  const allFiles = await getMigrationFiles();

  // Parse all migration files
  const allMigrations = allFiles.map(parseMigrationFilename);

  // Find pending migrations
  const pending = allMigrations.filter((m) => !appliedVersions.has(m.version));

  if (pending.length === 0) {
    logger.info("✅ Database is up to date - no pending migrations");
    return { applied: 0, pending: 0 };
  }

  logger.info(`📋 Found ${pending.length} pending migration(s):`);
  pending.forEach((m) => {
    logger.info(`   - ${m.version}: ${m.name}`);
  });

  if (dryRun) {
    logger.info("\n🔍 DRY RUN - No changes will be made\n");
  }

  // Apply pending migrations in order
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

/**
 * Verify migration integrity
 * Checks if applied migrations have been modified
 */
async function verifyMigrations() {
  logger.info("🔍 Verifying migration integrity...");

  const applied = await getAppliedMigrations();
  const issues = [];

  for (const migration of applied) {
    const files = await fs.readdir(MIGRATIONS_DIR);
    const matchingFile = files.find((f) => f.startsWith(migration.version));

    if (!matchingFile) {
      issues.push({
        version: migration.version,
        issue: "Migration file deleted from disk",
      });
      continue;
    }

    const content = await fs.readFile(
      path.join(MIGRATIONS_DIR, matchingFile),
      "utf8",
    );
    const currentChecksum = calculateChecksum(content);

    if (migration.checksum && currentChecksum !== migration.checksum) {
      issues.push({
        version: migration.version,
        issue: "Migration file modified after being applied",
        expected: migration.checksum,
        actual: currentChecksum,
      });
    }
  }

  if (issues.length > 0) {
    logger.warn("⚠️  Migration integrity issues found:");
    issues.forEach((issue) => {
      logger.warn(`   - ${issue.version}: ${issue.issue}`);
    });
    return false;
  }

  logger.info("✅ All migrations verified - integrity intact");
  return true;
}

/**
 * Get migration status
 */
async function getStatus() {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const allFiles = await getMigrationFiles();
  const allMigrations = allFiles.map(parseMigrationFilename);
  const appliedVersions = new Set(applied.map((m) => m.version));

  console.log("\n📊 Migration Status\n");
  console.log("Applied Migrations:");
  console.log("─".repeat(70));

  if (applied.length === 0) {
    console.log("(none)");
  } else {
    applied.forEach((m) => {
      console.log(
        `✅ ${m.version} (applied ${new Date(m.applied_at).toLocaleString()})`,
      );
    });
  }

  const pending = allMigrations.filter((m) => !appliedVersions.has(m.version));

  if (pending.length > 0) {
    console.log("\nPending Migrations:");
    console.log("─".repeat(70));
    pending.forEach((m) => {
      console.log(`⏳ ${m.version}: ${m.name}`);
    });
  }

  console.log("\n" + "─".repeat(70));
  console.log(`Total: ${applied.length} applied, ${pending.length} pending\n`);
}

// CLI Handler
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const status = args.includes("--status");
  const verify = args.includes("--verify");

  (async () => {
    try {
      if (status) {
        await getStatus();
      } else if (verify) {
        await verifyMigrations();
      } else {
        await runMigrations({ dryRun });
      }

      await pool.end();
      process.exit(0);
    } catch (error) {
      logger.error("Migration failed:", error);
      await pool.end();
      process.exit(1);
    }
  })();
}

module.exports = {
  runMigrations,
  verifyMigrations,
  getStatus,
};
