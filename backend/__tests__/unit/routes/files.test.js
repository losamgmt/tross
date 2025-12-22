/**
 * Files Routes - Unit Tests
 *
 * Tests file attachment endpoints:
 * - POST   /api/files/:entityType/:entityId - Upload file
 * - GET    /api/files/:entityType/:entityId - List files
 * - GET    /api/files/:id/download          - Download URL
 * - DELETE /api/files/:id                   - Soft delete
 *
 * MOCKING STRATEGY:
 * - storage-service: Mock S3 operations
 * - db/connection: Mock database queries
 * - middleware/auth: Mock authentication
 * - validators: Mock param validation
 */

const request = require('supertest');
const express = require('express');

// =============================================================================
// MOCK FUNCTIONS - Define before jest.mock calls
// =============================================================================

const mockDbQuery = jest.fn();
const mockStorageUpload = jest.fn();
const mockStorageDelete = jest.fn();
const mockStorageGetSignedUrl = jest.fn();
const mockStorageIsConfigured = jest.fn();

// =============================================================================
// MOCKS
// =============================================================================

jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../db/connection', () => ({
  query: mockDbQuery,
}));

jest.mock('../../../services/storage-service', () => ({
  storageService: {
    isConfigured: mockStorageIsConfigured,
    generateStorageKey: jest.fn((entityType, entityId, filename) => 
      `${entityType}/${entityId}/test-uuid.${filename.split('.').pop()}`
    ),
    upload: mockStorageUpload,
    delete: mockStorageDelete,
    getSignedDownloadUrl: mockStorageGetSignedUrl,
  },
}));

jest.mock('../../../middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    // Default: authenticated with permissions
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    req.permissions = {
      hasPermission: jest.fn(() => true),
    };
    next();
  }),
}));

jest.mock('../../../validators', () => ({
  validateIdParam: jest.fn(() => (req, res, next) => next()),
}));

// =============================================================================
// TEST SETUP
// =============================================================================

const filesRouter = require('../../../routes/files');
const { authenticateToken } = require('../../../middleware/auth');

