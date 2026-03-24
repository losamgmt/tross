/**
 * Environment Detection Module
 *
 * BACKWARDS COMPATIBILITY WRAPPER
 *
 * This module now re-exports from app-mode.js which is the new
 * SINGLE SOURCE OF TRUTH for environment detection.
 *
 * For new code, import directly from app-mode.js:
 *   const { isTestMode, isLocalDev, isProduction } = require('./app-mode');
 *
 * This wrapper maintains backwards compatibility with existing code that
 * imports from environment.js.
 */

const { ENVIRONMENTS } = require('./constants');
const {
  getAppMode,
  isTestMode,
  isLocalDev,
  isProduction,
  AppMode,
} = require('./app-mode');

/**
 * Get current environment from NODE_ENV
 * @deprecated Use getAppMode() from app-mode.js for unified behavior
 * @returns {string} Current environment
 */
function getEnvironment() {
  return process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;
}

/**
 * Check if running in development mode
 * @deprecated Use isLocalDev() from app-mode.js
 */
const isDevelopment = isLocalDev;

/**
 * Check if running in test mode
 * @deprecated Use isTestMode() from app-mode.js
 */
const isTest = isTestMode;

module.exports = {
  // Re-exports from app-mode.js (new API)
  AppMode,
  getAppMode,
  isTestMode,
  isLocalDev,

  // Backwards compatibility (old API)
  ENVIRONMENTS,
  getEnvironment,
  isDevelopment,
  isProduction,
  isTest,
};
