/**
 * E2E Test Helpers - Cleanup
 * 
 * Provides utilities for cleaning up test data after E2E tests
 * Ensures tests don't pollute the database with leftover test data
 */

import { getDevToken } from './auth';
import { getAllUsers, deleteTestUser } from './users';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Role data returned from API
 */
export interface TestRole {
  id: number;
  name: string;
  priority: number;
  description?: string;
  is_active: boolean;
}

/**
 * Clean up all test users
 * 
 * Deletes all users with emails starting with 'e2e-test-'.
 * Safe to run after each test or in afterAll hooks.
 * 
 * @param token - Admin authentication token (optional, will fetch if not provided)
 * 
 * @example
 * ```ts
 * test.afterAll(async () => {
 *   await cleanupTestUsers();
 * });
 * ```
 */
export async function cleanupTestUsers(token?: string): Promise<void> {
  const adminToken = token || await getDevToken('admin');
  
  try {
    const users = await getAllUsers(adminToken);
    
    // Find all test users (email starts with 'e2e-test-')
    const testUsers = users.filter(user => 
      user.email.startsWith('e2e-test-')
    );
    
    // Delete each test user
    for (const user of testUsers) {
      try {
        await deleteTestUser(adminToken, user.id);
      } catch (error) {
        // Log but don't fail if cleanup fails
        console.warn(`Failed to delete test user ${user.id}:`, error);
      }
    }
    
    if (testUsers.length > 0) {
      console.log(`✓ Cleaned up ${testUsers.length} test user(s)`);
    }
  } catch (error) {
    console.warn('Failed to cleanup test users:', error);
    // Don't throw - cleanup failures shouldn't fail tests
  }
}

/**
 * Clean up all test roles
 * 
 * Deletes all roles with names starting with 'e2e-test-'.
 * Protected roles (admin, manager, dispatcher, technician, client) are never deleted.
 * 
 * @param token - Admin authentication token (optional, will fetch if not provided)
 */
export async function cleanupTestRoles(token?: string): Promise<void> {
  const adminToken = token || await getDevToken('admin');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/roles?page=1&limit=200`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${response.status}`);
    }
    
    const result = await response.json();
    const roles: TestRole[] = result.data;
    
    // Find all test roles (name starts with 'e2e-test-')
    const testRoles = roles.filter(role => 
      role.name.startsWith('e2e-test-')
    );
    
    // Delete each test role
    for (const role of testRoles) {
      try {
        await deleteTestRole(adminToken, role.id);
      } catch (error) {
        console.warn(`Failed to delete test role ${role.id}:`, error);
      }
    }
    
    if (testRoles.length > 0) {
      console.log(`✓ Cleaned up ${testRoles.length} test role(s)`);
    }
  } catch (error) {
    console.warn('Failed to cleanup test roles:', error);
  }
}

/**
 * Delete role via API
 * 
 * @param token - Admin authentication token
 * @param roleId - Role ID to delete
 */
async function deleteTestRole(token: string, roleId: number): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/roles/${roleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  // 200 (success) or 404 (already deleted) are acceptable
  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete role ${roleId}: ${response.status} ${error}`);
  }
}

/**
 * Clean up all test data
 * 
 * Comprehensive cleanup of all test users and roles.
 * Run this in afterAll hooks to ensure clean test environment.
 * 
 * @param token - Admin authentication token (optional, will fetch if not provided)
 * 
 * @example
 * ```ts
 * test.afterAll(async () => {
 *   await cleanupAllTestData();
 * });
 * ```
 */
export async function cleanupAllTestData(token?: string): Promise<void> {
  const adminToken = token || await getDevToken('admin');
  
  await cleanupTestUsers(adminToken);
  await cleanupTestRoles(adminToken);
}

/**
 * Create test role via API
 * 
 * Creates a role for testing. Name will be prefixed with 'e2e-test-' for cleanup.
 * 
 * @param token - Admin authentication token
 * @param options - Role creation options
 * @returns Created role data
 */
export async function createTestRole(
  token: string,
  options: {
    name?: string;
    description?: string;
    priority?: number;
  } = {}
): Promise<TestRole> {
  const timestamp = Date.now();
  const name = options.name || `e2e-test-role-${timestamp}`;
  
  const response = await fetch(`${BACKEND_URL}/api/roles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name.startsWith('e2e-test-') ? name : `e2e-test-${name}`,
      description: options.description || 'E2E test role',
      priority: options.priority || 10,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create test role: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Wait for specified duration
 * 
 * Utility for adding delays in tests when needed.
 * 
 * @param ms - Milliseconds to wait
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * 
 * Useful for flaky operations that might need retries.
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default 3)
 * @param initialDelay - Initial delay in ms (default 100)
 * @returns Result of function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 100
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await wait(delay);
      }
    }
  }
  
  throw lastError;
}
