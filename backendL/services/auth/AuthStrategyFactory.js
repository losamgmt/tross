/**
 * Authentication Strategy Factory
 *
 * Clean factory pattern implementation for selecting authentication strategy.
 * Supports hot-swapping between dev and production auth based on AUTH_MODE env var.
 */
const { logger } = require('../../config/logger');
const DevAuthStrategy = require('./DevAuthStrategy');
const Auth0Strategy = require('./Auth0Strategy');

/**
 * Authentication modes
 */
const AUTH_MODES = {
  DEVELOPMENT: 'development',
  AUTH0: 'auth0',
  PRODUCTION: 'production',
};

/**
 * AuthStrategyFactory - Singleton factory for authentication strategies
 */
class AuthStrategyFactory {
  static _instance = null;
  static _currentStrategy = null;
  static _currentMode = null;
  static _initialized = false;

  /**
   * Get authentication strategy based on AUTH_MODE environment variable
   *
   * Supports hot-swapping: if AUTH_MODE changes, a new strategy is returned.
   *
   * @returns {AuthStrategy} Concrete authentication strategy instance
   */
  static getStrategy() {
    const authMode = this._normalizeAuthMode(process.env.AUTH_MODE);

    // Return existing strategy if mode hasn't changed
    if (this._currentStrategy && this._currentMode === authMode) {
      return this._currentStrategy;
    }

    // Log mode change or first initialization
    const modeChanged =
      this._currentMode !== null && this._currentMode !== authMode;
    const firstInit = !this._initialized;

    if (modeChanged) {
      logger.warn(`🔄 AUTH_MODE changed: ${this._currentMode} → ${authMode}`);
    }

    this._currentMode = authMode;
    this._currentStrategy = this._createStrategy(
      authMode,
      firstInit || modeChanged,
    );
    this._initialized = true;

    return this._currentStrategy;
  }

  /**
   * Create concrete strategy instance
   * @private
   */
  static _createStrategy(authMode, shouldLog = true) {
    switch (authMode) {
      case AUTH_MODES.DEVELOPMENT:
        if (shouldLog) {
          logger.info(
            '🔧 Using Development Authentication Strategy (JWT with test users)',
          );
        }
        return new DevAuthStrategy();

      case AUTH_MODES.AUTH0:
      case AUTH_MODES.PRODUCTION:
        if (shouldLog) {
          logger.info(
            '🔐 Using Auth0 Production Authentication Strategy (OAuth2/OIDC)',
          );
        }
        return new Auth0Strategy();

      default:
        // Should never reach here due to _normalizeAuthMode
        logger.warn(
          `⚠️  Unknown AUTH_MODE: ${authMode}, defaulting to development`,
        );
        return new DevAuthStrategy();
    }
  }

  /**
   * Normalize auth mode to standard values
   * @private
   */
  static _normalizeAuthMode(authMode) {
    if (!authMode) {
      return AUTH_MODES.DEVELOPMENT;
    }

    const normalized = authMode.toLowerCase().trim();

    switch (normalized) {
      case 'development':
      case 'dev':
      case 'local':
        return AUTH_MODES.DEVELOPMENT;

      case 'production':
      case 'prod':
      case 'auth0':
        return AUTH_MODES.AUTH0;

      default:
        logger.warn(
          `⚠️  Invalid AUTH_MODE: "${authMode}", defaulting to development`,
        );
        return AUTH_MODES.DEVELOPMENT;
    }
  }

  /**
   * Force reset strategy (useful for testing)
   */
  static reset() {
    this._currentStrategy = null;
    this._currentMode = null;
    this._initialized = false;
  }

  /**
   * Get current auth mode
   * @returns {string}
   */
  static getCurrentMode() {
    return this._currentMode || this._normalizeAuthMode(process.env.AUTH_MODE);
  }

  /**
   * Check if using development auth
   * @returns {boolean}
   */
  static isDevelopment() {
    return this.getCurrentMode() === AUTH_MODES.DEVELOPMENT;
  }

  /**
   * Check if using Auth0
   * @returns {boolean}
   */
  static isAuth0() {
    return this.getCurrentMode() === AUTH_MODES.AUTH0;
  }
}

module.exports = {
  AuthStrategyFactory,
  AUTH_MODES,
};
