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
 *
 * ARCHITECTURE:
 * - This route: HTTP concerns, permission checks, request/response formatting
 * - FileAttachmentService: Database operations for file_attachments table
 * - StorageService: Cloud storage operations (R2/S3)
 */
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateIdParam } = require('../validators');
const { storageService } = require('../services/storage-service');
const FileAttachmentService = require('../services/file-attachment-service');
const ResponseFormatter = require('../utils/response-formatter');
const { logger } = require('../config/logger');
const { asyncHandler } = require('../middleware/utils');
const AppError = require('../utils/app-error');

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

// Import metadata for correct table/resource names
const allMetadata = require('../config/models');

/**
 * Map entity type to RLS resource name (from metadata)
 * Uses metadata.rlsResource for correct pluralization
 * @param {string} entityType - Entity type (singular, snake_case)
 * @returns {string} RLS resource name from metadata
 */
function toRlsResource(entityType) {
  const metadata = allMetadata[entityType];
  if (metadata && metadata.rlsResource) {
    return metadata.rlsResource;
  }
  // Fallback for unknown entities (shouldn't happen)
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
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;

    // Permission check
    if (!hasEntityPermission(req, entityType, 'update')) {
      throw new AppError(`You don't have permission to add files to ${entityType}`, 403, 'FORBIDDEN');
    }

    // Storage check
    if (!requireStorageConfigured(res)) {
      return;
    }

    // Entity existence check (via service)
    const exists = await FileAttachmentService.entityExists(entityType, entityId);
    if (!exists) {
      throw new AppError(`${entityType} with id ${entityId} not found`, 404, 'NOT_FOUND');
    }

    // Parse headers
    const mimeType = req.headers['content-type'];
    const originalFilename = req.headers['x-filename'] || 'unnamed';
    const category = req.headers['x-category'] || 'attachment';
    const description = req.headers['x-description'] || null;

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new AppError(`File type ${mimeType} not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
    }

    // Validate body
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new AppError('No file data received. Send raw binary body.', 400, 'BAD_REQUEST');
    }

    // Validate size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new AppError(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400, 'BAD_REQUEST');
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

    // Save to database (via service)
    const attachment = await FileAttachmentService.createAttachment({
      entityType,
      entityId,
      originalFilename,
      storageKey,
      mimeType,
      fileSize: uploadResult.size,
      category,
      description,
      uploadedBy: req.user?.id || null,
    });

    return ResponseFormatter.created(
      res,
      FileAttachmentService.formatForResponse(attachment),
    );
  }),
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
router.get('/:id/download', validateIdParam(), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get file (via service)
  const file = await FileAttachmentService.getActiveFile(id);
  if (!file) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }

  // Permission check on parent entity
  if (!hasEntityPermission(req, file.entity_type, 'read')) {
    throw new AppError("You don't have permission to download this file", 403, 'FORBIDDEN');
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
}));

/**
 * DELETE /api/files/:id
 *
 * Soft delete a file (sets is_active = false).
 * Requires update permission on the parent entity type.
 * Does NOT delete from R2 (cleanup job can do that later).
 *
 * NOTE: This route MUST be defined before /:entityType/:entityId routes.
 */
router.delete('/:id', validateIdParam(), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get file (via service)
  const file = await FileAttachmentService.getActiveFile(id);
  if (!file) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }

  // Permission check on parent entity
  if (!hasEntityPermission(req, file.entity_type, 'update')) {
    throw new AppError("You don't have permission to delete this file", 403, 'FORBIDDEN');
  }

  // Soft delete (via service)
  await FileAttachmentService.softDelete(id);

  logger.info('File deleted by user', {
    id,
    entityType: file.entity_type,
    entityId: file.entity_id,
    deletedBy: req.user?.id,
  });

  return ResponseFormatter.success(res, { deleted: true });
}));

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
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;

    // Permission check
    if (!hasEntityPermission(req, entityType, 'read')) {
      throw new AppError(`You don't have permission to view ${entityType} files`, 403, 'FORBIDDEN');
    }

    // List files (via service)
    const files = await FileAttachmentService.listFilesForEntity(
      entityType,
      entityId,
      { category: req.query.category },
    );

    return ResponseFormatter.success(res, files, {
      message: `Retrieved ${files.length} files`,
    });
  }),
);

module.exports = router;
