/**
 * E2E Production Test Constants
 *
 * Single source of truth for E2E test configuration.
 * Imports from root config for URL consistency (SRP).
 *
 * NOTE: Production E2E tests verify:
 * - Deployment is up (health checks)
 * - Auth is enforced (401/403 without valid token)
 * - Security headers present
 *
 * Tests requiring authentication run in integration tests (1100+ tests)
 * with test auth enabled in CI.
 */

// URLs from root config (SRP - single source of truth)
const PORTS = require("../../config/ports");

export const URLS = {
  BACKEND: PORTS.BACKEND_URL,
  FRONTEND: PORTS.FRONTEND_URL,
  API: PORTS.BACKEND_API_URL,
  HEALTH: PORTS.BACKEND_HEALTH_URL,
} as const;
