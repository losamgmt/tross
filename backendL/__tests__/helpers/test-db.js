/**
 * Test Database Utilities
 * Manages PostgreSQL test database for integration tests
 *
 * NOTE: This now uses the centralized pool from db/connection.js
 * which automatically switches to test database when NODE_ENV=test
 */

const fs = require("fs").promises;
const path = require("path");
const { pool: centralPool } = require("../../db/connection");
const { logger } = require("../../config/logger");
const testLogger = require("../../config/test-logger");
const {
  TEST_EMAIL_PREFIXES,
  TEST_ROLES,
  TEST_USERS,
  TEST_TOKEN_CLAIMS,
} = require("../../config/test-constants");

// Track setup state globally (prevents multiple setups in parallel)
// Note: In Jest, globalSetup runs in a separate context, so we can't rely on
// this flag alone. Tests should handle "already setup" gracefully.
let isSetup = false;
let setupPromise = null; // Track ongoing setup to prevent race conditions

/**
 * Set up test database - apply schema
 * Call this in beforeAll() of integration tests OR in globalSetup
 * Uses centralized pool which is already configured for test database
 * OPTIMIZED: Only runs schema setup once, subsequent calls return immediately
 * IDEMPOTENT: Safe to call multiple times, will only set up once per process
 */
async function setupTestDatabase() {
  // If already set up, return immediately (FAST PATH)
  if (isSetup) {
    testLogger.log("⚡ Test database already setup (fast path)");
    return centralPool;
  }

  // If setup is in progress, wait for it to complete (prevents race conditions)
  if (setupPromise) {
    testLogger.log("⏳ Test database setup in progress, waiting...");
    await setupPromise;
    return centralPool;
  }

  // Start setup and track the promise
  setupPromise = (async () => {
    try {
      testLogger.log("🚀 Setting up test database...");
      
      // Test connection
      const client = await centralPool.connect();
      await client.query("SELECT NOW()");
      client.release();

      testLogger.log("✅ Test database connected");

      // Apply schema (optimized - only if needed)
      await runMigrations(centralPool);

      isSetup = true;
      setupPromise = null; // Clear promise after successful setup
      testLogger.log("🎉 Test database setup complete!");
      return centralPool;
    } catch (error) {
      setupPromise = null; // Clear promise on error so retry is possible
      testLogger.error("❌ Test database setup failed:", error.message);
      throw new Error(`Test database setup failed: ${error.message}`);
    }
  })();

  return setupPromise;
}

/**
 * Run database schema setup on test database
 * Uses schema.sql instead of migrations
 * OPTIMIZED: Only drops and recreates if schema doesn't exist or is corrupted
 * This is 100x faster than DROP CASCADE on every test run
 */
