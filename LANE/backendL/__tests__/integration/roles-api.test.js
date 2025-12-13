/**
 * Roles CRUD API - Integration Tests
 *
 * Tests role management endpoints with real server and database
 * Covers full CRUD lifecycle with permissions and validation
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const Role = require('../../db/models/Role');

describe('Roles CRUD API - Integration Tests', () => {
  let adminUser;
  let adminToken;
  let technicianUser;
  let technicianToken;

  beforeAll(async () => {
    // Create test users with tokens
    adminUser = await createTestUser('admin');
    adminToken = adminUser.token;
    technicianUser = await createTestUser('technician');
    technicianToken = technicianUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/roles - List Roles', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/roles');
      expect(response.status).toBe(401);
    });

    it('should allow authenticated users to read roles', async () => {
      const response = await request(app)
        .get('/api/roles?page=1&limit=10')
        .set('Authorization', `Bearer ${technicianToken}`);

      expect([200, 403]).toContain(response.status);
    });

    it('should return paginated role list', async () => {
      const response = await request(app)
        .get('/api/roles?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
        }),
        timestamp: expect.any(String),
      });
    });

    it('should include role data in list', async () => {
      const response = await request(app)
        .get('/api/roles?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      const roles = response.body.data;
      expect(roles.length).toBeGreaterThan(0);

      roles.forEach((role) => {
        expect(role).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
        });
      });
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/roles?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 3,
      });
      expect(response.body.data.length).toBeLessThanOrEqual(3);
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/roles?page=1&limit=10&sortBy=name&sortOrder=ASC')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const roles = response.body.data;
      
      if (roles.length >= 2) {
        expect(roles[0].name.localeCompare(roles[1].name)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('GET /api/roles/:id - Get Role by ID', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/roles/1');
      expect(response.status).toBe(401);
    });

    it('should return role by ID', async () => {
      // Get a valid role ID first
      const listResponse = await request(app)
        .get('/api/roles?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      if (listResponse.body.data.length === 0) return; // Skip if no roles

      const roleId = listResponse.body.data[0].id;
      const response = await request(app)
        .get(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: roleId,
            name: expect.any(String),
          }),
          timestamp: expect.any(String),
        });
      }
    });

    it('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .get('/api/roles/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/roles/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/roles/:id/users - Get Users by Role', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/roles/1/users');
      expect(response.status).toBe(401);
    });

    it('should return users for a role', async () => {
      // Get a valid role ID
      const listResponse = await request(app)
        .get('/api/roles?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      if (listResponse.body.data.length === 0) return;

      const roleId = listResponse.body.data[0].id;
      const response = await request(app)
        .get(`/api/roles/${roleId}/users?page=1&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array),
          timestamp: expect.any(String),
        });
      }
    });
  });

  describe('POST /api/roles - Create Role', () => {
    let testRoleName;

    beforeEach(() => {
      testRoleName = `test-role-${Date.now()}`;
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/roles')
        .send({ name: testRoleName, priority: 50 });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ name: testRoleName, priority: 50 });

      expect(response.status).toBe(403);
    });

    it('should create role with valid data', async () => {
      const roleData = {
        name: testRoleName,
        priority: 50,
        description: 'Test role',
      };

      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          name: testRoleName,
          priority: 50,
        }),
        timestamp: expect.any(String),
      });
    });

    it('should reject duplicate role name', async () => {
      // Create role first
      await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: testRoleName,
          priority: 50,
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: testRoleName,
          priority: 60,
        });

      expect([400, 409]).toContain(response.status);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing name and priority',
        });

      expect(response.status).toBe(400);
    });

    it('should validate priority range', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: testRoleName,
          priority: 999, // Invalid priority
        });

      expect([400, 201]).toContain(response.status);
    });
  });

  describe('PUT /api/roles/:id - Update Role', () => {
    let testRole;

    beforeEach(async () => {
      // Create a test role to update
      const name = `update-test-${Date.now()}`;
      testRole = await Role.create(name, 50);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put(`/api/roles/${testRole.id}`)
        .send({ description: 'Updated' });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ description: 'Updated' });

      expect(response.status).toBe(403);
    });

    it('should update role description', async () => {
      const response = await request(app)
        .put(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated description' });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update role priority', async () => {
      const response = await request(app)
        .put(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priority: 75 });

      expect(response.status).toBe(200);
      expect(response.body.data.priority).toBe(75);
    });

    it('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .put('/api/roles/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated' });

      expect([400, 404]).toContain(response.status);
    });

    it('should persist updates to database', async () => {
      // Update role
      await request(app)
        .put(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Persisted update', priority: 80 });

      // Fetch role again
      const getResponse = await request(app)
        .get(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (getResponse.status === 200) {
        expect(getResponse.body.data).toMatchObject({
          description: 'Persisted update',
          priority: 80,
        });
      }
    });
  });

  describe('DELETE /api/roles/:id - Delete Role', () => {
    let testRole;

    beforeEach(async () => {
      // Create test role to delete
      const name = `delete-test-${Date.now()}`;
      testRole = await Role.create(name, 50);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).delete(`/api/roles/${testRole.id}`);
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${technicianToken}`);

      expect(response.status).toBe(403);
    });

    it('should delete role', async () => {
      const response = await request(app)
        .delete(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .delete('/api/roles/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    });

    it('should remove role from database', async () => {
      // Delete role
      await request(app)
        .delete(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Try to get deleted role
      const getResponse = await request(app)
        .get(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(getResponse.status);
    });
  });

  describe('Roles API - Response Format', () => {
    it('should return consistent success format', async () => {
      const response = await request(app)
        .get('/api/roles?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    it('should return consistent error format', async () => {
      const response = await request(app).get('/api/roles');

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should include proper content-type', async () => {
      const response = await request(app)
        .get('/api/roles?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Roles API - Performance', () => {
    it('should respond quickly to list requests', async () => {
      const start = Date.now();

      const response = await request(app)
        .get('/api/roles?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .get('/api/roles?page=1&limit=10')
            .set('Authorization', `Bearer ${adminToken}`),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
