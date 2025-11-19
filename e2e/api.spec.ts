/**
 * E2E Tests - Complete API Workflow
 * 
 * Tests real-world workflows across all business entities:
 * - Work orders with customer/technician relationships
 * - Invoices tied to work orders
 * - Contracts for customers
 * - Inventory usage tracking
 * 
 * Focus: End-to-end business flows, not unit operations
 */

import { test, expect } from '@playwright/test';
import { URLS, TEST_DATA } from './config/constants';

const BACKEND_URL = URLS.BACKEND;

// Helper to get dev token
async function getAdminToken(request: any): Promise<string> {
  const response = await request.get(`${BACKEND_URL}/api/dev/token?role=admin`);
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.token;
}

async function getDispatcherToken(request: any): Promise<string> {
  const response = await request.get(`${BACKEND_URL}/api/dev/token?role=dispatcher`);
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.token;
}

test.describe('Complete Business Workflow E2E', () => {
  let adminToken: string;
  let dispatcherToken: string;
  let customerId: number;
  let technicianId: number;
  let workOrderId: number;
  let invoiceId: number;
  let contractId: number;
  let inventoryItemId: number;

  test.beforeAll(async ({ request }) => {
    // Get auth tokens
    adminToken = await getAdminToken(request);
    dispatcherToken = await getDispatcherToken(request);
  });

  test('01 - Health check confirms all services ready', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.database.connected).toBe(true);
  });

  test('02 - Create customer for work order', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        email: TEST_DATA.EMAIL.unique(TEST_DATA.PREFIXES.CUSTOMER),
        company_name: TEST_DATA.CUSTOMER.company_name,
        contact_name: TEST_DATA.CUSTOMER.contact_name,
        phone: TEST_DATA.PHONES.CUSTOMER,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBe(true);
    customerId = result.data.id;
    expect(customerId).toBeGreaterThan(0);
  });

  test('03 - Create technician for assignment', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/technicians`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        license_number: `${TEST_DATA.PREFIXES.LICENSE}-${Date.now()}`,
        first_name: TEST_DATA.TECHNICIAN.first_name,
        last_name: TEST_DATA.TECHNICIAN.last_name,
        email: TEST_DATA.EMAIL.unique(TEST_DATA.PREFIXES.TECHNICIAN),
        phone: TEST_DATA.PHONES.TECHNICIAN,
        hourly_rate: TEST_DATA.TECHNICIAN.hourly_rate,
        status: TEST_DATA.TECHNICIAN.status,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    technicianId = result.data.id;
    expect(technicianId).toBeGreaterThan(0);
  });

  test('04 - Create inventory item for tracking', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/inventory`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: `${TEST_DATA.INVENTORY.name_prefix} ${Date.now()}`,
        sku: `${TEST_DATA.PREFIXES.INVENTORY}-${Date.now()}`,
        quantity: TEST_DATA.INVENTORY.quantity,
        unit_cost: TEST_DATA.INVENTORY.unit_cost,
        location: TEST_DATA.INVENTORY.location,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    inventoryItemId = result.data.id;
    expect(inventoryItemId).toBeGreaterThan(0);
  });

  test('05 - Create contract with customer', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/contracts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        contract_number: `${TEST_DATA.PREFIXES.CONTRACT}-${Date.now()}`,
        customer_id: customerId,
        start_date: TEST_DATA.CONTRACT.start_date,
        end_date: TEST_DATA.CONTRACT.end_date,
        value: TEST_DATA.CONTRACT.value,
        status: TEST_DATA.CONTRACT.status,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    contractId = result.data.id;
    
    // Verify decimal field returns as string (learned pattern!)
    expect(typeof result.data.value).toBe('string');
    expect(result.data.value).toBe('12000.00');
  });

  test('06 - Create work order (dispatcher role)', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/work_orders`, {
      headers: { Authorization: `Bearer ${dispatcherToken}` },
      data: {
        title: TEST_DATA.WORK_ORDER.title,
        customer_id: customerId,
        assigned_technician_id: technicianId,
        description: TEST_DATA.WORK_ORDER.description,
        priority: TEST_DATA.WORK_ORDER.priority,
        status: TEST_DATA.WORK_ORDER.status,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    workOrderId = result.data.id;
    expect(result.data.title).toBe('E2E HVAC Repair');
    expect(result.data.customer_id).toBe(customerId);
  });

  test('07 - Update work order to in-progress', async ({ request }) => {
    const response = await request.patch(
      `${BACKEND_URL}/api/work_orders/${workOrderId}`,
      {
        headers: { Authorization: `Bearer ${dispatcherToken}` },
        data: { status: 'in_progress' },
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.data.status).toBe('in_progress');
  });

  test('08 - Create invoice for completed work', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/invoices`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        invoice_number: `${TEST_DATA.PREFIXES.INVOICE}-${Date.now()}`,
        customer_id: customerId,
        work_order_id: workOrderId,
        amount: TEST_DATA.INVOICE.amount,
        tax: TEST_DATA.INVOICE.tax,
        total: TEST_DATA.INVOICE.total,
        status: TEST_DATA.INVOICE.status,
        due_date: TEST_DATA.INVOICE.due_date,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    invoiceId = result.data.id;
    
    // Verify decimal fields (learned pattern!)
    expect(typeof result.data.total).toBe('string');
    expect(result.data.total).toBe('918.00');
  });

  test('09 - Update invoice to sent status', async ({ request }) => {
    const response = await request.patch(
      `${BACKEND_URL}/api/invoices/${invoiceId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { status: 'sent' },
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.data.status).toBe('sent');
  });

  // NOTE: RLS testing is covered in backend integration tests
  // (see backend/__tests__/integration/*-api.test.js)
  // E2E tests focus on business workflows, not backend security internals

  test('12 - Search and pagination work correctly', async ({ request }) => {
    const response = await request.get(
      `${BACKEND_URL}/api/work_orders?search=E2E&page=1&limit=10&sortBy=created_at&sortOrder=desc`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.pagination).toBeDefined();
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
  });

  test('13 - Cleanup - soft delete all test data', async ({ request }) => {
    // Delete in reverse dependency order
    await request.delete(`${BACKEND_URL}/api/invoices/${invoiceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    await request.delete(`${BACKEND_URL}/api/work_orders/${workOrderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    await request.delete(`${BACKEND_URL}/api/contracts/${contractId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    await request.delete(`${BACKEND_URL}/api/inventory/${inventoryItemId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    await request.delete(`${BACKEND_URL}/api/technicians/${technicianId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    await request.delete(`${BACKEND_URL}/api/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });
});

test.describe('Error Handling & Edge Cases E2E', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getAdminToken(request);
  });

  test('Invalid ID format returns 400', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/work_orders/invalid-id`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result.error).toBeDefined();
  });

  test('Non-existent resource returns 404', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/work_orders/999999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(404);
  });

  test('Missing required fields returns 400', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/work_orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        // Missing required 'title' and 'customer_id'
        description: 'Incomplete work order',
      },
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result.error).toBeDefined();
  });

  test('Unauthorized access returns 401', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/work_orders`);
    expect(response.status()).toBe(401);
  });

  test('Invalid token returns 403', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/work_orders`, {
      headers: { Authorization: 'Bearer invalid-token-here' },
    });

    expect(response.status()).toBe(403);
  });
});
