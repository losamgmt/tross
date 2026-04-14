'use strict';

const IntegrationTokenService = require('./token-service');
const { hasProvider, getProviderNames } = require('./providers');
const AppError = require('../../utils/app-error');
const { logger, logSecurityEvent } = require('../../config/logger');
const { SYSTEM_USER_ID } = require('../../config/constants');

/**
 * Integration Runner - orchestrates integration operations
 * 
 * Pattern: Functional runner that delegates to provider modules
 * Location: services/integrations/runner.js
 * 
 * Responsibilities:
 * - Token validation and refresh with mutex
 * - Provider interface enforcement (duck typing)
 * - Shared error handling and logging
 * - Health check aggregation
 */

/**
 * Required methods every provider must implement
 */
const REQUIRED_METHODS = ['healthCheck', 'refreshToken'];

/**
 * Token refresh mutex state (per provider)
 */
const refreshingProviders = new Set();

/**
 * Load and validate a provider module
 * @private
 * @param {string} providerName - Provider name (e.g., 'quickbooks', 'stripe')
 * @returns {Object} Provider module
 * @throws {Error} If provider invalid or missing required methods
 */
function loadProvider(providerName) {
  if (!hasProvider(providerName)) {
    throw new AppError(
      `Unknown integration provider: ${providerName}`,
      400,
      'BAD_REQUEST'
    );
  }
  
  // eslint-disable-next-line global-require
  const provider = require(`./providers/${providerName}`);
  
  // Enforce interface via duck typing
  for (const method of REQUIRED_METHODS) {
    if (typeof provider[method] !== 'function') {
      throw new Error(
        `Provider '${providerName}' missing required method: ${method}`
      );
    }
  }
  
  return provider;
}

/**
 * Get valid tokens, refreshing if needed (with mutex)
 * @private
 * @param {string} providerName - Provider name
 * @param {Object} provider - Provider module
 * @param {number} [bufferMs=300000] - Refresh if expiring within this time (5 min default)
 * @returns {Promise<Object>} Valid tokens
 * @throws {AppError} If not connected
 */
async function getValidTokens(providerName, provider, bufferMs = 5 * 60 * 1000) {
  let tokens = await IntegrationTokenService.getTokens(providerName);
  
  if (!tokens) {
    throw new AppError(
      `${providerName} integration not connected`,
      401,
      'INTEGRATION_NOT_CONNECTED'
    );
  }
  
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at) : null;
  const needsRefresh = expiresAt && (expiresAt.getTime() - Date.now() < bufferMs);
  
  if (needsRefresh) {
    // Mutex: wait if another refresh is in progress
    if (refreshingProviders.has(providerName)) {
      await new Promise(r => setTimeout(r, 1000));
      return getValidTokens(providerName, provider, bufferMs);
    }
    
    try {
      refreshingProviders.add(providerName);
      
      // Double-check after acquiring mutex
      tokens = await IntegrationTokenService.getTokens(providerName);
      const stillNeedsRefresh = new Date(tokens.expires_at).getTime() - Date.now() < bufferMs;
      
      if (stillNeedsRefresh) {
        logger.info(`Refreshing ${providerName} tokens`);
        const newTokens = await provider.refreshToken(tokens.refresh_token);
        await IntegrationTokenService.setTokens(providerName, newTokens, SYSTEM_USER_ID);
        tokens = newTokens;
        
        logSecurityEvent('INTEGRATION_TOKEN_REFRESHED', { provider: providerName });
      }
    } finally {
      refreshingProviders.delete(providerName);
    }
  }
  
  return tokens;
}

/**
 * Run an integration operation with automatic token handling
 * 
 * @param {string} providerName - Provider name (e.g., 'quickbooks', 'stripe')
 * @param {string} operation - Operation method name on the provider
 * @param {Object} [params={}] - Parameters to pass to the operation
 * @returns {Promise<any>} Operation result
 * @throws {AppError} If provider not connected or operation unsupported
 */
async function run(providerName, operation, params = {}) {
  const provider = loadProvider(providerName);
  
  if (typeof provider[operation] !== 'function') {
    throw new Error(
      `Provider '${providerName}' does not support operation: ${operation}`
    );
  }
  
  const tokens = await getValidTokens(providerName, provider);
  
  try {
    const result = await provider[operation](tokens, params);
    return result;
  } catch (error) {
    // Log but don't expose internal details
    logger.error(`Integration operation failed: ${providerName}.${operation}`, {
      error: error.message,
      code: error.code,
    });
    
    throw new AppError(
      `${providerName} operation failed: ${operation}`,
      error.statusCode || 500,
      'INTEGRATION_OPERATION_FAILED',
      { provider: providerName, operation }
    );
  }
}

/**
 * Run health checks for all or specified providers
 * 
 * @param {string[]} [providers] - Provider names (defaults to all)
 * @returns {Promise<Object>} Health check results by provider
 */
async function healthCheckAll(providers) {
  const toCheck = providers || getProviderNames();
  const results = {};
  
  await Promise.all(toCheck.map(async (providerName) => {
    try {
      const provider = loadProvider(providerName);
      const tokenStatus = await IntegrationTokenService.checkTokenStatus(providerName);
      
      if (!tokenStatus.hasTokens) {
        results[providerName] = {
          status: 'unconfigured',
          configured: false,
          reachable: false,
        };
        return;
      }
      
      const tokens = await IntegrationTokenService.getTokens(providerName);
      const healthy = await provider.healthCheck(tokens);
      
      results[providerName] = {
        status: healthy ? 'healthy' : 'unhealthy',
        configured: true,
        reachable: healthy,
        tokenExpiresAt: tokenStatus.expiresAt,
      };
    } catch (error) {
      results[providerName] = {
        status: 'error',
        configured: false,
        reachable: false,
        error: error.message,
      };
    }
  }));
  
  return results;
}

module.exports = {
  run,
  healthCheckAll,
  // For testing
  _loadProvider: loadProvider,
  _getValidTokens: getValidTokens,
};
