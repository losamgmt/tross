/**
 * TrossApp Port Configuration
 * Single source of truth for all port numbers
 * Last updated: October 20, 2025
 */

module.exports = {
  // Application Ports
  BACKEND_PORT: 3001,
  FRONTEND_PORT: 8080,

  // Database Ports
  DB_DEV_PORT: 5432, // PostgreSQL Development
  DB_TEST_PORT: 5433, // PostgreSQL Test
  REDIS_PORT: 6379, // Redis (sessions/cache)

  // Legacy/Deprecated (DO NOT USE)
  // VITE_PORT: 5173,     // ❌ Replaced by Flutter on 8080
  // OLD_BACKEND: 3000,   // ❌ Replaced by 3001

  // URLs for convenience
  get BACKEND_URL() {
    return `http://localhost:${this.BACKEND_PORT}`;
  },
  get FRONTEND_URL() {
    return `http://localhost:${this.FRONTEND_PORT}`;
  },
  get BACKEND_API_URL() {
    return `${this.BACKEND_URL}/api`;
  },
  get BACKEND_HEALTH_URL() {
    return `${this.BACKEND_API_URL}/health`;
  },
};
