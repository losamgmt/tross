/**
 * Smart Mock Infrastructure - Main Exports
 * 
 * Centralized mock factory for consistent, intelligent test mocking
 * 
 * USAGE:
 *   const { createSmartMocks, createDBMock } = require('../mocks');
 *   
 *   // Simple setup (most common)
 *   const mocks = createSmartMocks();
 *   jest.mock('../../services/query-builder-service', () => mocks.queryBuilder);
 *   jest.mock('../../services/pagination-service', () => mocks.pagination);
 *   jest.mock('../../db/connection', () => createDBMock({ rows: [...] }));
 *   
 *   // Advanced setup (error simulation)
 *   const mocks = createSmartMocks({
 *     queryBuilderOverrides: {
 *       buildFilterClause: () => { throw new Error('Metadata missing') }
 *     }
 *   });
 */

// Smart service mocks (NEW)
const {
  createQueryBuilderMock,
  createPaginationMock,
  createSmartMocks,
} = require('./service-mocks');

// Smart database mocks (NEW)
const {
  createDBMock,
  createFailingDBMock,
  createRetryableDBMock,
  createConstraintViolationMock,
} = require('./db-mocks');

// Smart utility mocks (NEW)
const {
  createLoggerMock,
  createAuditMock,
  createMetadataMock,
} = require('./utility-mocks');

// Legacy mocks (OLD - keeping for backward compatibility)
const dbMocks = require('./db.mock');
const modelMocks = require('./models.mock');
const serviceMocks = require('./services.mock');
const middlewareMocks = require('./middleware.mock');
const loggerMocks = require('./logger.mock');
const fixtures = require('../fixtures');

module.exports = {
  // NEW: Smart Mock Infrastructure (use these for new tests)
  createQueryBuilderMock,
  createPaginationMock,
  createSmartMocks,
  createDBMock,
  createFailingDBMock,
  createRetryableDBMock,
  createConstraintViolationMock,
  createLoggerMock,
  createAuditMock,
  createMetadataMock,

  // OLD: Legacy mocks (for backward compatibility)
  ...dbMocks,
  ...modelMocks,
  ...serviceMocks,
  ...middlewareMocks,
  ...loggerMocks,
  ...fixtures,
};
