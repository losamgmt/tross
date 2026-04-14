'use strict';

/**
 * Integration OAuth Service - Generic OAuth2 Flow Handler
 *
 * SRP: Handles OAuth2 authorization code flow for any provider.
 * Uses provider metadata from config/integration-providers.js
 *
 * PATTERN: Follows Auth0Strategy pattern but generic for all OAuth providers
 */

const crypto = require('crypto');
const { logger, logSecurityEvent } = require('../../config/logger');
const AppError = require('../../utils/app-error');
const IntegrationTokenService = require('./token-service');
const { getProvider, hasProvider, OAUTH_TYPES } = require('../../config/integration-providers');

/**
 * In-memory state store for CSRF protection
 * In production, consider Redis for multi-instance deployments
 * TTL: 10 minutes
 */
const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Generate a cryptographically secure state parameter
 * @returns {string}
 */
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Clean up expired states (called periodically)
 */
function cleanupExpiredStates() {
  const now = Date.now();
  for (const [state, data] of pendingStates.entries()) {
    if (now > data.expiresAt) {
      pendingStates.delete(state);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupExpiredStates, 5 * 60 * 1000).unref();

class IntegrationOAuthService {
  /**
   * Generate OAuth authorization URL for a provider
   *
   * @param {string} providerName - Provider name
   * @param {string} redirectUri - Callback URL after authorization
   * @param {number} userId - Admin user initiating the connection
   * @returns {{ authUrl: string, state: string }}
   */
  static generateAuthUrl(providerName, redirectUri, userId) {
    if (!hasProvider(providerName)) {
      throw new AppError(`Unknown provider: ${providerName}`, 400, 'BAD_REQUEST');
    }

    const provider = getProvider(providerName);

    if (!provider.oauth) {
      throw new AppError(
        `${providerName} does not support OAuth - configure via API key`,
        400,
        'BAD_REQUEST',
      );
    }

    if (provider.oauth.type !== OAUTH_TYPES.AUTHORIZATION_CODE) {
      throw new AppError(
        `Unsupported OAuth type: ${provider.oauth.type}`,
        400,
        'BAD_REQUEST',
      );
    }

    // Generate CSRF state
    const state = generateState();

    // Store state for validation
    pendingStates.set(state, {
      providerName,
      userId,
      redirectUri,
      expiresAt: Date.now() + STATE_TTL_MS,
    });

    // Build authorization URL
    const clientId = process.env[provider.oauth.envVars.clientId];
    if (!clientId) {
      throw new AppError(
        `${providerName} OAuth not configured - missing ${provider.oauth.envVars.clientId}`,
        503,
        'SERVICE_UNAVAILABLE',
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.oauth.scopes.join(' '),
      state,
    });

    const authUrl = `${provider.oauth.authUrl}?${params.toString()}`;

    logger.info('OAuth authorization URL generated', {
      provider: providerName,
      userId,
    });

    return { authUrl, state };
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param {string} providerName - Provider name
   * @param {string} code - Authorization code from callback
   * @param {string} state - State parameter for CSRF validation
   * @param {Object} callbackParams - Additional params from callback (e.g., realmId)
   * @returns {Promise<Object>} Stored token data
   */
  static async exchangeCode(providerName, code, state, callbackParams = {}) {
    // Validate state (CSRF protection)
    const pendingState = pendingStates.get(state);
    if (!pendingState) {
      throw new AppError('Invalid or expired state parameter', 400, 'BAD_REQUEST');
    }

    if (pendingState.providerName !== providerName) {
      throw new AppError('Provider mismatch in state', 400, 'BAD_REQUEST');
    }

    // Clear used state
    pendingStates.delete(state);

    const provider = getProvider(providerName);
    const { redirectUri, userId } = pendingState;

    // Get credentials
    const clientId = process.env[provider.oauth.envVars.clientId];
    const clientSecret = process.env[provider.oauth.envVars.clientSecret];

    if (!clientId || !clientSecret) {
      throw new AppError(
        `${providerName} OAuth not configured`,
        503,
        'SERVICE_UNAVAILABLE',
      );
    }

    // Exchange code for tokens
    logger.info('Exchanging OAuth code for tokens', { provider: providerName });

    const response = await fetch(provider.oauth.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('OAuth token exchange failed', {
        provider: providerName,
        status: response.status,
        error: errorData,
      });
      throw new AppError(
        `${providerName} OAuth token exchange failed`,
        401,
        'UNAUTHORIZED',
      );
    }

    const tokenData = await response.json();

    // Build token object with standard fields plus provider-specific data
    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
    };

    // Add callback params (e.g., realmId for QuickBooks)
    if (provider.oauth.callbackParams) {
      for (const param of provider.oauth.callbackParams) {
        const camelParam = param.charAt(0).toLowerCase() + param.slice(1);
        const snakeParam = param.replace(/([A-Z])/g, '_$1').toLowerCase();
        // Check both camelCase (from callback) and snake_case
        tokens[snakeParam] = callbackParams[param] || callbackParams[camelParam] || callbackParams[snakeParam];
      }
    }

    // Store tokens
    await IntegrationTokenService.setTokens(providerName, tokens, userId);

    logSecurityEvent('INTEGRATION_CONNECTED', {
      provider: providerName,
      userId,
      hasRefreshToken: !!tokens.refresh_token,
    });

    logger.info('OAuth tokens stored successfully', {
      provider: providerName,
      userId,
      expiresAt: tokens.expires_at,
    });

    return tokens;
  }

  /**
   * Disconnect an integration (clear tokens)
   *
   * @param {string} providerName - Provider name
   * @param {number} userId - Admin user disconnecting
   * @returns {Promise<void>}
   */
  static async disconnect(providerName, userId) {
    const provider = getProvider(providerName);

    // Optionally revoke token with provider
    if (provider?.oauth?.revokeUrl) {
      try {
        const tokens = await IntegrationTokenService.getTokens(providerName);
        if (tokens?.access_token) {
          const clientId = process.env[provider.oauth.envVars.clientId];
          const clientSecret = process.env[provider.oauth.envVars.clientSecret];

          await fetch(provider.oauth.revokeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              token: tokens.refresh_token || tokens.access_token,
              client_id: clientId,
              client_secret: clientSecret,
            }),
          });

          logger.info('Token revoked with provider', { provider: providerName });
        }
      } catch (error) {
        // Log but don't fail - we still want to clear local tokens
        logger.warn('Failed to revoke token with provider', {
          provider: providerName,
          error: error.message,
        });
      }
    }

    // Clear local tokens
    await IntegrationTokenService.clearTokens(providerName, userId);

    logSecurityEvent('INTEGRATION_DISCONNECTED', {
      provider: providerName,
      userId,
    });

    logger.info('Integration disconnected', { provider: providerName, userId });
  }

  /**
   * Check if a state is valid and pending
   * @param {string} state - State to check
   * @returns {boolean}
   */
  static isStateValid(state) {
    const pending = pendingStates.get(state);
    return pending && Date.now() < pending.expiresAt;
  }

  /**
   * Get pending state data (for testing)
   * @param {string} state - State to get
   * @returns {Object|null}
   */
  static _getPendingState(state) {
    return pendingStates.get(state) || null;
  }

  /**
   * Clear a state (for testing)
   * @param {string} state - State to clear
   */
  static _clearState(state) {
    pendingStates.delete(state);
  }
}

module.exports = IntegrationOAuthService;
