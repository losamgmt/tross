/**
 * User Mock Fixtures
 * 
 * SRP: ONLY provides mock DATA, no behavior
 * Use with mock factories for test setup
 */

/**
 * Standard user fixtures for testing
 * Consistent with Contract v2.0 schema
 */
const MOCK_USERS = {
  admin: {
    id: 1,
    email: "admin@trossapp.com",
    auth0_id: "auth0|admin123",
    first_name: "Admin",
    last_name: "User",
    role_id: 1,
    is_active: true,
    created_at: new Date("2025-01-01T00:00:00Z"),
    updated_at: new Date("2025-01-01T00:00:00Z"),
  },

  client: {
    id: 2,
    email: "client@example.com",
    auth0_id: "auth0|client123",
    first_name: "John",
    last_name: "Doe",
    role_id: 2,
    is_active: true,
    created_at: new Date("2025-01-02T00:00:00Z"),
    updated_at: new Date("2025-01-02T00:00:00Z"),
  },

  technician: {
    id: 3,
    email: "tech@trossapp.com",
    auth0_id: "auth0|tech123",
    first_name: "Jane",
    last_name: "Smith",
    role_id: 3,
    is_active: true,
    created_at: new Date("2025-01-03T00:00:00Z"),
    updated_at: new Date("2025-01-03T00:00:00Z"),
  },

  dispatcher: {
    id: 4,
    email: "dispatch@trossapp.com",
    auth0_id: "auth0|dispatch123",
    first_name: "Bob",
    last_name: "Johnson",
    role_id: 4,
    is_active: true,
    created_at: new Date("2025-01-04T00:00:00Z"),
    updated_at: new Date("2025-01-04T00:00:00Z"),
  },

  inactive: {
    id: 5,
    email: "inactive@example.com",
    auth0_id: "auth0|inactive123",
    first_name: "Inactive",
    last_name: "User",
    role_id: 2,
    is_active: false,
    created_at: new Date("2025-01-05T00:00:00Z"),
    updated_at: new Date("2025-01-05T00:00:00Z"),
  },
};

/**
 * Users with role data joined (as returned by queries with JOINs)
 */
const MOCK_USERS_WITH_ROLES = {
  admin: {
    ...MOCK_USERS.admin,
    role_name: "admin",
    role_description: "System administrator with full access",
  },

  client: {
    ...MOCK_USERS.client,
    role_name: "client",
    role_description: "Client user with limited access",
  },

  technician: {
    ...MOCK_USERS.technician,
    role_name: "technician",
    role_description: "Technician with field access",
  },

  dispatcher: {
    ...MOCK_USERS.dispatcher,
    role_name: "dispatcher",
    role_description: "Dispatcher with scheduling access",
  },
};

/**
 * Array of active users
 */
const ACTIVE_USERS = [
  MOCK_USERS.admin,
  MOCK_USERS.client,
  MOCK_USERS.technician,
  MOCK_USERS.dispatcher,
];

/**
 * Array of all users including inactive
 */
const ALL_USERS = [...ACTIVE_USERS, MOCK_USERS.inactive];

module.exports = {
  MOCK_USERS,
  MOCK_USERS_WITH_ROLES,
  ACTIVE_USERS,
  ALL_USERS,
};
