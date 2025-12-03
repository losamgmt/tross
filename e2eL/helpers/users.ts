/**
 * E2E Test Helpers - User Management
 * 
 * Provides reusable helpers for creating, managing, and cleaning up test users
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * User data returned from API
 */
export interface TestUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role_id: number;
  is_active: boolean;
}

/**
 * Create test user via API
 * 
 * Creates a user directly via backend API for testing.
 * User email will be prefixed with 'e2e-test-' for easy cleanup.
 * 
 * @param token - Admin authentication token
 * @param options - User creation options
 * @returns Created user data
 * 
 * @example
 * ```ts
 * const user = await createTestUser(adminToken, {
 *   firstName: 'Test',
 *   lastName: 'User',
 *   roleId: 5 // client
 * });
 * ```
 */
export async function createTestUser(
  token: string,
  options: {
    firstName?: string;
    lastName?: string;
    roleId?: number;
  } = {}
): Promise<TestUser> {
  const timestamp = Date.now();
  const email = `e2e-test-${timestamp}@example.com`;
  
  const response = await fetch(`${BACKEND_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      first_name: options.firstName || 'E2E',
      last_name: options.lastName || 'Test',
      role_id: options.roleId || 5, // Default to client role
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create test user: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete user via API
 * 
 * Deletes a user by ID. Used for cleanup after tests.
 * 
 * @param token - Admin authentication token
 * @param userId - User ID to delete
 * 
 * @example
 * ```ts
 * await deleteTestUser(adminToken, user.id);
 * ```
 */
export async function deleteTestUser(
  token: string,
  userId: number
): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  // 200 (success) or 404 (already deleted) are both acceptable
  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete user ${userId}: ${response.status} ${error}`);
  }
}

/**
 * Get all users via API
 * 
 * Fetches all users from the system.
 * 
 * @param token - Admin authentication token
 * @returns List of users
 */
export async function getAllUsers(token: string): Promise<TestUser[]> {
  const response = await fetch(`${BACKEND_URL}/api/users?page=1&limit=200`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get user by ID via API
 * 
 * @param token - Admin authentication token
 * @param userId - User ID to fetch
 * @returns User data
 */
export async function getUserById(
  token: string,
  userId: number
): Promise<TestUser> {
  const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user ${userId}: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update user via API
 * 
 * @param token - Admin authentication token
 * @param userId - User ID to update
 * @param updates - Fields to update
 * @returns Updated user data
 */
export async function updateTestUser(
  token: string,
  userId: number,
  updates: {
    first_name?: string;
    last_name?: string;
    role_id?: number;
    is_active?: boolean;
  }
): Promise<TestUser> {
  const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update user ${userId}: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update user role via API
 * 
 * @param token - Admin authentication token
 * @param userId - User ID to update
 * @param roleId - New role ID
 * @returns Updated user data
 */
export async function updateUserRole(
  token: string,
  userId: number,
  roleId: number
): Promise<TestUser> {
  const response = await fetch(`${BACKEND_URL}/api/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role_id: roleId }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update user role: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Deactivate user via API
 * 
 * Sets user is_active to false.
 * 
 * @param token - Admin authentication token
 * @param userId - User ID to deactivate
 * @returns Updated user data
 */
export async function deactivateUser(
  token: string,
  userId: number
): Promise<TestUser> {
  return updateTestUser(token, userId, { is_active: false });
}

/**
 * Reactivate user via API
 * 
 * Sets user is_active to true.
 * 
 * @param token - Admin authentication token
 * @param userId - User ID to reactivate
 * @returns Updated user data
 */
export async function reactivateUser(
  token: string,
  userId: number
): Promise<TestUser> {
  return updateTestUser(token, userId, { is_active: true });
}
