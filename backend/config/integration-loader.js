'use strict';

/**
 * Integration Loader - Metadata-Driven Integration Route Registration
 *
 * PATTERN: Mirrors route-loader.js
 * - Dynamically loads integration routes based on provider metadata
 * - Adding a new integration requires NO changes to server.js
 *
 * LOADS:
 * - /api/integrations/* - Admin routes for OAuth/API key management
 * - /webhooks/* - Public routes for receiving external events
 */

const { router: integrationsRouter } = require('../routes/integrations');
const { router: webhooksRouter } = require('../routes/webhooks');
const { getProviderNames, getWebhookProviders } = require('./integration-providers');

/**
 * Load integration management routes
 *
 * @returns {Array<{path: string, router: Router, type: string}>}
 */
function loadIntegrationRoutes() {
  return [{
    path: '/api/integrations',
    router: integrationsRouter,
    type: 'admin',
    description: 'Integration management (OAuth, API keys)',
  }];
}

/**
 * Load webhook receiver routes
 *
 * @returns {Array<{path: string, router: Router, type: string}>}
 */
function loadWebhookRoutes() {
  return [{
    path: '/webhooks',
    router: webhooksRouter,
    type: 'public',
    description: 'Webhook receivers (signature-verified)',
  }];
}

/**
 * Get a summary of loaded integration routes for logging
 * @returns {string} Formatted summary
 */
function getIntegrationRouteSummary() {
  const providers = getProviderNames();
  const webhookProviders = Object.keys(getWebhookProviders());

  const lines = [
    '  Integration Routes:',
    `    /api/integrations (admin) - ${providers.length} providers`,
    ...providers.map(p => `      /${p}/*`),
    '  Webhook Routes:',
    `    /webhooks (public) - ${webhookProviders.length} providers`,
    ...webhookProviders.map(p => `      /${p}`),
  ];

  return lines.join('\n');
}

module.exports = {
  loadIntegrationRoutes,
  loadWebhookRoutes,
  getIntegrationRouteSummary,
};
