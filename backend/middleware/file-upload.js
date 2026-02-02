/**
 * File Upload Middleware
 *
 * File-specific validation middleware for binary uploads.
 * Uses generic sub-entity middleware for permission/service checks.
 *
 * MIDDLEWARE:
 * - validateFileHeaders - Validate Content-Type, X-Filename headers
 * - validateFileBody - Validate binary body exists and size limits
 *
 * For generic parent-entity checks, see middleware/sub-entity.js
 */

const AppError = require('../utils/app-error');
const { FILE_ATTACHMENTS } = require('../config/constants');

/**
 * Middleware: Validate file upload headers
 * Validates Content-Type is allowed and sets normalized values on req.fileUpload
 */
function validateFileHeaders(req, res, next) {
  const mimeType = req.headers['content-type'];

  // Validate MIME type is allowed
  if (!mimeType || !FILE_ATTACHMENTS.ALLOWED_MIME_TYPES.includes(mimeType)) {
    return next(
      new AppError(
        `File type ${mimeType || 'unknown'} not allowed. Allowed: ${FILE_ATTACHMENTS.ALLOWED_MIME_TYPES.join(', ')}`,
        400,
        'BAD_REQUEST',
      ),
    );
  }

  // Set normalized upload info on request
  req.fileUpload = {
    mimeType,
    originalFilename: req.headers['x-filename'] || 'unnamed',
    category: req.headers['x-category'] || 'attachment',
    description: req.headers['x-description'] || null,
  };

  next();
}

/**
 * Middleware: Validate file body
 * Ensures binary data exists and doesn't exceed size limit
 */
function validateFileBody(req, res, next) {
  const buffer = req.body;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return next(new AppError('No file data received. Send raw binary body.', 400, 'BAD_REQUEST'));
  }

  if (buffer.length > FILE_ATTACHMENTS.MAX_FILE_SIZE) {
    const maxMB = FILE_ATTACHMENTS.MAX_FILE_SIZE / 1024 / 1024;
    return next(new AppError(`File too large. Maximum size: ${maxMB}MB`, 400, 'BAD_REQUEST'));
  }

  next();
}

module.exports = {
  validateFileHeaders,
  validateFileBody,
};
