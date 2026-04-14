/**
 * IntegrationTokenService - OAuth Token Management for Third-Party Integrations
 *
 * SRP: ONLY handles integration token storage, retrieval, and management
 *
 * DESIGN:
 * - Stores OAuth tokens securely in system_settings table
 * - Provider-agnostic: supports QuickBooks, Stripe, and future integrations
 * - Handles token lifecycle: store, retrieve, clear
 * - Logs security events for audit trail
 *
 * SEPARATION OF CONCERNS:
 * - This service: Token credential management
 * - SystemSettingsService: General system settings (feature flags, maintenance mode)
 * - Individual integration services (QuickBooks, Stripe): Business logic
 *
 * Extracted from SystemSettingsService for better SRP compliance.
 */

const db = require('../db/connection');
const { logger, logSecurityEvent } = require('../config/logger');
const AppError = require('../utils/app-error');

/**
 * Valid integration providers
 * Add new providers here as integrations are added
 */
const INTEGRATION_PROVIDERS = ['quickbooks', 'stripe'];

class IntegrationTokenService {
  /**
   * Valid integration providers
   */
  static PROVIDERS = INTEGRATION_PROVIDERS;

  /**
   * Validate provider name
   * @param {string} provider - Provider name to validate
   * @throws {AppError} If provider is invalid
   */
  static _validateProvider(provider) {
    if (!provider || !INTEGRATION_PROVIDERS.includes(provider)) {
      throw new AppError(
        `Invalid integration provider: ${provider}. Valid: ${INTEGRATION_PROVIDERS.join(', ')}`,
        400,
        'BAD_REQUEST',
      );
    }
  }

  /**
   * Get setting by key (internal helper)
   * @private
   */
  static async _getSetting(key) {
    const result = await db.query(
      `SELECT key, value, description, updated_at, updated_by
       FROM system_settings
       WHERE key = $1`,
      [key],
    );
    return result.rows[0] || null;
  }

  /**
   * Update setting by key (internal helper)
   * @private
   */
  static async _updateSetting(key, value, userId) {
    const result = await db.query(
      `INSERT INTO system_settings (key, value, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_by = EXCLUDED.updated_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING key, value, description, updated_at, updated_by`,
      [key, JSON.stringify(value), userId],
    );
    return result.rows[0];
  }

  // ===========================================================================
  // TOKEN MANAGEMENT
  // ===========================================================================

  /**
   * Get OAuth tokens for an integration
   *
   * @param {string} provider - Provider name: 'quickbooks', 'stripe'
   * @returns {Promise<Object|null>} Tokens object or null if not stored
   */
  static async getTokens(provider) {
    this._validateProvider(provider);
    const setting = await this._getSetting(`integration.${provider}.tokens`);
    return setting?.value || null;
  }

  /**
   * Store OAuth tokens for an integration
   *
   * @param {string} provider - Provider name
   * @param {Object} tokens - Token object (shape varies by provider)
   * @param {number} userId - Admin user ID for audit trail
   * @returns {Promise<Object>} The updated setting record
   *
   * @example
   *   await IntegrationTokenService.setTokens('quickbooks', {
   *     access_token: 'eyJ...',
   *     refresh_token: 'AB11...',
   *     expires_at: '2026-04-15T12:00:00Z',
   *     realm_id: '123456789',
   *   }, adminUserId);
   */
  static async setTokens(provider, tokens, userId) {
    this._validateProvider(provider);

    if (!tokens || typeof tokens !== 'object') {
      throw new AppError('Tokens must be an object', 400, 'BAD_REQUEST');
    }

    // Add storage timestamp for debugging
    const tokenData = {
      ...tokens,
      stored_at: new Date().toISOString(),
    };

    const result = await this._updateSetting(
      `integration.${provider}.tokens`,
      tokenData,
      userId,
    );

    logSecurityEvent('INTEGRATION_TOKENS_UPDATED', {
      provider,
      userId,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresAt: tokens.expires_at,
    });

    logger.info('Integration tokens stored', {
      provider,
      userId,
      hasRefreshToken: !!tokens.refresh_token,
    });

    return result;
  }

