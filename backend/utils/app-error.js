/**
 * AppError - Unified Application Error Class
 *
 * Use this for ALL application errors to eliminate pattern-matching.
 * The statusCode and code are defined at the SOURCE, not derived from message text.
 *
 * @example
 * const { ERROR_CODES } = require('../config/error-codes');
 * throw new AppError('User not found', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
 * throw new AppError('Token expired', 401, ERROR_CODES.AUTH_TOKEN_EXPIRED);
 * throw new AppError('Email is required', 400, ERROR_CODES.VALIDATION_FAILED);
 *
 * Common status codes:
 * - 400: Bad Request (validation, missing fields, invalid input)
 * - 401: Unauthorized (auth failed, token expired)
 * - 403: Forbidden (permission denied)
 * - 404: Not Found (resource doesn't exist)
 * - 409: Conflict (duplicate, already exists)
 * - 500: Internal Server Error (unexpected errors)
 */
const { ERROR_CODES } = require('../config/error-codes');

class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} code - Machine-readable error code (default: ERROR_CODES.SERVER_ERROR)
   * @param {Object|null} [details] - Optional structured details surfaced in the
   *   error envelope (e.g. { approvalInfo }); omit for simple errors.
   */
  constructor(message, statusCode = 500, code = ERROR_CODES.SERVER_ERROR, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Capture stack trace (excludes constructor from trace)
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Check if an error is an AppError
   * @param {Error} err
   * @returns {boolean}
   */
  static isAppError(err) {
    return err instanceof AppError;
  }
}

module.exports = AppError;
