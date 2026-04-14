'use strict';

/**
 * Integration Providers Registry
 * 
 * Re-exports provider metadata accessors and loads provider modules.
 * This is the service-layer entry point for provider operations.
 * 
 * METADATA: config/integration-providers.js (SSOT for provider config)
 * IMPLEMENTATIONS: providers/*.js (actual API calls)
 */

const {
  PROVIDERS,
  getProviderNames,
  getProvider,
  hasProvider,
  getOAuthProviders,
  getApiKeyProviders,
  getWebhookProviders,
  validateProviderEnv,
} = require('../../../config/integration-providers');

/**
 * Dynamically load a provider module
 * @param {string} name - Provider name
 * @returns {Object} Provider module with healthCheck, refreshToken, etc.
 * @throws {Error} If provider doesn't exist or module not found
 */
function loadProviderModule(name) {
  if (!hasProvider(name)) {
    throw new Error(`Unknown provider: ${name}`);
  }
  
  // eslint-disable-next-line global-require
  return require(`./${name}`);
}

/**
 * Get provider module with its metadata
 * @param {string} name - Provider name
 * @returns {{ module: Object, config: Object }}
 */
function getProviderWithModule(name) {
  return {
    module: loadProviderModule(name),
    config: getProvider(name),
  };
}

module.exports = {
  // Re-export metadata accessors
  PROVIDERS,
  getProviderNames,
  getProvider,
  hasProvider,
  getOAuthProviders,
  getApiKeyProviders,
  getWebhookProviders,
  validateProviderEnv,
  
  // Provider module loading
  loadProviderModule,
  getProviderWithModule,
  
  // Convenience: list of names (backwards compatible)
  list: getProviderNames,
  exists: hasProvider,
};
