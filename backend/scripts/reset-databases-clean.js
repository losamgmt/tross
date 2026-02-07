#!/usr/bin/env node
/**
 * Nuclear Database Reset Script
 *
 * COMPLETELY drops and recreates both dev and test databases
 * Ensures clean, consistent state with ONLY the 5 core roles
 * Role IDs will be 1-5 in correct order
 *
 * USE WITH CAUTION: This destroys ALL data!
 */

const { Client } = require("pg");
const fs = require("fs").promises;
const path = require("path");
const { DATABASE } = require("../config/constants");

// Color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function resetDatabase(config, envName) {
  // Connect to postgres database (not the app database)
  const adminClient = new Client({
    host: config.host,
    port: config.port,
    database: "postgres", // Connect to postgres DB to drop/create
    user: config.user,
    password: config.password,
  });

  try {
    log(`\n🔄 Connecting to postgres (to reset ${envName})...`, "blue");
    await adminClient.connect();
    log("✅ Connected to postgres", "green");

    // Terminate all connections to the target database
    log(`🔌 Terminating all connections to ${config.database}...`, "yellow");
    await adminClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${config.database}'
        AND pid <> pg_backend_pid();
    `);
    log("✅ Connections terminated", "green");

    // Drop database
    log(`💥 Dropping database ${config.database}...`, "red");
    await adminClient.query(`DROP DATABASE IF EXISTS "${config.database}";`);
    log("✅ Database dropped", "green");

    // Create fresh database
    log(`🆕 Creating fresh database ${config.database}...`, "blue");
    await adminClient.query(
      `CREATE DATABASE "${config.database}" OWNER "${config.user}";`,
    );
    log("✅ Database created", "green");
  } catch (error) {
    log(`❌ Error resetting ${envName}: ${error.message}`, "red");
    throw error;
  } finally {
    await adminClient.end();
  }

  // Now connect to the new database and apply schema
  const appClient = new Client(config);

  try {
    log(`\n🔄 Connecting to fresh ${envName} database...`, "blue");
    await appClient.connect();
    log(`✅ Connected to ${envName}`, "green");

    // Apply schema
    const schemaPath = path.join(__dirname, "..", "schema.sql");
    const schema = await fs.readFile(schemaPath, "utf8");

    log(`📄 Applying schema.sql to ${envName}...`, "blue");
    await appClient.query(schema);
    log("✅ Schema applied", "green");

    // Verify roles
    const rolesResult = await appClient.query(`
      SELECT id, name, priority 
      FROM roles 
      ORDER BY priority DESC
    `);

    log(`\n📊 Roles in ${envName}:`, "cyan");
    rolesResult.rows.forEach((r) => {
      const emoji = r.priority === 5 ? "👑" : r.priority === 1 ? "👤" : "👔";
      log(
        `   ${emoji} ID: ${r.id}, Name: ${r.name.padEnd(12)}, Priority: ${r.priority}`,
        "cyan",
      );
    });

    // Verify counts
    const usersResult = await appClient.query("SELECT COUNT(*) FROM users");
    const userCount = parseInt(usersResult.rows[0].count);

    log(
      `\n👥 Users in ${envName}: ${userCount}`,
      userCount === 0 ? "green" : "yellow",
    );

    if (userCount > 0 && envName === "TEST") {
      log("   ⚠️  WARNING: Test DB should have 0 users!", "yellow");
    }

    // For DEV, check if we have our admin user
    if (envName === "DEVELOPMENT") {
      const adminCheck = await appClient.query(`
        SELECT email, role_id FROM users WHERE email = 'zarika.amber@gmail.com'
      `);

      if (adminCheck.rows.length > 0) {
        log(
          `   ✅ Admin user exists: ${adminCheck.rows[0].email} (role_id: ${adminCheck.rows[0].role_id})`,
          "green",
        );
      } else {
        log(
          "   ℹ️  No admin user yet (will be created on first Auth0 login)",
          "blue",
        );
      }
    }
  } catch (error) {
    log(`❌ Error applying schema to ${envName}: ${error.message}`, "red");
    throw error;
  } finally {
    await appClient.end();
    log(`🔌 Disconnected from ${envName}\n`, "blue");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const devOnly = args.includes("--dev-only");
  const testOnly = args.includes("--test-only");

  const targets = devOnly
    ? "DEVELOPMENT only"
    : testOnly
      ? "TEST only"
      : "BOTH databases";

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         🔥 NUCLEAR DATABASE RESET 🔥                      ║");
  console.log(
    `║  WARNING: This will DESTROY ALL data in ${targets.padEnd(16)}║`,
  );
  console.log("╚════════════════════════════════════════════════════════════╝");

  log("\n⏳ Starting in 3 seconds... (Ctrl+C to cancel)", "yellow");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    // Reset dev database (unless test-only)
    if (!testOnly) {
      await resetDatabase(
        {
          host: DATABASE.DEV.HOST,
          port: DATABASE.DEV.PORT,
          database: DATABASE.DEV.NAME,
          user: DATABASE.DEV.USER,
          password: DATABASE.DEV.PASSWORD,
        },
        "DEVELOPMENT",
      );
    }

    // Reset test database (unless dev-only)
    if (!devOnly) {
      await resetDatabase(
        {
          host: DATABASE.TEST.HOST,
          port: DATABASE.TEST.PORT,
          database: DATABASE.TEST.NAME,
          user: DATABASE.TEST.USER,
          password: DATABASE.TEST.PASSWORD,
        },
        "TEST",
      );
    }

    console.log(
      "╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║            ✅ DATABASE(S) RESET SUCCESSFULLY ✅            ║",
    );
    console.log(
      "║                                                            ║",
    );
    console.log(
      "║  Database(s) now have:                                    ║",
    );
    console.log(
      "║  - Clean schema with 5 core roles (IDs 1-5)               ║",
    );
    console.log(
      "║  - No test garbage                                        ║",
    );
    console.log(
      "║  - Consistent structure                                   ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝",
    );
  } catch (error) {
    log(`\n❌ Reset failed: ${error.message}`, "red");
    process.exit(1);
  }
}

// ============================================================================
// EXPORTS (for testing)
// ============================================================================
module.exports = {
  resetDatabase,
  log,
  colors,
};

// ============================================================================
// CLI ENTRYPOINT
// ============================================================================
if (require.main === module) {
  main();
}
