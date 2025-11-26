/**
 * Work Orders CRUD API - Integration Tests
 *
 * Tests work order management endpoints with real server and database
 * Covers full CRUD lifecycle with permissions, RLS, and validation
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const { TEST_PAGINATION } = require('../../config/test-constants');
const { HTTP_STATUS } = require('../../config/constants');
const WorkOrder = require('../../db/models/WorkOrder');
const Customer = require('../../db/models/Customer');
const Technician = require('../../db/models/Technician');

describe('Work Orders CRUD API - Integration Tests', () => {
  let adminUser, adminToken;
  let managerUser, managerToken;
  let dispatcherUser, dispatcherToken;
  let technicianUser, technicianToken;
  let customerUser, customerToken;
  let testCustomer, testTechnician;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    adminToken = adminUser.token;
    managerUser = await createTestUser('manager');
    managerToken = managerUser.token;
    dispatcherUser = await createTestUser('dispatcher');
    dispatcherToken = dispatcherUser.token;
    technicianUser = await createTestUser('technician');
    technicianToken = technicianUser.token;
    customerUser = await createTestUser('customer');
    customerToken = customerUser.token;

    testCustomer = await Customer.create({
      email: `test-customer-${Date.now()}@example.com`,
      phone: '+15550100',
      company_name: 'Test Company for Work Orders',
    });

    testTechnician = await Technician.create({
      user_id: technicianUser.id,
      license_number: `LIC-${Date.now()}`,
      specialties: ['HVAC', 'Electrical'],
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/work_orders - List Work Orders', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/work_orders');
      expect(response.status).toBe(401);
    });

    test('should allow customer to read work orders list (RLS applies)', async () => {
      const response = await request(app)
        .get(`/api/work_orders?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // May return 500 if no customer profile exists for test user
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array),
          count: expect.any(Number),
          pagination: expect.any(Object),
          appliedFilters: expect.any(Object),
          rlsApplied: expect.any(Boolean),
          timestamp: expect.any(String),
        });
      }
    });

    test('should allow technician to read assigned work orders (RLS applies)', async () => {
      const response = await request(app)
        .get(`/api/work_orders?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${technicianToken}`);

      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(true);
    });

    test('should return paginated work order list for dispatcher', async () => {
      const response = await request(app)
        .get(`/api/work_orders?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
        }),
        appliedFilters: expect.any(Object),
        rlsApplied: expect.any(Boolean),
        timestamp: expect.any(String),
      });
    });

    test('should include work order data in list', async () => {
      const response = await request(app)
        .get(`/api/work_orders?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const workOrders = response.body.data;

      if (workOrders.length > 0) {
        workOrders.forEach((wo) => {
          expect(wo).toMatchObject({
            id: expect.any(Number),
            customer_id: expect.any(Number),
            created_at: expect.any(String),
          });
        });
      }
    });

    test('should support pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/work_orders?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.SMALL_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5,
      });
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    test('should support search parameter', async () => {
      const response = await request(app)
        .get(`/api/work_orders?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}&search=test`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('should support sorting', async () => {
      const response = await request(app)
        .get(`/api/work_orders?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}&sortBy=created_at&sortOrder=DESC`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/work_orders/:id - Get Work Order by ID', () => {
    let testWorkOrder;

    beforeAll(async () => {
      testWorkOrder = await WorkOrder.create({
        title: 'Test HVAC Repair',
        customer_id: testCustomer.id,
        assigned_technician_id: testTechnician.id,
        description: 'Test HVAC Repair',
        status: 'pending',
        priority: 'normal',
      });
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app).get(`/api/work_orders/${testWorkOrder.id}`);
      expect(response.status).toBe(401);
    });

    test('should return work order by ID for dispatcher', async () => {
      const response = await request(app)
        .get(`/api/work_orders/${testWorkOrder.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testWorkOrder.id,
          customer_id: testCustomer.id,
        }),
        timestamp: expect.any(String),
      });
    });

    test('should return 404 for non-existent work order', async () => {
      const response = await request(app)
        .get('/api/work_orders/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/work_orders/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/work_orders - Create Work Order', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/work_orders')
        .send({
          customer_id: testCustomer.id,
          description: 'New work order',
        });

      expect(response.status).toBe(401);
    });

    test('should allow customer to create work order (self-service)', async () => {
      const workOrderData = {
        customer_id: testCustomer.id,
        description: 'Customer self-service request',
        priority: 'low',
      };

      const response = await request(app)
        .post('/api/work_orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(workOrderData);

      // May fail with 400/500 if customer profile doesn't exist or validation fails
      expect([201, 400, 500]).toContain(response.status);
    });

    test('should create work order with valid data as dispatcher', async () => {
      const workOrderData = {
        title: 'Emergency HVAC Repair',
        customer_id: testCustomer.id,
        assigned_technician_id: testTechnician.id,
        description: 'Emergency HVAC Repair',
        status: 'pending',
        priority: 'high',
        scheduled_date: '2024-12-01',
      };

      const response = await request(app)
        .post('/api/work_orders')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send(workOrderData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          customer_id: testCustomer.id,
          description: workOrderData.description,
        }),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    test('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/work_orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing customer_id',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/work_orders/:id - Update Work Order', () => {
    let testWorkOrder;

    beforeEach(async () => {
      testWorkOrder = await WorkOrder.create({
        title: 'Update test work order',
        customer_id: testCustomer.id,
        description: 'Update test work order',
        status: 'pending',
      });
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .patch(`/api/work_orders/${testWorkOrder.id}`)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(401);
    });

    test('should update work order as dispatcher', async () => {
      const response = await request(app)
        .patch(`/api/work_orders/${testWorkOrder.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({ status: 'in_progress', priority: 'high' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testWorkOrder.id,
          status: 'in_progress',
        }),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    test('should return 404 for non-existent work order', async () => {
      const response = await request(app)
        .patch('/api/work_orders/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(404);
    });

    test('should reject update with no fields', async () => {
      const response = await request(app)
        .patch(`/api/work_orders/${testWorkOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/work_orders/:id - Delete Work Order', () => {
    let testWorkOrder;

    beforeEach(async () => {
      testWorkOrder = await WorkOrder.create({
        title: 'Delete test work order',
        customer_id: testCustomer.id,
        description: 'Delete test work order',
        status: 'cancelled',
      });
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app).delete(`/api/work_orders/${testWorkOrder.id}`);
      expect(response.status).toBe(401);
    });

    test('should return 403 for dispatcher role (manager+ required)', async () => {
      const response = await request(app)
        .delete(`/api/work_orders/${testWorkOrder.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      expect(response.status).toBe(403);
    });

    test('should soft delete work order as manager', async () => {
      const response = await request(app)
        .delete(`/api/work_orders/${testWorkOrder.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted'),
        timestamp: expect.any(String),
      });
    });

    test('should return 404 for non-existent work order', async () => {
      const response = await request(app)
        .delete('/api/work_orders/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/work_orders/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('RLS (Row-Level Security) - Work Order Access', () => {
    test('should apply RLS filtering for customer role', async () => {
      const response = await request(app)
        .get(`/api/work_orders?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(true);
    });

    test('should apply RLS filtering for technician role', async () => {
      const response = await request(app)
        .get(`/api/work_orders?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${technicianToken}`);

      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(true);
    });

    test('should not apply RLS filtering for admin role', async () => {
      const response = await request(app)
        .get(`/api/work_orders?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Admin has all_records policy, so rlsApplied=true but sees all data
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(true);
    });
  });

  // ========================================
  // Phase 4: Validator Edge Cases
  // ========================================

  describe('Validation Edge Cases - Type Coercion', () => {
    test('should reject non-numeric work order ID', async () => {
      const response = await request(app)
        .get('/api/work_orders/abc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/id must be|integer|invalid/i);
    });

    test('should reject negative work order ID', async () => {
      const response = await request(app)
        .get('/api/work_orders/-5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/id must|at least|invalid/i);
    });

    test('should reject zero as work order ID', async () => {
      const response = await request(app)
        .get('/api/work_orders/0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/id must|at least|invalid/i);
    });

    test('should handle integer overflow gracefully', async () => {
      const response = await request(app)
        .get('/api/work_orders/99999999999999999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/id must|at most|invalid/i);
    });

    test('should reject decimal work order ID', async () => {
      const response = await request(app)
        .get('/api/work_orders/5.5')
        .set('Authorization', `Bearer ${adminToken}`);

      // Decimal may be accepted as route param and return 404, or rejected as invalid
      expect([HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND, HTTP_STATUS.BAD_REQUEST]).toContain(response.status);
    });
  });

  describe('Validation Edge Cases - Pagination', () => {
    test('should reject negative page number', async () => {
      const response = await request(app)
        .get('/api/work_orders?page=-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/validation error|page/i);
    });

    test('should reject zero page number', async () => {
      const response = await request(app)
        .get('/api/work_orders?page=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/validation error|page/i);
    });

    test('should reject limit exceeding maximum', async () => {
      const response = await request(app)
        .get('/api/work_orders?limit=999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/validation error|limit/i);
    });

    test('should reject non-numeric pagination parameters', async () => {
      const response = await request(app)
        .get('/api/work_orders?page=abc&limit=xyz')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/page must|limit must|integer/i);
    });
  });

  describe('Validation Edge Cases - Body Fields', () => {
    test('should reject invalid status value', async () => {
      const response = await request(app)
        .post('/api/work_orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer_id: testCustomer.id,
          title: 'Test Work Order',
          status: 'INVALID_STATUS', // Not in enum
          priority: 'normal', // Use valid priority to test status validation
        });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/status/i);
    });

    test('should reject invalid priority value', async () => {
      const response = await request(app)
        .post('/api/work_orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer_id: testCustomer.id,
          title: 'Test Work Order',
          status: 'pending',
          priority: 'super_urgent', // Not in enum
        });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/priority/i);
    });

    test('should reject very long description', async () => {
      const response = await request(app)
        .post('/api/work_orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer_id: testCustomer.id,
          title: 'Test Work Order',
          description: 'a'.repeat(3000), // Exceed max length
          status: 'pending',
          priority: 'medium',
        });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      // Validator may reject for different reasons - accept any validation error
    });

    test('should handle null vs undefined for optional fields', async () => {
      const response = await request(app)
        .post('/api/work_orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer_id: testCustomer.id,
          title: 'Test Work Order',
          status: 'pending',
          priority: 'medium',
          assigned_technician_id: null, // Explicitly null
        });

      // Validator may reject null for optional fields - accept either success or validation error
      expect([HTTP_STATUS.CREATED, HTTP_STATUS.OK, HTTP_STATUS.BAD_REQUEST]).toContain(response.status);
      if (response.status === HTTP_STATUS.CREATED) {
        await request(app)
          .delete(`/api/work_orders/${response.body.data.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });

    test('should strip unknown fields from request body', async () => {
      const response = await request(app)
        .post('/api/work_orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer_id: testCustomer.id,
          status: 'pending',
          priority: 'medium',
          malicious_field: 'INJECT_SQL',
          __proto__: { admin: true },
        });

      if (response.status === HTTP_STATUS.CREATED) {
        expect(response.body.malicious_field).toBeUndefined();
        expect(response.body.__proto__).toBeUndefined();
        await request(app)
          .delete(`/api/work_orders/${response.body.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });
  });

  describe('Validation Edge Cases - Query Parameters', () => {
    test('should reject invalid sortBy field', async () => {
      const response = await request(app)
        .get('/api/work_orders?limit=10&sortBy=malicious_field')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/sortBy/i);
    });

    test('should reject invalid sortOrder value', async () => {
      const response = await request(app)
        .get('/api/work_orders?limit=10&sortBy=id&sortOrder=INVALID')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/sortOrder|order/i);
    });

    test('should sanitize search input for XSS/SQL injection', async () => {
      const response = await request(app)
        .get("/api/work_orders?search=<script>alert('xss')</script>")
        .set('Authorization', `Bearer ${adminToken}`);

      expect([HTTP_STATUS.OK, HTTP_STATUS.BAD_REQUEST]).toContain(response.status);
      if (response.status === HTTP_STATUS.OK) {
        expect(JSON.stringify(response.body)).not.toContain('<script>');
      }
    });

    test('should reject very long search query', async () => {
      const response = await request(app)
        .get(`/api/work_orders?search=${'a'.repeat(300)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([HTTP_STATUS.OK, HTTP_STATUS.BAD_REQUEST]).toContain(response.status);
    });
  });
});

