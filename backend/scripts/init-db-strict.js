#!/usr/bin/env node
/**
 * Strict Database Initialization Script
 * 
 * Runs schema.sql and seed-data.sql with FAIL-FAST behavior.
 * Used by Railway deploy to ensure database is properly initialized.
 * 
 * USES THE SAME CONNECTION AS THE REST OF THE APP (db/connection.js)
 * This ensures SSL, connection pooling, and environment detection all work.
 * 
 * Exit codes:
 *   0 - Success (both schema and seed applied)
 *   1 - Failure (any error - deploy should abort)
 */

const fs = require('fs').promises;
const path = require('path');

// Load environment variables FIRST (before any other requires)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Use the SAME database connection as the rest of the app
const db = require('../db/connection');

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

  try {
    // Test connection first
    log('📡 Testing database connection...', 'cyan');
    const testResult = await db.query('SELECT NOW() as time, current_database() as db');
    log(`✅ Connected to database: ${testResult.rows[0].db}`, 'green');

    // Apply schema
    log('📦 Applying schema.sql...', 'blue');
    const schemaSQL = await fs.readFile(SCHEMA_FILE, 'utf8');
    await db.query(schemaSQL);
    log('✅ Schema applied successfully', 'green');

    // Apply seed data
    log('🌱 Applying seed-data.sql...', 'blue');
    const seedSQL = await fs.readFile(SEED_FILE, 'utf8');
    await db.query(seedSQL);
    log('✅ Seed data applied successfully', 'green');

    // Verify key data
    log('🔍 Verifying seed data...', 'cyan');

    const checks = [
      { query: 'SELECT COUNT(*) FROM roles', name: 'roles', expected: 5 },
      { query: "SELECT COUNT(*) FROM users WHERE email IN ('zarika.amber@gmail.com', 'lane.vandeventer@gmail.com')", name: 'admin users', expected: 2 },
      { query: 'SELECT COUNT(*) FROM customers', name: 'customers', min: 1 },
      { query: 'SELECT COUNT(*) FROM properties', name: 'properties', min: 1 },
      { query: 'SELECT COUNT(*) FROM technicians', name: 'technicians', min: 1 },
      { query: 'SELECT COUNT(*) FROM work_orders', name: 'work_orders', min: 1 },
    ];

    let allPassed = true;
    for (const check of checks) {
      const result = await db.query(check.query);
      const count = parseInt(result.rows[0].count);
      
      if (check.expected !== undefined && count !== check.expected) {
        log(`  ⚠️  ${check.name}: ${count} (expected ${check.expected})`, 'yellow');
        allPassed = false;
      } else if (check.min !== undefined && count < check.min) {
        log(`  ⚠️  ${check.name}: ${count} (expected at least ${check.min})`, 'yellow');
        allPassed = false;
      } else {
        log(`  ✅ ${check.name}: ${count}`, 'green');
      }
    }

    log('═'.repeat(50), 'green');
    if (allPassed) {
      log('✅ Database initialization complete!', 'green');
    } else {
      log('⚠️ Database initialized but some verification checks failed', 'yellow');
    }
    
    // Close pool gracefully
    await db.end();
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
    if (error.code) {
      log(`   Code: ${error.code}`, 'red');
    }
    
    // Try to close pool
    try {
      await db.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

initDatabase();
