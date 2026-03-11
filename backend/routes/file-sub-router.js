/**
 * File Sub-Router - Sub-resource pattern for entity file attachments
 *
 * Mounted on entities with supportsFileAttachments: true
 * Routes: POST/GET/GET:fileId/DELETE on /:id/files
 *
 * RLS: Uses declarative polymorphic parent RLS via requireParentAccess middleware.
 * File access is determined by parent entity's RLS rules (work_order, asset, etc.)
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
  requireParentAccess,
  requireServiceConfigured,
} = require('../middleware/sub-entity');

// File-specific middleware
const {
  validateFileHeaders,
  validateFileBody,
} = require('../middleware/file-upload');

/** Storage configured check */
const isStorageConfigured = () => storageService.isConfigured();

/**
 * Generate signed download URL with expiry
 */
async function generateDownloadInfo(storageKey) {
  const expirySeconds = FILE_ATTACHMENTS.DOWNLOAD_URL_EXPIRY_SECONDS;
  const url = await storageService.getSignedDownloadUrl(storageKey, expirySeconds);
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);
  return { url, expiresAt };
}

/**
 * Verify file belongs to the expected parent entity
 * Returns the file if valid, throws 404 if not found or mismatched
 */
async function getVerifiedFile(fileId, entityKey, parentId) {
  const file = await FileAttachmentService.getActiveFile(fileId);
  if (!file || file.entity_type !== entityKey || file.entity_id !== parentId) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }
  return file;
}

/** Create a file sub-router for an entity */
function createFileSubRouter(metadata) {
  const router = express.Router({ mergeParams: true });
  const { entityKey } = metadata;

  router.use(attachParentMetadata(metadata));
  router.use(authenticateToken);
  router.use(validateIdParam({ paramName: 'id' }));

  const requireStorage = requireServiceConfigured(
    isStorageConfigured,
    'File storage',
  );

  // POST /:id/files - Upload file
  router.post(
    '/',
    requireParentPermission('update'),
    validateFileHeaders,
    validateFileBody,
    requireStorage,
    requireParentAccess(entityKey),
    asyncHandler(async (req, res) => {
      const parentId = req.parentId;
      const { mimeType, originalFilename, category, description } =
        req.fileUpload;

      const storageKey = storageService.generateStorageKey(
        entityKey,
        parentId,
        originalFilename,
      );

      const uploadResult = await storageService.upload({
        buffer: req.body,
        storageKey,
        mimeType,
        metadata: {
          entityType: entityKey,
          entityId: String(parentId),
          category,
          uploadedBy: String(req.user.id),
        },
      });

      const attachment = await FileAttachmentService.createAttachment({
        entityType: entityKey,
        entityId: parentId,
        originalFilename,
        storageKey,
        mimeType,
        fileSize: uploadResult.size,
        category,
        description,
        uploadedBy: req.user.id,
      });

      const downloadInfo = await generateDownloadInfo(storageKey);

      return ResponseFormatter.created(
        res,
        FileAttachmentService.formatForResponse(attachment, downloadInfo),
      );
    }),
  );

  // GET /:id/files - List files
  router.get(
    '/',
    requireParentPermission('read'),
    requireStorage,
    requireParentAccess(entityKey),
    asyncHandler(async (req, res) => {
      const parentId = req.parentId;
      const files = await FileAttachmentService.listFilesForEntity(
        entityKey,
        parentId,
        {
          category: req.query.category,
        },
      );

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

  // GET /:id/files/:fileId - Get single file
  router.get(
    '/:fileId',
    validateIdParam({ paramName: 'fileId' }),
    requireParentPermission('read'),
    requireStorage,
    requireParentAccess(entityKey),
    asyncHandler(async (req, res) => {
      const file = await getVerifiedFile(
        parseInt(req.params.fileId, 10),
        entityKey,
        req.parentId,
      );
      const downloadInfo = await generateDownloadInfo(file.storage_key);
      return ResponseFormatter.success(
        res,
        FileAttachmentService.formatForResponse(file, downloadInfo),
      );
    }),
  );

  // DELETE /:id/files/:fileId - Soft delete
  router.delete(
    '/:fileId',
    validateIdParam({ paramName: 'fileId' }),
    requireParentPermission('update'),
    requireParentAccess(entityKey),
    asyncHandler(async (req, res) => {
      const fileId = parseInt(req.params.fileId, 10);
      await getVerifiedFile(fileId, entityKey, req.parentId);
      await FileAttachmentService.softDelete(fileId);

      logger.info('File deleted', {
        fileId,
        entityType: entityKey,
        entityId: req.parentId,
        deletedBy: req.user?.id,
      });

      return ResponseFormatter.success(res, { deleted: true });
    }),
  );

  return router;
}

module.exports = { createFileSubRouter };
