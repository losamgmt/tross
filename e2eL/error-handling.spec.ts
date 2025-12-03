/**
 * E2E Tests - Error Handling & Validation
 * 
 * Tests that the API properly handles error cases:
 * - Invalid data validation
 * - Duplicate entries (409 Conflict)
 * - Missing authentication (401 Unauthorized)
 * - Insufficient permissions (403 Forbidden)
 * - Not found errors (404)
 * - Bad request errors (400)
 */

import { test, expect } from '@playwright/test';
import { getDevToken, cleanupTestUsers, cleanupTestRoles } from './helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

test.describe('Error Handling E2E - API Level', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    adminToken = await getDevToken('admin');
  });

  test.afterAll(async () => {
    await cleanupTestUsers(adminToken);
    await cleanupTestRoles(adminToken);
  });

  test.describe('Authentication Errors', () => {
    test('Missing token returns 401 Unauthorized', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/users`);
      
      expect(response.status()).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('Invalid token returns 403 Forbidden', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/users`, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345',
        },
      });
      
      // Backend returns 403 for invalid tokens (AUTH_INVALID_TOKEN event)
      expect(response.status()).toBe(403);
    });
  });

  test.describe('Validation Errors (400 Bad Request)', () => {
    test('Create user with invalid email returns 400', async ({ request }) => {
      const response = await request.post(`${BACKEND_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          email: 'not-an-email',
          first_name: 'Test',
          last_name: 'User',
          role_id: 5,
        },
      });

      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('Create user with invalid first name returns 400', async ({ request }) => {
      const timestamp = Date.now();
      const response = await request.post(`${BACKEND_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          email: `test-${timestamp}@example.com`,
          first_name: '123',  // Numbers not allowed
          last_name: 'User',
          role_id: 5,
        },
      });

      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data.message || data.error).toBeDefined();
    });

    test('Create user with missing required fields returns 400', async ({ request }) => {
      const response = await request.post(`${BACKEND_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          email: 'test@example.com',
          // Missing first_name, last_name, role_id
        },
      });

      expect(response.status()).toBe(400);
    });

    test('Update user with invalid role_id returns 404', async ({ request }) => {
      // Create a test user first
      const timestamp = Date.now();
      const createResponse = await request.post(`${BACKEND_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          email: `e2e-test-${timestamp}@example.com`,
          first_name: 'TestUser',
          last_name: 'ForError',
          role_id: 5,
        },
      });

      const { data: user } = await createResponse.json();

      // Try to update with invalid role_id (returns 404 because role doesn't exist)
      const response = await request.put(`${BACKEND_URL}/api/users/${user.id}/role`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          role_id: 9999, // Non-existent role
        },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('Duplicate Entry Errors (409 Conflict)', () => {
    test('Create user with duplicate email returns 409', async ({ request }) => {
      const timestamp = Date.now();
      const email = `e2e-test-duplicate-${timestamp}@example.com`;

      // Create first user
      const firstResponse = await request.post(`${BACKEND_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          email,
          first_name: 'First',
          last_name: 'User',
          role_id: 5,
        },
      });

      expect(firstResponse.ok()).toBeTruthy();

      // Try to create second user with same email
      const secondResponse = await request.post(`${BACKEND_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          email,
          first_name: 'Second',
          last_name: 'User',
          role_id: 5,
        },
      });

      expect(secondResponse.status()).toBe(409);
      
      const data = await secondResponse.json();
      expect(data.error).toBeDefined();
    });

    test('Create role with duplicate name returns 409', async ({ request }) => {
      const timestamp = Date.now();
      const roleName = `e2e-test-duplicate-role-${timestamp}`;

      // Create first role
      const firstResponse = await request.post(`${BACKEND_URL}/api/roles`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: roleName,
        },
      });

      expect(firstResponse.ok()).toBeTruthy();

      // Try to create second role with same name
      const secondResponse = await request.post(`${BACKEND_URL}/api/roles`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: roleName,
        },
      });

      expect(secondResponse.status()).toBe(409);
      
      const data = await secondResponse.json();
      expect(data.success).toBe(false);
    });
  });

  test.describe('Not Found Errors (404)', () => {
    test('Get non-existent user returns 404', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/users/999999`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('Update non-existent user returns 404', async ({ request }) => {
      const response = await request.put(`${BACKEND_URL}/api/users/999999`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          first_name: 'Updated',
        },
      });

      expect(response.status()).toBe(404);
    });

    test('Delete non-existent user returns 404', async ({ request }) => {
      const response = await request.delete(`${BACKEND_URL}/api/users/999999`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('Permission Errors (403 Forbidden)', () => {
    test('Technician cannot create users', async ({ request }) => {
      const techToken = await getDevToken('technician');
      
      const response = await request.post(`${BACKEND_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${techToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          email: 'should-fail@example.com',
          first_name: 'Should',
          last_name: 'Fail',
          role_id: 5,
        },
      });

      expect(response.status()).toBe(403);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('Technician cannot delete users', async ({ request }) => {
      const techToken = await getDevToken('technician');
      
      const response = await request.delete(`${BACKEND_URL}/api/users/1`, {
        headers: {
          'Authorization': `Bearer ${techToken}`,
        },
      });

      expect(response.status()).toBe(403);
    });

    test('Client cannot access user list (missing pagination)', async ({ request }) => {
      const clientToken = await getDevToken('client');
      
      const response = await request.get(`${BACKEND_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      });

      // Returns 400 because pagination params required
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Protected Resource Errors', () => {
    test('Cannot delete protected admin role', async ({ request }) => {
      const response = await request.delete(`${BACKEND_URL}/api/roles/1`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      // Should return 400 (protected role)
      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('Cannot update protected client role name', async ({ request }) => {
      const response = await request.put(`${BACKEND_URL}/api/roles/5`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: 'should-fail',
        },
      });

      // Should return 400 (protected role)
      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
