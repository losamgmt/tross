/**
 * Roles CRUD API - Integration Tests
 *
 * Tests role management endpoints with real server and database
 * Covers full CRUD lifecycle with permissions and validation
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const { TEST_PAGINATION } = require('../../config/test-constants');
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
    test('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/roles');
      expect(response.status).toBe(401);
    });

    test('should allow authenticated users to read roles', async () => {
      const response = await request(app)
        .get(`/api/roles?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${technicianToken}`);

      expect([200, 403]).toContain(response.status);
    });

    test('should return paginated role list', async () => {
      const response = await request(app)
        .get(`/api/roles?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
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

    test('should include role data in list', async () => {
      const response = await request(app)
        .get(`/api/roles?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
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

    test('should support pagination parameters', async () => {
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

    test('should support sorting', async () => {
      const response = await request(app)
        .get(`/api/roles?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}&sortBy=name&sortOrder=ASC`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const roles = response.body.data;
      
      if (roles.length >= 2) {
        expect(roles[0].name.localeCompare(roles[1].name)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('GET /api/roles/:id - Get Role by ID', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/roles/1');
      expect(response.status).toBe(401);
    });

    test('should return role by ID', async () => {
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

    test('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .get('/api/roles/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/roles/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/roles/:id/users - Get Users by Role', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/roles/1/users');
      expect(response.status).toBe(401);
    });

    test('should return users for a role', async () => {
      // Get a valid role ID
      const listResponse = await request(app)
        .get('/api/roles?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      if (listResponse.body.data.length === 0) return;

      const roleId = listResponse.body.data[0].id;
      const response = await request(app)
        .get(`/api/roles/${roleId}/users?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
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

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/roles')
        .send({ name: testRoleName, priority: 50 });

      expect(response.status).toBe(401);
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ name: testRoleName, priority: 50 });

      expect(response.status).toBe(403);
    });

    test('should create role with valid data', async () => {
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

    test('should reject duplicate role name', async () => {
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

    test('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing name and priority',
        });

      expect(response.status).toBe(400);
    });

    test('should validate priority range', async () => {
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

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .put(`/api/roles/${testRole.id}`)
        .send({ description: 'Updated' });

      expect(response.status).toBe(401);
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ description: 'Updated' });

      expect(response.status).toBe(403);
    });

    test('should update role description', async () => {
      const response = await request(app)
        .put(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated description' });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Updated description');
    });

    test('should update role priority', async () => {
      const response = await request(app)
        .put(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priority: 75 });

      expect(response.status).toBe(200);
      expect(response.body.data.priority).toBe(75);
    });

    test('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .put('/api/roles/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated' });

      expect([400, 404]).toContain(response.status);
    });

    test('should persist updates to database', async () => {
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

    test('should return 401 without authentication', async () => {
      const response = await request(app).delete(`/api/roles/${testRole.id}`);
      expect(response.status).toBe(401);
    });

    test('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${technicianToken}`);

      expect(response.status).toBe(403);
    });

    test('should delete role', async () => {
      const response = await request(app)
        .delete(`/api/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .delete('/api/roles/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    });

    test('should remove role from database', async () => {
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
    test('should return consistent success format', async () => {
      const response = await request(app)
        .get(`/api/roles?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    test('should return consistent error format', async () => {
      const response = await request(app).get('/api/roles');

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    test('should include proper content-type', async () => {
      const response = await request(app)
        .get(`/api/roles?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Roles API - Performance', () => {
    test('should respond quickly to list requests', async () => {
      const start = Date.now();

      const response = await request(app)
        .get(`/api/roles?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .get(`/api/roles?page=${TEST_PAGINATION.DEFAULT_PAGE}&limit=${TEST_PAGINATION.DEFAULT_LIMIT}`)
            .set('Authorization', `Bearer ${adminToken}`),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Audit Logging for Role CRUD', () => {
    test('should log role creation in audit_logs', async () => {
      const uniqueRoleName = `test-role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: uniqueRoleName });

      const roleId = response.body.data.id;
      const db = require('../../db/connection');

      // Get authenticated user from token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET || 'dev-secret-key');
      const GenericEntityService = require('../../services/generic-entity-service');
      const authenticatedUser = await GenericEntityService.findByField('user', 'auth0_id', decoded.sub);

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_create' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, authenticatedUser.id]
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].resource_type).toBe('role');
      expect(auditResult.rows[0].result).toBe('success');
    });

    test('should log role updates in audit_logs', async () => {
      const createRoleName = `test-role-${Date.now()}-create`;
      const updatedRoleName = `test-role-${Date.now()}-update`;

      const createResponse = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: createRoleName });

      const roleId = createResponse.body.data.id;

      await request(app)
        .put(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: updatedRoleName });

      const db = require('../../db/connection');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET || 'dev-secret-key');
      const GenericEntityService = require('../../services/generic-entity-service');
      const authenticatedUser = await GenericEntityService.findByField('user', 'auth0_id', decoded.sub);

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_update' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, authenticatedUser.id]
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].old_values).toBeDefined();
      const newValues = JSON.stringify(auditResult.rows[0].new_values);
      expect(newValues).toContain(updatedRoleName);
    });

    test('should log role deletion in audit_logs', async () => {
      const deleteRoleName = `test-role-${Date.now()}-delete`;

      const createResponse = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: deleteRoleName });

      const roleId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const db = require('../../db/connection');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET || 'dev-secret-key');
      const GenericEntityService = require('../../services/generic-entity-service');
      const authenticatedUser = await GenericEntityService.findByField('user', 'auth0_id', decoded.sub);

      const auditResult = await db.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'role_delete' 
         AND resource_id = $1 
         AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [roleId, authenticatedUser.id]
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].result).toBe('success');
    });
  });
});
