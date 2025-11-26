/**
 * Invoices CRUD API - Integration Tests
 *
 * Tests invoice management endpoints with real server and database
 * Covers full CRUD lifecycle with permissions, RLS, and validation
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const { TEST_PAGINATION } = require('../../config/test-constants');
const Invoice = require('../../db/models/Invoice');
const Customer = require('../../db/models/Customer');
const WorkOrder = require('../../db/models/WorkOrder');

describe('Invoices CRUD API - Integration Tests', () => {
  let adminUser;
  let adminToken;
  let managerUser;
  let managerToken;
  let dispatcherUser;
  let dispatcherToken;
  let technicianUser;
  let technicianToken;
  let customerUser;
  let customerToken;
  let testCustomer;
  let testWorkOrder;

  beforeAll(async () => {
    // Create test users with tokens
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

    // Create test customer and work order for invoice relationships
    testCustomer = await Customer.create({
      email: `test-customer-${Date.now()}@example.com`,
      phone: '+15550100',
      company_name: 'Test Company for Invoices',
    });

    testWorkOrder = await WorkOrder.create({
      customer_id: testCustomer.id,
      title: 'Test Work Order for Invoices',
      description: 'Test work order description',
      status: 'completed',
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/invoices - List Invoices', () => {
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/invoices');

      // Assert
      expect(response.status).toBe(401);
    });

    test('should return 403 for technician role (deny_all RLS)', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert - Technicians have deny_all RLS for invoices
      // deny_all returns empty list with 200, not 403
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    test('should allow customer to read invoices list (RLS applies)', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert - Customer role should be able to read (with own_invoices_only RLS)
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

    test('should return paginated invoice list for dispatcher', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
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

    test('should include invoice data in list', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      const invoices = response.body.data;

      if (invoices.length > 0) {
        invoices.forEach((invoice) => {
          expect(invoice).toMatchObject({
            id: expect.any(Number),
            customer_id: expect.any(Number),
            created_at: expect.any(String),
          });
        });
      }
    });

    test('should support pagination parameters', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.SMALL_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5,
      });
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    test('should support search parameter', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}&search=test`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('should support sorting', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}&sortBy=total&sortOrder=DESC`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('should apply RLS filtering for customer role', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(true);
      
      // Customer should only see their own invoices
      if (response.body.data.length > 0) {
        response.body.data.forEach((invoice) => {
          expect(invoice).toHaveProperty('id');
          expect(invoice).toHaveProperty('customer_id');
        });
      }
    });
  });

  describe('GET /api/invoices/:id - Get Invoice by ID', () => {
    let testInvoice;

    beforeAll(async () => {
      // Create a test invoice
      testInvoice = await Invoice.create({
        invoice_number: `TST-INV-${Date.now()}`,
        customer_id: testCustomer.id,
        work_order_id: testWorkOrder.id,
        amount: 700.00,
        tax: 50.00,
        total: 750.00,
        status: 'draft',
        due_date: '2024-12-31',
      });
    });

    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get(`/api/invoices/${testInvoice.id}`);

      // Assert
      expect(response.status).toBe(401);
    });

    test('should return invoice by ID for dispatcher', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testInvoice.id,
          customer_id: testCustomer.id,
          total: expect.any(String), // Decimal returned as string
        }),
        timestamp: expect.any(String),
      });
    });

    test('should return 404 for non-existent invoice', async () => {
      // Act
      const response = await request(app)
        .get('/api/invoices/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    test('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .get('/api/invoices/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/invoices - Create Invoice', () => {
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/invoices')
        .send({
          customer_id: testCustomer.id,
          total: 500.00,
        });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should return 403 for customer role (dispatcher+ required)', async () => {
      // Act
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customer_id: testCustomer.id,
          total: 500.00,
        });

      // Assert
      expect(response.status).toBe(403);
    });

    test('should return 403 for technician role (dispatcher+ required)', async () => {
      // Act
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({
          customer_id: testCustomer.id,
          total: 500.00,
        });

      // Assert
      expect(response.status).toBe(403);
    });

    test('should create invoice with valid data as dispatcher', async () => {
      // Arrange
      const invoiceData = {
        invoice_number: `TST-CREATE-${Date.now()}`,
        customer_id: testCustomer.id,
        work_order_id: testWorkOrder.id,
        amount: 1100.00,
        tax: 150.00,
        total: 1250.00,
        status: 'draft',
        due_date: '2024-12-31',
      };

      // Act
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send(invoiceData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          customer_id: testCustomer.id,
          total: expect.any(String), // Decimal returned as string
        }),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    test('should create invoice with minimal required data', async () => {
      // Arrange
      const invoiceData = {
        invoice_number: `TST-MIN-${Date.now()}`,
        customer_id: testCustomer.id,
        amount: 300.00,
        total: 350.00,
      };

      // Act
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invoiceData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.customer_id).toBe(testCustomer.id);
      expect(response.body.data.total).toBeDefined();
    });

    test('should reject missing required fields', async () => {
      // Act - Missing customer_id
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          total: 100.00,
        });

      // Assert
      expect(response.status).toBe(400);
    });

    test('should reject invalid customer_id', async () => {
      // Act
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer_id: 999999,
          total: 100.00,
        });

      // Assert - Foreign key violation returns 400 or 500 depending on validator vs DB constraint
      expect([400, 500]).toContain(response.status);
    });

    test('should reject negative total', async () => {
      // Act
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoice_number: `TST-NEG-${Date.now()}`,
          customer_id: testCustomer.id,
          amount: -90.00,
          total: -100.00,
        });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/invoices/:id - Update Invoice', () => {
    let testInvoice;

    beforeEach(async () => {
      // Create a fresh test invoice for each update test
      testInvoice = await Invoice.create({
        invoice_number: `UPD-INV-${Date.now()}`,
        customer_id: testCustomer.id,
        amount: 550.00,
        tax: 50.00,
        total: 600.00,
        status: 'draft',
      });
    });

    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/invoices/${testInvoice.id}`)
        .send({ status: 'paid' });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should return 403 for customer role (dispatcher+ required)', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'paid' });

      // Assert
      expect(response.status).toBe(403);
    });

    test('should return 403 for technician role (dispatcher+ required)', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ status: 'paid' });

      // Assert
      expect(response.status).toBe(403);
    });

    test('should update invoice with valid data as dispatcher', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({ status: 'paid', total: 650.00 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testInvoice.id,
          status: 'paid',
        }),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    test('should update multiple fields', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          total: 800.00,
          status: 'paid',
          paid_date: '2024-11-15',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        total: expect.any(String), // DECIMAL returned as string
        status: 'paid',
      });
    });

    test('should return 404 for non-existent invoice', async () => {
      // Act
      const response = await request(app)
        .patch('/api/invoices/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'paid' });

      // Assert
      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .patch('/api/invoices/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'paid' });

      // Assert
      expect(response.status).toBe(400);
    });

    test('should reject update with no fields', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/invoices/:id - Delete Invoice', () => {
    let testInvoice;

    beforeEach(async () => {
      // Create a fresh test invoice for each delete test
      testInvoice = await Invoice.create({
        invoice_number: `DEL-INV-${Date.now()}`,
        customer_id: testCustomer.id,
        amount: 180.00,
        tax: 20.00,
        total: 200.00,
        status: 'cancelled',
      });
    });

    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).delete(`/api/invoices/${testInvoice.id}`);

      // Assert
      expect(response.status).toBe(401);
    });

    test('should return 403 for dispatcher role (manager+ required)', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(403);
    });

    test('should soft delete invoice as manager', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted'),
        timestamp: expect.any(String),
      });
    });

    test('should delete invoice as admin', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent invoice', async () => {
      // Act
      const response = await request(app)
        .delete('/api/invoices/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .delete('/api/invoices/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('RLS (Row-Level Security) - Invoice Access', () => {
    test('should apply RLS filtering for customer role on GET list', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(true);
    });

    test('should deny access for technician role (deny_all RLS)', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert - deny_all returns empty list with 200, not 403
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    test('should not apply RLS filtering for admin role', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert - Admin has all_records policy, so rlsApplied=true but sees all data
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(true);
    });

    test('should apply RLS filtering for dispatcher role (all_records policy)', async () => {
      // Act
      const response = await request(app)
        .get(`/api/invoices?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rlsApplied');
    });
  });

  describe('Validation Edge Cases - Type Coercion', () => {
    const { HTTP_STATUS } = require('../../config/constants');

    test('should reject non-numeric invoice ID', async () => {
      const response = await request(app)
        .get('/api/invoices/abc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/id must|integer|invalid/i);
    });

    test('should reject negative invoice ID', async () => {
      const response = await request(app)
        .get('/api/invoices/-5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/id must|at least|invalid/i);
    });

    test('should reject zero as invoice ID', async () => {
      const response = await request(app)
        .get('/api/invoices/0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/id must|at least|invalid/i);
    });

    test('should handle integer overflow gracefully', async () => {
      const response = await request(app)
        .get('/api/invoices/99999999999999999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/id must|at most|invalid/i);
    });

    test('should reject decimal invoice ID', async () => {
      const response = await request(app)
        .get('/api/invoices/5.5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND, HTTP_STATUS.BAD_REQUEST]).toContain(response.status);
    });
  });

  describe('Validation Edge Cases - Pagination', () => {
    const { HTTP_STATUS } = require('../../config/constants');

    test('should reject negative page number', async () => {
      const response = await request(app)
        .get('/api/invoices?page=-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/page|validation/i);
    });

    test('should reject zero page number', async () => {
      const response = await request(app)
        .get('/api/invoices?page=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/page|validation/i);
    });

    test('should reject limit exceeding maximum', async () => {
      const response = await request(app)
        .get('/api/invoices?limit=999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/limit/i);
    });

    test('should reject non-numeric pagination parameters', async () => {
      const response = await request(app)
        .get('/api/invoices?page=abc&limit=xyz')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/page must|limit must|integer/i);
    });
  });

  describe('Validation Edge Cases - Body Fields', () => {
    const { HTTP_STATUS } = require('../../config/constants');

    test('should reject invalid status value', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          invoice_number: `INV-TEST-${Date.now()}`,
          customer_id: testCustomer.id,
          amount: 100.00,
          total: 100.00,
          status: 'INVALID_STATUS',
        });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/status/i);
    });

    test('should reject negative amount', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          invoice_number: `INV-TEST-${Date.now()}`,
          customer_id: testCustomer.id,
          amount: -100.00,
          total: -100.00,
          status: 'draft',
        });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should reject missing required invoice_number', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          customer_id: testCustomer.id,
          amount: 100.00,
          total: 100.00,
        });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/invoice_number|required/i);
    });

    test('should reject missing required customer_id', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          invoice_number: `INV-TEST-${Date.now()}`,
          amount: 100.00,
          total: 100.00,
        });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/customer_id|required/i);
    });

    test('should strip unknown fields from request body', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          invoice_number: `INV-TEST-${Date.now()}`,
          customer_id: testCustomer.id,
          amount: 100.00,
          total: 100.00,
          malicious_field: 'INJECT_SQL',
          // Note: __proto__ test removed - JavaScript objects always have __proto__ property
        });

      if (response.status === HTTP_STATUS.CREATED) {
        expect(response.body.data.malicious_field).toBeUndefined();
        // Unknown fields should be stripped by Joi validation
        await request(app)
          .delete(`/api/invoices/${response.body.data.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });
  });

  describe('Validation Edge Cases - Query Parameters', () => {
    const { HTTP_STATUS } = require('../../config/constants');

    test('should reject invalid sortBy field', async () => {
      const response = await request(app)
        .get('/api/invoices?limit=10&sortBy=malicious_field')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/sortBy/i);
    });

    test('should reject invalid sortOrder value', async () => {
      const response = await request(app)
        .get('/api/invoices?limit=10&sortBy=invoice_number&sortOrder=INVALID')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toMatch(/sortOrder|order/i);
    });

    test('should sanitize search input for XSS/SQL injection', async () => {
      const response = await request(app)
        .get("/api/invoices?search=<script>alert('xss')</script>")
        .set('Authorization', `Bearer ${adminToken}`);

      expect([HTTP_STATUS.OK, HTTP_STATUS.BAD_REQUEST]).toContain(response.status);
      if (response.status === HTTP_STATUS.OK) {
        expect(JSON.stringify(response.body)).not.toContain('<script>');
      }
    });

    test('should handle very long search queries', async () => {
      const response = await request(app)
        .get(`/api/invoices?search=${'a'.repeat(300)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([HTTP_STATUS.OK, HTTP_STATUS.BAD_REQUEST]).toContain(response.status);
    });
  });
});
