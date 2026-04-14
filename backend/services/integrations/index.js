'use strict';

/**
 * Integration Services Barrel Export
 * 
 * Provides a single entry point for integration functionality.
 * 
 * Usage:
 *   const { IntegrationRunner, IntegrationTokenService } = require('./services/integrations');
 *   
 *   // Run an operation
 *   await IntegrationRunner.run('quickbooks', 'syncInvoice', { invoice });
 *   
 *   // Check health
 *   await IntegrationRunner.healthCheckAll();
 *   
 *   // Direct token access (for OAuth callbacks)
 *   await IntegrationTokenService.setTokens('quickbooks', tokens, userId);
 */

const IntegrationRunner = require('./runner');
const IntegrationTokenService = require('./token-service');
const providers = require('./providers');

module.exports = {
  IntegrationRunner,
  IntegrationTokenService,
  providers,
};
