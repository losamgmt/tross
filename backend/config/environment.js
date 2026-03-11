/**
 * Environment Detection Module
 *
 * SINGLE SOURCE OF TRUTH for environment detection helpers.
 * Imported by app-config.js, env-manifest.js, and any other module
 * that needs to detect the current environment.
 *
 * This module imports ENVIRONMENTS from constants.js to avoid duplication.
 */

const { ENVIRONMENTS } = require('./constants');

/**
 * Get current environment from NODE_ENV
 * @returns {string} Current environment
 */
function getEnvironment() {
  return process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;
}

/**
 * Check if running in development mode
 * @returns {boolean} True if development environment
 */
function isDevelopment() {
  return getEnvironment() === ENVIRONMENTS.DEVELOPMENT;
}

/**
 * Check if running in production mode
 * @returns {boolean} True if production environment
 */
function isProduction() {
  return getEnvironment() === ENVIRONMENTS.PRODUCTION;
}

/**
 * Check if running in test mode
 * @returns {boolean} True if test environment
 */
function isTest() {
  return getEnvironment() === ENVIRONMENTS.TEST;
}

module.exports = {
  ENVIRONMENTS, // Re-export for convenience
  getEnvironment,
  isDevelopment,
  isProduction,
  isTest,
};
