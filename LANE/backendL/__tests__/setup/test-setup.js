/**
 * Centralized Test Setup
 * 
 * SRP: ONLY provides pre-configured mocks for tests
 * 
 * Usage in test files:
 * const { setupMocks, MOCK_USERS, MOCK_ROLES } = require('../../setup/test-setup');
 * 
 * describe('MyTest', () => {
 *   const mocks = setupMocks();
 *   
 *   beforeEach(() => {
 *     mocks.reset(); // Reset all mocks between tests
 *   });
 *   
 *   it('should work', async () => {
 *     mocks.db.query.mockResolvedValue({ rows: [MOCK_USERS.admin] });
 *     // ... test logic
 *   });
 * });
 */

const {
  createMockDb,
  createMockUser,
  createMockRole,
  createMockAuditService,
  createMockPaginationService,
  createMockLogger,
  createMockRequest,
  createMockResponse,
  createMockNext,
  resetDbMocks,
  resetUserMocks,
  resetRoleMocks,
  resetAuditServiceMocks,
  resetPaginationServiceMocks,
  resetLoggerMocks,
} = require('../mocks');

// Re-export all fixtures for convenience
const fixtures = require('../fixtures');

/**
 * Setup all mocks for a test suite
 * Creates fresh mock instances that can be reset between tests
 * 
 * @returns {Object} Mock instances with reset helper
 */
function setupMocks() {
  const mocks = {
    // Database
    db: createMockDb(),
    
    // Models
    User: createMockUser(),
    Role: createMockRole(),
    
    // Services
    auditService: createMockAuditService(),
    paginationService: createMockPaginationService(),
    
    // Logger
    logger: createMockLogger(),
    
    // Express middleware
    req: createMockRequest(),
    res: createMockResponse(),
    next: createMockNext(),
    
    /**
     * Reset all mocks - call in beforeEach()
     */
    reset() {
      resetDbMocks(this.db);
      resetUserMocks(this.User);
      resetRoleMocks(this.Role);
      resetAuditServiceMocks(this.auditService);
      resetPaginationServiceMocks(this.paginationService);
      resetLoggerMocks(this.logger);
      
      // Express mocks need recreation for chainability
      this.req = createMockRequest();
      this.res = createMockResponse();
      this.next = createMockNext();
    },
  };
  
  return mocks;
}

/**
 * Setup module mocks using jest.mock()
 * Call at TOP of test file (before any imports)
 * 
 * Example:
 * setupModuleMocks();
 * const User = require('../../db/models/User');
 */
function setupModuleMocks() {
  // Database connection
  jest.mock('../../db/connection', () => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  }));
  
  // Logger (always mock to prevent console spam)
  jest.mock('../../config/logger', () => ({
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    requestLogger: jest.fn((req, res, next) => next()),
    logSecurityEvent: jest.fn(),
  }));
  
  // Audit service
  jest.mock('../../services/audit-service', () => ({
    log: jest.fn(),
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
    logAuth: jest.fn(),
    logError: jest.fn(),
    logDeactivation: jest.fn(),
    logReactivation: jest.fn(),
  }));
}

/**
 * Setup auth middleware mocks
 * Call at TOP of test file for route tests
 */
function setupAuthMocks() {
  jest.mock('../../middleware/auth', () => ({
    requireAuth: jest.fn((req, res, next) => next()),
    requireRole: jest.fn(() => (req, res, next) => next()),
    requirePermission: jest.fn(() => (req, res, next) => next()),
    optionalAuth: jest.fn((req, res, next) => next()),
  }));
}

module.exports = {
  // Main setup function
  setupMocks,
  setupModuleMocks,
  setupAuthMocks,
  
  // Re-export all fixtures
  ...fixtures,
  
  // Re-export mock helpers for advanced usage
  createMockRequest,
  createMockResponse,
  createMockNext,
};
