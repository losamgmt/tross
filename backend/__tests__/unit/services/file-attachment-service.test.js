/**
 * FileAttachmentService - Unit Tests
 *
 * Tests database operations for file attachments
 * Mocks database connections to test service logic in isolation
 */

const FileAttachmentService = require('../../../services/file-attachment-service');

// Mock database connection
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
}));

jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock entity metadata for entityExists() tests
jest.mock('../../../config/models', () => ({
  customer: { entityKey: 'customer', tableName: 'customers' },
  work_order: { entityKey: 'work_order', tableName: 'work_orders' },
  // unknown_entity deliberately not in mock to test "entity not found" path
}));

const { query: mockQuery } = require('../../../db/connection');
const { logger } = require('../../../config/logger');

describe('FileAttachmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('entityExists()', () => {
    test('should return true when entity exists', async () => {
      // Mock table exists check
      mockQuery.mockResolvedValueOnce({
        rows: [{ table_exists: true }],
      });
      // Mock entity check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      // Use entityKey, not tableName
      const result = await FileAttachmentService.entityExists('customer', 1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      // Verify it queried the correct table (tableName from metadata)
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('table_name = $1'),
        ['customers'],
      );
    });

    test('should return false when entity key not in metadata', async () => {
      const result = await FileAttachmentService.entityExists('nonexistent_entity', 1);

      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Unknown entity key: nonexistent_entity');
    });

    test('should return false when table does not exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ table_exists: false }],
      });

      const result = await FileAttachmentService.entityExists('customer', 1);

      expect(result).toBe(false);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    test('should return false when entity does not exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ table_exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await FileAttachmentService.entityExists('customer', 999999);

      expect(result).toBe(false);
    });

    test('should throw on database connection error (not swallow)', async () => {
      // Connection errors should be thrown, not swallowed
      mockQuery.mockRejectedValueOnce(Object.assign(new Error('DB connection failed'), { code: 'ECONNREFUSED' }));

      await expect(
        FileAttachmentService.entityExists('customer', 1),
      ).rejects.toThrow('Database unavailable');

      expect(logger.error).toHaveBeenCalledWith(
        'Database connection error checking entity existence',
        expect.objectContaining({
          entityKey: 'customer',
          entityId: 1,
        }),
      );
    });

    test('should return false and log warning on non-connection errors', async () => {
      // Non-connection errors (like table not found) should return false
      mockQuery.mockRejectedValueOnce(new Error('relation does not exist'));

      const result = await FileAttachmentService.entityExists('customer', 1);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'Error checking entity existence (non-fatal)',
        expect.objectContaining({
          entityKey: 'customer',
          entityId: 1,
        }),
      );
    });
  });

  describe('getActiveFile()', () => {
    test('should return file when found and active', async () => {
      const mockFile = {
        id: 1,
        entity_type: 'work_order',
        entity_id: 5,
        original_filename: 'test.pdf',
        is_active: true,
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockFile] });

      const result = await FileAttachmentService.getActiveFile(1);

      expect(result).toEqual(mockFile);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        [1],
      );
    });

    test('should return null when file not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await FileAttachmentService.getActiveFile(999999);

      expect(result).toBeNull();
    });

    test('should return null for inactive file', async () => {
      // The query filters for is_active = true, so inactive files are not returned
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await FileAttachmentService.getActiveFile(1);

      expect(result).toBeNull();
    });
  });

  describe('listFilesForEntity()', () => {
    test('should return files for entity', async () => {
      const mockFiles = [
        { id: 1, original_filename: 'file1.pdf' },
        { id: 2, original_filename: 'file2.jpg' },
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockFiles });

      const result = await FileAttachmentService.listFilesForEntity('work_orders', 5);

      expect(result).toEqual(mockFiles);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('entity_type = $1 AND entity_id = $2'),
        ['work_orders', 5],
      );
    });

    test('should return empty array when no files exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await FileAttachmentService.listFilesForEntity('work_orders', 5);

      expect(result).toEqual([]);
    });

    test('should filter by category when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await FileAttachmentService.listFilesForEntity('work_orders', 5, {
        category: 'photo',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('category = $3'),
        ['work_orders', 5, 'photo'],
      );
    });

    test('should not filter by category when not provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await FileAttachmentService.listFilesForEntity('work_orders', 5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.not.stringContaining('category = $3'),
        ['work_orders', 5],
      );
    });

    test('should order by created_at DESC', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await FileAttachmentService.listFilesForEntity('work_orders', 5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array),
      );
    });
  });

  describe('createAttachment()', () => {
    test('should create attachment and return it', async () => {
      const mockAttachment = {
        id: 1,
        entity_type: 'work_orders',
        entity_id: 5,
        original_filename: 'test.pdf',
        storage_key: 'work_orders/5/abc123/test.pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        category: 'attachment',
        description: null,
        uploaded_by: 10,
        created_at: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockAttachment] });

      const result = await FileAttachmentService.createAttachment({
        entityType: 'work_orders',
        entityId: 5,
        originalFilename: 'test.pdf',
        storageKey: 'work_orders/5/abc123/test.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        uploadedBy: 10,
      });

      expect(result).toEqual(mockAttachment);
      expect(logger.info).toHaveBeenCalledWith(
        'File attachment created',
        expect.objectContaining({
          id: 1,
          entityType: 'work_orders',
          entityId: 5,
        }),
      );
    });

    test('should use default category and description', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await FileAttachmentService.createAttachment({
        entityType: 'work_orders',
        entityId: 5,
        originalFilename: 'test.pdf',
        storageKey: 'key',
        mimeType: 'application/pdf',
        fileSize: 1024,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['attachment', null, null]),
      );
    });

    test('should use provided category and description', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await FileAttachmentService.createAttachment({
        entityType: 'work_orders',
        entityId: 5,
        originalFilename: 'photo.jpg',
        storageKey: 'key',
        mimeType: 'image/jpeg',
        fileSize: 2048,
        category: 'photo',
        description: 'Job site photo',
        uploadedBy: 10,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['photo', 'Job site photo', 10]),
      );
    });
  });

  describe('softDelete()', () => {
    test('should soft delete and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await FileAttachmentService.softDelete(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        [1],
      );
      expect(logger.info).toHaveBeenCalledWith(
        'File attachment soft-deleted',
        { id: 1 },
      );
    });

    test('should return false when file not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await FileAttachmentService.softDelete(999999);

      expect(result).toBe(false);
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('formatForResponse()', () => {
    test('should exclude storage_key from response', async () => {
      const row = {
        id: 1,
        entity_type: 'work_orders',
        entity_id: 5,
        original_filename: 'test.pdf',
        storage_key: 'sensitive/internal/path/test.pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        category: 'attachment',
        description: 'A test file',
        uploaded_by: 10,
        created_at: new Date('2024-01-15'),
        is_active: true,
        updated_at: new Date('2024-01-15'),
      };

      const result = FileAttachmentService.formatForResponse(row);

      expect(result).not.toHaveProperty('storage_key');
      expect(result).not.toHaveProperty('is_active');
      expect(result).not.toHaveProperty('updated_at');
    });

    test('should include all public fields', async () => {
      const row = {
        id: 1,
        entity_type: 'work_orders',
        entity_id: 5,
        original_filename: 'test.pdf',
        storage_key: 'internal/path',
        mime_type: 'application/pdf',
        file_size: 1024,
        category: 'attachment',
        description: 'A test file',
        uploaded_by: 10,
        created_at: new Date('2024-01-15'),
      };

      const result = FileAttachmentService.formatForResponse(row);

      expect(result).toEqual({
        id: 1,
        entity_type: 'work_orders',
        entity_id: 5,
        original_filename: 'test.pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        category: 'attachment',
        description: 'A test file',
        uploaded_by: 10,
        created_at: new Date('2024-01-15'),
      });
    });

    test('should handle null description', async () => {
      const row = {
        id: 1,
        entity_type: 'customers',
        entity_id: 3,
        original_filename: 'logo.png',
        storage_key: 'path',
        mime_type: 'image/png',
        file_size: 512,
        category: 'logo',
        description: null,
        uploaded_by: null,
        created_at: new Date(),
      };

      const result = FileAttachmentService.formatForResponse(row);

      expect(result.description).toBeNull();
      expect(result.uploaded_by).toBeNull();
    });
  });
});
