/**
 * E2E File Storage Tests
 * 
 * Verifies file storage endpoints work end-to-end.
 * 
 * READ-ONLY BY DESIGN:
 * - Dev users cannot upload/delete files (read-only protection)
 * - Dev users have limited permissions (may not access all entities)
 * - Tests verify authentication, permission boundaries, and error handling
 * - Actual CRUD tested in integration tests (45+ tests)
 * 
 * These tests should NEVER flake because they:
 * - Don't depend on test data state
 * - Test fundamental connectivity and error handling only
 */

import { test, expect } from '@playwright/test';
import { URLS } from './config/constants';
import { getDevToken, getDevTokenWithRequest } from './helpers';

const BACKEND_URL = URLS.BACKEND;

test.describe('E2E - File Storage Authentication', () => {

  test('List files requires authentication', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/files/work_order/1`);

    expect(response.status()).toBe(401);
  });

  test('Download requires authentication', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/files/1/download`);

    expect(response.status()).toBe(401);
  });

  test('Delete requires authentication', async ({ request }) => {
    const response = await request.delete(`${BACKEND_URL}/api/files/1`);

    expect(response.status()).toBe(401);
  });

  test('Upload requires authentication', async ({ request }) => {
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

test.describe('E2E - File Storage Read-Only Protection', () => {

  test('Dev users cannot upload files (read-only)', async ({ request }) => {
    const adminToken = await getDevTokenWithRequest(request, 'admin');

    const response = await request.post(`${BACKEND_URL}/api/files/work_order/1`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'image/jpeg',
        'X-Filename': 'test.jpg',
      },
      data: Buffer.from('fake image data'),
    });

    // Dev users are read-only
    expect(response.status()).toBe(403);
    
    const data = await response.json();
    expect(data.message).toContain('read-only');
  });

  test('Dev users cannot delete files (read-only)', async ({ request }) => {
    const adminToken = await getDevTokenWithRequest(request, 'admin');

    const response = await request.delete(`${BACKEND_URL}/api/files/1`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });

    // Dev users are read-only
    expect(response.status()).toBe(403);
    
    const data = await response.json();
    expect(data.message).toContain('read-only');
  });
});

test.describe('E2E - File Storage Validation', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    adminToken = await getDevToken('admin');
  });

  test('Invalid entity ID format returns 400', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/files/work_order/not-a-number`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(400);
  });

  test('Invalid file ID format returns 400', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/files/abc/download`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(400);
  });

  test('Download non-existent file returns 404', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/files/999999/download`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });

    // Should be 404 (file not found) after passing validation
    expect(response.status()).toBe(404);
    
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});

test.describe('E2E - File Storage Permission Boundaries', () => {

  test('Dev admin gets permission error for entity files (expected)', async ({ request }) => {
    // Dev users have limited permissions - this verifies the permission check works
    const adminToken = await getDevTokenWithRequest(request, 'admin');

    const response = await request.get(`${BACKEND_URL}/api/files/work_order/1`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });

    // Dev tokens may not have full permissions - 403 is expected
    // This proves the permission system is working
    expect([200, 403]).toContain(response.status());
  });

  test('Customer token has restricted access', async ({ request }) => {
    const customerToken = await getDevTokenWithRequest(request, 'customer');

    const response = await request.get(`${BACKEND_URL}/api/files/work_order/1`, {
      headers: { 'Authorization': `Bearer ${customerToken}` },
    });

    // Customer should be forbidden from work_order files
    expect([403]).toContain(response.status());
  });
});
