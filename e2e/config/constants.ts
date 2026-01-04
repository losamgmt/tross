/**
 * E2E Test Constants
 * 
 * Single source of truth for E2E test configuration.
 * Imports from root config for URL consistency (SRP).
 * 
 * NOTE: E2E tests are READ-ONLY by design.
 * - Dev tokens cannot create/modify data
 * - CRUD operations tested in 1100+ integration tests
 * - E2E tests verify stack connectivity only
 * 
 * Architecture:
 * - URLs: Import from config/ports.js (single source of truth)
 * - HTTP Status: Use for response validation
 */

// URLs from root config (SRP - single source of truth)
const PORTS = require('../../config/ports');

export const URLS = {
  BACKEND: PORTS.BACKEND_URL,
  FRONTEND: PORTS.FRONTEND_URL,
  API: PORTS.BACKEND_API_URL,
  HEALTH: PORTS.BACKEND_HEALTH_URL,
} as const;

// HTTP Status codes for response validation
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Test timeouts
export const TIMEOUTS = {
  /** Standard API response timeout */
  API: 5000,
  /** Page load timeout */
  PAGE_LOAD: 10000,
  /** Backend startup wait */
  BACKEND_READY: 30000,
} as const;

// Test endpoints for smoke tests
export const SMOKE_ENDPOINTS = {
  HEALTH: '/api/health',
  DEV_TOKEN: '/api/dev/token',
  USERS: '/api/users',
  CUSTOMERS: '/api/customers',
  WORK_ORDERS: '/api/work_orders',
  ROLES: '/api/roles',
  TECHNICIANS: '/api/technicians',
} as const;
