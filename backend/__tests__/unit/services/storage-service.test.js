/**
 * Storage Service Unit Tests
 *
 * Tests the S3-compatible storage service (Cloudflare R2).
 *
 * MOCKING STRATEGY:
 * - @aws-sdk/client-s3: Mock S3Client and commands
 * - @aws-sdk/s3-request-presigner: Mock getSignedUrl
 * - uuid: Mock for predictable storage keys
 * - config/logger: Standard logger mock
 *
 * NOTE: The storage-service.js module caches the S3 client at module level.
 * We use jest.isolateModules() to get fresh instances with mocked dependencies.
 *
 * PURE FUNCTION TESTS (no mocking needed):
 * - generateStorageKey: Pure string manipulation
 *
 * I/O BOUNDARY TESTS (mock AWS SDK):
 * - upload, getSignedDownloadUrl, delete, exists, getMetadata
 */

// =============================================================================
// SHARED MOCK FUNCTIONS - Defined before jest.mock calls
// =============================================================================

// Shared mock functions that can be accessed across module reloads
const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockUuidV4 = jest.fn(() => "test-uuid-1234");

// =============================================================================
// MOCKS - Using shared mock functions
// =============================================================================

// Mock logger
jest.mock("../../../config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock uuid for predictable keys
jest.mock("uuid", () => ({
  v4: mockUuidV4,
}));

// Mock AWS SDK S3 Client - use the shared mockSend function
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PutObjectCommand: jest.fn((params) => ({ ...params, _type: "PutObject" })),
  GetObjectCommand: jest.fn((params) => ({ ...params, _type: "GetObject" })),
  DeleteObjectCommand: jest.fn((params) => ({
    ...params,
    _type: "DeleteObject",
  })),
  HeadObjectCommand: jest.fn((params) => ({ ...params, _type: "HeadObject" })),
  HeadBucketCommand: jest.fn((params) => ({ ...params, _type: "HeadBucket" })),
}));

// Mock presigner - use the shared mockGetSignedUrl function
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

// =============================================================================
// TEST SETUP
// =============================================================================

