#!/usr/bin/env node
/**
 * Strict Database Initialization Script
 * 
 * Runs schema.sql and seed-data.sql with FAIL-FAST behavior.
 * Used by Railway deploy to ensure database is properly initialized.
 * 
 * Exit codes:
 *   0 - Success (both schema and seed applied)
 *   1 - Failure (any error - deploy should abort)
 */

const fs = require('fs').promises;
const path = require('path');
const { Client } = require('pg');

const SCHEMA_FILE = path.join(__dirname, '..', 'schema.sql');
const SEED_FILE = path.join(__dirname, '..', 'seeds', 'seed-data.sql');

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function initDatabase() {
  log('🚀 Tross Database Initialization (strict mode)', 'blue');
  log('═'.repeat(50), 'blue');

  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('❌ DATABASE_URL environment variable is not set', 'red');
    process.exit(1);
  }

  log(`📡 Connecting to database...`, 'cyan');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway') ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    log('✅ Connected to database', 'green');

    // Apply schema
    log('📦 Applying schema.sql...', 'blue');
    const schemaSQL = await fs.readFile(SCHEMA_FILE, 'utf8');
    await client.query(schemaSQL);
    log('✅ Schema applied successfully', 'green');

    // Apply seed data
    log('🌱 Applying seed-data.sql...', 'blue');
    const seedSQL = await fs.readFile(SEED_FILE, 'utf8');
    await client.query(seedSQL);
    log('✅ Seed data applied successfully', 'green');

    // Verify key data
    log('🔍 Verifying seed data...', 'cyan');

    const checks = [
      { query: 'SELECT COUNT(*) FROM roles', name: 'roles', expected: 5 },
      { query: "SELECT COUNT(*) FROM users WHERE email IN ('zarika.amber@gmail.com', 'lane.vandeventer@gmail.com')", name: 'admin users', expected: 2 },
      { query: 'SELECT COUNT(*) FROM customers', name: 'customers', min: 1 },
      { query: 'SELECT COUNT(*) FROM properties', name: 'properties', min: 1 },
    ];

    for (const check of checks) {
      const result = await client.query(check.query);
      const count = parseInt(result.rows[0].count);
      
      if (check.expected !== undefined && count !== check.expected) {
        log(`  ⚠️  ${check.name}: ${count} (expected ${check.expected})`, 'yellow');
      } else if (check.min !== undefined && count < check.min) {
        log(`  ⚠️  ${check.name}: ${count} (expected at least ${check.min})`, 'yellow');
      } else {
        log(`  ✅ ${check.name}: ${count}`, 'green');
      }
    }

    log('═'.repeat(50), 'green');
    log('✅ Database initialization complete!', 'green');
    
    await client.end();
    process.exit(0);

  } catch (error) {
    log('═'.repeat(50), 'red');
    log(`❌ Database initialization FAILED:`, 'red');
    log(`   ${error.message}`, 'red');
    if (error.detail) {
      log(`   Detail: ${error.detail}`, 'red');
    }
    if (error.hint) {
      log(`   Hint: ${error.hint}`, 'yellow');
    }
    
    await client.end().catch(() => {});
    process.exit(1);
  }
}

initDatabase();
