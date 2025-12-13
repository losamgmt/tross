/**
 * E2E Smoke Tests - Roles & Permissions
 * 
 * Verifies role-based access control works end-to-end.
 * These tests prove:
 * 1. Role creation and assignment works
 * 2. Different roles have appropriate access levels
 * 3. RLS enforces permissions across the stack
 * 
 * Complements smoke.spec.ts which tests the core business workflow.
 */

import { test, expect } from '@playwright/test';
import { URLS, TEST_DATA } from './config/constants';

const BACKEND_URL = URLS.BACKEND;

// Helper to get dev token for a specific role
async function getToken(request: any, role: string = 'admin'): Promise<string> {
  const response = await request.get(`${BACKEND_URL}/api/dev/token?role=${role}`);
  const data = await response.json();
  return data.data?.token || data.token;
}

test.describe('Smoke Tests - Role Management', () => {
  let adminToken: string;
  let testRoleId: number;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('Admin can create a new role', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/roles`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: `e2e-smoke-role-${Date.now()}`,
        priority: 50,
        description: 'E2E smoke test role',
        is_active: true,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBe(true);
    testRoleId = result.data.id;
    expect(testRoleId).toBeGreaterThan(0);
  });

  test('Admin can update role', async ({ request }) => {
    test.skip(!testRoleId, 'Requires test role');

    const response = await request.patch(`${BACKEND_URL}/api/roles/${testRoleId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        description: 'Updated E2E smoke test role',
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.data.description).toBe('Updated E2E smoke test role');
  });

  test('Admin can list all roles', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/roles?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    
    // Should have at least the default roles
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  test('Cleanup - delete test role', async ({ request }) => {
    if (testRoleId) {
      const response = await request.delete(`${BACKEND_URL}/api/roles/${testRoleId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      // Role deletion should succeed or return 404 if already cleaned
      expect([200, 204, 404]).toContain(response.status());
    }
  });
});

test.describe('Smoke Tests - Permission Enforcement', () => {
  
  test('Admin can access all entities', async ({ request }) => {
    const adminToken = await getToken(request, 'admin');
    
    // Admin should access all protected endpoints
    const endpoints = [
      '/api/users?page=1&limit=1',
      '/api/roles?page=1&limit=1',
      '/api/customers?page=1&limit=1',
      '/api/technicians?page=1&limit=1',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${BACKEND_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.ok(), `Admin should access ${endpoint}`).toBeTruthy();
    }
  });

  test('Technician has limited access', async ({ request }) => {
    const techToken = await getToken(request, 'technician');
    
    // Technician should be able to read their own work orders
    const workOrdersResponse = await request.get(`${BACKEND_URL}/api/work_orders?page=1&limit=1`, {
      headers: { 'Authorization': `Bearer ${techToken}` }
    });
    expect(workOrdersResponse.ok()).toBeTruthy();
    
    // Technician should NOT be able to create users (admin-only)
    const createUserResponse = await request.post(`${BACKEND_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: `e2e-should-fail-${Date.now()}@test.com`,
        first_name: 'Should',
        last_name: 'Fail',
        role: 'technician',
      },
    });
    
    // Should be forbidden (403) for technician to create users
    expect(createUserResponse.status()).toBe(403);
  });

  test('Customer has read-only access to their data', async ({ request }) => {
    const customerToken = await getToken(request, 'customer');
    
    // Customer should be able to view work orders (their own via RLS)
    const response = await request.get(`${BACKEND_URL}/api/work_orders?page=1&limit=1`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    expect(response.ok()).toBeTruthy();
    
    // Customer should NOT be able to create technicians
    const createTechResponse = await request.post(`${BACKEND_URL}/api/technicians`, {
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        license_number: `FAIL-${Date.now()}`,
        first_name: 'Should',
        last_name: 'Fail',
        email: `e2e-fail-${Date.now()}@test.com`,
        phone: '+15550199',
        hourly_rate: 50.00,
        status: 'available',
      },
    });
    
    expect(createTechResponse.status()).toBe(403);
  });

  test('Different roles get different token claims', async ({ request }) => {
    const roles = ['admin', 'manager', 'dispatcher', 'technician', 'customer'];
    
    for (const role of roles) {
      const response = await request.get(`${BACKEND_URL}/api/dev/token?role=${role}`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      const tokenData = data.data || data;
      
      expect(tokenData.user.role).toBe(role);
      expect(tokenData.token).toBeDefined();
    }
  });
});
