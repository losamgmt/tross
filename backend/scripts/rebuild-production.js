#!/usr/bin/env node
/**
 * Production Database FULL REBUILD Script
 *
 * NUCLEAR OPTION: Drops ALL tables and rebuilds from scratch.
 * Use this when schema.sql has changed significantly.
 *
 * Steps:
 *   1. Drop all tables in public schema
 *   2. Apply fresh schema.sql (creates all tables + 5 roles)
 *   3. Run seed-data.sql (admin user + preferences)
 *
 * Usage:
 *   node scripts/rebuild-production.js
 *
 * Environment variables (from .env):
 *   RAILWAY_DB_HOST, RAILWAY_DB_PORT, RAILWAY_DB_USER, RAILWAY_DB_PASSWORD, RAILWAY_DB_NAME
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Color output for terminal
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function rebuildProduction() {
  // Validate environment
  const required = [
    "RAILWAY_DB_HOST",
    "RAILWAY_DB_PORT",
    "RAILWAY_DB_USER",
    "RAILWAY_DB_PASSWORD",
    "RAILWAY_DB_NAME",
  ];
  const missing = required.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    log(
      `❌ Missing required environment variables: ${missing.join(", ")}`,
      "red",
    );
    log("", "reset");
    log("Please set them in your .env file:", "yellow");
    log("  RAILWAY_DB_HOST=hopper.proxy.rlwy.net", "cyan");
    log("  RAILWAY_DB_PORT=48592", "cyan");
    log("  RAILWAY_DB_USER=postgres", "cyan");
    log("  RAILWAY_DB_PASSWORD=your-password", "cyan");
    log("  RAILWAY_DB_NAME=railway", "cyan");
    process.exit(1);
  }

  // Database configuration
  const config = {
    host: process.env.RAILWAY_DB_HOST,
    port: parseInt(process.env.RAILWAY_DB_PORT),
    user: process.env.RAILWAY_DB_USER,
    password: process.env.RAILWAY_DB_PASSWORD,
    database: process.env.RAILWAY_DB_NAME,
    ssl: { rejectUnauthorized: false },
  };

  log("", "reset");
  log("╔═══════════════════════════════════════════════════════════╗", "red");
  log("║     🔥 NUCLEAR PRODUCTION DATABASE REBUILD 🔥              ║", "red");
  log("║                                                           ║", "red");
  log("║  WARNING: This will DROP ALL TABLES and rebuild!         ║", "red");
  log("║  All existing data will be PERMANENTLY DELETED!          ║", "red");
  log("╚═══════════════════════════════════════════════════════════╝", "red");
  log("", "reset");
  log(`📡 Target: ${config.host}:${config.port}/${config.database}`, "cyan");
  log("", "reset");
  log("⏳ Starting in 5 seconds... (Ctrl+C to cancel)", "yellow");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const client = new Client(config);

  try {
    await client.connect();
    log("✅ Connected to Railway database", "green");
    log("", "reset");

    // Step 1: Drop all tables in public schema
    log("💥 Step 1/4: Dropping ALL tables...", "red");

    // Get all table names
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    const tables = tablesResult.rows.map((r) => r.tablename);
    log(
      `   Found ${tables.length} tables to drop: ${tables.join(", ")}`,
      "yellow",
    );

    if (tables.length > 0) {
      // Drop all tables with CASCADE
      await client.query(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO public;
      `);
      log("✅ All tables dropped", "green");
    } else {
      log("   No tables to drop (fresh database)", "cyan");
    }
    log("", "reset");

    // Step 2: Apply schema.sql
    log("📝 Step 2/4: Applying schema.sql...", "blue");
    const schemaPath = path.join(__dirname, "..", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    await client.query(schema);
    log("✅ Schema applied (all tables + 5 roles created)", "green");
    log("", "reset");

    // Step 3: Apply seed-data.sql
    log("🌱 Step 3/4: Applying seed-data.sql...", "blue");
    const seedPath = path.join(__dirname, "..", "seeds", "seed-data.sql");
    const seedData = fs.readFileSync(seedPath, "utf8");
    await client.query(seedData);
    log("✅ Seed data applied (admin user + preferences)", "green");
    log("", "reset");

    // Step 4: Verify
    log("🔍 Step 4/4: Verifying database state...", "blue");

    // Check tables
    const newTablesResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    log(`   ✓ Tables: ${newTablesResult.rows.length}`, "cyan");
    newTablesResult.rows.forEach((r) => log(`     - ${r.tablename}`, "cyan"));

    // Check roles
    const rolesResult = await client.query(
      "SELECT name, priority FROM roles ORDER BY priority DESC",
    );
    log(
      `   ✓ Roles: ${rolesResult.rows.map((r) => `${r.name}(${r.priority})`).join(", ")}`,
      "cyan",
    );

    // Check users
    const usersResult = await client.query(`
      SELECT u.email, r.name as role 
      FROM users u 
      JOIN roles r ON u.role_id = r.id
    `);
    log(`   ✓ Users: ${usersResult.rows.length}`, "cyan");
    usersResult.rows.forEach((u) =>
      log(`     - ${u.email} (${u.role})`, "cyan"),
    );

    // Check preferences
    const prefsResult = await client.query(
      "SELECT id, theme, density, notifications_enabled FROM preferences",
    );
    log(`   ✓ Preferences: ${prefsResult.rows.length}`, "cyan");
    prefsResult.rows.forEach((p) =>
      log(
        `     - User ${p.id}: theme=${p.theme}, density=${p.density}`,
        "cyan",
      ),
    );

    log("", "reset");
    log(
      "╔═══════════════════════════════════════════════════════════╗",
      "green",
    );
    log(
      "║     ✨ PRODUCTION DATABASE REBUILT SUCCESSFULLY! ✨       ║",
      "green",
    );
    log(
      "╚═══════════════════════════════════════════════════════════╝",
      "green",
    );
    log("", "reset");
  } catch (error) {
    log("", "reset");
    log("❌ Rebuild failed:", "red");
    log(error.message, "red");
    log("", "reset");

    if (error.stack) {
      log("Stack trace:", "yellow");
      log(error.stack, "yellow");
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run rebuild
rebuildProduction().catch((error) => {
  log("", "reset");
  log("❌ Unexpected error:", "red");
  log(error.message, "red");
  process.exit(1);
});
