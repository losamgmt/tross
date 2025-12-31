/**
 * FileAttachmentService - Database operations for file attachments
 *
 * SRP: ONLY handles database CRUD for file_attachments table
 *
 * DESIGN:
 * - Polymorphic pattern: entity_type + entity_id (like audit_logs)
 * - Soft delete pattern: is_active flag
 * - Delegates cloud storage to StorageService
 *
 * SEPARATION OF CONCERNS:
 * - This service: Database operations for file_attachments table
 * - StorageService: Cloud storage operations (R2/S3)
 * - files.js route: HTTP concerns, permission checks, request/response
 */

const { query: db } = require('../db/connection');
const { logger } = require('../config/logger');

class FileAttachmentService {
  /**
   * Check if an entity exists in the database
   *
   * @param {string} entityType - Table name (e.g., 'customers', 'work_orders')
   * @param {number} entityId - Entity ID
   * @returns {Promise<boolean>} True if entity exists
   */
  static async entityExists(entityType, entityId) {
    try {
      // Check table exists in public schema
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
   * Get an active file attachment by ID
   *
   * @param {number} id - File attachment ID
   * @returns {Promise<Object|null>} File record or null if not found/inactive
   */
  static async getActiveFile(id) {
    const result = await db(
      'SELECT * FROM file_attachments WHERE id = $1 AND is_active = true',
      [id],
    );
    return result.rows[0] || null;
  }

  /**
   * List files for an entity
   *
   * @param {string} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {Object} [options={}] - Query options
   * @param {string} [options.category] - Filter by category
   * @returns {Promise<Array>} Array of file records
   */
  static async listFilesForEntity(entityType, entityId, options = {}) {
    let query = `
      SELECT id, entity_type, entity_id, original_filename, mime_type, 
             file_size, category, description, uploaded_by, created_at
      FROM file_attachments
      WHERE entity_type = $1 AND entity_id = $2 AND is_active = true
    `;
    const params = [entityType, entityId];

    if (options.category) {
      query += ' AND category = $3';
      params.push(options.category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db(query, params);
    return result.rows;
  }

  /**
   * Create a file attachment record
   *
   * @param {Object} data - File attachment data
   * @param {string} data.entityType - Parent entity type
   * @param {number} data.entityId - Parent entity ID
   * @param {string} data.originalFilename - Original file name
   * @param {string} data.storageKey - Storage key in R2/S3
   * @param {string} data.mimeType - MIME type
   * @param {number} data.fileSize - File size in bytes
   * @param {string} [data.category='attachment'] - File category
   * @param {string} [data.description] - File description
   * @param {number} [data.uploadedBy] - User ID of uploader
   * @returns {Promise<Object>} Created file record
   */
  static async createAttachment(data) {
    const {
      entityType,
      entityId,
      originalFilename,
      storageKey,
      mimeType,
      fileSize,
      category = 'attachment',
      description = null,
      uploadedBy = null,
    } = data;

    const result = await db(
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
        fileSize,
        category,
        description,
        uploadedBy,
      ],
    );

    const attachment = result.rows[0];

    logger.info('File attachment created', {
      id: attachment.id,
      entityType,
      entityId,
      storageKey,
      size: fileSize,
    });

    return attachment;
  }

  /**
   * Soft delete a file attachment
   *
   * @param {number} id - File attachment ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async softDelete(id) {
    const result = await db(
      'UPDATE file_attachments SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rows.length > 0) {
      logger.info('File attachment soft-deleted', { id });
      return true;
    }

    return false;
  }

  /**
   * Format a file record for API response
   * Excludes internal fields like storage_key
   *
   * @param {Object} row - Database row
   * @returns {Object} Formatted response object
   */
  static formatForResponse(row) {
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
}

module.exports = FileAttachmentService;
