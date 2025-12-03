/**
 * Centralized Mock System - Index
 * 
 * SRP: ONLY exports all mock factories
 * Use: Single import point for all mocks
 * 
 * Example:
 * const { createMockDb, MOCK_USERS, createMockRequest } = require('../mocks');
 */

// Database mocks
const dbMocks = require('./db.mock');

// Model mocks
const modelMocks = require('./models.mock');

// Service mocks
const serviceMocks = require('./services.mock');

// Middleware mocks
const middlewareMocks = require('./middleware.mock');

// Logger mocks
const loggerMocks = require('./logger.mock');

// Fixtures (re-export for convenience)
const fixtures = require('../fixtures');

module.exports = {
  // Database
  ...dbMocks,
  
  // Models
  ...modelMocks,
  
  // Services
  ...serviceMocks,
  
  // Middleware
  ...middlewareMocks,
  
  // Logger
  ...loggerMocks,
  
  // Fixtures (data)
  ...fixtures,
};
