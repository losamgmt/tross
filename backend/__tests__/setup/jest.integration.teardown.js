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

    if (pool) {
      // Wait for any in-flight queries to complete (brief grace period)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if pool has active connections
      const totalCount = pool.totalCount || 0;
      const idleCount = pool.idleCount || 0;
      const waitingCount = pool.waitingCount || 0;

      testLogger.log(
        `📊 Pool status: ${totalCount} total, ${idleCount} idle, ${waitingCount} waiting`
      );

      if (totalCount > 0) {
        try {
          await pool.end();
          testLogger.log("✅ Test database connections closed gracefully");
        } catch (endError) {
          // Connection already terminated - this is OK
          if (endError.message === "Connection terminated") {
            testLogger.log("✅ Pool already terminated");
          } else {
            throw endError;
          }
        }
      } else {
        testLogger.log("✅ No active connections to close");
      }
    }

    testLogger.log("✅ Tross integration test suite completed");
  } catch (error) {
    // Log but don't throw - allow Jest to exit gracefully
    testLogger.error("⚠️ Global teardown warning:", error.message);
  }
};
