// Test Users Configuration for Development
// Five users representing each role in the TrossApp hierarchy
//
// ARCHITECTURE: File-based dev users with DB-consistent structure
// - Same schema as real database users (role_id, not role string)
// - id: null (dev users don't exist in DB, no foreign key conflicts)
// - auth0_id is the unique identifier for dev users
// - Allows dev auth WITHOUT database queries or dependencies
//
// PARITY WITH DATABASE SCHEMA (users table) - CONTRACT V2.0:
// ✅ DB Fields (must match exactly):
//    - id, email, auth0_id, first_name, last_name
//    - role_id (FK to roles.id)
//    - is_active, created_at, updated_at
//
// ⚠️  Query-Time Fields (added by User.findById JOIN, NOT in DB):
//    - role (string) - denormalized from roles.name for convenience
//    - role_priority (int) - denormalized from roles.priority for O(1) permission checks
//    - name (string) - computed from first_name + last_name
//
// 🔧 Non-DB Fields (dev-only routing):
//    - provider (string) - signals "development" vs "auth0" auth strategy
//
// ROLE PRIORITY: Uses role-definitions.js fallback constants (acceptable for dev-auth)
// This file is part of the dev auth strategy - not used in production Auth0 flow.

const { ROLE_NAME_TO_PRIORITY } = require('./role-definitions');

// Database role_id to role name mapping
// This matches the database seed data in roles table
const ROLE_ID_TO_NAME = {
  1: 'admin',
  2: 'manager',
  3: 'dispatcher',
  4: 'technician',
  5: 'customer',
};

/**
 * Create a test user with derived role_priority from SSOT
 * @param {Object} config - User configuration
 * @returns {Object} Complete user object with derived role_priority
 */
function createTestUser({
  auth0_id,
  email,
  first_name,
  last_name,
  role_id,
}) {
  const role = ROLE_ID_TO_NAME[role_id];
  return {
    // DB fields (match users table schema exactly)
    id: null, // No DB record - prevents FK conflicts
    auth0_id,
    email,
    first_name,
    last_name,
    role_id,
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',

    // Query-time fields (added by JOIN, not in DB)
    role, // From roles.name
    role_priority: ROLE_NAME_TO_PRIORITY[role], // Derived from SSOT

    // Dev-only routing field
    provider: 'development',
  };
}

const TEST_USERS = {
  admin: createTestUser({
    auth0_id: 'dev|admin001',
    email: 'admin@trossapp.dev',
    first_name: 'Sarah',
    last_name: 'Administrator',
    role_id: 1,
  }),
  manager: createTestUser({
    auth0_id: 'dev|manager001',
    email: 'manager@trossapp.dev',
    first_name: 'Mike',
    last_name: 'Manager',
    role_id: 2,
  }),
  dispatcher: createTestUser({
    auth0_id: 'dev|dispatcher001',
    email: 'dispatcher@trossapp.dev',
    first_name: 'Diana',
    last_name: 'Dispatcher',
    role_id: 3,
  }),
  technician: createTestUser({
    auth0_id: 'dev|tech001',
    email: 'technician@trossapp.dev',
    first_name: 'Tom',
    last_name: 'Technician',
    role_id: 4,
  }),
  customer: createTestUser({
    auth0_id: 'dev|customer001',
    email: 'customer@trossapp.dev',
    first_name: 'Carol',
    last_name: 'Customer',
    role_id: 5,
  }),
};

module.exports = { TEST_USERS };
