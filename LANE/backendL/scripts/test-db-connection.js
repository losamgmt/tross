/**
 * Database Connection Test
 * Run this to verify database connectivity and table existence
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'trossapp_dev',
  password: process.env.DB_PASSWORD || 'tross123',
  port: process.env.DB_PORT || 5432,
});

async function testConnection() {
  console.log('\n🔍 Testing Database Connection...\n');

  console.log('📋 Environment Variables:');
  console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   DB_PORT: ${process.env.DB_PORT || '5432'}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME || 'trossapp_dev'}`);
  console.log(`   DB_USER: ${process.env.DB_USER || 'postgres'}`);
  console.log('');

  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful\n');

    // Check current database
    const dbResult = await client.query('SELECT current_database()');
    console.log(
      `📊 Connected to database: ${dbResult.rows[0].current_database}\n`,
    );

    // List all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tables in database:');
    tablesResult.rows.forEach((row) => {
      console.log(`   ✓ ${row.table_name}`);
    });
    console.log('');

    // Check specific tables
    const requiredTables = [
      'users',
      'roles',
      'user_roles',
      'refresh_tokens',
      'audit_logs',
    ];
    console.log('🔍 Checking required tables:');
    for (const table of requiredTables) {
      const exists = tablesResult.rows.some((row) => row.table_name === table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    }
    console.log('');

    // Count records in key tables
    console.log('📊 Record counts:');
    for (const table of ['users', 'roles', 'refresh_tokens', 'audit_logs']) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ${table}: ${countResult.rows[0].count} records`);
      } catch (err) {
        console.log(`   ${table}: ERROR - ${err.message}`);
      }
    }

    client.release();
    console.log('\n✅ All database checks completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Database connection failed:');
    console.error(`   Error: ${err.message}`);
    console.error(`   Code: ${err.code}`);
    console.error(`   Detail: ${err.detail || 'N/A'}\n`);
    process.exit(1);
  }
}

testConnection();
