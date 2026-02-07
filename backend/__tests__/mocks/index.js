/**
 * Smart Mock Infrastructure - Main Exports
 *
 * Centralized mock factory for consistent, intelligent test mocking
 *
 * USAGE:
 *   const { createDBMock, createMockClient } = require('../mocks');
 *
 *   // Setup in test file
 *   jest.mock('../../db/connection', () => createDBMock({ rows: [...] }));
 *
 *   // Use in tests
 *   const db = require('../../db/connection');
 *   db.query.mockResolvedValue({ rows: [data] }); // Simple query pattern
 *
 *   const client = db.__getMockClient(); // Access transaction client
 *   // or use helper functions like mockSuccessfulTransaction(client, {...})
 */

// Smart service mocks
const {
  createQueryBuilderMock,
  createPaginationMock,
  createSmartMocks,
} = require("./service-mocks");

// Smart database mocks (ENHANCED - supports both db.query AND db.getClient)
const {
  createDBMock,
  createFailingDBMock,
  createRetryableDBMock,
  createConstraintViolationMock,
  createMockClient,
  mockSuccessfulTransaction,
  mockFailedTransaction,
  mockRecordNotFound,
  transactionMatchers,
} = require("./db-mocks");

// Smart utility mocks
const {
  createLoggerMock,
  createAuditMock,
  createMetadataMock,
} = require("./utility-mocks");

// Legacy mocks (for backward compatibility)
const dbMocksLegacy = require("./db.mock");
// modelMocks removed - models no longer used (GenericEntityService replaces them)
const serviceMocks = require("./services.mock");
const middlewareMocks = require("./middleware.mock");
const loggerMocks = require("./logger.mock");
const fixtures = require("../fixtures");

module.exports = {
  // PRIMARY DATABASE MOCKS - Use these!
  createDBMock,
  createFailingDBMock,
  createRetryableDBMock,
  createConstraintViolationMock,
  createMockClient,
  mockSuccessfulTransaction,
  mockFailedTransaction,
  mockRecordNotFound,
  transactionMatchers,

  // Service mocks
  createQueryBuilderMock,
  createPaginationMock,
  createSmartMocks,

  // Utility mocks
  createLoggerMock,
  createAuditMock,
  createMetadataMock,

  // Legacy exports (for backward compatibility)
  ...dbMocksLegacy,
  ...serviceMocks,
  ...middlewareMocks,
  ...loggerMocks,
  ...fixtures,
};
