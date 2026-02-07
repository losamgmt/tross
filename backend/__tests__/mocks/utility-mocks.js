/**
 * Smart Utility Service Mocks
 *
 * PHILOSOPHY:
 * - Minimal mocking: Only mock side effects (logging, auditing)
 * - Silent by default: Don't clutter test output
 * - Trackable: Can assert on calls when needed
 *
 * USAGE:
 *   const { createLoggerMock, createAuditMock } = require('./mocks/utility-mocks');
 *
 *   jest.mock('../../config/logger', () => ({ logger: createLoggerMock() }));
 *   jest.mock('../../services/audit-service', () => createAuditMock());
 */

/**
 * Create silent logger mock
 * Tracks log calls but doesn't output to console
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.silent - Whether to suppress output (default: true)
 * @returns {Object} Mock logger with info/warn/error/debug methods
 */
function createLoggerMock(options = {}) {
  const { silent = true } = options;

  const createLogMethod = (level) => {
    return jest.fn((...args) => {
      if (!silent) {
        console[level](...args);
      }
    });
  };

  return {
    info: createLogMethod("log"),
    warn: createLogMethod("warn"),
    error: createLogMethod("error"),
    debug: createLogMethod("log"),
  };
}

/**
 * Create audit service mock
 * Tracks audit calls without actually writing to database
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onAudit - Callback when audit is logged (for assertions)
 * @returns {Object} Mock audit service
 */
function createAuditMock(options = {}) {
  const { onAudit } = options;

  return {
    logCreate: jest.fn((userId, resource, data) => {
      if (onAudit) onAudit("CREATE", userId, resource, data);
      return Promise.resolve({ id: 1 });
    }),

    logUpdate: jest.fn((userId, resource, id, oldData, newData) => {
      if (onAudit) onAudit("UPDATE", userId, resource, id, oldData, newData);
      return Promise.resolve({ id: 1 });
    }),

    logDelete: jest.fn((userId, resource, id, data) => {
      if (onAudit) onAudit("DELETE", userId, resource, id, data);
      return Promise.resolve({ id: 1 });
    }),

    logAccess: jest.fn((userId, resource, action, metadata) => {
      if (onAudit) onAudit("ACCESS", userId, resource, action, metadata);
      return Promise.resolve({ id: 1 });
    }),
  };
}

/**
 * Create metadata mock loader
 * Returns actual metadata or mock metadata for testing
 *
 * @param {string} entityName - Entity name (e.g., 'technician', 'work-order')
 * @param {Object} overrides - Override specific metadata fields
 * @returns {Object} Metadata object
 */
function createMetadataMock(entityName, overrides = {}) {
  // Try to load actual metadata first
  try {
    const metadata = require(`../../config/models/${entityName}-metadata`);
    return { ...metadata, ...overrides };
  } catch (error) {
    // Fallback to generic metadata
    return {
      tableName: entityName + "s",
      primaryKey: "id",
      searchableFields: [],
      filterableFields: ["id", "is_active", "created_at", "updated_at"],
      sortableFields: ["id", "created_at", "updated_at"],
      defaultSort: { field: "created_at", order: "DESC" },
      fields: {},
      ...overrides,
    };
  }
}

module.exports = {
  createLoggerMock,
  createAuditMock,
  createMetadataMock,
};
