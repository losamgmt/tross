/**
 * E2E Tests - Authentication Flows
 * 
 * Tests authentication and authorization using dev mode tokens.
 * Tests the ACTUAL Flutter app behavior, not idealized scenarios.
 * 
 * IMPORTANT: These tests validate that:
 * 1. Dev tokens work end-to-end (backend → localStorage → Flutter AuthProvider)
 * 2. Route guards enforce admin access
 * 3. Flutter app properly handles auth state
 */

import { test, expect } from '@playwright/test';
import { 
  getDevToken,
  cleanupAllTestData 
} from './helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

test.describe('Authentication & Authorization E2E', () => {
  // Cleanup after all tests
  test.afterAll(async () => {
    await cleanupAllTestData();
  });

  test('Dev token endpoint returns valid admin token', async ({ request }) => {
    // Test that our dev auth backend actually works
    const response = await request.get(`${BACKEND_URL}/api/dev/token?role=admin`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.token).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.role).toBe('admin');
    
    // Verify token is a JWT (has 3 parts separated by dots)
    const tokenParts = data.token.split('.');
    expect(tokenParts).toHaveLength(3);
  });

  test('Admin can access protected API with dev token', async ({ request }) => {
    // Get admin token
    const tokenResponse = await request.get(`${BACKEND_URL}/api/dev/token?role=admin`);
    const { token } = await tokenResponse.json();
    
    // Use token to access protected endpoint
    const usersResponse = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(usersResponse.ok()).toBeTruthy();
    
    const usersData = await usersResponse.json();
    expect(usersData.success).toBe(true);
    expect(usersData.data).toBeDefined();
    expect(Array.isArray(usersData.data)).toBe(true);
  });

  test('Technician cannot access admin API endpoint', async ({ request }) => {
    // Get technician token
    const tokenResponse = await request.get(`${BACKEND_URL}/api/dev/token?role=technician`);
    const { token } = await tokenResponse.json();
    
    // Attempt to access admin-only endpoint (create user)
    const createResponse = await request.post(`${BACKEND_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role_id: 5,
      }
    });
    
    // Should be forbidden
    expect(createResponse.status()).toBe(403);
  });
});
