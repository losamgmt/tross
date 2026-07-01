/**
 * Response Formatter Utility
 *
 * SINGLE RESPONSIBILITY: Standardize all API responses
 *
 * Benefits:
 * - Consistent response structure across all endpoints
 * - Easier frontend parsing
 * - Single place to modify response format
 * - Clear documentation of response schemas
 * - Machine-readable error codes for programmatic handling
 */

const { HTTP_STATUS } = require('../config/constants');
const { logger } = require('../config/logger');

/**
 * Machine-readable error codes for frontend error handling
 *
 * Format: CATEGORY_SPECIFIC_ERROR
 * These allow frontend to display localized messages or take specific actions.
 */
const ERROR_CODES = Object.freeze({
  // Authentication errors (AUTH_*)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Validation errors (VALIDATION_*)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',

  // Resource errors (RESOURCE_*)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Rate limiting (RATE_*)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (SERVER_*)
  SERVER_ERROR: 'SERVER_ERROR',
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',
  SERVER_TIMEOUT: 'SERVER_TIMEOUT',

  // Database errors (DB_*)
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
});

class ResponseFormatter {
  /**
   * Success response for LIST operations (paginated)
   *
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {Array} data.data - Array of records
   * @param {Object} data.pagination - Pagination metadata
   * @param {Object} [data.appliedFilters] - Applied filters
   * @param {boolean} [data.rlsApplied] - Whether RLS was applied
   */
  static list(res, data) {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: data.data,
      count: data.data.length,
      pagination: data.pagination,
      appliedFilters: data.appliedFilters || {},
      rlsApplied: data.rlsApplied || false,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Success response for GET operations (single record)
   *
   * @param {Object} res - Express response object
   * @param {Object} data - Single record
   */
  static get(res, data) {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generic success response
   *
   * @param {Object} res - Express response object
   * @param {*} data - Response data (object, array, or primitive)
   * @param {Object} [options] - Additional options
   * @param {string} [options.message] - Optional success message
   * @param {Object} [options.pagination] - Optional pagination metadata
   */
  static success(res, data, options = {}) {
    const response = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    if (options.message) {
      response.message = options.message;
    }

    if (options.pagination) {
      response.pagination = options.pagination;
    }

    res.status(HTTP_STATUS.OK).json(response);
  }

  /**
   * Success response for CREATE operations
   *
   * @param {Object} res - Express response object
   * @param {Object} data - Created record
   * @param {string} [message] - Optional success message
   */
  static created(res, data, message = 'Resource created successfully') {
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Success response for UPDATE operations
   *
   * @param {Object} res - Express response object
   * @param {Object} data - Updated record
   * @param {string} [message] - Optional success message
   */
  static updated(res, data, message = 'Resource updated successfully') {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Success response for DELETE operations
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Optional success message
   */
  static deleted(res, message = 'Resource deleted successfully') {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Error response (automatically determines status code)
   *
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} [fallbackMessage] - Fallback error message
   */
  static error(res, error, fallbackMessage = 'An error occurred') {
    // Prefer an explicit status from the error (e.g., AppError.statusCode); fall
    // back to message-pattern inference only when the error carries none.
    const statusCode =
      error.statusCode || error.status || this._determineStatusCode(error);
    return this._sendError(res, {
      status: statusCode,
      error: error.name || this._humanNameForStatus(statusCode),
      code: error.code || this._defaultCodeForStatus(statusCode),
      message: error.message || fallbackMessage,
      details: error.details || null,
      stack: error.stack || null,
    });
  }

  /**
   * Not Found (404) response
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Custom not found message
   * @param {string} [code] - Error code (default: RESOURCE_NOT_FOUND)
   */
  static notFound(
    res,
    message = 'Resource not found',
    code = ERROR_CODES.RESOURCE_NOT_FOUND,
  ) {
    return this._sendError(res, {
      status: HTTP_STATUS.NOT_FOUND,
      error: 'Not Found',
      code,
      message,
    });
  }

  /**
   * Bad Request (400) response
   *
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Object} [details] - Additional error details
   * @param {string} [code] - Error code (default: VALIDATION_FAILED)
   */
  static badRequest(
    res,
    message,
    details = null,
    code = ERROR_CODES.VALIDATION_FAILED,
  ) {
    return this._sendError(res, {
      status: HTTP_STATUS.BAD_REQUEST,
      error: 'Bad Request',
      code,
      message,
      details,
    });
  }

  /**
   * Forbidden (403) response
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Custom forbidden message
   * @param {string} [code] - Error code (default: AUTH_INSUFFICIENT_PERMISSIONS)
   */
  static forbidden(
    res,
    message = 'You do not have permission to perform this action',
    code = ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
  ) {
    return this._sendError(res, {
      status: HTTP_STATUS.FORBIDDEN,
      error: 'Forbidden',
      code,
      message,
    });
  }

  /**
   * Unauthorized (401) response
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Custom unauthorized message
   * @param {string} [code] - Error code (default: AUTH_REQUIRED)
   */
  static unauthorized(
    res,
    message = 'Authentication required',
    code = ERROR_CODES.AUTH_REQUIRED,
  ) {
    return this._sendError(res, {
      status: HTTP_STATUS.UNAUTHORIZED,
      error: 'Unauthorized',
      code,
      message,
    });
  }

  /**
   * Internal Server Error (500) response
   *
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} [code] - Error code (default: SERVER_ERROR)
   */
  static internalError(res, error, code = ERROR_CODES.SERVER_ERROR) {
    logger.error('Internal server error', {
      error: error.message,
      stack: error.stack,
    });

    return this._sendError(res, {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      code,
      message: 'An unexpected error occurred',
    });
  }

  /**
   * Service Unavailable (503) response
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Custom unavailable message
   * @param {Object} [details] - Additional health/status details
   * @param {string} [code] - Error code (default: SERVER_UNAVAILABLE)
   */
  static serviceUnavailable(
    res,
    message = 'Service temporarily unavailable',
    details = null,
    code = ERROR_CODES.SERVER_UNAVAILABLE,
  ) {
    // Health details are merged at the TOP level (not nested) for this method,
    // preserving the existing health-check response contract.
    return this._sendError(res, {
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
      error: 'Service Unavailable',
      code,
      message,
      extra: details,
    });
  }

  /**
   * Conflict (409) response
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Custom conflict message
   * @param {string} [code] - Error code (default: RESOURCE_ALREADY_EXISTS)
   */
  static conflict(
    res,
    message = 'Resource already exists',
    code = ERROR_CODES.RESOURCE_ALREADY_EXISTS,
  ) {
    return this._sendError(res, {
      status: HTTP_STATUS.CONFLICT,
      error: 'Conflict',
      code,
      message,
    });
  }

  /**
   * Canonical error-envelope sender — SINGLE SOURCE OF TRUTH for error shape.
   *
   * Shape: { success:false, error:'<Human Name>', code:'<MACHINE_CODE>',
   * message, details?, timestamp }. In local dev a `stack` is added when
   * supplied. `extra` (when given) is merged at the top level for the few
   * responses that carry health/status fields.
   *
   * @param {Object} res - Express response object
   * @param {Object} opts
   * @param {number} opts.status - HTTP status code
   * @param {string} opts.error - Human-readable error name
   * @param {string} opts.code - Machine-readable code (ERROR_CODES)
   * @param {string} opts.message - Human-readable message
   * @param {Object} [opts.details] - Optional structured details (nested)
   * @param {Object} [opts.extra] - Optional fields merged at the top level
   * @param {string} [opts.stack] - Optional stack trace (local dev only)
   * @private
   */
  static _sendError(
    res,
    { status, error, code, message, details = null, extra = null, stack = null },
  ) {
    const response = {
      success: false,
      error,
      code,
      message,
      timestamp: new Date().toISOString(),
    };

    if (details) {
      response.details = details;
    }

    if (extra && typeof extra === 'object') {
      Object.assign(response, extra);
    }

    const { isLocalDev } = require('../config/app-mode');
    if (stack && isLocalDev()) {
      response.stack = stack;
    }

    res.status(status).json(response);
  }

  /**
   * Map an HTTP status code to a default machine-readable ERROR_CODES value.
   * @private
   */
  static _defaultCodeForStatus(status) {
    const map = {
      [HTTP_STATUS.BAD_REQUEST]: ERROR_CODES.VALIDATION_FAILED,
      [HTTP_STATUS.UNAUTHORIZED]: ERROR_CODES.AUTH_REQUIRED,
      [HTTP_STATUS.FORBIDDEN]: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
      [HTTP_STATUS.NOT_FOUND]: ERROR_CODES.RESOURCE_NOT_FOUND,
      [HTTP_STATUS.REQUEST_TIMEOUT]: ERROR_CODES.SERVER_TIMEOUT,
      [HTTP_STATUS.CONFLICT]: ERROR_CODES.RESOURCE_CONFLICT,
      [HTTP_STATUS.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      [HTTP_STATUS.SERVICE_UNAVAILABLE]: ERROR_CODES.SERVER_UNAVAILABLE,
    };
    return map[status] || ERROR_CODES.SERVER_ERROR;
  }

  /**
   * Map an HTTP status code to a human-readable error name.
   * @private
   */
  static _humanNameForStatus(status) {
    const map = {
      [HTTP_STATUS.BAD_REQUEST]: 'Bad Request',
      [HTTP_STATUS.UNAUTHORIZED]: 'Unauthorized',
      [HTTP_STATUS.FORBIDDEN]: 'Forbidden',
      [HTTP_STATUS.NOT_FOUND]: 'Not Found',
      [HTTP_STATUS.REQUEST_TIMEOUT]: 'Request Timeout',
      [HTTP_STATUS.CONFLICT]: 'Conflict',
      [HTTP_STATUS.TOO_MANY_REQUESTS]: 'Too Many Requests',
      [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Service Unavailable',
      [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    };
    return map[status] || 'Error';
  }

  /**
   * Determine HTTP status code from error
   * @private
   */
  static _determineStatusCode(error) {
    const message = error.message || '';

    // Not found errors
    if (message.includes('not found') || message.includes('Not Found')) {
      return HTTP_STATUS.NOT_FOUND;
    }

    // Conflict errors (409) - duplicate resources
    if (message.includes('already exists')) {
      return HTTP_STATUS.CONFLICT;
    }

    // Validation/business logic errors (400)
    if (
      message.includes('Cannot delete') ||
      message.includes('Cannot update') ||
      message.includes('Invalid') ||
      message.includes('required') ||
      message.includes('must be')
    ) {
      return HTTP_STATUS.BAD_REQUEST;
    }

    // Authorization errors
    if (
      message.includes('protected') ||
      message.includes('permission') ||
      message.includes('Forbidden')
    ) {
      return HTTP_STATUS.FORBIDDEN;
    }

    // Authentication errors
    if (message.includes('Unauthorized') || message.includes('token')) {
      return HTTP_STATUS.UNAUTHORIZED;
    }

    // Default to 500
    return HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
}

module.exports = ResponseFormatter;
module.exports.ERROR_CODES = ERROR_CODES;
