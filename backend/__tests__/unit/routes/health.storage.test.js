/**
 * Storage Health Check - Unit Tests
 *
 * Tests for storage configuration and deep health check functions
 * in health routes and storage service.
 */

const { storageService } = require("../../../services/storage-service");

// Mock the storage service
jest.mock("../../../services/storage-service", () => ({
  storageService: {
    isConfigured: jest.fn(),
    getConfigurationInfo: jest.fn(),
    healthCheck: jest.fn(),
  },
}));

// Import after mocking
const {
  getStorageConfiguration,
  checkStorage,
} = require("../../../routes/health");

describe("Storage Health Check - Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getStorageConfiguration()", () => {
    test("should return healthy status when storage is configured", () => {
      // Arrange
      storageService.getConfigurationInfo.mockReturnValue({
        configured: true,
        provider: "r2",
        bucket: "test-bucket",
      });

      // Act
      const result = getStorageConfiguration();

      // Assert
      expect(result).toEqual({
        configured: true,
        provider: "r2",
        status: "healthy",
      });
    });

    test("should return degraded status when storage is not configured", () => {
      // Arrange
      storageService.getConfigurationInfo.mockReturnValue({
        configured: false,
        provider: "none",
        bucket: null,
      });

      // Act
      const result = getStorageConfiguration();

      // Assert
      expect(result).toEqual({
        configured: false,
        provider: "none",
        status: "degraded",
      });
    });
  });

  describe("checkStorage()", () => {
    test("should return healthy status when storage is reachable", async () => {
      // Arrange
      storageService.healthCheck.mockResolvedValue({
        configured: true,
        reachable: true,
        bucket: "test-bucket",
        responseTime: 50,
        status: "healthy",
      });

      // Act
      const result = await checkStorage();

      // Assert
      expect(result).toEqual({
        configured: true,
        reachable: true,
        bucket: "test-bucket",
        responseTime: 50,
        status: "healthy",
      });
    });

    test("should return critical status when storage is unreachable", async () => {
      // Arrange
      storageService.healthCheck.mockResolvedValue({
        configured: true,
        reachable: false,
        bucket: "test-bucket",
        responseTime: 5000,
        status: "critical",
        message: "Storage connectivity failed",
      });

      // Act
      const result = await checkStorage();

      // Assert
      expect(result).toEqual({
        configured: true,
        reachable: false,
        bucket: "test-bucket",
        responseTime: 5000,
        status: "critical",
        message: "Storage connectivity failed",
      });
    });

    test("should return degraded status when storage is not configured", async () => {
      // Arrange
      storageService.healthCheck.mockResolvedValue({
        configured: false,
        reachable: false,
        bucket: null,
        responseTime: 0,
        status: "unconfigured",
        message: "Storage not configured (missing environment variables)",
      });

      // Act
      const result = await checkStorage();

      // Assert
      expect(result).toEqual({
        configured: false,
        reachable: false,
        bucket: null,
        responseTime: 0,
        status: "degraded",
        message: "Storage not configured (missing environment variables)",
      });
    });

    test("should handle timeout status", async () => {
      // Arrange
      storageService.healthCheck.mockResolvedValue({
        configured: true,
        reachable: false,
        bucket: "test-bucket",
        responseTime: 5000,
        status: "timeout",
        message: "Storage check timed out after 5000ms",
      });

      // Act
      const result = await checkStorage();

      // Assert
      expect(result.status).toBe("critical");
      expect(result.message).toContain("timed out");
    });
  });
});
