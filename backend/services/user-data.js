/**
 * UserDataService - DEPRECATED COMPATIBILITY WRAPPER
 *
 * @deprecated Use AuthUserService directly instead.
 *
 * This module provides backward-compatible methods that delegate to AuthUserService.
 * All functionality has been merged into AuthUserService.
 *
 * MIGRATION:
 * - Replace: const UserDataService = require('./user-data');
 * - With:    const AuthUserService = require('./auth-user-service');
 *
 * Methods available (all delegated to AuthUserService):
 * - isConfigMode() → AuthUserService.isConfigMode()
 * - getAllUsers() → AuthUserService.getAllUsers()
 * - getUserByAuth0Id() → AuthUserService.getUserByAuth0Id()
 * - findOrCreateUser() → AuthUserService.findOrCreateUser()
 */

const AuthUserService = require('./auth-user-service');

// Provide static class wrapper for backward compatibility with mocking in tests
class UserDataService {
  /**
   * @deprecated Use useInMemoryUsers() from app-mode.js directly
   */
  static isConfigMode() {
    return AuthUserService.isConfigMode();
  }

  /**
   * @deprecated Use AuthUserService.getAllUsers() instead
   */
  static async getAllUsers() {
    return AuthUserService.getAllUsers();
  }

  /**
   * @deprecated Use AuthUserService.getUserByAuth0Id() instead
   */
  static async getUserByAuth0Id(auth0Id) {
    return AuthUserService.getUserByAuth0Id(auth0Id);
  }

  /**
   * @deprecated Use AuthUserService.findOrCreateUser() instead
   */
  static async findOrCreateUser(auth0Data) {
    return AuthUserService.findOrCreateUser(auth0Data);
  }
}

module.exports = UserDataService;