describe("StorageService", () => {
  let StorageService;
  let service;
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
    mockUuidV4.mockReturnValue("test-uuid-1234");

    // Set up environment for storage
    process.env = {
      ...originalEnv,
      STORAGE_PROVIDER: "r2",
      STORAGE_ENDPOINT: "https://mock-endpoint.r2.cloudflarestorage.com",
      STORAGE_BUCKET: "test-bucket",
      STORAGE_ACCESS_KEY: "mock-access-key",
      STORAGE_SECRET_KEY: "mock-secret-key",
      STORAGE_REGION: "auto",
    };

    // Reset module cache to force fresh S3Client creation
    jest.resetModules();

    // Re-require after module reset to get fresh instance with mocks
    StorageService =
      require("../../../services/storage-service").StorageService;
    service = new StorageService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ===========================================================================
  // isConfigured() Tests
  // ===========================================================================
  describe("isConfigured()", () => {
    // Note: getClient() uses lazy initialization with module-level cache.
    // We test that isConfigured returns truthy/falsy correctly.
    // The S3Client mock means getClient() will return a mock client.

    test("returns falsy when STORAGE_BUCKET is not set", () => {
      // Even if client is configured, no bucket = not configured
      process.env.STORAGE_ENDPOINT = "https://test.r2.dev";
      process.env.STORAGE_ACCESS_KEY = "test-key";
      process.env.STORAGE_SECRET_KEY = "test-secret";
      delete process.env.STORAGE_BUCKET;

      const result = service.isConfigured();

      // getBucket() returns undefined, so result is falsy
      expect(result).toBeFalsy();
    });

    test("returns truthy when client and bucket are configured", () => {
      process.env.STORAGE_ENDPOINT = "https://test.r2.dev";
      process.env.STORAGE_ACCESS_KEY = "test-key";
      process.env.STORAGE_SECRET_KEY = "test-secret";
      process.env.STORAGE_BUCKET = "test-bucket";

      const result = service.isConfigured();

      // Client exists (mocked) and bucket is set
      expect(result).toBeTruthy();
    });
  });

  // ===========================================================================
  // generateStorageKey() Tests - PURE FUNCTION
  // ===========================================================================
  describe("generateStorageKey()", () => {
    test("generates key in format entityType/entityId/uuid.ext", () => {
      const key = service.generateStorageKey("work_order", 123, "photo.jpg");

      expect(key).toBe("work_order/123/test-uuid-1234.jpg");
    });

    test("extracts extension from filename correctly", () => {
      const key = service.generateStorageKey("customer", 456, "document.pdf");

      expect(key).toBe("customer/456/test-uuid-1234.pdf");
    });

    test("converts extension to lowercase", () => {
      const key = service.generateStorageKey("invoice", 789, "Image.PNG");

      expect(key).toBe("invoice/789/test-uuid-1234.png");
    });

    test("uses .bin extension when filename has no extension", () => {
      const key = service.generateStorageKey("contract", 1, "noextension");

      expect(key).toBe("contract/1/test-uuid-1234.bin");
    });

    test("handles complex filenames with multiple dots", () => {
      const key = service.generateStorageKey(
        "work_order",
        2,
        "report.2024.final.pdf",
      );

      expect(key).toBe("work_order/2/test-uuid-1234.pdf");
    });

    test("handles entity type with underscores", () => {
      const key = service.generateStorageKey("work_order", 100, "file.txt");

      expect(key).toBe("work_order/100/test-uuid-1234.txt");
    });
  });

  // ===========================================================================
  // upload() Tests
  // ===========================================================================
  describe("upload()", () => {
    beforeEach(() => {
      // Configure storage for upload tests
      process.env.STORAGE_ENDPOINT = "https://test.r2.dev";
      process.env.STORAGE_ACCESS_KEY = "test-key";
      process.env.STORAGE_SECRET_KEY = "test-secret";
      process.env.STORAGE_BUCKET = "test-bucket";
    });

    test("uploads file and returns success with storageKey and size", async () => {
      mockSend.mockResolvedValueOnce({});

      const buffer = Buffer.from("test file content");
      const result = await service.upload({
        buffer,
        storageKey: "work_order/123/test.jpg",
        mimeType: "image/jpeg",
        metadata: { category: "photo" },
      });

      expect(result).toEqual({
        success: true,
        storageKey: "work_order/123/test.jpg",
        size: buffer.length,
      });
    });

    test("sends correct PutObjectCommand parameters", async () => {
      const { PutObjectCommand } = require("@aws-sdk/client-s3");
      mockSend.mockResolvedValueOnce({});

      const buffer = Buffer.from("content");
      await service.upload({
        buffer,
        storageKey: "customer/456/doc.pdf",
        mimeType: "application/pdf",
        metadata: { foo: "bar" },
      });

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "customer/456/doc.pdf",
          Body: buffer,
          ContentType: "application/pdf",
        }),
      );
    });

    test("propagates S3 errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("S3 connection failed"));

      await expect(
        service.upload({
          buffer: Buffer.from("test"),
          storageKey: "test/key",
          mimeType: "text/plain",
        }),
      ).rejects.toThrow("S3 connection failed");
    });
  });

  // ===========================================================================
  // getSignedDownloadUrl() Tests
  // ===========================================================================
  describe("getSignedDownloadUrl()", () => {
    test("returns signed URL from presigner", async () => {
      mockGetSignedUrl.mockResolvedValueOnce(
        "https://signed-url.example.com/file?token=xyz",
      );

      const url = await service.getSignedDownloadUrl(
        "work_order/123/photo.jpg",
      );

      expect(url).toBe("https://signed-url.example.com/file?token=xyz");
    });

    test("passes correct parameters to getSignedUrl", async () => {
      const { GetObjectCommand } = require("@aws-sdk/client-s3");
      mockGetSignedUrl.mockResolvedValueOnce("https://example.com");

      await service.getSignedDownloadUrl("customer/456/doc.pdf", 7200);

      // Verify GetObjectCommand was created with correct params
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "customer/456/doc.pdf",
      });

      // Verify getSignedUrl was called with correct expiry
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(), // client
        expect.objectContaining({ _type: "GetObject" }),
        { expiresIn: 7200 },
      );
    });

    test("uses default expiry of 3600 seconds", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://example.com");

      await service.getSignedDownloadUrl("test/key.txt");

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 },
      );
    });

    test("propagates presigner errors", async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error("Presigner failed"));

      await expect(service.getSignedDownloadUrl("test/key")).rejects.toThrow(
        "Presigner failed",
      );
    });
  });

  // ===========================================================================
  // delete() Tests
  // ===========================================================================
  describe("delete()", () => {
    test("returns success on successful deletion", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await service.delete("work_order/123/photo.jpg");

      expect(result).toEqual({ success: true });
    });

    test("sends correct DeleteObjectCommand parameters", async () => {
      const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
      mockSend.mockResolvedValueOnce({});

      await service.delete("customer/456/document.pdf");

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "customer/456/document.pdf",
      });
    });

    test("propagates S3 errors on delete failure", async () => {
      mockSend.mockRejectedValueOnce(new Error("Delete operation failed"));

      await expect(service.delete("test/key")).rejects.toThrow(
        "Delete operation failed",
      );
    });
  });

  // ===========================================================================
  // exists() Tests
  // ===========================================================================
  describe("exists()", () => {
    test("returns true when file exists (HeadObject succeeds)", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await service.exists("work_order/123/photo.jpg");

      expect(result).toBe(true);
    });

    test("returns false when file does not exist (NotFound error)", async () => {
      const notFoundError = new Error("Not Found");
      notFoundError.name = "NotFound";
      mockSend.mockRejectedValueOnce(notFoundError);

      const result = await service.exists("work_order/123/missing.jpg");

      expect(result).toBe(false);
    });

    test("returns false when file does not exist (404 status)", async () => {
      const notFoundError = new Error("Not Found");
      notFoundError.$metadata = { httpStatusCode: 404 };
      mockSend.mockRejectedValueOnce(notFoundError);

      const result = await service.exists("work_order/123/missing.jpg");

      expect(result).toBe(false);
    });

    test("sends correct HeadObjectCommand parameters", async () => {
      const { HeadObjectCommand } = require("@aws-sdk/client-s3");
      mockSend.mockResolvedValueOnce({});

      await service.exists("customer/456/doc.pdf");

      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "customer/456/doc.pdf",
      });
    });

    test("propagates non-NotFound errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Network failure"));

      await expect(service.exists("test/key")).rejects.toThrow(
        "Network failure",
      );
    });
  });

  // ===========================================================================
  // getMetadata() Tests
  // ===========================================================================
  describe("getMetadata()", () => {
    test("returns parsed metadata from HeadObject response", async () => {
      const lastModified = new Date("2024-01-15T10:30:00Z");
      mockSend.mockResolvedValueOnce({
        ContentLength: 12345,
        ContentType: "image/jpeg",
        LastModified: lastModified,
        Metadata: { category: "photo", uploadedBy: "user123" },
      });

      const result = await service.getMetadata("work_order/123/photo.jpg");

      expect(result).toEqual({
        size: 12345,
        mimeType: "image/jpeg",
        lastModified,
        metadata: { category: "photo", uploadedBy: "user123" },
      });
    });

    test("sends correct HeadObjectCommand parameters", async () => {
      const { HeadObjectCommand } = require("@aws-sdk/client-s3");
      mockSend.mockResolvedValueOnce({
        ContentLength: 100,
        ContentType: "text/plain",
        LastModified: new Date(),
        Metadata: {},
      });

      await service.getMetadata("customer/456/doc.txt");

      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "customer/456/doc.txt",
      });
    });

    test("propagates errors when file not found", async () => {
      const notFoundError = new Error("File not found");
      notFoundError.name = "NotFound";
      mockSend.mockRejectedValueOnce(notFoundError);

      await expect(service.getMetadata("missing/key")).rejects.toThrow(
        "File not found",
      );
    });

    test("handles empty metadata gracefully", async () => {
      mockSend.mockResolvedValueOnce({
        ContentLength: 500,
        ContentType: "application/pdf",
        LastModified: new Date(),
        Metadata: undefined,
      });

      const result = await service.getMetadata("test/file.pdf");

      expect(result.metadata).toBeUndefined();
    });
  });

  // ===========================================================================
  // getConfigurationInfo() Tests
  // ===========================================================================

  describe("getConfigurationInfo()", () => {
    test("returns configured info when all env vars present", () => {
      const result = service.getConfigurationInfo();

      expect(result).toEqual({
        configured: true,
        provider: "r2",
        bucket: "test-bucket",
      });
    });

    test("returns unconfigured when storage not set up", () => {
      // Reset with missing env vars
      delete process.env.STORAGE_ENDPOINT;
      delete process.env.STORAGE_ACCESS_KEY;
      delete process.env.STORAGE_SECRET_KEY;

      jest.resetModules();
      const {
        StorageService: UnconfiguredStorageService,
      } = require("../../../services/storage-service");
      const unconfiguredService = new UnconfiguredStorageService();

      const result = unconfiguredService.getConfigurationInfo();

      expect(result).toEqual({
        configured: false,
        provider: "r2",
        bucket: null,
      });
    });

    test("returns provider as none when STORAGE_PROVIDER not set", () => {
      delete process.env.STORAGE_PROVIDER;

      jest.resetModules();
      const {
        StorageService: NoProviderService,
      } = require("../../../services/storage-service");
      const noProviderService = new NoProviderService();

      const result = noProviderService.getConfigurationInfo();

      expect(result.provider).toBe("none");
    });
  });

  // ===========================================================================
  // healthCheck() Tests
  // ===========================================================================

  describe("healthCheck()", () => {
    test("returns healthy when bucket is reachable", async () => {
      mockSend.mockResolvedValueOnce({}); // HeadBucket success

      const result = await service.healthCheck();

      expect(result).toMatchObject({
        configured: true,
        reachable: true,
        bucket: "test-bucket",
        status: "healthy",
      });
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    test("sends HeadBucketCommand with correct bucket", async () => {
      const { HeadBucketCommand } = require("@aws-sdk/client-s3");
      mockSend.mockResolvedValueOnce({});

      await service.healthCheck();

      expect(HeadBucketCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
      });
    });

    test("returns unconfigured when storage not set up", async () => {
      delete process.env.STORAGE_ENDPOINT;
      delete process.env.STORAGE_ACCESS_KEY;
      delete process.env.STORAGE_SECRET_KEY;

      jest.resetModules();
      const {
        StorageService: UnconfiguredStorageService,
      } = require("../../../services/storage-service");
      const unconfiguredService = new UnconfiguredStorageService();

      const result = await unconfiguredService.healthCheck();

      expect(result).toEqual({
        configured: false,
        reachable: false,
        bucket: null,
        responseTime: 0,
        status: "unconfigured",
        message: "Storage not configured (missing environment variables)",
      });
    });

    test("returns critical when bucket is unreachable", async () => {
      const networkError = new Error("Network error");
      mockSend.mockRejectedValueOnce(networkError);

      const result = await service.healthCheck();

      expect(result).toMatchObject({
        configured: true,
        reachable: false,
        bucket: "test-bucket",
        status: "critical",
        message: "Storage connectivity failed",
      });
    });

    test("returns appropriate message for access denied", async () => {
      const accessDeniedError = new Error("Access Denied");
      accessDeniedError.name = "AccessDenied";
      mockSend.mockRejectedValueOnce(accessDeniedError);

      const result = await service.healthCheck();

      expect(result.status).toBe("critical");
      expect(result.message).toBe("Storage access denied (check credentials)");
    });

    test("returns appropriate message for bucket not found", async () => {
      const notFoundError = new Error("Bucket not found");
      notFoundError.$metadata = { httpStatusCode: 404 };
      mockSend.mockRejectedValueOnce(notFoundError);

      const result = await service.healthCheck();

      expect(result.status).toBe("critical");
      expect(result.message).toContain("not found");
    });

    test("measures response time accurately", async () => {
      // Simulate a slow response
      mockSend.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 50)),
      );

      const result = await service.healthCheck();

      expect(result.responseTime).toBeGreaterThanOrEqual(50);
    });
  });
});
