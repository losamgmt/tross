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
  customer: {
    id: 1,
    name: "customer",
    description: "Customer with access to their own records",
    is_active: true,
    priority: 1,
    created_at: new Date("2025-01-01T00:00:00Z"),
    updated_at: new Date("2025-01-01T00:00:00Z"),
  },

  technician: {
    id: 2,
    name: "technician",
    description: "Technician with field access",
    is_active: true,
    priority: 2,
    created_at: new Date("2025-01-02T00:00:00Z"),
    updated_at: new Date("2025-01-02T00:00:00Z"),
  },

  dispatcher: {
    id: 3,
    name: "dispatcher",
    description: "Dispatcher with scheduling access",
    is_active: true,
    priority: 3,
    created_at: new Date("2025-01-03T00:00:00Z"),
    updated_at: new Date("2025-01-03T00:00:00Z"),
  },

  manager: {
    id: 4,
    name: "manager",
    description: "Manager with elevated operational access",
    is_active: true,
    priority: 4,
    created_at: new Date("2025-01-04T00:00:00Z"),
    updated_at: new Date("2025-01-04T00:00:00Z"),
  },

  admin: {
    id: 5,
    name: "admin",
    description: "System administrator with full access",
    is_active: true,
    priority: 5,
    created_at: new Date("2025-01-05T00:00:00Z"),
    updated_at: new Date("2025-01-05T00:00:00Z"),
  },

  inactive: {
    id: 6,
    name: "inactive_role",
    description: "Inactive role for testing",
    is_active: false,
    priority: 99,
    created_at: new Date("2025-01-06T00:00:00Z"),
    updated_at: new Date("2025-01-06T00:00:00Z"),
  },
};

/**
 * Array of all active roles (canonical hierarchy: customer → technician →
 * dispatcher → manager → admin)
 */
const ACTIVE_ROLES = [
  MOCK_ROLES.customer,
  MOCK_ROLES.technician,
  MOCK_ROLES.dispatcher,
  MOCK_ROLES.manager,
  MOCK_ROLES.admin,
];

/**
 * Array of all roles including inactive
 */
const ALL_ROLES = [...ACTIVE_ROLES, MOCK_ROLES.inactive];

/**
 * Protected role names (cannot be modified/deleted)
 */
const PROTECTED_ROLES = ["admin", "customer"];

module.exports = {
  MOCK_ROLES,
  ACTIVE_ROLES,
  ALL_ROLES,
  PROTECTED_ROLES,
};
