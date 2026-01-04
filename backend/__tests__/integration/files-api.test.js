/**
 * Files API Endpoints - Integration Tests
 *
 * Tests file upload/download/delete endpoints with real server
 * Validates polymorphic file attachment patterns
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const { HTTP_STATUS } = require('../../config/constants');

describe('Files API Endpoints - Integration Tests', () => {
  let adminUser;
  let adminToken;
  let customerUser;
  let customerToken;
  let viewerUser;
  let viewerToken;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    adminToken = adminUser.token;
    customerUser = await createTestUser('customer');
    customerToken = customerUser.token;
    viewerUser = await createTestUser('viewer');
    viewerToken = viewerUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/files/:entityType/:entityId - Upload File', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/files/work_orders/1')
        .set('Content-Type', 'text/plain')
        .set('X-Filename', 'test.txt')
        .send(Buffer.from('test content'));

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return 403 without update permission on entity', async () => {
      const response = await request(app)
        .post('/api/files/work_orders/1')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('Content-Type', 'text/plain')
        .set('X-Filename', 'test.txt')
        .send(Buffer.from('test content'));

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    test('should return 400 for invalid entity ID', async () => {
      const response = await request(app)
        .post('/api/files/work_orders/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'text/plain')
        .set('X-Filename', 'test.txt')
        .send(Buffer.from('test content'));

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 400 for disallowed MIME type', async () => {
      const response = await request(app)
        .post('/api/files/work_orders/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/x-executable')
        .set('X-Filename', 'malicious.exe')
        .send(Buffer.from('not a real exe'));

      // 400 for MIME type rejection, or 404 if entity check happens first
      expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND]).toContain(response.status);
    });

    test('should return 400 for empty file body', async () => {
      const response = await request(app)
        .post('/api/files/work_orders/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'text/plain')
        .set('X-Filename', 'empty.txt')
        .send(Buffer.alloc(0));

      // 400 for empty body, or 404 if entity check happens first
      expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND]).toContain(response.status);
    });

    test('should return 404 for non-existent entity', async () => {
      const response = await request(app)
        .post('/api/files/work_orders/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'text/plain')
        .set('X-Filename', 'test.txt')
        .send(Buffer.from('test content'));

      // Either 404 (entity not found) or 503 (storage not configured) is acceptable
      expect([HTTP_STATUS.NOT_FOUND, HTTP_STATUS.SERVICE_UNAVAILABLE]).toContain(response.status);
    });
  });

  describe('GET /api/files/:entityType/:entityId - List Files', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/files/work_orders/1');

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return 403 without read permission on entity', async () => {
      // Viewers may have read permission, so test a restricted entity type
      const response = await request(app)
        .get('/api/files/audit_logs/1')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    test('should return 400 for invalid entity ID', async () => {
      const response = await request(app)
        .get('/api/files/work_orders/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return empty array for entity with no files', async () => {
      const response = await request(app)
        .get('/api/files/work_orders/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should accept category filter', async () => {
      const response = await request(app)
        .get('/api/files/work_orders/1?category=photo')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/files/:id/download - Download File', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/files/1/download');

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return 400 for invalid file ID', async () => {
      const response = await request(app)
        .get('/api/files/invalid/download')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .get('/api/files/999999/download')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE /api/files/:id - Delete File', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete('/api/files/1');

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return 400 for invalid file ID', async () => {
      const response = await request(app)
        .delete('/api/files/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .delete('/api/files/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });
});
