#!/usr/bin/env node
/**
 * Database Audit Script
 *
 * Checks data purity and consistency across dev and test databases
 */

const { Client } = require("pg");
const { DATABASE } = require("../config/constants");

async function auditDatabase(config, envName) {
  const client = new Client(config);

  try {
    await client.connect();
    console.log(
      "\n╔════════════════════════════════════════════════════════════╗",
    );
    console.log(`║ ${envName.toUpperCase()} DATABASE AUDIT`.padEnd(61) + "║");
    console.log(
      "╚════════════════════════════════════════════════════════════╝",
    );

    // Check roles
    const roles = await client.query(
      "SELECT id, name, description, priority, is_active FROM roles ORDER BY id",
    );
    console.log(`\n📊 ROLES TABLE (${roles.rows.length} records):`);
    console.log("  ID | Name         | Priority | Active | Description");
    console.log("  ---|--------------|----------|--------|-------------");
    roles.rows.forEach((r) => {
      const desc = r.description ? r.description.substring(0, 40) : "";
      console.log(
        `  ${r.id.toString().padEnd(2)} | ${r.name.padEnd(12)} | ${r.priority.toString().padEnd(8)} | ${r.is_active ? "Yes" : "No "}    | ${desc}`,
      );
    });

    // Check users
    const users = await client.query(
      "SELECT id, email, first_name, last_name, role_id, is_active, status FROM users ORDER BY id",
    );
    console.log(`\n👥 USERS TABLE (${users.rows.length} records):`);
    if (users.rows.length > 0) {
      console.log(
        "  ID | Email                    | Name           | Role ID | Active | Status",
      );
      console.log(
        "  ---|--------------------------|----------------|---------|--------|--------",
      );
      users.rows.forEach((u) => {
        const name = `${u.first_name || ""} ${u.last_name || ""}`.trim();
        const roleId = (u.role_id || "null").toString().padEnd(7);
        console.log(
          `  ${u.id.toString().padEnd(2)} | ${u.email.padEnd(24)} | ${name.padEnd(14)} | ${roleId} | ${u.is_active ? "Yes" : "No "}    | ${u.status}`,
        );
      });
    } else {
      console.log("  (empty - no users)");
    }

    // Check audit logs count
    const auditCount = await client.query("SELECT COUNT(*) FROM audit_logs");
    console.log(`\n📝 AUDIT_LOGS: ${auditCount.rows[0].count} records`);

    // Check for data consistency issues
    console.log("\n🔍 DATA CONSISTENCY CHECKS:");

    // Check for duplicate role IDs
    const duplicateRoles = await client.query(`
      SELECT id, COUNT(*) as count 
      FROM roles 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);
    if (duplicateRoles.rows.length > 0) {
      console.log(`  ❌ DUPLICATE ROLE IDs: ${duplicateRoles.rows.length}`);
    } else {
      console.log("  ✅ No duplicate role IDs");
    }

    // Check for orphaned users (role_id not in roles)
    const orphanedUsers = await client.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role_id IS NOT NULL 
      AND role_id NOT IN (SELECT id FROM roles)
    `);
    if (parseInt(orphanedUsers.rows[0].count) > 0) {
      console.log(
        `  ❌ ORPHANED USERS: ${orphanedUsers.rows[0].count} (invalid role_id)`,
      );
    } else {
      console.log("  ✅ No orphaned users");
    }

    // Check for expected 5 core roles
    const coreRoles = await client.query(`
      SELECT name FROM roles 
      WHERE name IN ('admin', 'manager', 'dispatcher', 'technician', 'customer')
      ORDER BY priority DESC
    `);
    if (coreRoles.rows.length === 5) {
      console.log("  ✅ All 5 core roles present");
    } else {
      console.log(
        `  ❌ MISSING CORE ROLES: Expected 5, found ${coreRoles.rows.length}`,
      );
    }
  } finally {
    await client.end();
  }
}

async function main() {
  console.log(
    "\n╔════════════════════════════════════════════════════════════╗",
  );
  console.log("║           DATABASE PURITY AUDIT REPORT                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    await auditDatabase(
      {
        host: DATABASE.DEV.HOST,
        port: DATABASE.DEV.PORT,
        database: DATABASE.DEV.NAME,
        user: DATABASE.DEV.USER,
        password: DATABASE.DEV.PASSWORD,
      },
      "Development",
    );

    await auditDatabase(
      {
        host: DATABASE.TEST.HOST,
        port: DATABASE.TEST.PORT,
        database: DATABASE.TEST.NAME,
        user: DATABASE.TEST.USER,
        password: DATABASE.TEST.PASSWORD,
      },
      "Test",
    );

    console.log(
      "\n╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║                    AUDIT COMPLETE                         ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝\n",
    );
  } catch (error) {
    console.error("\n❌ Audit failed:", error.message);
    process.exit(1);
  }
}

main();
