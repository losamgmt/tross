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
 *
 * ARCHITECTURE:
 * - Generic sub-entity middleware from middleware/sub-entity.js
 * - File-specific validation from middleware/file-upload.js
 * - Route handlers are thin controllers
 * - FileAttachmentService handles all database operations
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

// Generic sub-entity middleware
const {
  attachParentMetadata,
  requireParentPermission,
  requireServiceConfigured,
  requireParentExists,
} = require('../middleware/sub-entity');

// File-specific middleware
const { validateFileHeaders, validateFileBody } = require('../middleware/file-upload');

/**
 * Storage configuration check function
 */
const isStorageConfigured = () => storageService.isConfigured();

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
  const { entityKey } = metadata;

  // Attach metadata to all requests for middleware access
  router.use(attachParentMetadata(metadata));

  // All file routes require authentication
  router.use(authenticateToken);

  // Validate the parent entity :id param for all file routes
  router.use(validateIdParam({ paramName: 'id' }));

  // Storage check middleware (used by routes that need R2)
  const requireStorage = requireServiceConfigured(isStorageConfigured, 'File storage');

  // =============================================================================
  // ROUTES
  // =============================================================================

  /**
   * POST /:id/files - Upload a file attached to an entity
   */
  router.post(
    '/',
    requireParentPermission('update'),
    requireStorage,
    requireParentExists(FileAttachmentService.entityExists),
    validateFileHeaders,
    validateFileBody,
    asyncHandler(async (req, res) => {
      const parentId = req.parentId;
      const { mimeType, originalFilename, category, description } = req.fileUpload;

      // Generate storage key and upload
      const storageKey = storageService.generateStorageKey(entityKey, parentId, originalFilename);

      const uploadResult = await storageService.upload({
        buffer: req.body,
        storageKey,
        mimeType,
        metadata: {
          entityType: entityKey,
          entityId: String(parentId),
          category,
          uploadedBy: String(req.user?.id || 'unknown'),
        },
      });

      // Save to database
      const attachment = await FileAttachmentService.createAttachment({
        entityType: entityKey,
        entityId: parentId,
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
   * GET /:id/files - List all files attached to an entity
   */
  router.get(
    '/',
    requireParentPermission('read'),
    requireStorage,
    asyncHandler(async (req, res) => {
      const parentId = parseInt(req.params.id, 10);

      // List files from database
      const files = await FileAttachmentService.listFilesForEntity(entityKey, parentId, {
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
   * GET /:id/files/:fileId - Get a single file with download URL
   */
  router.get(
    '/:fileId',
    validateIdParam({ paramName: 'fileId' }),
    requireParentPermission('read'),
    requireStorage,
    asyncHandler(async (req, res) => {
      const parentId = parseInt(req.params.id, 10);
      const fileId = parseInt(req.params.fileId, 10);

      // Get and verify file
      const file = await FileAttachmentService.getActiveFile(fileId);
      if (!file || file.entity_type !== entityKey || file.entity_id !== parentId) {
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
   * DELETE /:id/files/:fileId - Soft delete a file
   */
  router.delete(
    '/:fileId',
    validateIdParam({ paramName: 'fileId' }),
    requireParentPermission('update'),
    asyncHandler(async (req, res) => {
      const parentId = parseInt(req.params.id, 10);
      const fileId = parseInt(req.params.fileId, 10);

      // Get and verify file
      const file = await FileAttachmentService.getActiveFile(fileId);
      if (!file || file.entity_type !== entityKey || file.entity_id !== parentId) {
        throw new AppError('File not found', 404, 'NOT_FOUND');
      }

      // Soft delete
      await FileAttachmentService.softDelete(fileId);

      logger.info('File deleted by user', {
        fileId,
        entityType: entityKey,
        entityId: parentId,
        deletedBy: req.user?.id,
      });

      return ResponseFormatter.success(res, { deleted: true });
    }),
  );

  return router;
}

module.exports = { createFileSubRouter };
