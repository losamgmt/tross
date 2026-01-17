/**
 * Custom Error Classes
 *
 * SRP: Typed errors that carry HTTP status codes and error types.
 * The global error handler recognizes these and responds appropriately.
 *
 * USAGE:
 *   const { NotFoundError, BadRequestError } = require('../utils/errors');
 *
 *   // In route handlers with asyncHandler:
 *   throw new NotFoundError('User not found');
 *   throw new BadRequestError('Invalid email format');
 *
 * The global error handler will automatically:
 * - Set the correct HTTP status code
 * - Format the response consistently
 * - Log appropriately based on severity
 */

const { HTTP_STATUS } = require('../config/constants');

/**
 * Base class for API errors
 * Extends Error with HTTP status and error code
 */
class ApiError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Distinguishes from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request
 * Client sent invalid data
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details = null) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'BAD_REQUEST');
    this.details = details;
  }
}

/**
 * 401 Unauthorized
 * Authentication required or failed
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden
 * Authenticated but not allowed
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found
 * Resource does not exist
 */
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict
 * Resource state conflict (e.g., already exists)
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT');
  }
}

/**
 * 422 Unprocessable Entity
 * Validation failed
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * 429 Too Many Requests
 * Rate limit exceeded
 */
class RateLimitError extends ApiError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMITED');
    this.retryAfter = retryAfter;
  }
}

/**
 * 503 Service Unavailable
 * Service temporarily unavailable
 */
class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service unavailable') {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE');
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError,
};
