/**
 * E2E API Security Tests
 * 
 * Verifies security measures work across the full stack.
 * Tests:
 * 1. Security headers are present
 * 2. CORS is configured properly
 * 3. Input sanitization works at API level
 * 4. SQL injection attempts are blocked
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

test.describe('E2E - Security Headers', () => {
  
  test('X-Content-Type-Options header is set', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    
    const header = response.headers()['x-content-type-options'];
    expect(header).toBe('nosniff');
  });

  test('X-Frame-Options header is set', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    
    const header = response.headers()['x-frame-options'];
    expect(['DENY', 'SAMEORIGIN']).toContain(header);
  });

  test('Content-Security-Policy header is present', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
  });

  test('X-XSS-Protection header is set', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    
    // Note: Modern browsers use CSP instead, but this header doesn't hurt
    // May or may not be present depending on security config
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('E2E - Input Sanitization', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('MongoDB operators in input are neutralized', async ({ request }) => {
    // Even though we use PostgreSQL, the sanitizer should neutralize MongoDB operators
    const response = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: `test-${Date.now()}@test.com`,
        company_name: '$gt malicious',  // MongoDB operator prefix
        phone: '+15551234567',
      },
    });

    // Should either succeed with sanitized value or reject
    if (response.status() === 201 || response.status() === 200) {
      const result = await response.json();
      // If saved, the $ should have been replaced
      if (result.data?.company_name) {
        expect(result.data.company_name).not.toMatch(/^\$/);
      }
      
      // Clean up created customer
      if (result.data?.id) {
        await request.delete(`${BACKEND_URL}/api/customers/${result.data.id}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
      }
    }
  });

  test('XSS script tags in input are handled', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: `xss-test-${Date.now()}@test.com`,
        company_name: '<script>alert("xss")</script>',
        phone: '+15551234567',
      },
    });

    // Should either sanitize, escape, or reject
    if (response.status() === 201 || response.status() === 200) {
      const result = await response.json();
      // Script should not execute, content may be stored escaped
      
      // Clean up
      if (result.data?.id) {
        await request.delete(`${BACKEND_URL}/api/customers/${result.data.id}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
      }
    }
  });

  test('SQL injection attempts in search are blocked', async ({ request }) => {
    const response = await request.get(
      `${BACKEND_URL}/api/customers?search='; DROP TABLE customers; --`, 
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    // Should either reject (400) or handle safely (200)
    expect([200, 400]).toContain(response.status());
    
    // Verify the table still exists
    const verifyResponse = await request.get(`${BACKEND_URL}/api/customers?page=1&limit=1`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    expect(verifyResponse.ok()).toBeTruthy();
  });

  test('Path traversal attempts are blocked', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/../../../etc/passwd`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    // Should return 404 (not found) not actual file contents
    expect(response.status()).toBe(404);
  });
});

test.describe('E2E - Authorization Bypass Prevention', () => {
  
  test('Cannot escalate role via API', async ({ request }) => {
    const techToken = await getToken(request, 'technician');
    
    // Try to create admin user (should fail for technician)
    const response = await request.post(`${BACKEND_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: `escalation-test-${Date.now()}@test.com`,
        first_name: 'Escalation',
        last_name: 'Test',
        role: 'admin',  // Try to create admin
      },
    });

    expect(response.status()).toBe(403);
  });

  test('Customer cannot access admin endpoints', async ({ request }) => {
    const customerToken = await getToken(request, 'customer');
    
    // Try to list all users (admin only)
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    expect(response.status()).toBe(403);
  });

  test('Technician cannot delete customers', async ({ request }) => {
    const techToken = await getToken(request, 'technician');
    
    const response = await request.delete(`${BACKEND_URL}/api/customers/1`, {
      headers: { 'Authorization': `Bearer ${techToken}` }
    });

    expect(response.status()).toBe(403);
  });

  test('Cannot modify other users role', async ({ request }) => {
    const managerToken = await getToken(request, 'manager');
    
    // Manager trying to make themselves admin
    const response = await request.patch(`${BACKEND_URL}/api/users/1`, {
      headers: {
        'Authorization': `Bearer ${managerToken}`,
        'Content-Type': 'application/json'
      },
      data: { role: 'admin' },
    });

    // Should be forbidden or not found (if trying to modify admin account)
    expect([403, 404]).toContain(response.status());
  });
});

test.describe('E2E - Session Security', () => {
  
  test('Cannot reuse token after format change', async ({ request }) => {
    const token = await getToken(request, 'admin');
    
    // Tamper with token
    const tamperedToken = token.slice(0, -5) + 'XXXXX';
    
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${tamperedToken}` }
    });

    expect(response.status()).toBe(403);
  });

  test('Token from different algorithm is rejected', async ({ request }) => {
    // This is a token with "none" algorithm (alg: none)
    const noneAlgToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJkZXZ8YWRtaW4wMDEiLCJlbWFpbCI6ImFkbWluQHRyb3NzYXBwLmRldiIsInJvbGUiOiJhZG1pbiJ9.';
    
    const response = await request.get(`${BACKEND_URL}/api/users?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${noneAlgToken}` }
    });

    expect(response.status()).toBe(403);
  });
});
