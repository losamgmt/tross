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
// ROLE PRIORITY HIERARCHY:
// - admin: 5 (highest)
// - manager: 4
// - dispatcher: 3
// - technician: 2
// - customer: 1 (lowest)

const TEST_USERS = {
  admin: {
    // DB fields (match users table schema exactly)
    id: null, // No DB record - prevents FK conflicts
    auth0_id: 'dev|admin001',
    email: 'admin@trossapp.dev',
    first_name: 'Sarah',
    last_name: 'Administrator',
    role_id: 1, // FK to roles.id (admin role)
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',

    // Query-time fields (added by JOIN, not in DB)
    role: 'admin',           // From roles.name
    role_priority: 5,        // From roles.priority - for O(1) permission checks

    // Dev-only routing field
    provider: 'development',
  },
  manager: {
    id: null,
    auth0_id: 'dev|manager001',
    email: 'manager@trossapp.dev',
    first_name: 'Mike',
    last_name: 'Manager',
    role_id: 2,
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    role: 'manager',
    role_priority: 4,
    provider: 'development',
  },
  dispatcher: {
    id: null,
    auth0_id: 'dev|dispatcher001',
    email: 'dispatcher@trossapp.dev',
    first_name: 'Diana',
    last_name: 'Dispatcher',
    role_id: 3,
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    role: 'dispatcher',
    role_priority: 3,
    provider: 'development',
  },
  technician: {
    id: null,
    auth0_id: 'dev|tech001',
    email: 'technician@trossapp.dev',
    first_name: 'Tom',
    last_name: 'Technician',
    role_id: 4,
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    role: 'technician',
    role_priority: 2,
    provider: 'development',
  },
  client: {
    id: null,
    auth0_id: 'dev|client001',
    email: 'client@trossapp.dev',
    first_name: 'Carol',
    last_name: 'Customer',
    role_id: 5,
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    role: 'customer',
    role_priority: 1,
    provider: 'development',
  },
};

module.exports = { TEST_USERS };
