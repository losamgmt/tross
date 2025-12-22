/**
 * File Attachment Routes - Generic polymorphic file storage
 *
 * GENERIC module for file attachments to any entity.
 * Uses polymorphic pattern (entity_type + entity_id) like audit_logs.
 *
 * Endpoints:
 * - POST   /api/files/:entityType/:entityId - Upload file to entity
 * - GET    /api/files/:entityType/:entityId - List files for entity
 * - GET    /api/files/:id/download          - Get signed download URL
 * - DELETE /api/files/:id                   - Soft delete file
 *
 * All endpoints require authentication and permissions on parent entity.
 */
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateIdParam } = require('../validators');
const { storageService } = require('../services/storage-service');
const { query: db } = require('../db/connection');
const ResponseFormatter = require('../utils/response-formatter');
const { logger } = require('../config/logger');

const router = express.Router();

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
];

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map entity type to RLS resource name (pluralization)
 * @param {string} entityType - Entity type (singular or plural)
 * @returns {string} RLS resource name (plural)
 */
function toRlsResource(entityType) {
  return entityType.endsWith('s') ? entityType : `${entityType}s`;
}

/**
 * Check if user has permission on entity type
 * @param {Object} req - Express request with permissions
 * @param {string} entityType - Entity type
 * @param {string} operation - 'read' or 'update'
 * @returns {boolean}
 */
function hasEntityPermission(req, entityType, operation) {
  const rlsResource = toRlsResource(entityType);
  return req.permissions?.hasPermission(rlsResource, operation) ?? false;
}

/**
 * Check storage is configured, return error response if not
 * @param {Object} res - Express response
 * @returns {boolean} true if storage OK, false if error was sent
 */
function requireStorageConfigured(res) {
  if (!storageService.isConfigured()) {
    ResponseFormatter.serviceUnavailable(res, 'File storage is not configured');
    return false;
  }
  return true;
}

/**
 * Validate entity exists in database
 * @param {string} entityType - Table name
 * @param {number} entityId - Row ID
 * @returns {Promise<boolean>}
 */
