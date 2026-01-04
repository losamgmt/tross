/**
 * E2E Test Helpers - Index
 * 
 * Central export point for all E2E test helpers.
 * 
 * NOTE: E2E tests are READ-ONLY by design.
 * CRUD operations are tested in 1100+ integration tests.
 * E2E tests verify stack connectivity only.
 */

// Auth helpers
export {
  getDevToken,
  getDevTokenWithRequest,
  loginAsAdmin,
  loginAsTechnician,
  loginAsManager,
  loginAsDispatcher,
  loginAsCustomer,
  logout,
  isAuthenticated,
  getAuthToken,
} from './auth';
export type { DevRole } from './auth';

// User read helpers (READ-ONLY)
export {
  getAllUsers,
  getUserById,
} from './users';
export type { TestUser } from './users';

// Utility helpers
export {
  wait,
  retry,
} from './cleanup';
export type { TestRole } from './cleanup';