async function runMigrations(pool) {
  const schemaPath = path.join(__dirname, "../../schema.sql");

  try {
    testLogger.log("📦 Checking database schema...");

    // Check if schema already exists with expected tables
    const tableCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'roles', 'refresh_tokens', 'audit_logs')
    `);

    const expectedTables = 4;
    const hasSchema = parseInt(tableCheck.rows[0].count) === expectedTables;

    if (hasSchema) {
      testLogger.log("✅ Schema already exists, skipping setup (fast path)");
      return;
    }

    testLogger.log("🔧 Schema missing or incomplete, applying full setup...");

    // Drop and recreate public schema for clean slate
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
    await pool.query("CREATE SCHEMA IF NOT EXISTS public");

    // Grant usage on schema to ensure proper permissions
    await pool.query("GRANT ALL ON SCHEMA public TO PUBLIC");
    await pool.query("GRANT ALL ON SCHEMA public TO postgres");

    // Apply schema
    const sql = await fs.readFile(schemaPath, "utf8");
    await pool.query(sql);

    testLogger.log("✅ Schema applied successfully");
  } catch (error) {
    testLogger.error("❌ Schema application error:", error.message);
    testLogger.error("Error details:", error);
    throw error;
  }
}

/**
 * Clean up test database - truncate all tables
 * Call this in afterEach() to reset state between tests
 * Uses centralized pool
 * 
 * STANDARD PATTERN: Assumes schema is already set up by globalSetup
 * Just cleans data, doesn't touch schema
 */
async function cleanupTestDatabase() {
  try {
    // KISS: Truncate test data tables (preserve roles as they're seeded by schema)
    // Note: user_roles table no longer exists (simplified to users.role_id)
    await centralPool.query(`
      TRUNCATE TABLE 
        audit_logs,
        refresh_tokens,
        users
      RESTART IDENTITY CASCADE;
    `);

    // Note: We don't truncate 'roles' table because it contains seed data
    // from schema (admin, manager, dispatcher, technician, client)

    testLogger.log("🧹 Test database cleaned");
  } catch (error) {
    testLogger.error("❌ Database cleanup failed:", error.message);
    throw error;
  }
}

/**
 * Tear down test database connection
 * Call this in afterAll() of integration tests
 * Closes the centralized pool to prevent open handles warning
 */
async function teardownTestDatabase() {
  if (isSetup) {
    try {
      // Close the centralized pool to prevent open handles
      await centralPool.end();
      isSetup = false;
      testLogger.log("✅ Test database connection closed");
    } catch (error) {
      testLogger.error("❌ Test database teardown failed:", error.message);
      throw error;
    }
  }
}

/**
 * Get test database pool (for direct queries in tests)
 * Returns the centralized pool which is automatically configured for tests
 * 
 * STANDARD PATTERN: Assumes globalSetup has already configured the database
 */
function getTestPool() {
  return centralPool;
}

/**
 * Create a test user directly in database
 * Useful for setting up test scenarios
 * KISS: users.role_id directly references roles table (many-to-one)
 *
 * @param {Object|string} userData - User data object or role name string
 * @returns {Promise<{user: Object, token: string}>}
 */
async function createTestUser(userData = {}) {
  const jwt = require("jsonwebtoken");
  const pool = getTestPool();

  // Handle both createTestUser('admin') and createTestUser({ role: 'admin' })
  const userDataObj =
    typeof userData === "string" ? { role: userData } : userData;

  const defaultUser = {
    auth0_id: `test-${Date.now()}`,
    email: `test-${Date.now()}@test.com`,
    first_name: "Test",
    last_name: "User",
    role: "technician", // Default role
    ...userDataObj,
  };

  // KISS: Single INSERT with role_id (many-to-one relationship)
  const userResult = await pool.query(
    `INSERT INTO users (auth0_id, email, first_name, last_name, role_id)
     VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = $5))
     RETURNING *`,
    [
      defaultUser.auth0_id,
      defaultUser.email,
      defaultUser.first_name,
      defaultUser.last_name,
      defaultUser.role,
    ],
  );

  const user = userResult.rows[0];

  // Add role name to user object for convenience (fetch from DB)
  const roleResult = await pool.query("SELECT name FROM roles WHERE id = $1", [
    user.role_id,
  ]);
  user.role = roleResult.rows[0]?.name || defaultUser.role;

  // Generate JWT token for testing - MUST match unified token structure (RFC 7519)
  // CRITICAL: Use 'auth0' provider since these are REAL database users
  // 'development' provider is for in-memory test-users.js only (no DB)
  const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
  const token = jwt.sign(
    {
      // REGISTERED CLAIMS (RFC 7519 Standard) - REQUIRED by auth middleware
      iss: process.env.API_URL || "https://api.trossapp.dev", // Issuer
      sub: user.auth0_id, // Subject (user ID) - REQUIRED
      aud: process.env.API_URL || "https://api.trossapp.dev", // Audience

      // PRIVATE CLAIMS (Application-specific)
      email: user.email,
      role: user.role,
      provider: "auth0", // REQUIRED: auth0 = database user, development = config-only
      userId: user.id, // Database ID for convenience
    },
    JWT_SECRET,
    { expiresIn: "1h" },
  );

  return { user, token };
}

/**
 * Create test role directly in database
 */
async function createTestRole(roleData = {}) {
  const pool = getTestPool();

  const defaultRole = {
    name: "test_role",
    description: "Test role",
    permissions: ["read"],
    ...roleData,
  };

  const result = await pool.query(
    `INSERT INTO roles (name, description, permissions)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [defaultRole.name, defaultRole.description, defaultRole.permissions],
  );

  return result.rows[0];
}

/**
 * Verify test database is ready
 * Call this to check DB health before running tests
 */
async function verifyTestDatabase() {
  try {
    const pool = getTestPool();

    // Check connection
    const result = await pool.query("SELECT NOW() as current_time");

    // Check tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const expectedTables = ["users", "roles", "refresh_tokens", "audit_logs"];
    const actualTables = tables.rows.map((r) => r.table_name);

    const missingTables = expectedTables.filter(
      (t) => !actualTables.includes(t),
    );

    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(", ")}`);
    }

    testLogger.log("✅ Test database verified");
    return true;
  } catch (error) {
    testLogger.error("❌ Test database verification failed:", error.message);
    throw error;
  }
}

/**
 * Generate unique email address for tests
 * Uses centralized prefixes from test-constants.js
 *
 * @param {string} prefix - Email prefix from TEST_EMAIL_PREFIXES (default: GENERIC)
 * @returns {string} - Unique email address
 */
function uniqueEmail(prefix = TEST_EMAIL_PREFIXES.GENERIC) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${random}@test.com`;
}

/**
 * Generate unique role name for tests
 * Uses centralized role names from test-constants.js
 *
 * @param {string} baseRole - Base role name from TEST_ROLES (default: UNIQUE_COORDINATOR)
 * @returns {string} - Unique role name
 */
function uniqueRoleName(baseRole = TEST_ROLES.UNIQUE_COORDINATOR) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `${baseRole}_${timestamp}_${random}`;
}

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  teardownTestDatabase,
  getTestPool,
  createTestUser,
  createTestRole,
  verifyTestDatabase,
  uniqueEmail,
  uniqueRoleName,
};
