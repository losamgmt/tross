/**
 * E2E Tests - Role Management API
 * 
 * Tests complete role CRUD workflows via API.
 * These tests prove that the full stack works together:
 * - Dev auth → JWT token
 * - Token → API authorization
 * - API → Database operations
 * - Database → Persistence
 */

import { test, expect } from '@playwright/test';
import { getDevToken, cleanupTestRoles } from './helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

test.describe.configure({ mode: 'serial' });

test.describe('Role Management E2E - API Level', () => {
  let adminToken: string;
  let createdRoleId: number;

  test.beforeAll(async () => {
    adminToken = await getDevToken('admin');
  });

  test.afterAll(async () => {
    await cleanupTestRoles(adminToken);
  });

  test('Admin can create new role via API', async ({ request }) => {
    const timestamp = Date.now();
    const response = await request.post(`${BACKEND_URL}/api/roles`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `e2e-test-role-${timestamp}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.name).toBe(`e2e-test-role-${timestamp}`);
    expect(data.data.id).toBeDefined();
    expect(data.data.priority).toBeDefined();
    
    // Save for later tests
    createdRoleId = data.data.id;
  });

  test('Admin can retrieve role by ID', async ({ request }) => {
    test.skip(!createdRoleId, 'Requires role from previous test');
    
    const response = await request.get(`${BACKEND_URL}/api/roles/${createdRoleId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(createdRoleId);
    expect(data.data.name).toContain('e2e-test-role-');
  });

  test('Admin can update role description', async ({ request }) => {
    test.skip(!createdRoleId, 'Requires role from previous test');
    
    const response = await request.put(`${BACKEND_URL}/api/roles/${createdRoleId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        description: 'Updated E2E test role description',
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.description).toBe('Updated E2E test role description');
  });

  test('Admin can list all roles with pagination', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/roles?page=1&limit=10`, {
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

  test('Non-admin cannot create roles', async ({ request }) => {
    const techToken = await getDevToken('technician');
    
    const response = await request.post(`${BACKEND_URL}/api/roles`, {
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'should-fail-role',
      },
    });

    expect(response.status()).toBe(403);
  });

  test('Admin can delete role', async ({ request }) => {
    test.skip(!createdRoleId, 'Requires role from previous test');
    
    const response = await request.delete(`${BACKEND_URL}/api/roles/${createdRoleId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
