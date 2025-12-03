/**
 * Test Constants
 * Single source of truth for ALL test data
 *
 * Architecture Principles:
 * - DRY: All test data defined once, used everywhere
 * - SRP: Each constant group has single responsibility
 * - YAGNI: Only what we need, nothing more
 * - Edge Cases: Unique names avoid conflicts with seeded data
 */

// ============================================================================
// TEST ROLES
// ============================================================================
// IMPORTANT: Use unique names that DON'T conflict with migrations
// Migration 001 seeds: admin, client, technician, dispatcher, manager
const TEST_ROLES = Object.freeze({
  // Unique test role names with test_ prefix to avoid migration conflicts
  UNIQUE_COORDINATOR: 'test_coordinator',
  UNIQUE_SUPERVISOR: 'test_supervisor',
  UNIQUE_ANALYST: 'test_analyst',
  UNIQUE_OBSERVER: 'test_observer',
  UNIQUE_AUDITOR: 'test_auditor',

  // Role names for update tests (different from creation to test update logic)
  UPDATED_COORDINATOR: 'test_updated_coordinator',
  UPDATED_SUPERVISOR: 'test_updated_supervisor',

  // Role names for conflict testing (simulate existing roles)
  CONFLICT_NAME: 'test_existing_role',
});

// ============================================================================
// TEST USERS
// ============================================================================
// Standardized test user data templates
const TEST_USERS = Object.freeze({
  ADMIN: Object.freeze({
    first_name: 'Test',
    last_name: 'Admin',
    role: 'admin',
    provider: 'development',
  }),

  CLIENT: Object.freeze({
    first_name: 'Test',
    last_name: 'Client',
    role: 'client',
    provider: 'development',
  }),

  MANAGER: Object.freeze({
    first_name: 'Test',
    last_name: 'Manager',
    role: 'manager',
    provider: 'development',
  }),

  TECHNICIAN: Object.freeze({
    first_name: 'Test',
    last_name: 'Technician',
    role: 'technician',
    provider: 'development',
  }),

  // User for update tests
  FOR_UPDATE: Object.freeze({
    first_name: 'Original',
    last_name: 'User',
    role: 'client',
    provider: 'development',
  }),

  // Updated user data
  UPDATED: Object.freeze({
    first_name: 'Updated',
    last_name: 'User',
    role: 'manager',
    provider: 'development',
  }),
});

// ============================================================================
// TEST EMAIL PATTERNS
// ============================================================================
// Email prefixes for uniqueEmail() helper
const TEST_EMAIL_PREFIXES = Object.freeze({
  ADMIN: 'test-admin',
  CLIENT: 'test-client',
  MANAGER: 'test-manager',
  TECHNICIAN: 'test-technician',
  GENERIC: 'test-user',
  UPDATE: 'test-update',
  DELETE: 'test-delete',
  LIFECYCLE: 'test-lifecycle',
});

// ============================================================================
// TEST TOKENS
// ============================================================================
// RFC 7519 token claim templates
const TEST_TOKEN_CLAIMS = Object.freeze({
  ISSUER: 'test-trossapp',
  AUDIENCE: 'trossapp-api',

  // Common token structures for different test scenarios
  ADMIN_CLAIMS: Object.freeze({
    iss: 'test-trossapp',
    aud: 'trossapp-api',
    provider: 'development',
    role: 'admin',
  }),

  CLIENT_CLAIMS: Object.freeze({
    iss: 'test-trossapp',
    aud: 'trossapp-api',
    provider: 'development',
    role: 'client',
  }),

  MANAGER_CLAIMS: Object.freeze({
    iss: 'test-trossapp',
    aud: 'trossapp-api',
    provider: 'development',
    role: 'manager',
  }),
});

// ============================================================================
// TEST AUDIT SCENARIOS
// ============================================================================
// Expected audit log patterns
const TEST_AUDIT = Object.freeze({
  ACTIONS: Object.freeze({
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DELETED: 'user_deleted',
    USER_ROLE_REMOVED: 'user_role_removed',
    ROLE_CREATED: 'role_created',
    ROLE_UPDATED: 'role_updated',
    ROLE_DELETED: 'role_deleted',
  }),

  STATUSES: Object.freeze({
    SUCCESS: 'success',
    FAILURE: 'failure',
  }),
});

