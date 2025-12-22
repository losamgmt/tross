/**
 * E2E Stack Health Tests
 * 
 * These tests verify the FULL STACK works end-to-end.
 * They are READ-ONLY by design because:
 * 1. Dev users are read-only (security protection)
 * 2. E2E tests should verify connectivity, not business logic
 * 3. CRUD operations are tested in 689 integration tests
 * 
 * PHILOSOPHY:
 * - Unit tests verify logic (1500+ tests)
 * - Integration tests verify API contracts (700+ tests)  
 * - E2E tests verify the stack connects (~10 tests)
 * 
 * These tests should NEVER flake because they:
 * - Don't depend on test data state
 * - Don't create/modify data
 * - Test fundamental connectivity only
 */

import { test, expect } from '@playwright/test';
import { URLS } from './config/constants';
import { getDevToken, getDevTokenWithRequest } from './helpers';

const BACKEND_URL = URLS.BACKEND;

test.describe('E2E - System Health', () => {
  
  test('Backend health check passes', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.database.connected).toBe(true);
  });

  test('Database connection is responsive', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    const health = await response.json();
    
    // Database should respond in reasonable time (< 1 second)
    expect(health.database.responseTime).toBeLessThan(1000);
  });

  test('Memory usage is healthy', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    const health = await response.json();
    
    expect(health.memory.status).toBe('healthy');
  });
});

test.describe('E2E - Authentication Flow', () => {

  test('Dev token endpoint returns valid JWT', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/dev/token?role=admin`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    const tokenData = data.data || data;
    
    expect(tokenData.token).toBeDefined();
    expect(tokenData.user).toBeDefined();
    expect(tokenData.user.role).toBe('admin');
    
    // Verify it's a JWT (3 base64 parts)
    const parts = tokenData.token.split('.');
    expect(parts).toHaveLength(3);
  });

  test('Different roles return different tokens', async ({ request }) => {
    const adminResp = await request.get(`${BACKEND_URL}/api/dev/token?role=admin`);
    const techResp = await request.get(`${BACKEND_URL}/api/dev/token?role=technician`);
    
    const adminData = await adminResp.json();
    const techData = await techResp.json();
    
    expect((adminData.data || adminData).user.role).toBe('admin');
    expect((techData.data || techData).user.role).toBe('technician');
  });

  test('Valid token enables API read access', async ({ request }) => {
    const token = await getDevTokenWithRequest(request, 'admin');
    
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('Invalid token is rejected', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': 'Bearer invalid-token-12345' }
    });
    
    expect(response.status()).toBe(403);
  });

  test('Missing token returns 401', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users`);
    expect(response.status()).toBe(401);
  });

  test('Malformed JWT returns 403', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': 'Bearer not.a.valid.jwt' }
    });

    expect(response.status()).toBe(403);
  });
});

test.describe('E2E - Security Headers', () => {
  
  test('X-Content-Type-Options is nosniff', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('X-Frame-Options prevents framing', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    const header = response.headers()['x-frame-options'];
    expect(['DENY', 'SAMEORIGIN']).toContain(header);
  });

  test('Content-Security-Policy is present', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    expect(response.headers()['content-security-policy']).toBeTruthy();
  });
});

test.describe('E2E - API Contract', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    adminToken = await getDevToken('admin');
  });

  test('List endpoints return paginated data', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/customers?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Standard response shape
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(5);
  });

  test('Non-existent resource returns 404', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/customers/999999`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(404);
    const result = await response.json();
    expect(result.success).toBe(false);
  });

  test('Non-existent route returns 404', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/nonexistent-endpoint`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(404);
  });

  test('Dev users cannot write data (read-only protection)', async ({ request }) => {
    // This verifies our security: dev tokens are READ-ONLY
    const response = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: `test-${Date.now()}@test.com`,
        company_name: 'Should Fail',
        phone: '+15551234567',
      },
    });

    expect(response.status()).toBe(403);
    const result = await response.json();
    expect(result.message).toContain('read-only');
  });
});

test.describe('E2E - Role-Based Access', () => {
  
  test('Admin can access all read endpoints', async ({ request }) => {
    const adminToken = await getDevTokenWithRequest(request, 'admin');
    
    const endpoints = [
      '/api/users?page=1&limit=1',
      '/api/roles?page=1&limit=1',
      '/api/customers?page=1&limit=1',
      '/api/technicians?page=1&limit=1',
      '/api/work_orders?page=1&limit=1',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${BACKEND_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.ok(), `Admin should read ${endpoint}`).toBeTruthy();
    }
  });

  test('Customer has restricted access', async ({ request }) => {
    const customerToken = await getDevTokenWithRequest(request, 'customer');
    
    // Customer CAN access /api/users but sees only their own record (or empty for dev users)
    // This is due to own_record_only RLS policy - not 403/500
    const usersResponse = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    expect(usersResponse.ok()).toBeTruthy();
    
    const usersData = await usersResponse.json();
    // Dev users have no database ID, so RLS returns empty results (correct behavior)
    expect(usersData.data).toBeDefined();
    expect(usersData.data.length).toBe(0);
  });

  test('Technician has appropriate read access', async ({ request }) => {
    const techToken = await getDevTokenWithRequest(request, 'technician');
    
    // Technician should be able to read work orders
    const response = await request.get(`${BACKEND_URL}/api/work_orders?page=1&limit=1`, {
      headers: { 'Authorization': `Bearer ${techToken}` }
    });
    expect(response.ok()).toBeTruthy();
  });
});
