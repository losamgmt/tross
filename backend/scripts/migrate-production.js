#!/usr/bin/env node
/**
 * Production Database Migration Script
 *
 * Safely migrates Railway production database with:
 * - Full schema (all tables)
 * - 5 core roles
 * - Single admin user (zarika.amber@gmail.com)
 * - NO test/dev/debug data
 *
 * Usage:
 *   node scripts/migrate-production.js
 *
 * Environment variables required:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *   (These should match your Railway PostgreSQL credentials)
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.production
require("dotenv").config({
  path: path.join(__dirname, "..", ".env.production"),
});

// Color output for terminal
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigration() {
  // Validate environment
  const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  const missing = required.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    log(
      `❌ Missing required environment variables: ${missing.join(", ")}`,
      "red",
    );
    log("", "reset");
    log(
      "Please set them in your shell or create a .env.production file:",
      "yellow",
    );
    log("  DB_HOST=postgres.railway.internal", "cyan");
    log("  DB_PORT=5432", "cyan");
    log("  DB_USER=postgres", "cyan");
    log("  DB_PASSWORD=your-password", "cyan");
    log("  DB_NAME=railway", "cyan");
    process.exit(1);
  }

  // Database configuration
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_HOST.includes("railway")
      ? { rejectUnauthorized: false }
      : false,
  };

  log("", "reset");
  log("═══════════════════════════════════════════════", "blue");
  log("   🚀 Tross Production Database Migration", "blue");
  log("═══════════════════════════════════════════════", "blue");
  log("", "reset");
  log(
    `📡 Connecting to: ${config.host}:${config.port}/${config.database}`,
    "cyan",
  );

  const client = new Client(config);

  try {
    await client.connect();
    log("✅ Connected to database", "green");
    log("", "reset");

    // Step 1: Run base schema (includes all tables + 5 roles)
    log("📝 Step 1/3: Creating base schema...", "yellow");
    const schemaPath = path.join(__dirname, "..", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    await client.query(schema);
    log("✅ Base schema created (all tables + 5 roles)", "green");
    log("", "reset");

    // Step 2: Create admin user
    log("📝 Step 2/3: Creating admin user...", "yellow");
    const adminSql = `
      INSERT INTO users (
        auth0_id,
        email,
        first_name,
        last_name,
        role_id,
        is_active,
        status,
        created_at,
        updated_at
      )
      SELECT
        'google-oauth2|106216621173067609100',
        'zarika.amber@gmail.com',
        'Zarika',
        'Amber',
        r.id,
        true,
        'active',
        NOW(),
        NOW()
      FROM roles r
      WHERE r.name = 'admin'
      ON CONFLICT (email)
      DO UPDATE SET
        auth0_id = EXCLUDED.auth0_id,
        role_id = EXCLUDED.role_id,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        is_active = true,
        status = 'active',
        updated_at = NOW();
    `;

    await client.query(adminSql);
    log("✅ Admin user created: zarika.amber@gmail.com", "green");
    log("", "reset");

    // Step 3: Verify
    log("📝 Step 3/3: Verifying database state...", "yellow");

    const rolesResult = await client.query(
      "SELECT name, priority FROM roles ORDER BY priority DESC",
    );
    log(`  ✓ Roles: ${rolesResult.rows.map((r) => r.name).join(", ")}`, "cyan");

    const usersResult = await client.query(
      "SELECT COUNT(*) as count FROM users WHERE is_active = true",
    );
    log(`  ✓ Active users: ${usersResult.rows[0].count}`, "cyan");

    const tablesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    log(`  ✓ Tables created: ${tablesResult.rows[0].count}`, "cyan");

    log("", "reset");
    log("═══════════════════════════════════════════════", "green");
    log("   ✨ Migration completed successfully!", "green");
    log("═══════════════════════════════════════════════", "green");
    log("", "reset");
    log("🎯 Next steps:", "yellow");
    log(
      "  1. Test your API: https://tross-api-production.up.railway.app/api/health",
      "cyan",
    );
    log("  2. Update Auth0 with Railway URL", "cyan");
    log("  3. Lock down CORS (change ALLOWED_ORIGINS from *)", "cyan");
    log("", "reset");
  } catch (error) {
    log("", "reset");
    log("❌ Migration failed:", "red");
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

// Run migration
runMigration().catch((error) => {
  log("", "reset");
  log("❌ Unexpected error:", "red");
  log(error.message, "red");
  process.exit(1);
});
