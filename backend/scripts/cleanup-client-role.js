/**
 * Cleanup Script: Remove old 'client' role
 *
 * After renaming 'client' → 'customer', this script:
 * 1. Updates any users still using 'client' role
 * 2. Deletes the old 'client' role record
 */

const { Client } = require("pg");
const { DATABASE } = require("../config/constants");

// Database configurations
const configs = {
  development: {
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

async function cleanupClientRole(config, envName) {
  const client = new Client(config);

  try {
    console.log(`\n🔄 Connecting to ${envName} database...`);
    await client.connect();
    console.log(`✅ Connected to ${envName} database`);

    // Check if 'client' role exists
    const roleCheck = await client.query(
      "SELECT id FROM roles WHERE name = 'client'",
    );

    if (roleCheck.rows.length === 0) {
      console.log(`✅ No 'client' role found in ${envName} - already clean!`);
      return;
    }

    const clientRoleId = roleCheck.rows[0].id;
    console.log(`📍 Found 'client' role with ID: ${clientRoleId}`);

    // Check if anyone has the 'client' role
    const usersCheck = await client.query(
      "SELECT COUNT(*) FROM users WHERE role_id = $1",
      [clientRoleId],
    );
    const userCount = parseInt(usersCheck.rows[0].count);
    console.log(`👥 Users with 'client' role: ${userCount}`);

    // Get customer role ID
    const customerRoleResult = await client.query(
      "SELECT id FROM roles WHERE name = 'customer'",
    );

    if (customerRoleResult.rows.length === 0) {
      console.error(`❌ ERROR: 'customer' role not found in ${envName}!`);
      console.error(
        "   Run apply-schema.js first to create the 'customer' role.",
      );
      return;
    }

    const customerRoleId = customerRoleResult.rows[0].id;
    console.log(`📍 'customer' role ID: ${customerRoleId}`);

    // Update any users from 'client' to 'customer'
    if (userCount > 0) {
      await client.query("UPDATE users SET role_id = $1 WHERE role_id = $2", [
        customerRoleId,
        clientRoleId,
      ]);
      console.log(
        `✅ Updated ${userCount} user(s) from 'client' to 'customer' role`,
      );
    }

    // Delete the old 'client' role
    await client.query("DELETE FROM roles WHERE name = 'client'");
    console.log(`✅ Deleted old 'client' role from ${envName}`);

    // Verify remaining roles
    const roles = await client.query(
      "SELECT name, priority FROM roles ORDER BY priority DESC",
    );
    console.log(`\n📊 Roles in ${envName}:`);
    roles.rows.forEach((r) => {
      console.log(`   - ${r.name} (priority: ${r.priority})`);
    });
  } catch (error) {
    console.error(`\n❌ Error in ${envName}:`, error.message);
    throw error;
  } finally {
    await client.end();
    console.log(`🔌 Disconnected from ${envName} database\n`);
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log('║       Cleanup Old "client" Role → "customer"              ║');
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    await cleanupClientRole(configs.development, "DEVELOPMENT");
    await cleanupClientRole(configs.test, "TEST");

    console.log(
      "╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║               ✅ Cleanup Completed ✅                      ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝",
    );
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error.message);
    process.exit(1);
  }
}

main();
