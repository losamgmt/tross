/**
 * Storage Service Mock
 *
 * Mocks the storage-service.js for unit testing file routes.
 */

/**
 * Create a mock StorageService instance
 * @param {Object} overrides - Optional method overrides
 * @returns {Object} Mocked storage service
 */
function createMockStorageService(overrides = {}) {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    generateStorageKey: jest.fn().mockImplementation(
      (entityType, entityId, filename) => `${entityType}/${entityId}/mock-uuid-${filename}`
    ),
    upload: jest.fn().mockResolvedValue({
      success: true,
      storageKey: 'mock-storage-key',
      size: 1024,
    }),
    getSignedDownloadUrl: jest.fn().mockResolvedValue(
      'https://storage.example.com/signed-url?token=abc123'
    ),
    delete: jest.fn().mockResolvedValue({ success: true }),
    fileExists: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

/**
 * Create unconfigured storage mock (simulates missing env vars)
 */
function createUnconfiguredStorageMock() {
  return createMockStorageService({
    isConfigured: jest.fn().mockReturnValue(false),
  });
}

module.exports = {
  createMockStorageService,
  createUnconfiguredStorageMock,
};
