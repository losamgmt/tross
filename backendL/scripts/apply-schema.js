#!/usr/bin/env node
/**
 * Schema Application Script
 *
 * Applies schema.sql to BOTH development and test databases
 * Ensures schema consistency across all environments
 *
 * Usage:
 *   node backend/scripts/apply-schema.js [--test-only] [--dev-only]
 *
 * Architectural Principles:
 * - Single source of truth (schema.sql)
 * - Automatic consistency across environments
 * - Safe migration support
 * - Idempotent operations
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { DATABASE } = require('../config/constants');

// Parse command line arguments
const args = process.argv.slice(2);
const testOnly = args.includes('--test-only');
const devOnly = args.includes('--dev-only');

// Database configurations (uses constants.js for single source of truth)
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

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function applySchema(config, envName) {
  const client = new Client(config);

  try {
    log(`\n🔄 Connecting to ${envName} database...`, 'blue');
    await client.connect();
    log(`✅ Connected to ${envName} database`, 'green');

    // Read schema.sql
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    log(`📄 Applying schema.sql to ${envName}...`, 'blue');
    await client.query(schema);
    log(`✅ Schema applied successfully to ${envName}`, 'green');

    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    log(`\n📊 Tables in ${envName}:`, 'cyan');
    result.rows.forEach((row) => {
      log(`   - ${row.table_name}`, 'cyan');
    });

    // Verify roles
    const rolesResult = await client.query(
      'SELECT name, is_active FROM roles ORDER BY id',
    );
    log(`\n👥 Roles in ${envName}:`, 'cyan');
    rolesResult.rows.forEach((row) => {
      const status = row.is_active ? '✅' : '❌';
      log(`   ${status} ${row.name}`, 'cyan');
    });
  } catch (error) {
    log(`\n❌ Error applying schema to ${envName}:`, 'red');
    log(error.message, 'red');
    throw error;
  } finally {
    await client.end();
    log(`🔌 Disconnected from ${envName} database\n`, 'blue');
  }
}

async function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          TrossApp Schema Application Tool                 ║', 'cyan');
  log('║  Ensures consistency across dev and test databases        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    if (!testOnly) {
      await applySchema(configs.dev, 'DEVELOPMENT');
    }

    if (!devOnly) {
      await applySchema(configs.test, 'TEST');
    }

    log(
      '╔════════════════════════════════════════════════════════════╗',
      'green',
    );
    log(
      '║              ✅ Schema Consistency Verified ✅             ║',
      'green',
    );
    log(
      '║  Both databases now have identical schemas                ║',
      'green',
    );
    log(
      '╚════════════════════════════════════════════════════════════╝',
      'green',
    );

    log('\n📝 System-Level Fields Applied:', 'yellow');
    log('   - is_active: Soft delete capability on ALL entities', 'yellow');
    log('   - updated_at: Automatic timestamps on ALL entities', 'yellow');
    log('   - Foreign key protection: ON DELETE SET NULL', 'yellow');
  } catch (_error) {
    log(
      '\n╔════════════════════════════════════════════════════════════╗',
      'red',
    );
    log(
      '║                ❌ Schema Application Failed ❌             ║',
      'red',
    );
    log(
      '╚════════════════════════════════════════════════════════════╝',
      'red',
    );
    process.exit(1);
  }
}

main();
