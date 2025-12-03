#!/usr/bin/env node
/**
 * Migration Runner
 * Runs a specific migration file against dev and/or test databases
 *
 * Usage:
 *   node backend/scripts/run-migration.js <migration-file> [--test-only] [--dev-only]
 *
 * Example:
 *   node backend/scripts/run-migration.js 005_add_deactivation_audit_fields.sql
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { DATABASE } = require('../config/constants');

// Parse arguments
const args = process.argv.slice(2);
const migrationFile = args[0];
const testOnly = args.includes('--test-only');
const devOnly = args.includes('--dev-only');

if (!migrationFile) {
  console.error('❌ Error: Migration file required');
  console.log('\nUsage: node run-migration.js <migration-file> [--test-only] [--dev-only]');
  process.exit(1);
}

// Database configs
const configs = {
  dev: {
    host: DATABASE.DEV.HOST,
    port: DATABASE.DEV.PORT,
    database: DATABASE.DEV.NAME,
    user: DATABASE.DEV.USER,
    password: DATABASE.DEV.PASSWORD,
  },
  test: {
    host: DATABASE.TEST.HOST,
    port: DATABASE.TEST.PORT,
    database: DATABASE.TEST.NAME,
    user: DATABASE.TEST.USER,
    password: DATABASE.TEST.PASSWORD,
  },
};

async function runMigration(config, envName) {
  const client = new Client(config);

  try {
    console.log(`\n🔄 Connecting to ${envName} database...`);
    await client.connect();
    console.log(`✅ Connected to ${envName}`);

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`📄 Running migration: ${migrationFile}`);
    const result = await client.query(sql);

    // Show result message if migration returned one
    if (result.rows && result.rows.length > 0 && result.rows[0].status) {
      console.log(`✅ ${result.rows[0].status}`);
    } else {
      console.log('✅ Migration completed successfully');
    }

  } catch (error) {
    console.error(`\n❌ Error running migration on ${envName}:`);
    console.error(error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              TrossApp Migration Runner                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    if (!testOnly) {
      await runMigration(configs.dev, 'DEVELOPMENT');
    }

    if (!devOnly) {
      await runMigration(configs.test, 'TEST');
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Migration Successful ✅                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (_error) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ❌ Migration Failed ❌                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    process.exit(1);
  }
}

main();
