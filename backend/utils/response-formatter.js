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
 */

const { HTTP_STATUS } = require('../config/constants');
const { logger } = require('../config/logger');

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
    const statusCode = this._determineStatusCode(error);
    const errorResponse = {
      success: false,
      error: error.name || 'Error',
      message: error.message || fallbackMessage,
      timestamp: new Date().toISOString(),
    };

    // In development, include stack trace
    if (process.env.NODE_ENV === 'development' && error.stack) {
      errorResponse.stack = error.stack;
    }

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Not Found (404) response
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Custom not found message
   */
  static notFound(res, message = 'Resource not found') {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: 'Not Found',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Bad Request (400) response
   *
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Object} [details] - Additional error details
   */
  static badRequest(res, message, details = null) {
    const response = {
      success: false,
      error: 'Bad Request',
      message,
      timestamp: new Date().toISOString(),
    };

    if (details) {
      response.details = details;
    }

    res.status(HTTP_STATUS.BAD_REQUEST).json(response);
  }

  /**
   * Forbidden (403) response
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Custom forbidden message
   */
  static forbidden(res, message = 'You do not have permission to perform this action') {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: 'Forbidden',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unauthorized (401) response
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Custom unauthorized message
   */
  static unauthorized(res, message = 'Authentication required') {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Unauthorized',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Internal Server Error (500) response
   *
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   */
  static internalError(res, error) {
    logger.error('Internal server error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Service Unavailable (503) response
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Custom unavailable message
   * @param {Object} [details] - Additional health/status details
   */
  static serviceUnavailable(res, message = 'Service temporarily unavailable', details = null) {
    const response = {
      success: false,
      error: 'Service Unavailable',
      message,
      timestamp: new Date().toISOString(),
    };

    if (details) {
      Object.assign(response, details);
    }

    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
  }

  /**
   * Conflict (409) response
   *
   * @param {Object} res - Express response object
   * @param {string} [message] - Custom conflict message
   */
  static conflict(res, message = 'Resource already exists') {
    res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      error: 'Conflict',
      message,
      timestamp: new Date().toISOString(),
    });
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
