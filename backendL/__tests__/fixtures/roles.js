/**
 * Role Mock Fixtures
 * 
 * SRP: ONLY provides mock DATA, no behavior
 * Use with mock factories for test setup
 */

/**
 * Standard role fixtures for testing
 * Consistent with Contract v2.0 schema
 */
const MOCK_ROLES = {
  admin: {
    id: 1,
    name: "admin",
    description: "System administrator with full access",
    is_active: true,
    priority: 1,
    created_at: new Date("2025-01-01T00:00:00Z"),
    updated_at: new Date("2025-01-01T00:00:00Z"),
  },

  client: {
    id: 2,
    name: "client",
    description: "Client user with limited access",
    is_active: true,
    priority: 2,
    created_at: new Date("2025-01-02T00:00:00Z"),
    updated_at: new Date("2025-01-02T00:00:00Z"),
  },

  technician: {
    id: 3,
    name: "technician",
    description: "Technician with field access",
    is_active: true,
    priority: 3,
    created_at: new Date("2025-01-03T00:00:00Z"),
    updated_at: new Date("2025-01-03T00:00:00Z"),
  },

  dispatcher: {
    id: 4,
    name: "dispatcher",
    description: "Dispatcher with scheduling access",
    is_active: true,
    priority: 4,
    created_at: new Date("2025-01-04T00:00:00Z"),
    updated_at: new Date("2025-01-04T00:00:00Z"),
  },

  inactive: {
    id: 5,
    name: "inactive_role",
    description: "Inactive role for testing",
    is_active: false,
    priority: 99,
    created_at: new Date("2025-01-05T00:00:00Z"),
    updated_at: new Date("2025-01-05T00:00:00Z"),
  },
};

/**
 * Array of all active roles
 */
const ACTIVE_ROLES = [
  MOCK_ROLES.admin,
  MOCK_ROLES.client,
  MOCK_ROLES.technician,
  MOCK_ROLES.dispatcher,
];

/**
 * Array of all roles including inactive
 */
const ALL_ROLES = [...ACTIVE_ROLES, MOCK_ROLES.inactive];

/**
 * Protected role names (cannot be modified/deleted)
 */
const PROTECTED_ROLES = ["admin", "client"];

module.exports = {
  MOCK_ROLES,
  ACTIVE_ROLES,
  ALL_ROLES,
  PROTECTED_ROLES,
};
