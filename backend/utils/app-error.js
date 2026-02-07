/**
 * AppError - Unified Application Error Class
 *
 * Use this for ALL application errors to eliminate pattern-matching.
 * The statusCode and code are defined at the SOURCE, not derived from message text.
 *
 * @example
 * throw new AppError('User not found', 404, 'NOT_FOUND');
 * throw new AppError('Token expired', 401, 'UNAUTHORIZED');
 * throw new AppError('Email is required', 400, 'BAD_REQUEST');
 *
 * Common status codes:
 * - 400: Bad Request (validation, missing fields, invalid input)
 * - 401: Unauthorized (auth failed, token expired)
 * - 403: Forbidden (permission denied)
 * - 404: Not Found (resource doesn't exist)
 * - 409: Conflict (duplicate, already exists)
 * - 500: Internal Server Error (unexpected errors)
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} code - Machine-readable error code (default: 'INTERNAL_ERROR')
   */
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;

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