async function entityExists(entityType, entityId) {
  try {
    // Check table exists
    const tableCheck = await db(
      `SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = $1 AND table_schema = 'public'
      ) as table_exists`,
      [entityType],
    );

    if (!tableCheck.rows[0]?.table_exists) {
      return false;
    }

    // Check entity exists
    const entityCheck = await db(
      `SELECT id FROM "${entityType}" WHERE id = $1 LIMIT 1`,
      [entityId],
    );

    return entityCheck.rows.length > 0;
  } catch (error) {
    logger.error('Error checking entity existence', {
      entityType,
      entityId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Get file by ID with active check
 * @param {number} id - File ID
 * @returns {Promise<Object|null>}
 */
async function getActiveFile(id) {
  const result = await db(
    'SELECT * FROM file_attachments WHERE id = $1 AND is_active = true',
    [id],
  );
  return result.rows[0] || null;
}

/**
 * Format file record for API response
 * @param {Object} row - Database row
 * @returns {Object} Formatted response
 */
function formatFileResponse(row) {
  return {
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    file_size: row.file_size,
    category: row.category,
    description: row.description,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  };
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

router.use(authenticateToken);

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/files/:entityType/:entityId
 *
 * Upload a file attached to an entity.
 * Requires update permission on the entity type.
 *
 * Headers:
 * - Content-Type: MIME type of file
 * - X-Filename: Original filename
 * - X-Category: Category (optional, default: 'attachment')
 * - X-Description: Description (optional)
 *
 * Body: Raw binary file data
 */
router.post(
  '/:entityType/:entityId',
  validateIdParam({ paramName: 'entityId' }),
  async (req, res) => {
    const { entityType, entityId } = req.params;

    try {
      // Permission check
      if (!hasEntityPermission(req, entityType, 'update')) {
        return ResponseFormatter.forbidden(
          res,
          `You don't have permission to add files to ${entityType}`,
        );
      }

      // Storage check
      if (!requireStorageConfigured(res)) {
        return;
      }

      // Entity existence check
      const exists = await entityExists(entityType, entityId);
      if (!exists) {
        return ResponseFormatter.notFound(
          res,
          `${entityType} with id ${entityId} not found`,
        );
      }

      // Parse headers
      const mimeType = req.headers['content-type'];
      const originalFilename = req.headers['x-filename'] || 'unnamed';
      const category = req.headers['x-category'] || 'attachment';
      const description = req.headers['x-description'] || null;

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return ResponseFormatter.badRequest(
          res,
          `File type ${mimeType} not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        );
      }

      // Validate body
      const buffer = req.body;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return ResponseFormatter.badRequest(
          res,
          'No file data received. Send raw binary body.',
        );
      }

      // Validate size
      if (buffer.length > MAX_FILE_SIZE) {
        return ResponseFormatter.badRequest(
          res,
          `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        );
      }

      // Generate storage key and upload
      const storageKey = storageService.generateStorageKey(
        entityType,
        entityId,
        originalFilename,
      );

      const uploadResult = await storageService.upload({
        buffer,
        storageKey,
        mimeType,
        metadata: {
          entityType,
          entityId: String(entityId),
          category,
          uploadedBy: String(req.user?.id || 'unknown'),
        },
      });

      // Save to database
      const insertResult = await db(
        `INSERT INTO file_attachments 
         (entity_type, entity_id, original_filename, storage_key, mime_type, 
          file_size, category, description, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          entityType,
          entityId,
          originalFilename,
          storageKey,
          mimeType,
          uploadResult.size,
          category,
          description,
          req.user?.id || null,
        ],
      );

      const attachment = insertResult.rows[0];

      logger.info('File uploaded', {
        id: attachment.id,
        entityType,
        entityId,
        storageKey,
        size: uploadResult.size,
      });

      return ResponseFormatter.created(res, formatFileResponse(attachment));
    } catch (error) {
      logger.error('Error uploading file', {
        error: error.message,
        entityType,
        entityId,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * GET /api/files/:id/download
 *
 * Get a signed URL to download a file.
 * Requires read permission on the parent entity type.
 *
 * NOTE: This route MUST be defined before /:entityType/:entityId to avoid
 * route matching issues (e.g., /1/download matching entityType=1, entityId=download)
 */
router.get('/:id/download', validateIdParam(), async (req, res) => {
  const { id } = req.params;

  try {
    // Get file
    const file = await getActiveFile(id);
    if (!file) {
      return ResponseFormatter.notFound(res, 'File not found');
    }

    // Permission check on parent entity
    if (!hasEntityPermission(req, file.entity_type, 'read')) {
      return ResponseFormatter.forbidden(
        res,
        "You don't have permission to download this file",
      );
    }

    // Storage check
    if (!requireStorageConfigured(res)) {
      return;
    }

    // Generate signed URL (1 hour expiry)
    const downloadUrl = await storageService.getSignedDownloadUrl(
      file.storage_key,
      3600,
    );

    return ResponseFormatter.success(res, {
      download_url: downloadUrl,
      filename: file.original_filename,
      mime_type: file.mime_type,
      expires_in: 3600,
    });
  } catch (error) {
    logger.error('Error generating download URL', {
      error: error.message,
      fileId: id,
    });
    return ResponseFormatter.internalError(res, error);
  }
});

/**
 * DELETE /api/files/:id
 *
 * Soft delete a file (sets is_active = false).
 * Requires update permission on the parent entity type.
 * Does NOT delete from R2 (cleanup job can do that later).
 *
 * NOTE: This route MUST be defined before /:entityType/:entityId routes.
 */
router.delete('/:id', validateIdParam(), async (req, res) => {
  const { id } = req.params;

  try {
    // Get file
    const file = await getActiveFile(id);
    if (!file) {
      return ResponseFormatter.notFound(res, 'File not found');
    }

    // Permission check on parent entity
    if (!hasEntityPermission(req, file.entity_type, 'update')) {
      return ResponseFormatter.forbidden(
        res,
        "You don't have permission to delete this file",
      );
    }

    // Soft delete
    await db(
      'UPDATE file_attachments SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id],
    );

    logger.info('File soft-deleted', {
      id,
      entityType: file.entity_type,
      entityId: file.entity_id,
      storageKey: file.storage_key,
    });

    return ResponseFormatter.success(res, { deleted: true });
  } catch (error) {
    logger.error('Error deleting file', {
      error: error.message,
      fileId: id,
    });
    return ResponseFormatter.internalError(res, error);
  }
});

/**
 * GET /api/files/:entityType/:entityId
 *
 * List all files attached to an entity.
 * Requires read permission on the entity type.
 *
 * Query:
 * - category: Filter by category (optional)
 */
router.get(
  '/:entityType/:entityId',
  validateIdParam({ paramName: 'entityId' }),
  async (req, res) => {
    const { entityType, entityId } = req.params;

    try {
      // Permission check
      if (!hasEntityPermission(req, entityType, 'read')) {
        return ResponseFormatter.forbidden(
          res,
          `You don't have permission to view ${entityType} files`,
        );
      }

      // Build query
      const category = req.query.category;
      let query = `
        SELECT id, entity_type, entity_id, original_filename, mime_type, 
               file_size, category, description, uploaded_by, created_at
        FROM file_attachments
        WHERE entity_type = $1 AND entity_id = $2 AND is_active = true
      `;
      const params = [entityType, entityId];

      if (category) {
        query += ' AND category = $3';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC';

      const result = await db(query, params);

      return ResponseFormatter.success(res, result.rows, {
        message: `Retrieved ${result.rows.length} files`,
      });
    } catch (error) {
      logger.error('Error listing files', {
        error: error.message,
        entityType,
        entityId,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
