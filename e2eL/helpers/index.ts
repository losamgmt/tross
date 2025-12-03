/**
 * E2E Test Helpers - Index
 * 
 * Central export point for all E2E test helpers
 */

// Auth helpers
export {
  getDevToken,
  loginAsAdmin,
  loginAsTechnician,
  loginAsManager,
  loginAsDispatcher,
  loginAsClient,
  logout,
  isAuthenticated,
  getAuthToken,
} from './auth';

// User management helpers
export {
  createTestUser,
  deleteTestUser,
  getAllUsers,
  getUserById,
  updateTestUser,
  updateUserRole,
  deactivateUser,
  reactivateUser,
} from './users';
export type { TestUser } from './users';

// Cleanup helpers
export {
  cleanupTestUsers,
  cleanupTestRoles,
  cleanupAllTestData,
  createTestRole,
  wait,
  retry,
} from './cleanup';
export type { TestRole } from './cleanup';
