/**
 * E2E Production Stack Health Tests
 * 
 * PURPOSE: Verify the deployed production stack is up and secure.
 * 
 * These tests run against the REAL Railway deployment and test ONLY:
 * 1. Health - Is the server running? Database connected?
 * 2. Security - Are security headers present? Is auth enforced?
 * 3. Routing - Do unknown routes return 404?
 * 
 * WHAT'S NOT HERE (and why):
 * - Dev token tests → Dev tokens don't work in production (correct!)
 * - RBAC tests → Tested in 1100+ integration tests with test auth
 * - Read-only protection → Tested in integration tests
 * - Pagination/API contracts → Tested in integration tests
 * 
 * PHILOSOPHY:
 * - Unit tests: Logic (1900+ tests)
 * - Integration tests: API contracts with test auth (1100+ tests)
 * - E2E tests: Production is up and secure (~15 tests)
 * 
 * These tests NEVER flake because they:
 * - Only hit public endpoints or verify auth rejection
 * - Don't require working authentication
 * - Don't depend on test data
 */

import { test, expect } from '@playwright/test';
import { URLS } from './config/constants';

const BACKEND_URL = URLS.BACKEND;

// ============================================================================
// HEALTH CHECKS - Is the deployment running?
// ============================================================================
test.describe('E2E - Production Health @smoke', () => {
  
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

// ============================================================================
// SECURITY - Is authentication enforced? Are headers present?
// ============================================================================
test.describe('E2E - Production Security @smoke @security', () => {

  test('Protected endpoints require authentication', async ({ request }) => {
    // These should all return 401 without a token
    const protectedEndpoints = [
      '/api/users',
      '/api/customers',
      '/api/work_orders',
      '/api/technicians',
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(`${BACKEND_URL}${endpoint}`);
      expect(response.status(), `${endpoint} should require auth`).toBe(401);
    }
  });

  test('Invalid token is rejected', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users`, {
      headers: { 'Authorization': 'Bearer invalid-token-12345' }
    });
    
    expect(response.status()).toBe(403);
  });

  test('Malformed JWT is rejected', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/users`, {
      headers: { 'Authorization': 'Bearer not.a.valid.jwt.token' }
    });

    expect(response.status()).toBe(403);
  });

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

// ============================================================================
// ROUTING - Do unknown routes behave correctly?
// ============================================================================
test.describe('E2E - Production Routing @smoke', () => {

  test('Non-existent route returns 404', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/nonexistent-endpoint`);
    expect(response.status()).toBe(404);
  });

  test('API root returns useful response', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api`);
    // Could be 200 with API info, or 404 - both are acceptable
    expect([200, 404]).toContain(response.status());
  });
});

// ============================================================================
// FILE STORAGE - Is auth enforced on file endpoints?
// ============================================================================
test.describe('E2E - File Storage Security @smoke @security', () => {

  test('File list requires authentication', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/files/work_order/1`);
    expect(response.status()).toBe(401);
  });

  test('File download requires authentication', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/files/1/download`);
    expect(response.status()).toBe(401);
  });

  test('File delete requires authentication', async ({ request }) => {
    const response = await request.delete(`${BACKEND_URL}/api/files/1`);
    expect(response.status()).toBe(401);
  });

  test('File upload requires authentication', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/files/work_order/1`, {
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Filename': 'test.jpg',
      },
      data: Buffer.from('fake'),
    });
    expect(response.status()).toBe(401);
  });
});