// ============================================================================
// TEST ERROR MESSAGES
// ============================================================================
// Expected error messages for validation tests
// These MUST match the messages in middleware/validation.js
const TEST_ERROR_MESSAGES = Object.freeze({
  VALIDATION: Object.freeze({
    // Error type returned by validation middleware
    ERROR_TYPE: 'Validation Error',

    // Role validation messages (from validateRoleCreate, validateRoleUpdate)
    ROLE_NAME_REQUIRED: 'Role name is required',
    ROLE_NAME_EMPTY: 'Role name cannot be empty',
    ROLE_NAME_TOO_LONG: 'Role name cannot exceed 50 characters',
    ROLE_NAME_PATTERN:
      'Role name must start with a letter and contain only lowercase letters, numbers, and underscores',

    // Role assignment messages (from validateRoleAssignment)
    ROLE_ID_REQUIRED: 'Role ID is required',
    ROLE_ID_MUST_BE_NUMBER: 'Role ID must be a number',
    ROLE_ID_MUST_BE_INTEGER: 'Role ID must be an integer',
    ROLE_ID_MUST_BE_POSITIVE: 'Role ID must be positive',

    // User validation messages (from validateUserCreate)
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Email must be a valid email address',
    FIRST_NAME_REQUIRED: 'First name is required',
    LAST_NAME_REQUIRED: 'Last name is required',

    // Update validation messages
    AT_LEAST_ONE_FIELD: 'At least one field must be provided for update',

    // ID parameter validation messages (from validateIdParam)
    INVALID_ID_PARAM: 'Invalid ID parameter. Must be a positive integer.',
  }),

  ROLE: Object.freeze({
    NAME_REQUIRED: 'Role name is required',
    NAME_TOO_SHORT: 'Role name must be at least 2 characters',
    NAME_TOO_LONG: 'Role name cannot exceed 50 characters',
    ALREADY_EXISTS: 'Role name already exists',
    PROTECTED_ROLE: 'Cannot modify protected system role',
    NOT_FOUND: 'Role not found',
  }),

  USER: Object.freeze({
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Invalid email format',
    FIRST_NAME_REQUIRED: 'First name is required',
    LAST_NAME_REQUIRED: 'Last name is required',
    ROLE_REQUIRED: 'Role is required',
    NOT_FOUND: 'User not found',
  }),

  AUTH: Object.freeze({
    TOKEN_REQUIRED: 'Authorization token required',
    TOKEN_INVALID: 'Invalid token',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
    UNAUTHORIZED: 'Unauthorized',
  }),
});

// ============================================================================
// TEST DATABASE
// ============================================================================
// Import from main constants.js for single source of truth
const { DATABASE } = require('./constants');

// Database configuration for tests
const TEST_DATABASE = Object.freeze({
  PORT: DATABASE.TEST.PORT,
  HOST: DATABASE.TEST.HOST,
  DATABASE: DATABASE.TEST.NAME,
  USER: DATABASE.TEST.USER,
  PASSWORD: DATABASE.TEST.PASSWORD,

  // Tables to clean in proper order (respecting foreign keys)
  // KISS: users.role_id directly references roles (no user_roles join table)
  CLEANUP_ORDER: Object.freeze([
    'audit_logs',
    'refresh_tokens',
    'users',
    'roles',
  ]),
});

// ============================================================================
// TEST TIMEOUTS
// ============================================================================
// Timeouts for async operations in tests
const TEST_TIMEOUTS = Object.freeze({
  DATABASE_OPERATION: 5000, // 5 seconds for DB operations
  API_REQUEST: 3000, // 3 seconds for API calls
  CLEANUP: 2000, // 2 seconds for cleanup operations
  DEFAULT: 10000, // 10 seconds default Jest timeout
});

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = Object.freeze({
  TEST_ROLES,
  TEST_USERS,
  TEST_EMAIL_PREFIXES,
  TEST_TOKEN_CLAIMS,
  TEST_AUDIT,
  TEST_ERROR_MESSAGES,
  TEST_DATABASE,
  TEST_TIMEOUTS,
});
