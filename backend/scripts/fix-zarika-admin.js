/**
 * One-time script to fix Zarika's user account
 * - Update role from customer to admin
 * - Update first_name and last_name from Auth0 token data
 */

const { Client } = require('pg');
const chalk = require('chalk');

const DEV_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'trossapp_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function fixZarikaAccount() {
  const client = new Client(DEV_CONFIG);

  try {
    await client.connect();
    console.log(chalk.green('✅ Connected to database'));

    // Get admin role ID
    const adminRole = await client.query(
      "SELECT id FROM roles WHERE name = 'admin'",
    );

    if (adminRole.rows.length === 0) {
      throw new Error('Admin role not found!');
    }

    const adminRoleId = adminRole.rows[0].id;
    console.log(chalk.cyan(`📌 Admin role ID: ${adminRoleId}`));

    // Update Zarika's account
    const result = await client.query(`
      UPDATE users 
      SET 
        role_id = $1,
        first_name = $2,
        last_name = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE email = $4
      RETURNING *
    `, [adminRoleId, 'Zarika', 'Amber', 'zarika.amber@gmail.com']);

    if (result.rows.length === 0) {
      console.log(chalk.yellow('⚠️  User not found with email: zarika.amber@gmail.com'));
      return;
    }

    const user = result.rows[0];
    console.log(chalk.green('\n✅ User updated successfully!'));
    console.log(chalk.cyan('📋 Updated user:'));
    console.log(chalk.white(`   ID: ${user.id}`));
    console.log(chalk.white(`   Email: ${user.email}`));
    console.log(chalk.white(`   Name: ${user.first_name} ${user.last_name}`));
    console.log(chalk.white(`   Role ID: ${user.role_id}`));
    console.log(chalk.white(`   Auth0 ID: ${user.auth0_id}`));

  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    throw error;
  } finally {
    await client.end();
    console.log(chalk.blue('\n🔌 Disconnected from database'));
  }
}

// Run the script
fixZarikaAccount()
  .then(() => {
    console.log(chalk.green('\n✅ Done! Please refresh your browser.'));
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red('\n❌ Script failed:'), error);
    process.exit(1);
  });
