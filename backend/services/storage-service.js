/**
 * StorageService - S3-compatible file storage (Cloudflare R2)
 *
 * Provides a clean abstraction over cloud storage with:
 * - Upload files to R2
 * - Generate signed URLs for secure download
 * - Delete files
 * - List files by entity
 *
 * Environment variables required:
 * - STORAGE_PROVIDER: 'r2' (extensible for future providers)
 * - STORAGE_ENDPOINT: R2 S3-compatible endpoint
 * - STORAGE_BUCKET: Bucket name
 * - STORAGE_ACCESS_KEY: Access key ID
 * - STORAGE_SECRET_KEY: Secret access key
 * - STORAGE_REGION: 'auto' for R2
 */

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { logger } = require("../config/logger");
const AppError = require("../utils/app-error");

// Initialize S3 client for R2
const getS3Client = () => {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKey = process.env.STORAGE_ACCESS_KEY;
  const secretKey = process.env.STORAGE_SECRET_KEY;
  const region = process.env.STORAGE_REGION || "auto";

  if (!endpoint || !accessKey || !secretKey) {
    logger.warn(
      "Storage service not configured - missing environment variables",
    );
    return null;
  }

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    // R2-specific: force path-style URLs
    forcePathStyle: true,
  });
};

// Lazy initialization
let s3Client = null;
const getClient = () => {
  if (!s3Client) {
    s3Client = getS3Client();
  }
  return s3Client;
};

const getBucket = () => process.env.STORAGE_BUCKET;

/**
 * StorageService class for file operations
 */
class StorageService {
  /**
   * Check if storage is configured and available
   * @returns {boolean}
   */
  isConfigured() {
    return getClient() !== null && !!getBucket();
  }

  /**
   * Get storage configuration info (no network call)
   * @returns {{configured: boolean, provider: string, bucket: string|null}}
   */
  getConfigurationInfo() {
    const configured = this.isConfigured();
    return {
      configured,
      provider: process.env.STORAGE_PROVIDER || "none",
      bucket: configured ? getBucket() : null,
    };
  }

  /**
   * Deep health check - actually pings the R2 bucket
   * Uses HeadBucket to verify connectivity with minimal overhead
   *
   * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
   * @returns {Promise<{configured: boolean, reachable: boolean, bucket: string|null, responseTime: number, status: string, message?: string}>}
   */
  async healthCheck(timeoutMs = 5000) {
    const start = Date.now();

    // Check configuration first
    if (!this.isConfigured()) {
      return {
        configured: false,
        reachable: false,
        bucket: null,
        responseTime: 0,
        status: "unconfigured",
        message: "Storage not configured (missing environment variables)",
      };
    }

    const bucket = getBucket();
    const client = getClient();

    // Declare timeoutId outside try block for cleanup in catch
    let timeoutId;

    try {
      // Create an AbortController for timeout
      const abortController = new AbortController();
      timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      const command = new HeadBucketCommand({ Bucket: bucket });
      await client.send(command, { abortSignal: abortController.signal });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - start;

      logger.debug("Storage health check passed", { bucket, responseTime });

      return {
        configured: true,
        reachable: true,
        bucket,
        responseTime,
        status: "healthy",
      };
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const responseTime = Date.now() - start;

      // Determine error type for appropriate messaging
      let message = "Storage connectivity failed";
      let status = "critical";

      if (error.name === "AbortError" || error.message?.includes("aborted")) {
        message = `Storage check timed out after ${timeoutMs}ms`;
        status = "timeout";
      } else if (
        error.name === "AccessDenied" ||
        error.$metadata?.httpStatusCode === 403
      ) {
        message = "Storage access denied (check credentials)";
      } else if (error.$metadata?.httpStatusCode === 404) {
        message = `Bucket "${bucket}" not found`;
      }

      logger.warn("Storage health check failed", {
        bucket,
        error: error.message,
        responseTime,
      });

      return {
        configured: true,
        reachable: false,
        bucket,
        responseTime,
        status,
        message,
      };
    }
  }

  /**
   * Generate a unique storage key for a file
   * Format: {entityType}/{entityId}/{uuid}.{extension}
   *
   * @param {string} entityType - Type of entity (e.g., 'work_order')
   * @param {number} entityId - ID of the parent entity
   * @param {string} originalFilename - Original filename for extension
   * @returns {string} Storage key
   */
  generateStorageKey(entityType, entityId, originalFilename) {
    const ext = path.extname(originalFilename).toLowerCase() || ".bin";
    const uuid = uuidv4();
    return `${entityType}/${entityId}/${uuid}${ext}`;
  }

  /**
   * Upload a file to storage
   *
   * @param {Object} params - Upload parameters
   * @param {Buffer} params.buffer - File content as Buffer
   * @param {string} params.storageKey - Key/path in storage
   * @param {string} params.mimeType - MIME type of the file
   * @param {Object} params.metadata - Optional metadata
   * @returns {Promise<{success: boolean, storageKey: string, size: number}>}
   */
  async upload({ buffer, storageKey, mimeType, metadata = {} }) {
    const client = getClient();
    if (!client) {
      throw new AppError(
        "Storage service not configured",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }

    try {
      const command = new PutObjectCommand({
        Bucket: getBucket(),
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
        },
      });

      await client.send(command);

      logger.info("File uploaded successfully", {
        storageKey,
        size: buffer.length,
        mimeType,
      });

      return {
        success: true,
        storageKey,
        size: buffer.length,
      };
    } catch (error) {
      logger.error("Failed to upload file", {
        storageKey,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate a signed URL for secure file download
   * URL expires after specified duration
   *
   * @param {string} storageKey - Key/path of the file
   * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
   * @returns {Promise<string>} Signed URL
   */
  async getSignedDownloadUrl(storageKey, expiresIn = 3600) {
    const client = getClient();
    if (!client) {
      throw new AppError(
        "Storage service not configured",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }

    try {
      const command = new GetObjectCommand({
        Bucket: getBucket(),
        Key: storageKey,
      });

      const url = await getSignedUrl(client, command, { expiresIn });

      logger.debug("Generated signed download URL", {
        storageKey,
        expiresIn,
      });

      return url;
    } catch (error) {
      logger.error("Failed to generate signed URL", {
        storageKey,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete a file from storage
   *
   * @param {string} storageKey - Key/path of the file to delete
   * @returns {Promise<{success: boolean}>}
   */
  async delete(storageKey) {
    const client = getClient();
    if (!client) {
      throw new AppError(
        "Storage service not configured",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: storageKey,
      });

      await client.send(command);

      logger.info("File deleted successfully", { storageKey });

      return { success: true };
    } catch (error) {
      logger.error("Failed to delete file", {
        storageKey,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if a file exists in storage
   *
   * @param {string} storageKey - Key/path of the file
   * @returns {Promise<boolean>}
   */
  async exists(storageKey) {
    const client = getClient();
    if (!client) {
      throw new AppError(
        "Storage service not configured",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: getBucket(),
        Key: storageKey,
      });

      await client.send(command);
      return true;
    } catch (error) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata from storage
   *
   * @param {string} storageKey - Key/path of the file
   * @returns {Promise<{size: number, mimeType: string, lastModified: Date}>}
   */
  async getMetadata(storageKey) {
    const client = getClient();
    if (!client) {
      throw new AppError(
        "Storage service not configured",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: getBucket(),
        Key: storageKey,
      });

      const response = await client.send(command);

      return {
        size: response.ContentLength,
        mimeType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      logger.error("Failed to get file metadata", {
        storageKey,
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
const storageService = new StorageService();

module.exports = {
  storageService,
  StorageService,
};
