/**
 * SystemSettingsService - System-wide Configuration Management
 *
 * SRP: ONLY handles system settings CRUD operations
 * - Get individual settings by key
 * - Get all settings
 * - Update settings (admin only)
 * - Check maintenance mode
 *
 * DESIGN:
 * - Key-value store with JSONB values
 * - No entity metadata (simple table, not a business entity)
 * - Admin-only write access enforced at route level
 * - Maintenance mode has special helper for middleware use
 * - Static class (no instance state)
 */

const { query: db } = require('../db/connection');
const { logger, logSecurityEvent } = require('../config/logger');
const AppError = require('../utils/app-error');

/**
 * Known setting keys with their default values
 * Used when a setting doesn't exist in the database
 */
const DEFAULT_SETTINGS = {
  maintenance_mode: {
    enabled: false,
    message: 'System is under maintenance. Please try again later.',
    allowed_roles: ['admin'],
    estimated_end: null,
  },
  feature_flags: {
    dark_mode: true,
    file_attachments: true,
    audit_logging: true,
  },
};

class SystemSettingsService {
  /**
   * Get a single setting by key
   *
   * @param {string} key - The setting key
   * @returns {Promise<Object|null>} The setting value (JSONB) or default
   */
  static async getSetting(key) {
    if (!key || typeof key !== 'string') {
      throw new AppError('Setting key is required', 400, 'BAD_REQUEST');
    }

    const result = await db(
      `SELECT key, value, description, updated_at, updated_by
       FROM system_settings
       WHERE key = $1`,
      [key],
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Return default if exists, otherwise null
    if (DEFAULT_SETTINGS[key]) {
      return {
        key,
        value: DEFAULT_SETTINGS[key],
        description: null,
        updated_at: null,
        updated_by: null,
        is_default: true,
      };
    }

    return null;
  }

  /**
   * Get all system settings
   *
   * @returns {Promise<Array>} All settings
   */
  static async getAllSettings() {
    const result = await db(
      `SELECT key, value, description, updated_at, updated_by
       FROM system_settings
       ORDER BY key`,
    );

    return result.rows;
  }

  /**
   * Update a setting value
   *
   * @param {string} key - The setting key
   * @param {Object} value - The new value (will be stored as JSONB)
   * @param {number} userId - The user making the update
   * @returns {Promise<Object>} The updated setting
   */
  static async updateSetting(key, value, userId) {
    if (!key || typeof key !== 'string') {
      throw new AppError('Setting key is required', 400, 'BAD_REQUEST');
    }

    if (value === undefined) {
      throw new AppError('Setting value is required', 400, 'BAD_REQUEST');
    }

    const result = await db(
      `INSERT INTO system_settings (key, value, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_by = EXCLUDED.updated_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING key, value, description, updated_at, updated_by`,
      [key, JSON.stringify(value), userId],
    );

    logger.info('System setting updated', {
      key,
      updatedBy: userId,
    });

    return result.rows[0];
  }

  // ===========================================================================
  // MAINTENANCE MODE HELPERS
  // ===========================================================================

  /**
   * Check if maintenance mode is enabled
   * Used by middleware to block non-admin access
   *
   * @returns {Promise<Object>} Maintenance mode state
   */
  static async getMaintenanceMode() {
    const setting = await SystemSettingsService.getSetting('maintenance_mode');
    return setting?.value || DEFAULT_SETTINGS.maintenance_mode;
  }

  /**
   * Enable maintenance mode
   *
   * @param {Object} options - Maintenance options
   * @param {string} options.message - Message to display
   * @param {Array<string>} options.allowed_roles - Roles that can still access
   * @param {string|null} options.estimated_end - ISO timestamp
   * @param {number} userId - Admin user enabling maintenance
   * @returns {Promise<Object>} Updated setting
   */
  static async enableMaintenanceMode(options, userId) {
    const currentMode = await SystemSettingsService.getMaintenanceMode();

    const newValue = {
      ...currentMode,
      enabled: true,
      message: options.message || currentMode.message,
      allowed_roles: options.allowed_roles || currentMode.allowed_roles,
      estimated_end: options.estimated_end || null,
    };

    logSecurityEvent('MAINTENANCE_MODE_ENABLED', {
      userId,
      estimatedEnd: newValue.estimated_end,
    });

    return SystemSettingsService.updateSetting(
      'maintenance_mode',
      newValue,
      userId,
    );
  }

  /**
   * Disable maintenance mode
   *
   * @param {number} userId - Admin user disabling maintenance
   * @returns {Promise<Object>} Updated setting
   */
  static async disableMaintenanceMode(userId) {
    const currentMode = await SystemSettingsService.getMaintenanceMode();

    const newValue = {
      ...currentMode,
      enabled: false,
      estimated_end: null,
    };

    logSecurityEvent('MAINTENANCE_MODE_DISABLED', { userId });

    return SystemSettingsService.updateSetting(
      'maintenance_mode',
      newValue,
      userId,
    );
  }

  /**
   * Check if a role is allowed during maintenance
   *
   * @param {string} role - Role to check
   * @returns {Promise<boolean>} True if role can access during maintenance
   */
  static async isRoleAllowedDuringMaintenance(role) {
    const mode = await SystemSettingsService.getMaintenanceMode();

    if (!mode.enabled) {
      return true; // Maintenance not active
    }

    return mode.allowed_roles.includes(role);
  }

  // ===========================================================================
  // FEATURE FLAGS HELPERS
  // ===========================================================================

  /**
   * Get all feature flags
   *
   * @returns {Promise<Object>} Feature flags object
   */
  static async getFeatureFlags() {
    const setting = await SystemSettingsService.getSetting('feature_flags');
    return setting?.value || DEFAULT_SETTINGS.feature_flags;
  }

  /**
   * Check if a specific feature is enabled
   *
   * @param {string} featureName - Feature to check
   * @returns {Promise<boolean>} True if feature is enabled
   */
  static async isFeatureEnabled(featureName) {
    const flags = await SystemSettingsService.getFeatureFlags();
    return flags[featureName] === true;
  }

  // ===========================================================================
  // INTEGRATION CREDENTIALS HELPERS
  // ===========================================================================

  /**
   * Valid integration providers
   * @private
   */
  static INTEGRATION_PROVIDERS = ['quickbooks', 'stripe'];

  /**
   * Validate provider name
   * @private
   * @param {string} provider - Provider name to validate
   * @throws {AppError} If provider is invalid
   */
  static _validateProvider(provider) {
    if (!provider || !this.INTEGRATION_PROVIDERS.includes(provider)) {
      throw new AppError(
        `Invalid integration provider: ${provider}. Valid: ${this.INTEGRATION_PROVIDERS.join(', ')}`,
        400,
        'BAD_REQUEST',
      );
    }
  }

  /**
   * Get OAuth tokens for an integration
   *
   * @param {string} provider - Provider name: 'quickbooks', 'stripe'
   * @returns {Promise<Object|null>} Tokens object or null if not stored
   */
  static async getIntegrationTokens(provider) {
    this._validateProvider(provider);
    const setting = await this.getSetting(`integration.${provider}.tokens`);
    return setting?.value || null;
  }

  /**
   * Store OAuth tokens for an integration
   *
   * @param {string} provider - Provider name
   * @param {Object} tokens - Token object (shape varies by provider)
   * @param {number} userId - Admin user ID for audit trail
   * @returns {Promise<Object>} The updated setting record
   */
  static async setIntegrationTokens(provider, tokens, userId) {
    this._validateProvider(provider);

    if (!tokens || typeof tokens !== 'object') {
      throw new AppError('Tokens must be an object', 400, 'BAD_REQUEST');
    }

    // Add storage timestamp for debugging
    const tokenData = {
      ...tokens,
      stored_at: new Date().toISOString(),
    };

    const result = await this.updateSetting(
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

    return result;
  }

  /**
   * Clear tokens (disconnect integration)
   *
   * @param {string} provider - Integration provider name
   * @param {number} userId - Admin user ID for audit trail
   * @returns {Promise<boolean>} True if tokens existed and were cleared
   */
  static async clearIntegrationTokens(provider, userId) {
    this._validateProvider(provider);

    const existing = await this.getIntegrationTokens(provider);
    if (!existing) {return false;}

    const key = `integration.${provider}.tokens`;

    // NOTE: Using raw SQL DELETE instead of a service method because:
    // 1. SystemSettingsService doesn't have a deleteSetting() method
    // 2. Setting value to null would leave a row with null value (not clean)
    // 3. This is the only place we need delete functionality for now
    // If more delete use cases arise, consider adding deleteSetting() method.
    await db('DELETE FROM system_settings WHERE key = $1', [key]);

    logSecurityEvent('INTEGRATION_DISCONNECTED', {
      provider,
      userId,
      clearedKey: key,
    });

    return true;
  }

  /**
   * Get non-secret configuration for an integration
   *
   * @param {string} provider - Provider name
   * @returns {Promise<Object|null>} Config object or null if not stored
   */
  static async getIntegrationConfig(provider) {
    this._validateProvider(provider);
    const setting = await this.getSetting(`integration.${provider}.config`);
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
  static async setIntegrationConfig(provider, config, userId) {
    this._validateProvider(provider);
    return this.updateSetting(`integration.${provider}.config`, config, userId);
  }
}

module.exports = SystemSettingsService;
