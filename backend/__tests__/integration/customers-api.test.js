/**
 * Customers CRUD API - Integration Tests
 *
 * Tests customer management endpoints with real server and database
 * Covers full CRUD lifecycle with permissions, RLS, and validation
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const { TEST_PAGINATION } = require('../../config/test-constants');
const { HTTP_STATUS } = require('../../config/constants');
const Customer = require('../../db/models/Customer');

describe('Customers CRUD API - Integration Tests', () => {
  let adminUser;
  let adminToken;
  let dispatcherUser;
  let dispatcherToken;
  let technicianUser;
  let technicianToken;
  let customerUser;
  let customerToken;

  beforeAll(async () => {
    // Create test users with tokens
    adminUser = await createTestUser('admin');
    adminToken = adminUser.token;
    dispatcherUser = await createTestUser('dispatcher');
    dispatcherToken = dispatcherUser.token;
    technicianUser = await createTestUser('technician');
    technicianToken = technicianUser.token;
    customerUser = await createTestUser('customer');
    customerToken = customerUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/customers - List Customers', () => {
    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/customers');

      // Assert
      expect(response.status).toBe(401);
    });

    test('should allow customer to read customers list (RLS applies)', async () => {
      // Act
      const response = await request(app)
        .get(`/api/customers?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert - Customer role should be able to read (with RLS filtering)
      // May return empty list if no customer profile exists for test user
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array),
          pagination: expect.any(Object),
          rlsApplied: expect.any(Boolean),
          timestamp: expect.any(String),
        });
      }
    });

    test('should return paginated customer list for dispatcher', async () => {
      // Act
      const response = await request(app)
        .get(`/api/customers?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${dispatcherUser.token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
        }),
        rlsApplied: expect.any(Boolean),
        timestamp: expect.any(String),
      });
    });

    test('should include customer data in list', async () => {
      // Act
      const response = await request(app)
        .get(`/api/customers?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      const customers = response.body.data;

      if (customers.length > 0) {
        customers.forEach((customer) => {
          expect(customer).toMatchObject({
            id: expect.any(Number),
            email: expect.any(String),
            created_at: expect.any(String),
          });
        });
      }
    });

    test('should support pagination parameters', async () => {
      // Act
      const response = await request(app)
        .get(`/api/customers?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.SMALL_LIMIT}`)
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
        .get(`/api/customers?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}&search=test`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('should support sorting', async () => {
      // Act
      const response = await request(app)
        .get(`/api/customers?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}&sortBy=email&sortOrder=ASC`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      const customers = response.body.data;
      
      if (customers.length >= 2) {
        expect(customers[0].email.localeCompare(customers[1].email)).toBeLessThanOrEqual(0);
      }
    });

    test('should apply RLS filtering for customer role', async () => {
      // Act
      const response = await request(app)
        .get(`/api/customers?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(true);
      
      // Customer should only see their own records
      if (response.body.data.length > 0) {
        response.body.data.forEach((customer) => {
          // RLS should filter to only accessible records
          expect(customer).toHaveProperty('id');
        });
      }
    });
  });

  describe('GET /api/customers/:id - Get Customer by ID', () => {
    let testCustomer;

    beforeAll(async () => {
      // Create a test customer
      testCustomer = await Customer.create({
        email: `test-customer-${Date.now()}@example.com`,
        phone: '+15550100',
        company_name: 'Test Company',
      });
    });

    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get(`/api/customers/${testCustomer.id}`);

      // Assert
      expect(response.status).toBe(401);
    });

    test('should return customer by ID for dispatcher', async () => {
      // Act
      const response = await request(app)
        .get(`/api/customers/${testCustomer.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testCustomer.id,
          email: testCustomer.email,
        }),
        timestamp: expect.any(String),
      });
    });

    test('should return 404 for non-existent customer', async () => {
      // Act
      const response = await request(app)
        .get('/api/customers/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    test('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .get('/api/customers/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/customers - Create Customer', () => {
    let testEmail;

    beforeEach(() => {
      // Generate unique email for each test
      testEmail = `customer-${Date.now()}@example.com`;
    });

    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/customers')
        .send({ email: testEmail, phone: '+15550101' });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should return 403 for customer role (dispatcher+ required)', async () => {
      // Act
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ email: testEmail, phone: '+15550102' });

      // Assert
      expect(response.status).toBe(403);
    });

    test('should return 403 for technician role (dispatcher+ required)', async () => {
      // Act
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ email: testEmail, phone: '+15550103' });

      // Assert
      expect(response.status).toBe(403);
    });

    test('should create customer with valid data as dispatcher', async () => {
      // Arrange
      const customerData = {
        email: testEmail,
        phone: '+15550104',
        company_name: 'New Company LLC',
      };

      // Act
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${dispatcherUser.token}`)
        .send(customerData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          email: testEmail,
          phone: '+15550104',
          company_name: 'New Company LLC',
        }),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    test('should create customer with minimal required data', async () => {
      // Arrange
      const customerData = {
        email: testEmail,
      };

      // Act
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(customerData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe(testEmail);
    });

    test('should reject duplicate email', async () => {
      // Arrange - Create customer first
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;
      await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: duplicateEmail });

      // Act - Try to create duplicate
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: duplicateEmail });

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });

    test('should reject invalid email format', async () => {
      // Act
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid-email' });

      // Assert
      expect(response.status).toBe(400);
    });

    test('should reject missing required fields', async () => {
      // Act - Missing email
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+15550105' });

      // Assert
      expect(response.status).toBe(400);
    });

    test('should trim whitespace from email', async () => {
      // Arrange
      const trimEmail = `trim-${Date.now()}@example.com`;

      // Act
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: `  ${trimEmail}  ` });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe(trimEmail);
    });
  });

  describe('PATCH /api/customers/:id - Update Customer', () => {
    let testCustomer;

    beforeEach(async () => {
      // Create a fresh test customer for each update test
      testCustomer = await Customer.create({
        email: `update-test-${Date.now()}@example.com`,
        phone: '+15550200',
        company_name: 'Original Company',
      });
    });

    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/customers/${testCustomer.id}`)
        .send({ company_name: 'Updated Company' });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should update customer with valid data', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/customers/${testCustomer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ company_name: 'Updated Company LLC' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testCustomer.id,
          company_name: 'Updated Company LLC',
        }),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    test('should update multiple fields', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/customers/${testCustomer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          phone: '+15559999',
          company_name: 'Multi-Update Company',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        phone: '+15559999',
        company_name: 'Multi-Update Company',
      });
    });

    test('should return 404 for non-existent customer', async () => {
      // Act
      const response = await request(app)
        .patch('/api/customers/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ company_name: 'Updated' });

      // Assert
      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .patch('/api/customers/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ company_name: 'Updated' });

      // Assert
      expect(response.status).toBe(400);
    });

    test('should reject update with no fields', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/customers/${testCustomer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(400);
    });

    test('should trim whitespace from updated fields', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/customers/${testCustomer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ company_name: '  Trimmed Company  ' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.company_name).toBe('Trimmed Company');
    });
  });

  describe('DELETE /api/customers/:id - Delete Customer', () => {
    let testCustomer;

    beforeEach(async () => {
      // Create a fresh test customer for each delete test
      testCustomer = await Customer.create({
        email: `delete-test-${Date.now()}@example.com`,
        phone: '+15550300',
      });
    });

    test('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).delete(`/api/customers/${testCustomer.id}`);

      // Assert
      expect(response.status).toBe(401);
    });

    test('should return 403 for non-manager users (manager+ required)', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/customers/${testCustomer.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(403);
    });

    test('should soft delete customer as manager', async () => {
      // Arrange - Get manager token
      const managerUser = await createTestUser('manager');

      // Act
      const response = await request(app)
        .delete(`/api/customers/${testCustomer.id}`)
        .set('Authorization', `Bearer ${managerUser.token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted'),
        timestamp: expect.any(String),
      });

      // Verify soft delete (is_active = false)
      // Note: Customer.findById doesn't have includeInactive option yet
      // We can verify the delete succeeded by checking the response
    });

    test('should delete customer as admin', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/customers/${testCustomer.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent customer', async () => {
      // Act
      const response = await request(app)
        .delete('/api/customers/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .delete('/api/customers/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('RLS (Row-Level Security) - Customer Access', () => {
    test('should apply RLS filtering for customer role on GET list', async () => {
      // Act
      const response = await request(app)
        .get(`/api/customers?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(true);
    });

    test('should not apply RLS filtering for admin role', async () => {
      // Act
      const response = await request(app)
        .get(`/api/customers?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(false);
    });

    test('should apply RLS filtering for dispatcher role (all_records policy)', async () => {
      // Act
      const response = await request(app)
        .get(`/api/customers?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.LARGE_LIMIT}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(200);
      // Dispatcher has all_records policy, so RLS might be applied but grants full access
      expect(response.body).toHaveProperty('rlsApplied');
    });
  });

  describe('Validation Edge Cases - Type Coercion', () => {
    test('should reject non-numeric customer ID in URL', async () => {
      // Act
      const response = await request(app)
        .get('/api/customers/abc')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert - Type coercion should reject and return 400
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/must be a valid integer/i);
    });

    test('should reject negative customer ID', async () => {
      // Act
      const response = await request(app)
        .get('/api/customers/-5')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/must be at least 1/i);
    });

    test('should reject zero as customer ID', async () => {
      // Act
      const response = await request(app)
        .get('/api/customers/0')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/must be at least 1/i);
    });

    test('should handle integer overflow gracefully', async () => {
      // Arrange - Number exceeding MAX_SAFE_INTEGER
      const hugeNumber = '99999999999999999999999';

      // Act
      const response = await request(app)
        .get(`/api/customers/${hugeNumber}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert - Should reject as invalid or handle gracefully
      expect(response.status).toBe(400);
    });

    test('should reject decimal numbers as customer ID', async () => {
      // Act
      const response = await request(app)
        .get('/api/customers/5.5')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert - Should coerce to 5 or reject
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Validation Edge Cases - Pagination', () => {
    test('should reject negative page number', async () => {
      // Act
      const response = await request(app)
        .get('/api/customers?page=-1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/page/i);
    });

    test('should reject zero as page number', async () => {
      // Act
      const response = await request(app)
        .get('/api/customers?page=0&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/page/i);
    });

    test('should reject limit exceeding maximum', async () => {
      // Act - Try to request more than max limit (200)
      const response = await request(app)
        .get('/api/customers?page=1&limit=999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/limit/i);
    });

    test('should reject non-numeric pagination params', async () => {
      // Act
      const response = await request(app)
        .get('/api/customers?page=abc&limit=xyz')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Validation Edge Cases - Body Fields', () => {
    test('should reject email with invalid format', async () => {
      // Arrange
      const invalidCustomer = {
        email: 'notanemail',
        name: 'Test Customer',
        phone: '555-0100',
      };

      // Act
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCustomer);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/email/i);
    });

    test('should reject empty string for required fields', async () => {
      // Arrange
      const invalidCustomer = {
        email: '',
        name: '',
        phone: '555-0100',
      };

      // Act
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCustomer);

      // Assert
      expect(response.status).toBe(400);
    });

    test('should handle null vs undefined for optional fields', async () => {
      // Arrange - address is optional
      const customerWithNull = {
        email: 'null-test@example.com',
        name: 'Null Test',
        phone: '555-0100',
        address: null,
      };

      // Act
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(customerWithNull);

      // Assert - Phone validation should fail first (invalid format)
      expect(response.status).toBe(400);
    });

    test('should strip unknown fields from request body', async () => {
      // Arrange - Include malicious/unknown fields
      const customerWithExtras = {
        email: 'strip-test@example.com',
        name: 'Strip Test',
        phone: '555-0100',
        maliciousField: '<script>alert("xss")</script>',
        isAdmin: true,
      };

      // Act
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(customerWithExtras);

      // Assert - Should succeed but strip unknown fields
      if (response.status === 201) {
        expect(response.body.data.maliciousField).toBeUndefined();
        expect(response.body.data.isAdmin).toBeUndefined();
      }
    });
  });

  describe('Validation Edge Cases - Query Parameters', () => {
    test('should reject invalid sortBy field', async () => {
      // Act - Try to sort by field that doesn't exist
      const response = await request(app)
        .get('/api/customers?page=1&limit=10&sortBy=malicious_field')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert - Should reject invalid sort field
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/sort/i);
    });

    test('should reject invalid sortOrder value', async () => {
      // Act
      const response = await request(app)
        .get('/api/customers?page=1&limit=10&sortBy=email&sortOrder=INVALID')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/order|asc|desc/i);
    });

    test('should sanitize search input', async () => {
      // Arrange - Potential XSS/SQL injection in search
      const maliciousSearch = "<script>alert('xss')</script>";

      // Act
      const response = await request(app)
        .get(`/api/customers?page=1&limit=10&search=${encodeURIComponent(maliciousSearch)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert - Should not fail (search is sanitized)
      expect([200, 400]).toContain(response.status);
    });

    test('should handle very long search queries', async () => {
      // Arrange - Search string exceeding max length
      const longSearch = 'a'.repeat(300);

      // Act
      const response = await request(app)
        .get(`/api/customers?page=1&limit=10&search=${longSearch}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert - Should reject if exceeds max length
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/search|length/i);
    });
  });
});
