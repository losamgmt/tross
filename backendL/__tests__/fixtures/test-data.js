/**
 * Test Fixtures
 * Centralized test data using constants for consistency
 */

const { USER_ROLES, AUTH, HTTP_STATUS } = require("../../config/constants");

// Test User Data
const TEST_USERS = {
  admin: {
    auth0_id: "auth0|test-admin-123",
    email: "admin@trossapp.com",
    first_name: "Admin",
    last_name: "User",
    role: USER_ROLES.ADMIN,
  },

  manager: {
    auth0_id: "auth0|test-manager-456",
    email: "manager@trossapp.com",
    first_name: "Manager",
    last_name: "User",
    role: USER_ROLES.MANAGER,
  },

  technician: {
    auth0_id: "auth0|test-tech-789",
    email: "tech@trossapp.com",
    first_name: "Tech",
    last_name: "User",
    role: USER_ROLES.TECHNICIAN,
  },

  dispatcher: {
    auth0_id: "auth0|test-dispatch-101",
    email: "dispatch@trossapp.com",
    first_name: "Dispatch",
    last_name: "User",
    role: USER_ROLES.DISPATCHER,
  },

  client: {
    auth0_id: "auth0|test-client-112",
    email: "client@trossapp.com",
    first_name: "Client",
    last_name: "User",
    role: USER_ROLES.CLIENT,
  },
};

// Valid JWT Payloads for Testing
const JWT_PAYLOADS = {
  admin: {
    sub: TEST_USERS.admin.auth0_id,
    email: TEST_USERS.admin.email,
    given_name: TEST_USERS.admin.first_name,
    family_name: TEST_USERS.admin.last_name,
    role: TEST_USERS.admin.role,
    provider: AUTH.PROVIDERS.DEVELOPMENT_JWT,
    iss: "https://dev.trossapp.com",
    aud: "https://api.trossapp.dev",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  },

  technician: {
    sub: TEST_USERS.technician.auth0_id,
    email: TEST_USERS.technician.email,
    given_name: TEST_USERS.technician.first_name,
    family_name: TEST_USERS.technician.last_name,
    role: TEST_USERS.technician.role,
    provider: AUTH.PROVIDERS.DEVELOPMENT_JWT,
    iss: "https://dev.trossapp.com",
    aud: "https://api.trossapp.dev",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
};

// Expected API Responses
const API_RESPONSES = {
  unauthorized: {
    error: "Unauthorized",
    message: "Access token required",
    timestamp: expect.any(String),
  },

  forbidden: {
    error: "Forbidden",
    message: "Invalid or expired token",
    timestamp: expect.any(String),
  },

  roleRequired: (role) => ({
    error: "Forbidden",
    message: `${role} role required`,
    timestamp: expect.any(String),
  }),

  validationError: (message) => ({
    error: "Validation Error",
    message,
    timestamp: expect.any(String),
  }),

  health: {
    status: "healthy",
    service: "TrossApp Backend",
    timestamp: expect.any(String),
    version: "1.0.0",
    database: { connected: true, type: "PostgreSQL" },
  },
};

// Auth0 Mock Data
const AUTH0_MOCKS = {
  validTokenResponse: {
    access_token: "mock-access-token",
    id_token: "mock-id-token",
    refresh_token: "mock-refresh-token",
    token_type: "Bearer",
    expires_in: 3600,
  },

  userProfile: {
    sub: "auth0|mock-user-id",
    email: "test@auth0.com",
    given_name: "Test",
    family_name: "User",
    "https://trossapp.com/role": USER_ROLES.TECHNICIAN,
  },

  invalidToken: "invalid.jwt.token",

  expiredPayload: {
    sub: "auth0|expired-user",
    email: "expired@test.com",
    iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
  },
};

// Database Mock Data
const DB_MOCKS = {
  userRow: {
    id: 1,
    auth0_id: TEST_USERS.technician.auth0_id,
    email: TEST_USERS.technician.email,
    first_name: TEST_USERS.technician.first_name,
    last_name: TEST_USERS.technician.last_name,
    role: TEST_USERS.technician.role,
    created_at: new Date(),
    updated_at: new Date(),
  },

  emptyResult: { rows: [] },

  insertResult: {
    rows: [
      {
        id: 1,
        auth0_id: TEST_USERS.technician.auth0_id,
        created_at: new Date(),
      },
    ],
  },
};

// Error Test Cases
const ERROR_CASES = {
  missingToken: {
    description: "missing authorization header",
    headers: {},
    expectedStatus: HTTP_STATUS.UNAUTHORIZED,
    expectedResponse: API_RESPONSES.unauthorized,
  },

  invalidTokenFormat: {
    description: "invalid token format",
    headers: { authorization: "invalid-format" },
    expectedStatus: HTTP_STATUS.UNAUTHORIZED,
    expectedResponse: API_RESPONSES.unauthorized,
  },

  expiredToken: {
    description: "expired JWT token",
    payload: AUTH0_MOCKS.expiredPayload,
    expectedStatus: HTTP_STATUS.FORBIDDEN,
    expectedResponse: API_RESPONSES.forbidden,
  },
};

module.exports = {
  TEST_USERS,
  JWT_PAYLOADS,
  API_RESPONSES,
  AUTH0_MOCKS,
  DB_MOCKS,
  ERROR_CASES,
};