describe('Files Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: '*/*', limit: '10mb' }));
    app.use('/api/files', filesRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageIsConfigured.mockReturnValue(true);
  });

  // ===========================================================================
  // POST /api/files/:entityType/:entityId - Upload file
  // ===========================================================================
  describe('POST /api/files/:entityType/:entityId', () => {
    const validUploadHeaders = {
      'Content-Type': 'image/jpeg',
      'X-Filename': 'test-photo.jpg',
    };

    test('uploads file successfully', async () => {
      // Mock entity exists
      mockDbQuery
        .mockResolvedValueOnce({ rows: [{ table_exists: true }] }) // table check
        .mockResolvedValueOnce({ rows: [{ id: 123 }] }) // entity exists
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // insert file record

      mockStorageUpload.mockResolvedValueOnce({
        success: true,
        storageKey: 'work_order/123/test-uuid.jpg',
        size: 100,
      });

      const response = await request(app)
        .post('/api/files/work_order/123')
        .set(validUploadHeaders)
        .send(Buffer.from('fake image data'));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    test('returns 403 without permission', async () => {
      // Override auth mock for this test
      authenticateToken.mockImplementationOnce((req, res, next) => {
        req.user = { id: 'test-user' };
        req.permissions = {
          hasPermission: jest.fn(() => false), // No permission
        };
        next();
      });

      const response = await request(app)
        .post('/api/files/work_order/123')
        .set(validUploadHeaders)
        .send(Buffer.from('data'));

      expect(response.status).toBe(403);
    });

    test('returns 503 when storage not configured', async () => {
      // Must set storage unconfigured BEFORE permission check allows through
      mockStorageIsConfigured.mockReturnValue(false);
      
      // Override auth to reset its mock too
      authenticateToken.mockImplementationOnce((req, res, next) => {
        req.user = { id: 'test-user' };
        req.permissions = {
          hasPermission: jest.fn(() => true),
        };
        next();
      });

      const response = await request(app)
        .post('/api/files/work_order/123')
        .set(validUploadHeaders)
        .send(Buffer.from('data'));

      expect(response.status).toBe(503);
      expect(response.body.message).toContain('not configured');
    });

    test('returns 404 when entity does not exist', async () => {
      mockDbQuery
        .mockResolvedValueOnce({ rows: [{ table_exists: true }] })
        .mockResolvedValueOnce({ rows: [] }); // Entity not found

      const response = await request(app)
        .post('/api/files/work_order/999')
        .set(validUploadHeaders)
        .send(Buffer.from('data'));

      expect(response.status).toBe(404);
    });

    test('returns 400 for invalid mime type', async () => {
      mockDbQuery
        .mockResolvedValueOnce({ rows: [{ table_exists: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 123 }] });

      const response = await request(app)
        .post('/api/files/work_order/123')
        .set({
          'Content-Type': 'application/x-executable',
          'X-Filename': 'virus.exe',
        })
        .send(Buffer.from('data'));

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not allowed');
    });

    test('returns 400 when file is empty', async () => {
      mockDbQuery
        .mockResolvedValueOnce({ rows: [{ table_exists: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 123 }] });

      const response = await request(app)
        .post('/api/files/work_order/123')
        .set(validUploadHeaders)
        .send(Buffer.from('')); // Empty file

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No file data');
    });
  });

  // ===========================================================================
  // GET /api/files/:entityType/:entityId - List files
  // ===========================================================================
  describe('GET /api/files/:entityType/:entityId', () => {
    test('returns list of files for entity', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            entity_type: 'work_order',
            entity_id: 123,
            original_filename: 'photo1.jpg',
            mime_type: 'image/jpeg',
            file_size: 1000,
            category: 'photo',
            description: null,
            uploaded_by: 'user-123',
            created_at: new Date(),
          },
          {
            id: 2,
            entity_type: 'work_order',
            entity_id: 123,
            original_filename: 'photo2.jpg',
            mime_type: 'image/jpeg',
            file_size: 2000,
            category: 'photo',
            description: 'Another photo',
            uploaded_by: 'user-456',
            created_at: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/files/work_order/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('original_filename', 'photo1.jpg');
    });

    test('returns 403 without read permission', async () => {
      authenticateToken.mockImplementationOnce((req, res, next) => {
        req.user = { id: 'test-user' };
        req.permissions = {
          hasPermission: jest.fn(() => false),
        };
        next();
      });

      const response = await request(app)
        .get('/api/files/work_order/123');

      expect(response.status).toBe(403);
    });

    test('returns empty array when no files exist', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/files/customer/456');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  // ===========================================================================
  // GET /api/files/:id/download - Get download URL
  // ===========================================================================
  describe('GET /api/files/:id/download', () => {
    test('returns signed download URL', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          entity_type: 'work_order',
          entity_id: 123,
          storage_key: 'work_order/123/uuid.jpg',
          original_filename: 'photo.jpg',
          mime_type: 'image/jpeg',
          is_active: true,
        }],
      });

      mockStorageGetSignedUrl.mockResolvedValueOnce('https://signed-url.example.com/file?token=xyz');

      const response = await request(app)
        .get('/api/files/1/download');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('download_url');
      expect(response.body.data.download_url).toBe('https://signed-url.example.com/file?token=xyz');
    });

    test('returns 404 when file not found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/files/999/download');

      expect(response.status).toBe(404);
    });

    test('returns 403 without read permission on entity', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          entity_type: 'work_order',
          entity_id: 123,
          storage_key: 'work_order/123/uuid.jpg',
          is_active: true,
        }],
      });

      authenticateToken.mockImplementationOnce((req, res, next) => {
        req.user = { id: 'test-user' };
        req.permissions = {
          hasPermission: jest.fn(() => false),
        };
        next();
      });

      const response = await request(app)
        .get('/api/files/1/download');

      expect(response.status).toBe(403);
    });

    test('returns 503 when storage not configured', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          entity_type: 'work_order',
          entity_id: 123,
          storage_key: 'work_order/123/uuid.jpg',
          is_active: true,
        }],
      });

      mockStorageIsConfigured.mockReturnValue(false);

      const response = await request(app)
        .get('/api/files/1/download');

      expect(response.status).toBe(503);
    });
  });

  // ===========================================================================
  // DELETE /api/files/:id - Soft delete file
  // ===========================================================================
  describe('DELETE /api/files/:id', () => {
    test('soft deletes file successfully', async () => {
      mockDbQuery
        .mockResolvedValueOnce({ // get file
          rows: [{
            id: 1,
            entity_type: 'work_order',
            entity_id: 123,
            storage_key: 'work_order/123/uuid.jpg',
            is_active: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // update to inactive

      const response = await request(app)
        .delete('/api/files/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('returns 404 when file not found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/files/999');

      expect(response.status).toBe(404);
    });

    test('returns 403 without update permission', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          entity_type: 'work_order',
          entity_id: 123,
          storage_key: 'work_order/123/uuid.jpg',
          is_active: true,
        }],
      });

      authenticateToken.mockImplementationOnce((req, res, next) => {
        req.user = { id: 'test-user' };
        req.permissions = {
          hasPermission: jest.fn(() => false),
        };
        next();
      });

      const response = await request(app)
        .delete('/api/files/1');

      expect(response.status).toBe(403);
    });
  });

  // ===========================================================================
  // Helper Function Tests (via route behavior)
  // ===========================================================================
  describe('Helper function behavior', () => {
    test('toRlsResource handles singular entity types', async () => {
      // Test via route - work_order (singular) should check work_orders permission
      authenticateToken.mockImplementationOnce((req, res, next) => {
        req.user = { id: 'test-user' };
        req.permissions = {
          hasPermission: jest.fn((resource, op) => {
            // Verify pluralization
            expect(resource).toBe('work_orders');
            return true;
          }),
        };
        next();
      });

      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/files/work_order/123');
    });

    test('toRlsResource handles plural entity types', async () => {
      authenticateToken.mockImplementationOnce((req, res, next) => {
        req.user = { id: 'test-user' };
        req.permissions = {
          hasPermission: jest.fn((resource, op) => {
            // Already plural - should stay as-is
            expect(resource).toBe('customers');
            return true;
          }),
        };
        next();
      });

      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/files/customers/456');
    });
  });
});
