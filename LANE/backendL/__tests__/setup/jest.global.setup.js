/**
 * Jest Global Setup - Integration Tests
 * Runs ONCE before ALL integration test files
 * Sets up the test database schema
 */

// Note: globalSetup runs in a separate context and cannot export to tests
// We need to use environment variables or the filesystem to communicate state

module.exports = async () => {
  // Set up environment for database connection
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-key-for-jest-integration";
  process.env.AUTH_MODE = "development";
  process.env.USE_TEST_AUTH = "true";

  // Import after setting NODE_ENV
  const { pool } = require("../../db/connection");
  const fs = require("fs").promises;
  const path = require("path");
  const testLogger = require("../../config/test-logger");

  testLogger.log("🧪 Starting TrossApp integration test suite...");
  testLogger.log("📦 Setting up test database schema...");

  try {
    // Simple, fast schema setup - DROP and recreate for clean state
    const schemaPath = path.join(__dirname, "../../schema.sql");
    
    testLogger.log("🗑️  Dropping existing schema...");
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
    await pool.query("CREATE SCHEMA IF NOT EXISTS public");
    await pool.query("GRANT ALL ON SCHEMA public TO PUBLIC");
    await pool.query("GRANT ALL ON SCHEMA public TO postgres");

    testLogger.log("📄 Applying schema.sql...");
    const sql = await fs.readFile(schemaPath, "utf8");
    await pool.query(sql);

    testLogger.log("✅ Test database schema ready!");
    
    // Close the pool - tests will create their own connections
    await pool.end();
  } catch (error) {
    testLogger.error("❌ Global test database setup failed:", error.message);
    testLogger.error(
      "💡 Make sure test database is running: docker-compose -f docker-compose.test.yml up -d",
    );
    throw error;
  }
};
