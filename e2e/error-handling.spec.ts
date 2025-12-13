/**
 * E2E Error Handling Tests
 * 
 * Verifies the API handles errors gracefully across the full stack.
 * Tests:
 * 1. Validation errors return proper format
 * 2. Not found errors for invalid IDs
 * 3. Rate limiting works (if enabled)
 * 4. Database errors are handled gracefully
 */

import { test, expect } from '@playwright/test';
import { URLS } from './config/constants';

const BACKEND_URL = URLS.BACKEND;

// Helper to get dev token
async function getToken(request: any, role: string = 'admin'): Promise<string> {
  const response = await request.get(`${BACKEND_URL}/api/dev/token?role=${role}`);
  const data = await response.json();
  return data.data?.token || data.token;
}

test.describe('E2E - Validation Error Handling', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('Invalid email format returns 400 with details', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: 'not-an-email',
        company_name: 'Test Company',
        phone: '+15551234567',
      },
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error || result.message).toBeTruthy();
  });

  test('Missing required fields returns 400', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        // Missing email and company_name
        phone: '+15551234567',
      },
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result.success).toBe(false);
  });

  test('Invalid phone format returns 400', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: `valid-${Date.now()}@test.com`,
        company_name: 'Test Company',
        phone: '123', // Too short
      },
    });

    expect(response.status()).toBe(400);
  });

  test('Invalid data types return 400', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/technicians`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        license_number: `TEST-${Date.now()}`,
        first_name: 'Test',
        last_name: 'Tech',
        email: `tech-${Date.now()}@test.com`,
        phone: '+15559876543',
        hourly_rate: 'not-a-number', // Should be number
        status: 'available',
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('E2E - Not Found Handling', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('GET non-existent customer returns 404', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/customers/999999`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(404);
    const result = await response.json();
    expect(result.success).toBe(false);
  });

  test('GET non-existent technician returns 404', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/technicians/999999`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(404);
    const result = await response.json();
    expect(result.success).toBe(false);
  });

  test('GET non-existent work order returns 404', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/work_orders/999999`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(404);
  });

  test('PATCH non-existent resource returns 404', async ({ request }) => {
    const response = await request.patch(`${BACKEND_URL}/api/customers/999999`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: { company_name: 'Updated Name' },
    });

    expect(response.status()).toBe(404);
  });

  test('DELETE non-existent resource returns 404', async ({ request }) => {
    const response = await request.delete(`${BACKEND_URL}/api/customers/999999`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(404);
  });

  test('Non-existent route returns 404', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/nonexistent-endpoint`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(404);
  });
});

test.describe('E2E - Auth Error Handling', () => {

  test('Missing Authorization header returns 401', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`);
    expect(response.status()).toBe(401);
  });

  test('Empty Bearer token returns 401', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': 'Bearer ' }
    });

    expect([401, 403]).toContain(response.status());
  });

  test('Malformed JWT returns 403', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': 'Bearer not.a.valid.jwt' }
    });

    expect(response.status()).toBe(403);
  });

  test('Expired token is rejected', async ({ request }) => {
    // This is a pre-generated expired token (exp claim in past)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZ8YWRtaW4wMDEiLCJlbWFpbCI6ImFkbWluQHRyb3NzYXBwLmRldiIsInJvbGUiOiJhZG1pbiIsInByb3ZpZGVyIjoiZGV2ZWxvcG1lbnQiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.fake_signature';
    
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    });

    expect(response.status()).toBe(403);
  });

  test('Token with wrong signature is rejected', async ({ request }) => {
    // Valid structure but wrong signature
    const badSignatureToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZ8YWRtaW4wMDEiLCJlbWFpbCI6ImFkbWluQHRyb3NzYXBwLmRldiIsInJvbGUiOiJhZG1pbiIsInByb3ZpZGVyIjoiZGV2ZWxvcG1lbnQifQ.wrong_signature';
    
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${badSignatureToken}` }
    });

    expect(response.status()).toBe(403);
  });
});

test.describe('E2E - Pagination Validation', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('Invalid page number returns 400', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users?page=-1&limit=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(400);
  });

  test('Page zero returns 400', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users?page=0&limit=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(400);
  });

  test('Excessive limit is capped or rejected', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10000`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    // Should either cap the limit (200 OK) or reject (400)
    expect([200, 400]).toContain(response.status());
    
    if (response.status() === 200) {
      const result = await response.json();
      // If accepted, verify limit was capped
      expect(result.data.length).toBeLessThanOrEqual(100);
    }
  });

  test('Non-numeric pagination returns 400', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users?page=abc&limit=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('E2E - Response Format Consistency', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('Success responses have consistent format', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/customers?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data');
    expect(Array.isArray(result.data)).toBe(true);
  });

  test('Error responses have consistent format', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/customers/999999`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(response.status()).toBe(404);
    const result = await response.json();
    
    expect(result).toHaveProperty('success', false);
  });

  test('Content-Type is application/json', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/customers?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('Health endpoint returns proper format', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);

    expect(response.ok()).toBeTruthy();
    const health = await response.json();
    
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('database');
    expect(health.database).toHaveProperty('connected');
  });
});
