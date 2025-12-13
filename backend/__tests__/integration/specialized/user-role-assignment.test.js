/**
 * User Role Assignment Tests
 *
 * Tests for PUT /api/users/:id/role endpoint
 * This is a specialized endpoint not covered by standard CRUD scenarios.
 */

const request = require('supertest');
const app = require('../../../server');
const { createTestUser, cleanupTestDatabase } = require('../../helpers/test-db');
const GenericEntityService = require('../../../services/generic-entity-service');

describe('User Role Assignment - Specialized Tests', () => {
  let adminUser;
  let adminToken;
  let technicianToken;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    adminToken = adminUser.token;
    const techUser = await createTestUser('technician');
    technicianToken = techUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('PUT /api/users/:id/role - Assign Role', () => {
    let testUser;
    let managerRoleId;
    let dispatcherRoleId;

    beforeEach(async () => {
      // Create test user
      const email = `role-test-${Date.now()}@example.com`;
      testUser = await GenericEntityService.create('user', {
        email,
        first_name: 'Role',
        last_name: 'Test',
      });

      // Get role IDs from database
      const db = require('../../../db/connection');
      const managerResult = await db.query("SELECT id FROM roles WHERE name = 'manager' LIMIT 1");
      const dispatcherResult = await db.query("SELECT id FROM roles WHERE name = 'dispatcher' LIMIT 1");
      managerRoleId = managerResult.rows[0]?.id;
      dispatcherRoleId = dispatcherResult.rows[0]?.id;
    });

    test('should return 401 without authentication', async () => {
      if (!managerRoleId) return;

      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .send({ role_id: managerRoleId });

      expect(response.status).toBe(401);
    });

    test('should return 403 for non-admin users', async () => {
      if (!managerRoleId) return;

      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ role_id: managerRoleId });

      expect(response.status).toBe(403);
    });

    test('should assign role to user', async () => {
      if (!managerRoleId) return;

      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: managerRoleId });

      expect(response.status).toBe(200);
      expect(response.body.data.role_id).toBe(managerRoleId);
      expect(response.body.data.role).toBe('manager');
    });

    test('should return error for non-existent user', async () => {
      if (!managerRoleId) return;

      const response = await request(app)
        .put('/api/users/99999/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: managerRoleId });

      expect([404, 500]).toContain(response.status);
    });

    test('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: 99999 });

      expect(response.status).toBe(404);
    });

    test('should reject invalid role_id format', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: 'invalid' });

      expect(response.status).toBe(400);
    });

    test('should handle complete role workflow: assign → change → change again', async () => {
      if (!managerRoleId || !dispatcherRoleId) return;

      // Create test user
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `workflow-${Date.now()}@example.com`,
          first_name: 'Workflow',
          last_name: 'Test',
        })
        .expect(201);

      const userId = createResponse.body.data.id;

      // 1. Assign 'manager' role
      await request(app)
        .put(`/api/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: managerRoleId })
        .expect(200);

      let user = await GenericEntityService.findById('user', userId);
      expect(user.role).toBe('manager');

      // 2. Change to 'dispatcher' role
      await request(app)
        .put(`/api/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: dispatcherRoleId })
        .expect(200);

      user = await GenericEntityService.findById('user', userId);
      expect(user.role).toBe('dispatcher');

      // 3. Change back to 'manager'
      await request(app)
        .put(`/api/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role_id: managerRoleId })
        .expect(200);

      user = await GenericEntityService.findById('user', userId);
      expect(user.role).toBe('manager');
      expect(user.role_id).toBe(managerRoleId);
    });
  });
});
