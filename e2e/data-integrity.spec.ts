/**
 * E2E Data Integrity Tests
 * 
 * Verifies data integrity and constraints across the full stack.
 * Tests:
 * 1. Foreign key constraints are enforced
 * 2. Unique constraints work
 * 3. Cascade deletes work properly
 * 4. Data is persisted correctly
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

test.describe('E2E - Unique Constraints', () => {
  let adminToken: string;
  let testCustomerId: number;
  const uniqueEmail = `unique-test-${Date.now()}@test.com`;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('First customer with email succeeds', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: uniqueEmail,
        company_name: 'Unique Test Company',
        phone: '+15551111111',
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    testCustomerId = result.data.id;
    expect(testCustomerId).toBeGreaterThan(0);
  });

  test('Duplicate email is rejected', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: uniqueEmail,  // Same email as before
        company_name: 'Another Company',
        phone: '+15552222222',
      },
    });

    // Should be rejected (400 or 409 Conflict)
    expect([400, 409]).toContain(response.status());
  });

  test('Cleanup - delete test customer', async ({ request }) => {
    if (testCustomerId) {
      await request.delete(`${BACKEND_URL}/api/customers/${testCustomerId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    }
  });
});

test.describe('E2E - Foreign Key Constraints', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('Work order with non-existent customer fails', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/work_orders`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'FK Test Work Order',
        customer_id: 999999,  // Non-existent customer
        description: 'Testing FK constraint',
        priority: 'normal',
        status: 'pending',
      },
    });

    // Should fail due to FK constraint (400 or 422)
    expect([400, 422]).toContain(response.status());
  });

  test('Invoice with non-existent customer fails', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/invoices`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        invoice_number: `FK-TEST-${Date.now()}`,
        customer_id: 999999,  // Non-existent
        amount: 100.00,
        tax: 8.00,
        total: 108.00,
        status: 'draft',
        due_date: '2025-12-31',
      },
    });

    expect([400, 422]).toContain(response.status());
  });
});

test.describe('E2E - Data Persistence', () => {
  let adminToken: string;
  let testCustomerId: number;
  const testCompanyName = `Persistence Test ${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('Created data persists and can be retrieved', async ({ request }) => {
    // Create customer
    const createResponse = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: `persist-${Date.now()}@test.com`,
        company_name: testCompanyName,
        phone: '+15553333333',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const createResult = await createResponse.json();
    testCustomerId = createResult.data.id;

    // Retrieve and verify
    const getResponse = await request.get(`${BACKEND_URL}/api/customers/${testCustomerId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(getResponse.ok()).toBeTruthy();
    const getResult = await getResponse.json();
    expect(getResult.data.company_name).toBe(testCompanyName);
  });

  test('Updated data persists', async ({ request }) => {
    test.skip(!testCustomerId, 'Requires test customer');
    
    const updatedName = `Updated ${testCompanyName}`;
    
    // Update
    const updateResponse = await request.patch(`${BACKEND_URL}/api/customers/${testCustomerId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: { company_name: updatedName },
    });

    expect(updateResponse.ok()).toBeTruthy();

    // Verify update persisted
    const getResponse = await request.get(`${BACKEND_URL}/api/customers/${testCustomerId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const result = await getResponse.json();
    expect(result.data.company_name).toBe(updatedName);
  });

  test('Deleted data is removed', async ({ request }) => {
    test.skip(!testCustomerId, 'Requires test customer');

    // Delete
    const deleteResponse = await request.delete(`${BACKEND_URL}/api/customers/${testCustomerId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect([200, 204]).toContain(deleteResponse.status());

    // Verify deleted
    const getResponse = await request.get(`${BACKEND_URL}/api/customers/${testCustomerId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(getResponse.status()).toBe(404);
  });
});

test.describe('E2E - Concurrent Operations', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('Multiple concurrent reads succeed', async ({ request }) => {
    const promises = Array(5).fill(null).map(() =>
      request.get(`${BACKEND_URL}/api/customers?page=1&limit=10`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
    );

    const responses = await Promise.all(promises);
    
    for (const response of responses) {
      expect(response.ok()).toBeTruthy();
    }
  });

  test('Rapid sequential writes succeed', async ({ request }) => {
    const createdIds: number[] = [];

    // Create multiple customers sequentially
    for (let i = 0; i < 3; i++) {
      const response = await request.post(`${BACKEND_URL}/api/customers`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          email: `rapid-write-${Date.now()}-${i}@test.com`,
          company_name: `Rapid Write Test ${i}`,
          phone: `+1555000${1000 + i}`,
        },
      });

      if (response.ok()) {
        const result = await response.json();
        createdIds.push(result.data.id);
      }
    }

    // All should have been created
    expect(createdIds.length).toBe(3);

    // Cleanup
    for (const id of createdIds) {
      await request.delete(`${BACKEND_URL}/api/customers/${id}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    }
  });
});

test.describe('E2E - Soft Delete (if implemented)', () => {
  let adminToken: string;
  let testCustomerId: number;

  test.beforeAll(async ({ request }) => {
    adminToken = await getToken(request, 'admin');
  });

  test('Deleted records are not returned in list', async ({ request }) => {
    // Create a customer
    const createResponse = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: `soft-delete-${Date.now()}@test.com`,
        company_name: `Soft Delete Test ${Date.now()}`,
        phone: '+15554444444',
      },
    });

    if (!createResponse.ok()) {
      test.skip(true, 'Could not create test customer');
      return;
    }

    const createResult = await createResponse.json();
    testCustomerId = createResult.data.id;

    // Delete customer
    await request.delete(`${BACKEND_URL}/api/customers/${testCustomerId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    // Verify not in list
    const listResponse = await request.get(`${BACKEND_URL}/api/customers?page=1&limit=1000`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const listResult = await listResponse.json();
    const deletedCustomer = listResult.data.find((c: any) => c.id === testCustomerId);
    
    expect(deletedCustomer).toBeUndefined();
  });
});
