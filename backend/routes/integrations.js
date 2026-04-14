'use strict';

/**
 * Integration Routes - Generic Integration Management Routes
 *
 * PATTERN: Follows entities.js factory pattern
 * - createIntegrationRouter(providerName) returns routes for a provider
 * - Routes are generated from metadata in config/integration-providers.js
 * - Adding a new integration requires NO changes to this file
 *
 * ROUTES PER PROVIDER:
 * OAuth providers: GET /connect, GET /callback, POST /disconnect, GET /status
 * API key providers: POST /configure, POST /disconnect, GET /status
 */

const express = require('express');
const { authenticateToken, requireMinimumRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/utils');
const ResponseFormatter = require('../utils/response-formatter');
const { logger, logSecurityEvent } = require('../config/logger');

// Integration services
const IntegrationTokenService = require('../services/integrations/token-service');
const IntegrationOAuthService = require('../services/integrations/oauth-service');
const { IntegrationRunner } = require('../services/integrations');

// Provider metadata
const {
  getProvider,
  getProviderNames,
} = require('../config/integration-providers');

/**
 * Create a router for a specific integration provider
 *
 * @param {string} providerName - Provider name (e.g., 'quickbooks', 'stripe')
 * @returns {express.Router} Configured router for the provider
 */
function createIntegrationRouter(providerName) {
  const router = express.Router();
  const providerConfig = getProvider(providerName);

  if (!providerConfig) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  // All integration routes require admin
  router.use(authenticateToken);
  router.use(requireMinimumRole('admin'));

  // ===========================================================================
  // GET /status - Connection status for this provider
  // ===========================================================================
  router.get(
    '/status',
    asyncHandler(async (req, res) => {
      const tokenStatus = await IntegrationTokenService.checkTokenStatus(providerName);

      const status = {
        provider: providerName,
        displayName: providerConfig.displayName,
        category: providerConfig.category,
        configured: tokenStatus.hasTokens,
        connected: tokenStatus.hasTokens,
        tokenExpiresAt: tokenStatus.expiresAt,
        capabilities: providerConfig.capabilities,
        authType: providerConfig.oauth ? 'oauth' : 'api_key',
      };

      // If connected, try health check
      if (tokenStatus.hasTokens) {
        try {
          const healthResults = await IntegrationRunner.healthCheckAll([providerName]);
          status.healthy = healthResults[providerName]?.reachable || false;
          status.healthStatus = healthResults[providerName]?.status || 'unknown';
        } catch (error) {
          status.healthy = false;
          status.healthStatus = 'error';
          status.healthError = error.message;
        }
      }

      return ResponseFormatter.get(res, status);
    }),
  );

  // ===========================================================================
  // OAuth-based providers
  // ===========================================================================
  if (providerConfig.oauth) {
    /**
     * GET /connect - Initiate OAuth flow
     * Returns authorization URL for frontend to redirect to
     */
    router.get(
      '/connect',
      asyncHandler(async (req, res) => {
        // Build callback URL
        const protocol = req.secure ? 'https' : 'http';
        const callbackUrl = req.query.callback_url ||
          `${protocol}://${req.get('host')}/api/integrations/${providerName}/callback`;

        const { authUrl, state } = IntegrationOAuthService.generateAuthUrl(
          providerName,
          callbackUrl,
          req.user.id,
        );

        logger.info('OAuth connect initiated', {
          provider: providerName,
          userId: req.user.id,
        });

        return ResponseFormatter.get(res, {
          authUrl,
          state,
          message: `Redirect user to authUrl to begin ${providerConfig.displayName} connection`,
        });
      }),
    );

    /**
     * GET /callback - OAuth callback handler
     * Receives authorization code and exchanges for tokens
     */
    router.get(
      '/callback',
      asyncHandler(async (req, res) => {
        const { code, state, error, error_description } = req.query;

        // Handle OAuth errors
        if (error) {
          logger.warn('OAuth callback error', {
            provider: providerName,
            error,
            error_description,
          });

          return ResponseFormatter.badRequest(res,
            `${providerConfig.displayName} authorization failed: ${error_description || error}`,
          );
        }

        if (!code || !state) {
          return ResponseFormatter.badRequest(res, 'Missing code or state parameter');
        }

        // Extract callback params (e.g., realmId for QuickBooks)
        const callbackParams = {};
        if (providerConfig.oauth.callbackParams) {
          for (const param of providerConfig.oauth.callbackParams) {
            if (req.query[param]) {
              callbackParams[param] = req.query[param];
            }
          }
        }

        // Exchange code for tokens
        await IntegrationOAuthService.exchangeCode(
          providerName,
          code,
          state,
          callbackParams,
        );

        logger.info('OAuth callback successful', {
          provider: providerName,
          hasCallbackParams: Object.keys(callbackParams).length > 0,
        });

        // Return success - frontend can redirect to settings page
        return ResponseFormatter.get(res, {
          success: true,
          provider: providerName,
          message: `${providerConfig.displayName} connected successfully`,
        });
      }),
    );

    /**
     * POST /disconnect - Disconnect OAuth integration
     */
    router.post(
      '/disconnect',
      asyncHandler(async (req, res) => {
        await IntegrationOAuthService.disconnect(providerName, req.user.id);

        return ResponseFormatter.get(res, {
          success: true,
          provider: providerName,
          message: `${providerConfig.displayName} disconnected`,
        });
      }),
    );
  }

  // ===========================================================================
  // API key-based providers
  // ===========================================================================
  if (providerConfig.apiKey) {
    /**
     * POST /configure - Configure API key
     * Body: { api_key: 'sk_...' }
     */
    router.post(
      '/configure',
      asyncHandler(async (req, res) => {
        const { api_key } = req.body;

        if (!api_key) {
          return ResponseFormatter.badRequest(res, 'api_key is required');
        }

        // Validate key format if patterns defined
        if (providerConfig.apiKey.testPrefix || providerConfig.apiKey.livePrefix) {
          const isTest = api_key.startsWith(providerConfig.apiKey.testPrefix);
          const isLive = api_key.startsWith(providerConfig.apiKey.livePrefix);

          if (!isTest && !isLive) {
            return ResponseFormatter.badRequest(res,
              `Invalid API key format. Expected ${providerConfig.apiKey.testPrefix}... or ${providerConfig.apiKey.livePrefix}...`,
            );
          }
        }

        // Store as tokens (api_key field)
        await IntegrationTokenService.setTokens(providerName, {
          api_key,
          // No expiry for API keys
          expires_at: null,
        }, req.user.id);

        logSecurityEvent('INTEGRATION_CONFIGURED', {
          provider: providerName,
          userId: req.user.id,
          isTestKey: api_key.includes('test'),
        });

        logger.info('API key configured', {
          provider: providerName,
          userId: req.user.id,
        });

        return ResponseFormatter.get(res, {
          success: true,
          provider: providerName,
          message: `${providerConfig.displayName} configured successfully`,
        });
      }),
    );

    /**
     * POST /disconnect - Remove API key
     */
    router.post(
      '/disconnect',
      asyncHandler(async (req, res) => {
        await IntegrationTokenService.clearTokens(providerName, req.user.id);

        logSecurityEvent('INTEGRATION_DISCONNECTED', {
          provider: providerName,
          userId: req.user.id,
        });

        return ResponseFormatter.get(res, {
          success: true,
          provider: providerName,
          message: `${providerConfig.displayName} disconnected`,
        });
      }),
    );
  }

  return router;
}

/**
 * Create the main integrations router with all provider sub-routers
 *
 * Mounts:
 * - GET /status - Overview of all integrations
 * - /:provider/* - Provider-specific routes
 */
function createMainIntegrationsRouter() {
  const router = express.Router();

  // All routes require admin
  router.use(authenticateToken);
  router.use(requireMinimumRole('admin'));

  // ===========================================================================
  // GET /status - All integrations status
  // ===========================================================================
  router.get(
    '/status',
    asyncHandler(async (req, res) => {
      const providers = getProviderNames();
      const statuses = {};

      for (const name of providers) {
        const config = getProvider(name);
        const tokenStatus = await IntegrationTokenService.checkTokenStatus(name);

        statuses[name] = {
          displayName: config.displayName,
          category: config.category,
          configured: tokenStatus.hasTokens,
          authType: config.oauth ? 'oauth' : 'api_key',
          tokenExpiresAt: tokenStatus.expiresAt,
        };
      }

      return ResponseFormatter.get(res, {
        integrations: statuses,
        count: providers.length,
      });
    }),
  );

  // Mount provider-specific routers
  for (const providerName of getProviderNames()) {
    router.use(`/${providerName}`, createIntegrationRouter(providerName));
  }

  return router;
}

// Generate routers
const mainRouter = createMainIntegrationsRouter();

// Export factory + main router
module.exports = {
  createIntegrationRouter,
  createMainIntegrationsRouter,
  router: mainRouter,
};
