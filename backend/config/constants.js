/**
 * Application Constants
 * Single source of truth for all application constants
 * KISS Principle: Eliminate magic strings and magic numbers
 */

// Environment Constants
const ENVIRONMENTS = Object.freeze({
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
});

// Database Performance Constants
const DATABASE_PERFORMANCE = Object.freeze({
  SLOW_QUERY_THRESHOLD_MS: 100, // Log queries taking longer than 100ms
  SLOW_QUERY_EXPLAIN_THRESHOLD_MS: 500, // Run EXPLAIN for queries over 500ms
});

// Authentication Constants
const AUTH = Object.freeze({
  AUTH_MODES: Object.freeze({
    DEVELOPMENT: 'development',
    AUTH0: 'auth0',
  }),
  PROVIDERS: Object.freeze({
    DEVELOPMENT_JWT: 'development',
    AUTH0: 'auth0',
  }),
  JWT: Object.freeze({
    ALGORITHM: 'HS256',
    DEFAULT_EXPIRY: '24h',
    BEARER_PREFIX: 'Bearer ',
  }),
});

// User Role Constants
const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  DISPATCHER: 'dispatcher',
  TECHNICIAN: 'technician',
  CLIENT: 'customer',
});

// HTTP Status Constants
const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  REQUEST_TIMEOUT: 408,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
});

// Security Configuration Constants
// NOTE: Rate limiting configuration moved to backend/middleware/rate-limit.js (uses env vars)
const SECURITY = Object.freeze({
  REQUEST_LIMITS: Object.freeze({
    JSON_BODY_SIZE: '1mb', // Reduced from 10mb - sufficient for all API operations
    URL_ENCODED_SIZE: '1mb', // Reduced from 10mb - prevents DoS via large form submissions
  }),
  HEADERS: Object.freeze({
    CSP_UNSAFE_INLINE: "'unsafe-inline'",
    CSP_SELF: "'self'",
    CSP_NONE: "'none'",
  }),
});

// Database Configuration Constants
// KISS Principle: Single source of truth for all database credentials
// Dev and Test use SAME credentials (postgres/tross123) for simplicity
// Production credentials MUST come from environment variables
const DATABASE = Object.freeze({
  DEV: Object.freeze({
    HOST: 'localhost',
    PORT: 5432,
    NAME: 'trossapp_dev',
    USER: 'postgres',
    PASSWORD: 'tross123', // Dev only, never use in production
    POOL: Object.freeze({
      MIN: 2,
      MAX: 20,
      IDLE_TIMEOUT_MS: 30000,
      CONNECTION_TIMEOUT_MS: 5000,
    }),
  }),
  TEST: Object.freeze({
    HOST: 'localhost',
    PORT: 5433,
    NAME: 'trossapp_test',
    USER: 'postgres', // SAME as dev for simplicity
    PASSWORD: 'tross123', // SAME as dev for simplicity
    POOL: Object.freeze({
      MIN: 1,
      MAX: 5,
      IDLE_TIMEOUT_MS: 1000,
      CONNECTION_TIMEOUT_MS: 3000,
    }),
  }),
  PROD: Object.freeze({
    // Production values MUST come from secure environment variables
    // Never use default values in production
    MIN_PASSWORD_LENGTH: 16,
  }),
});

// Redis Configuration Constants
const REDIS = Object.freeze({
  DEV: Object.freeze({
    HOST: 'localhost',
    PORT: 6379,
    DB: 0,
  }),
  TEST: Object.freeze({
    HOST: 'localhost',
    PORT: 6379,
    DB: 1, // Different DB index for test isolation
  }),
  PROD: Object.freeze({
    DB: 0,
    // Host, port, password MUST come from environment variables
  }),
});

// API Endpoints
const API_ENDPOINTS = Object.freeze({
  HEALTH: '/api/health',
  AUTH: '/api/auth',
  AUTH0: '/api/auth0',
  DEV: '/api/dev',
  ROLES: '/api/roles',
});

// Model Error Messages
// Domain logic errors thrown by database models
// KISS: Single source of truth - tests reference these, never hardcoded strings
const MODEL_ERRORS = Object.freeze({
  ROLE: Object.freeze({
    // Validation errors
    NAME_REQUIRED: 'Role name is required',
    NAME_EMPTY: 'Role name cannot be empty',
    NAME_TOO_SHORT: 'Role name must be at least 2 characters',
    NAME_TOO_LONG: 'Role name cannot exceed 50 characters',
    ID_REQUIRED: 'Role ID is required',
    ID_AND_NAME_REQUIRED: 'Role ID and name are required',

    // Business logic errors
    NAME_EXISTS: 'Role name already exists',
    PROTECTED_ROLE: 'Cannot modify protected role',
    PROTECTED_DELETE: 'Cannot delete protected role',
    PROTECTED_DEACTIVATE: 'Cannot deactivate protected role',
    NOT_FOUND: 'Role not found',
    CREATION_FAILED: 'Failed to create role',

    // Delete validation (function for dynamic user count)
    USERS_ASSIGNED: (count) => `Cannot delete role: ${count} user(s) are assigned to this role. Use force=true to proceed and set their role to NULL.`,
  }),

  USER: Object.freeze({
    // Validation errors
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Invalid email format',
    FIRST_NAME_REQUIRED: 'First name is required',
    LAST_NAME_REQUIRED: 'Last name is required',

    // Business logic errors
    EMAIL_EXISTS: 'Email already exists',
    NOT_FOUND: 'User not found',
    CREATION_FAILED: 'Failed to create user',
    UPDATE_FAILED: 'Failed to update user',
    DELETE_FAILED: 'Failed to delete user',
  }),
});

module.exports = Object.freeze({
  ENVIRONMENTS,
  DATABASE_PERFORMANCE,
  AUTH,
  USER_ROLES,
  HTTP_STATUS,
  SECURITY,
  DATABASE,
  REDIS,
  API_ENDPOINTS,
  MODEL_ERRORS,
});
