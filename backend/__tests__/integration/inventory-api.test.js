/**
 * Inventory CRUD API - Integration Tests
 *
 * Tests inventory management endpoints with real server and database
 * Covers full CRUD lifecycle with permissions, RLS, and validation
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const Inventory = require('../../db/models/Inventory');

describe('Inventory CRUD API - Integration Tests', () => {
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
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/inventory - List Inventory', () => {
    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get('/api/inventory');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 for customer role (technician+ required)', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory?page=1&limit=10')
        .set('Authorization', `Bearer ${customerToken}`);

      // Assert - Customers don't have read permission
      expect(response.status).toBe(403);
    });

    it('should allow technician to read inventory list', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory?page=1&limit=10')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert - Technicians have read permission
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
        pagination: expect.any(Object),
        appliedFilters: expect.any(Object),
        rlsApplied: expect.any(Boolean),
        timestamp: expect.any(String),
      });
    });

    it('should return paginated inventory list for dispatcher', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory?page=1&limit=10')
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

    it('should include inventory data in list', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      const items = response.body.data;

      if (items.length > 0) {
        items.forEach((item) => {
          expect(item).toMatchObject({
            id: expect.any(Number),
            name: expect.any(String),
            created_at: expect.any(String),
          });
        });
      }
    });

    it('should support pagination parameters', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5,
      });
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should support search parameter', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory?page=1&limit=10&search=test')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should support sorting', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory?page=1&limit=10&sortBy=name&sortOrder=ASC')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/inventory/:id - Get Inventory Item by ID', () => {
    let testItem;

    beforeAll(async () => {
      // Create a test inventory item
      testItem = await Inventory.create({
        name: `Test Part ${Date.now()}`,
        sku: `SKU-${Date.now()}`,
        quantity: 100,
        unit_cost: 25.99,
        reorder_level: 20,
      });
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).get(`/api/inventory/${testItem.id}`);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return inventory item by ID for technician', async () => {
      // Act
      const response = await request(app)
        .get(`/api/inventory/${testItem.id}`)
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testItem.id,
          name: testItem.name,
          sku: testItem.sku,
        }),
        timestamp: expect.any(String),
      });
    });

    it('should return 404 for non-existent item', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    it('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/inventory - Create Inventory Item', () => {
    let testSku;

    beforeEach(() => {
      // Generate unique SKU for each test
      testSku = `SKU-${Date.now()}`;
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/inventory')
        .send({
          name: 'Test Part',
          sku: testSku,
          quantity: 50,
        });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 for customer role (dispatcher+ required)', async () => {
      // Act
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test Part',
          sku: testSku,
          quantity: 50,
        });

      // Assert
      expect(response.status).toBe(403);
    });

    it('should return 403 for technician role (dispatcher+ required)', async () => {
      // Act
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({
          name: 'Test Part',
          sku: testSku,
          quantity: 50,
        });

      // Assert
      expect(response.status).toBe(403);
    });

    it('should create inventory item with valid data as dispatcher', async () => {
      // Arrange
      const itemData = {
        name: 'HVAC Filter Premium',
        sku: testSku,
        quantity: 150,
        unit_cost: 45.99,
        reorder_level: 30,
      };

      // Act
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send(itemData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          name: itemData.name,
          sku: testSku,
          quantity: expect.any(Number),
        }),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should create inventory item with minimal required data', async () => {
      // Arrange
      const itemData = {
        name: 'Basic Part',
        sku: testSku,
      };

      // Act
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(itemData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe(itemData.name);
      expect(response.body.data.sku).toBe(testSku);
    });

    it('should reject duplicate SKU', async () => {
      // Arrange - Create item first
      const duplicateSku = `DUP-${Date.now()}`;
      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Original Item',
          sku: duplicateSku,
        });

      // Act - Try to create duplicate
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Item',
          sku: duplicateSku,
        });

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject missing required fields', async () => {
      // Act - Missing name
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: testSku,
        });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/inventory/:id - Update Inventory Item', () => {
    let testItem;

    beforeEach(async () => {
      // Create a fresh test item for each update test
      testItem = await Inventory.create({
        name: `Update Test ${Date.now()}`,
        sku: `UPD-${Date.now()}`,
        quantity: 75,
        unit_cost: 19.99,
      });
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/inventory/${testItem.id}`)
        .send({ quantity: 50 });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should update inventory item as technician', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/inventory/${testItem.id}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ quantity: 25, unit_cost: 22.99 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testItem.id,
          quantity: expect.any(Number),
        }),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should update multiple fields', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/inventory/${testItem.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity: 200,
          unit_cost: 35.00,
          reorder_level: 50,
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        quantity: expect.any(Number),
        unit_cost: expect.any(String), // Decimal returned as string
      });
    });

    it('should return 404 for non-existent item', async () => {
      // Act
      const response = await request(app)
        .patch('/api/inventory/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 100 });

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .patch('/api/inventory/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 100 });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject update with no fields', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/inventory/${testItem.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/inventory/:id - Delete Inventory Item', () => {
    let testItem;

    beforeEach(async () => {
      // Create a fresh test item for each delete test
      testItem = await Inventory.create({
        name: `Delete Test ${Date.now()}`,
        sku: `DEL-${Date.now()}`,
        quantity: 10,
      });
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app).delete(`/api/inventory/${testItem.id}`);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 for technician role (manager+ required)', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/inventory/${testItem.id}`)
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(403);
    });

    it('should return 403 for dispatcher role (manager+ required)', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/inventory/${testItem.id}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert
      expect(response.status).toBe(403);
    });

    it('should soft delete inventory item as manager', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/inventory/${testItem.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted'),
        timestamp: expect.any(String),
      });
    });

    it('should delete inventory item as admin', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/inventory/${testItem.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent item', async () => {
      // Act
      const response = await request(app)
        .delete('/api/inventory/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      // Act
      const response = await request(app)
        .delete('/api/inventory/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('RLS (Row-Level Security) - Inventory Access', () => {
    it('should not apply RLS filtering (public_resource)', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory?page=1&limit=100')
        .set('Authorization', `Bearer ${technicianToken}`);

      // Assert
      expect(response.status).toBe(200);
      // public_resource means all authenticated users with permission see all records
      expect(response.body.rlsApplied).toBe(false);
    });

    it('should not apply RLS filtering for manager role', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory?page=1&limit=100')
        .set('Authorization', `Bearer ${managerToken}`);

      // Assert - Manager has public_resource policy (applied=false)
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(false);
    });

    it('should not apply RLS filtering for dispatcher role', async () => {
      // Act
      const response = await request(app)
        .get('/api/inventory?page=1&limit=100')
        .set('Authorization', `Bearer ${dispatcherToken}`);

      // Assert - Dispatcher has public_resource policy (applied=false)
      expect(response.status).toBe(200);
      expect(response.body.rlsApplied).toBe(false);
    });
  });
});
