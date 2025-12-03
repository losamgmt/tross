/**
 * Jest Global Teardown - Integration Tests
 * Runs ONCE after ALL integration test files complete
 * Closes database connections to prevent hanging
 */

const testLogger = require("../../config/test-logger");

module.exports = async () => {
  testLogger.log("🧹 Global teardown: Cleaning up...");

  try {
    // Import the pool here to close connections made during tests
    const { pool } = require("../../db/connection");
    
    if (pool && pool.totalCount > 0) {
      await pool.end();
      testLogger.log("✅ Test database connections closed");
    }
    
    testLogger.log("✅ TrossApp integration test suite completed");
  } catch (error) {
    testLogger.error("❌ Global teardown error:", error.message);
    // Don't throw - allow Jest to exit gracefully
  }
};
