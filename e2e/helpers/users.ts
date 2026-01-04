/**
 * E2E Test Helpers - User Management
 * 
 * READ-ONLY helpers for user verification in E2E tests.
 * 
 * NOTE: Dev tokens are READ-ONLY by design. CRUD operations
 * are tested in 1100+ integration tests, not E2E.
 * E2E tests verify connectivity and access patterns only.
 */

import { URLS } from '../config/constants';

const BACKEND_URL = URLS.BACKEND;

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
 * Get all users via API (READ-ONLY)
 * 
 * Fetches users from the system. Returns data based on
 * the token's permission level.
 * 
 * @param token - Authentication token
 * @returns List of users (may be filtered by RLS policies)
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
 * Get user by ID via API (READ-ONLY)
 * 
 * @param token - Authentication token
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