  /**
   * Clear tokens (disconnect integration)
   *
   * @param {string} provider - Integration provider name
   * @param {number} userId - Admin user ID for audit trail
   * @returns {Promise<boolean>} True if tokens existed and were cleared
   */
  static async clearTokens(provider, userId) {
    this._validateProvider(provider);

    const existing = await this.getTokens(provider);
    if (!existing) {
      return false;
    }

    const key = `integration.${provider}.tokens`;
    await db.query('DELETE FROM system_settings WHERE key = $1', [key]);

    logSecurityEvent('INTEGRATION_DISCONNECTED', {
      provider,
      userId,
      clearedKey: key,
    });

    logger.info('Integration disconnected', { provider, userId });

    return true;
  }

  /**
   * Check if tokens exist and are not expired
   *
   * @param {string} provider - Provider name
   * @returns {Promise<{exists: boolean, expired: boolean, expiresAt: string|null}>}
   */
  static async checkTokenStatus(provider) {
    this._validateProvider(provider);

    const tokens = await this.getTokens(provider);

    if (!tokens) {
      return { exists: false, expired: false, expiresAt: null };
    }

    const expiresAt = tokens.expires_at ? new Date(tokens.expires_at) : null;
    const expired = expiresAt ? expiresAt < new Date() : false;

    return {
      exists: true,
      expired,
      expiresAt: tokens.expires_at || null,
    };
  }

  // ===========================================================================
  // CONFIGURATION MANAGEMENT
  // ===========================================================================

  /**
   * Get non-secret configuration for an integration
   *
   * @param {string} provider - Provider name
   * @returns {Promise<Object|null>} Config object or null if not stored
   */
  static async getConfig(provider) {
    this._validateProvider(provider);
    const setting = await this._getSetting(`integration.${provider}.config`);
    return setting?.value || null;
  }

  /**
   * Store non-secret configuration for an integration
   *
   * @param {string} provider - Provider name
   * @param {Object} config - Configuration object
   * @param {number} userId - Admin user ID for audit trail
   * @returns {Promise<Object>} The updated setting record
   */
  static async setConfig(provider, config, userId) {
    this._validateProvider(provider);
    return this._updateSetting(
      `integration.${provider}.config`,
      config,
      userId,
    );
  }

  // ===========================================================================
  // HEALTH CHECK METHODS (Standard Service Pattern)
  // ===========================================================================

  /**
   * Check if service is configured
   * @returns {boolean}
   */
  static isConfigured() {
    return true; // Service uses DB, no external config needed
  }

  /**
   * Get configuration info (no network call)
   * @returns {{configured: boolean, providers: string[]}}
   */
  static getConfigurationInfo() {
    return {
      configured: true,
      providers: INTEGRATION_PROVIDERS,
    };
  }

  /**
   * Deep health check - verifies DB connectivity and lists connected integrations
   * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
   * @returns {Promise<{configured: boolean, reachable: boolean, responseTime: number, status: string, connectedProviders?: string[], message?: string}>}
   */
  static async healthCheck(timeoutMs = 5000) {
    const start = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timed out')), timeoutMs);
      });

      // Check which integrations have tokens stored
      const queryPromise = db.query(
        `SELECT key FROM system_settings 
         WHERE key LIKE 'integration.%.tokens'`,
      );

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const responseTime = Date.now() - start;

      // Extract provider names from keys
      const connectedProviders = result.rows.map((row) => {
        const match = row.key.match(/^integration\.(\w+)\.tokens$/);
        return match ? match[1] : null;
      }).filter(Boolean);

      logger.debug('Integration token service health check passed', {
        responseTime,
        connectedProviders,
      });

      return {
        configured: true,
        reachable: true,
        responseTime,
        connectedProviders,
        status: 'healthy',
      };
    } catch (error) {
      const responseTime = Date.now() - start;

      let message = 'Integration token service connectivity failed';
      let status = 'critical';

      if (error.message?.includes('timed out')) {
        message = `Integration token service check timed out after ${timeoutMs}ms`;
        status = 'timeout';
      }

      logger.warn('Integration token service health check failed', {
        error: error.message,
        responseTime,
      });

      return {
        configured: true,
        reachable: false,
        responseTime,
        status,
        message,
      };
    }
  }
}

module.exports = IntegrationTokenService;
