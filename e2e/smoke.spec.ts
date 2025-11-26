/**
 * E2E Smoke Tests
 * 
 * MINIMAL end-to-end tests that verify the full stack works.
 * These tests prove:
 * 1. Backend boots and database connects
 * 2. Auth flow works end-to-end
 * 3. Cross-entity business workflows function
 * 
 * PHILOSOPHY:
 * - Unit tests verify logic (1318 tests)
 * - Integration tests verify API contracts (702 tests)
 * - E2E smoke tests verify the stack connects (~8 tests)
 * 
 * All detailed validation, permission, and error handling tests
 * are in the integration test suite where they run faster.
 */

import { test, expect } from '@playwright/test';
import { URLS, TEST_DATA } from './config/constants';

const BACKEND_URL = URLS.BACKEND;

// Helper to get dev token
async function getToken(request: any, role: string = 'admin'): Promise<string> {
  const response = await request.get(`${BACKEND_URL}/api/dev/token?role=${role}`);
  const data = await response.json();
  return data.data?.token || data.token;
}

test.describe('Smoke Tests - System Health', () => {
  
  test('Backend health check passes', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.database.connected).toBe(true);
  });

  test('Dev token endpoint returns valid JWT', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/dev/token?role=admin`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    const tokenData = data.data || data;
    
    expect(tokenData.token).toBeDefined();
    expect(tokenData.user).toBeDefined();
    expect(tokenData.user.role).toBe('admin');
    
    // Verify it's a JWT (3 parts)
    const parts = tokenData.token.split('.');
    expect(parts).toHaveLength(3);
  });

  test('Valid token enables API access', async ({ request }) => {
    const token = await getToken(request, 'admin');
    
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
});

test.describe('Smoke Tests - Business Workflow', () => {
  let adminToken: string;
  let customerId: number;
  let technicianId: number;
  let workOrderId: number;
  let invoiceId: number;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('Create customer', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: TEST_DATA.EMAIL.unique(TEST_DATA.PREFIXES.CUSTOMER),
        company_name: 'E2E Smoke Test Company',
        phone: TEST_DATA.PHONES.CUSTOMER,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBe(true);
    customerId = result.data.id;
    expect(customerId).toBeGreaterThan(0);
  });

  test('Create technician', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/technicians`, {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        license_number: `SMOKE-${Date.now()}`,
        first_name: 'Smoke',
        last_name: 'Tester',
        email: TEST_DATA.EMAIL.unique(TEST_DATA.PREFIXES.TECHNICIAN),
        phone: TEST_DATA.PHONES.TECHNICIAN,
        hourly_rate: 75.00,
        status: 'available',
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    technicianId = result.data.id;
    expect(technicianId).toBeGreaterThan(0);
  });

  test('Create work order linking customer and technician', async ({ request }) => {
    test.skip(!customerId || !technicianId, 'Requires customer and technician');

    const response = await request.post(`${BACKEND_URL}/api/work_orders`, {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'E2E Smoke Test Work Order',
        customer_id: customerId,
        assigned_technician_id: technicianId,
        description: 'Smoke test verifying cross-entity workflow',
        priority: 'normal',
        status: 'pending',
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    workOrderId = result.data.id;
    expect(result.data.customer_id).toBe(customerId);
  });

  test('Create invoice for work order', async ({ request }) => {
    test.skip(!workOrderId || !customerId, 'Requires work order and customer');

    const response = await request.post(`${BACKEND_URL}/api/invoices`, {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        invoice_number: `SMOKE-INV-${Date.now()}`,
        customer_id: customerId,
        work_order_id: workOrderId,
        amount: 100.00,
        tax: 8.00,
        total: 108.00,
        status: 'draft',
        due_date: '2025-12-31',
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    invoiceId = result.data.id;
    expect(result.data.work_order_id).toBe(workOrderId);
  });

  test('Cleanup - delete test data', async ({ request }) => {
    // Delete in reverse dependency order
    if (invoiceId) {
      await request.delete(`${BACKEND_URL}/api/invoices/${invoiceId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    }
    if (workOrderId) {
      await request.delete(`${BACKEND_URL}/api/work_orders/${workOrderId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    }
    if (technicianId) {
      await request.delete(`${BACKEND_URL}/api/technicians/${technicianId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    }
    if (customerId) {
      await request.delete(`${BACKEND_URL}/api/customers/${customerId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    }
  });
});
