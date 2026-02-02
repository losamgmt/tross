/**
 * File Sub-Router - Sub-resource pattern for entity file attachments
 *
 * Mounted on entities with supportsFileAttachments: true
 * e.g., /api/work_orders/:id/files, /api/contracts/:id/files
 *
 * Uses mergeParams to access parent entity route params (:id)
 *
 * ROUTES:
 * - POST   /:id/files           - Upload file to entity
 * - GET    /:id/files           - List entity's files
 * - GET    /:id/files/:fileId   - Get single file (with download_url)
 * - DELETE /:id/files/:fileId   - Soft delete file
 *
 * PERMISSIONS:
 * - List/Get: require 'read' on parent entity
 * - Upload/Delete: require 'update' on parent entity
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
const { FILE_ATTACHMENTS } = require('../config/constants');

/**
 * Create a file sub-router for an entity
 *
 * @param {Object} metadata - Entity metadata from config/models
 * @param {string} metadata.entityKey - Singular entity key (e.g., 'work_order')
 * @param {string} metadata.tableName - Plural table name (e.g., 'work_orders')
 * @param {string} metadata.rlsResource - RLS resource for permission checks
 * @returns {Router} Express router with mergeParams: true
 */
function createFileSubRouter(metadata) {
  const router = express.Router({ mergeParams: true });
  const { entityKey, rlsResource } = metadata;

  // All file routes require authentication
  router.use(authenticateToken);

  // Validate the parent entity :id param for all file routes
  router.use(validateIdParam({ paramName: 'id' }));

  // =============================================================================
  // HELPERS
  // =============================================================================

  /**
   * Check if user has permission on the parent entity
   */
  function hasPermission(req, operation) {
    return req.permissions?.hasPermission(rlsResource, operation) ?? false;
  }

  /**
   * Require storage is configured, throw if not
   */
  function requireStorage() {
    if (!storageService.isConfigured()) {
      throw new AppError('File storage is not configured', 503, 'SERVICE_UNAVAILABLE');
    }
  }

  /**
   * Generate download info for a file
   * @param {string} storageKey - R2 storage key
   * @returns {Promise<{url: string, expiresAt: Date}>}
   */
  async function generateDownloadInfo(storageKey) {
    const expirySeconds = FILE_ATTACHMENTS.DOWNLOAD_URL_EXPIRY_SECONDS;
    const url = await storageService.getSignedDownloadUrl(storageKey, expirySeconds);
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);
    return { url, expiresAt };
  }

  // =============================================================================
  // ROUTES
  // =============================================================================

  /**
   * POST /:id/files
   * Upload a file attached to an entity
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
    '/',
    asyncHandler(async (req, res) => {
      const entityId = parseInt(req.params.id, 10);

      // Permission check: upload requires 'update' on parent
      if (!hasPermission(req, 'update')) {
        throw new AppError(`You don't have permission to add files to this ${entityKey}`, 403, 'FORBIDDEN');
      }

      requireStorage();

      // Entity existence check
      const exists = await FileAttachmentService.entityExists(entityKey, entityId);
      if (!exists) {
        throw new AppError(`${entityKey} with id ${entityId} not found`, 404, 'NOT_FOUND');
      }

      // Parse headers
      const mimeType = req.headers['content-type'];
      const originalFilename = req.headers['x-filename'] || 'unnamed';
      const category = req.headers['x-category'] || 'attachment';
      const description = req.headers['x-description'] || null;

      // Validate MIME type
      if (!FILE_ATTACHMENTS.ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new AppError(
          `File type ${mimeType} not allowed. Allowed: ${FILE_ATTACHMENTS.ALLOWED_MIME_TYPES.join(', ')}`,
          400,
          'BAD_REQUEST',
        );
      }

      // Validate body
      const buffer = req.body;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new AppError('No file data received. Send raw binary body.', 400, 'BAD_REQUEST');
      }

      // Validate size
      if (buffer.length > FILE_ATTACHMENTS.MAX_FILE_SIZE) {
        throw new AppError(
          `File too large. Maximum size: ${FILE_ATTACHMENTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
          400,
          'BAD_REQUEST',
        );
      }

      // Generate storage key and upload
      const storageKey = storageService.generateStorageKey(entityKey, entityId, originalFilename);

      const uploadResult = await storageService.upload({
        buffer,
        storageKey,
        mimeType,
        metadata: {
          entityType: entityKey,
          entityId: String(entityId),
          category,
          uploadedBy: String(req.user?.id || 'unknown'),
        },
      });

      // Save to database
      const attachment = await FileAttachmentService.createAttachment({
        entityType: entityKey,
        entityId,
        originalFilename,
        storageKey,
        mimeType,
        fileSize: uploadResult.size,
        category,
        description,
        uploadedBy: req.user?.id || null,
      });

      // Generate download URL for response
      const downloadInfo = await generateDownloadInfo(storageKey);

      return ResponseFormatter.created(
        res,
        FileAttachmentService.formatForResponse(attachment, downloadInfo),
      );
    }),
  );

  /**
   * GET /:id/files
   * List all files attached to an entity
   *
   * Query:
   * - category: Filter by category (optional)
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const entityId = parseInt(req.params.id, 10);

      // Permission check: list requires 'read' on parent
      if (!hasPermission(req, 'read')) {
        throw new AppError(`You don't have permission to view files for this ${entityKey}`, 403, 'FORBIDDEN');
      }

      requireStorage();

      // List files from database (includes storage_key for URL generation)
      const files = await FileAttachmentService.listFilesForEntity(entityKey, entityId, {
        category: req.query.category,
      });

      // Generate download URLs for each file
      const filesWithUrls = await Promise.all(
        files.map(async (file) => {
          const downloadInfo = await generateDownloadInfo(file.storage_key);
          return FileAttachmentService.formatForResponse(file, downloadInfo);
        }),
      );

      return ResponseFormatter.success(res, filesWithUrls, {
        message: `Retrieved ${filesWithUrls.length} files`,
      });
    }),
  );

  /**
   * GET /:id/files/:fileId
   * Get a single file with download URL
   */
  router.get(
    '/:fileId',
    validateIdParam({ paramName: 'fileId' }),
    asyncHandler(async (req, res) => {
      const entityId = parseInt(req.params.id, 10);
      const fileId = parseInt(req.params.fileId, 10);

      // Permission check: get requires 'read' on parent
      if (!hasPermission(req, 'read')) {
        throw new AppError(`You don't have permission to view files for this ${entityKey}`, 403, 'FORBIDDEN');
      }

      requireStorage();

      // Get file from database
      const file = await FileAttachmentService.getActiveFile(fileId);
      if (!file) {
        throw new AppError('File not found', 404, 'NOT_FOUND');
      }

      // Verify file belongs to this entity
      if (file.entity_type !== entityKey || file.entity_id !== entityId) {
        throw new AppError('File not found', 404, 'NOT_FOUND');
      }

      // Generate download URL
      const downloadInfo = await generateDownloadInfo(file.storage_key);

      return ResponseFormatter.success(
        res,
        FileAttachmentService.formatForResponse(file, downloadInfo),
      );
    }),
  );

  /**
   * DELETE /:id/files/:fileId
   * Soft delete a file (sets is_active = false)
   * Does NOT delete from R2 (cleanup job can do that later)
   */
  router.delete(
    '/:fileId',
    validateIdParam({ paramName: 'fileId' }),
    asyncHandler(async (req, res) => {
      const entityId = parseInt(req.params.id, 10);
      const fileId = parseInt(req.params.fileId, 10);

      // Permission check: delete requires 'update' on parent
      if (!hasPermission(req, 'update')) {
        throw new AppError(`You don't have permission to delete files from this ${entityKey}`, 403, 'FORBIDDEN');
      }

      // Get file to verify it exists and belongs to this entity
      const file = await FileAttachmentService.getActiveFile(fileId);
      if (!file) {
        throw new AppError('File not found', 404, 'NOT_FOUND');
      }

      // Verify file belongs to this entity
      if (file.entity_type !== entityKey || file.entity_id !== entityId) {
        throw new AppError('File not found', 404, 'NOT_FOUND');
      }

      // Soft delete
      await FileAttachmentService.softDelete(fileId);

      logger.info('File deleted by user', {
        fileId,
        entityType: entityKey,
        entityId,
        deletedBy: req.user?.id,
      });

      return ResponseFormatter.success(res, { deleted: true });
    }),
  );

  return router;
}

module.exports = { createFileSubRouter };
