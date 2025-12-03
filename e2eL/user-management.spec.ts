/**
 * E2E Tests - User Management API
 * 
 * Tests complete user CRUD workflows via API.
 * These tests prove that the full stack works together:
 * - Dev auth → JWT token
 * - Token → API authorization
 * - API → Database operations
 * - Database → Persistence
 */

import { test, expect } from '@playwright/test';
import { getDevToken, cleanupTestUsers } from './helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

test.describe.configure({ mode: 'serial' });

test.describe('User Management E2E - API Level', () => {
  let adminToken: string;
  let createdUserId: number;

  test.beforeAll(async () => {
    adminToken = await getDevToken('admin');
  });

  test.afterAll(async () => {
    await cleanupTestUsers(adminToken);
  });

  test('Admin can create new user via API', async ({ request }) => {
    const timestamp = Date.now();
    const response = await request.post(`${BACKEND_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        email: `e2e-test-${timestamp}@example.com`,
        first_name: 'TestUser',
        last_name: 'EndToEnd',
        role_id: 5, // client role
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.email).toBe(`e2e-test-${timestamp}@example.com`);
    expect(data.data.id).toBeDefined();
    
    // Save for later tests
    createdUserId = data.data.id;
  });

  test('Admin can retrieve user by ID', async ({ request }) => {
    // Skip if user creation failed
    test.skip(!createdUserId, 'Requires user from previous test');
    
    const response = await request.get(`${BACKEND_URL}/api/users/${createdUserId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(createdUserId);
    expect(data.data.first_name).toBe('TestUser');
  });

  test('Admin can update user role', async ({ request }) => {
    // Skip if user creation failed
    test.skip(!createdUserId, 'Requires user from previous test');
    
    // Update from client (5) to technician (4)
    const response = await request.put(`${BACKEND_URL}/api/users/${createdUserId}/role`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        role_id: 4, // technician
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.role_id).toBe(4);
  });

  test('Admin can deactivate user', async ({ request }) => {
    // Skip if user creation failed
    test.skip(!createdUserId, 'Requires user from previous test');
    
    const response = await request.put(`${BACKEND_URL}/api/users/${createdUserId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        is_active: false,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.is_active).toBe(false);
  });

  test('Admin can list all users with pagination', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.pagination).toBeDefined();
  });

  test('Non-admin cannot create users', async ({ request }) => {
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
  });
});
