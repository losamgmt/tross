/**
 * Query String Validators
 *
 * Middleware for validating and coercing query string parameters.
 * Handles pagination, filtering, sorting, and search parameters.
 *
 * All validators attach validated values to req.validated.query = {}
 */
const {
  toSafeInteger,
  toSafeBoolean,
  toSafePagination,
} = require('./type-coercion');
const { HTTP_STATUS } = require('../config/constants');
const { logValidationFailure } = require('./validation-logger');

/**
 * Create a standard validation error response
 *
 * @private
 * @param {string} message - Error message
 * @param {string} field - Field that failed validation
 * @returns {Object} Error response object
 */
function createValidationError(message, field) {
  return {
    error: 'Validation Error',
    message,
    field,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate pagination query parameters
 *
 * Usage:
 *   router.get('/', validatePagination(), handler)
 *   // Access: req.validated.query.page, req.validated.query.limit, req.validated.query.offset
 *
 * @param {Object} limits - Pagination limits
 * @param {number} limits.defaultLimit - Default items per page (default: 50)
 * @param {number} limits.maxLimit - Maximum items per page (default: 200)
 * @returns {Function} Express middleware
 */
function validatePagination(limits = { defaultLimit: 50, maxLimit: 200 }) {
  return (req, res, next) => {
    try {
      const pagination = toSafePagination(req.query, limits);

      if (!req.validated) {req.validated = {};}
      req.validated.pagination = pagination;

      next();
    } catch (error) {
      logValidationFailure({
        validator: 'validatePagination',
        field: 'pagination',
        value: req.query,
        reason: error.message,
        context: { url: req.url, method: req.method },
      });

      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createValidationError(error.message, 'pagination'));
    }
  };
}

/**
 * Validate search query parameter
 *
 * Usage:
 *   router.get('/', validateSearch({ minLength: 2, maxLength: 100 }), handler)
 *   // Access: req.validated.query.search
 *
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum search length (default: 1)
 * @param {number} options.maxLength - Maximum search length (default: 255)
 * @param {boolean} options.required - Is search required? (default: false)
 * @returns {Function} Express middleware
 */
function validateSearch(options = {}) {
  const { minLength = 1, maxLength = 255, required = false } = options;

  return (req, res, next) => {
    const search = req.query.search || req.query.q || '';

    if (!search && required) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createValidationError('Search query is required', 'search'));
    }

    if (search && typeof search === 'string') {
      const trimmed = search.trim();

      if (trimmed.length < minLength) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            createValidationError(
              `Search query must be at least ${minLength} characters`,
              'search',
            ),
          );
      }

      if (trimmed.length > maxLength) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            createValidationError(
              `Search query cannot exceed ${maxLength} characters`,
              'search',
            ),
          );
      }

      if (!req.validated) {req.validated = {};}
      if (!req.validated.query) {req.validated.query = {};}
      req.validated.query.search = trimmed;
    }

    next();
  };
}

/**
 * Validate sort query parameters
 *
 * Usage:
 *   router.get('/', validateSort(['name', 'created_at', 'updated_at']), handler)
 *   // Access: req.validated.query.sortBy, req.validated.query.sortOrder
 *
 * @param {string[]} allowedFields - Allowed fields to sort by
 * @param {string} defaultField - Default sort field (default: first allowed field)
 * @param {string} defaultOrder - Default sort order: 'asc' or 'desc' (default: 'asc')
 * @returns {Function} Express middleware
 */
function validateSort(
  allowedFields,
  defaultField = null,
  defaultOrder = 'asc',
) {
  if (!allowedFields || allowedFields.length === 0) {
    throw new Error('validateSort requires at least one allowed field');
  }

  const defaultSortField = defaultField || allowedFields[0];

  return (req, res, next) => {
    const sortBy = req.query.sortBy || req.query.sort || defaultSortField;
    const sortOrder = (
      req.query.sortOrder ||
      req.query.order ||
      defaultOrder
    ).toLowerCase();

    // Validate sortBy
    if (!allowedFields.includes(sortBy)) {
      logValidationFailure({
        validator: 'validateSort',
        field: 'sortBy',
        value: sortBy,
        reason: `Field not in allowed list: ${allowedFields.join(', ')}`,
        context: { url: req.url, method: req.method },
      });

      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createValidationError(
            `sortBy must be one of: ${allowedFields.join(', ')}`,
            'sortBy',
          ),
        );
    }

    // Validate sortOrder
    if (!['asc', 'desc'].includes(sortOrder)) {
      logValidationFailure({
        validator: 'validateSort',
        field: 'sortOrder',
        value: sortOrder,
        reason: 'Must be "asc" or "desc"',
        context: { url: req.url, method: req.method },
      });

      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createValidationError(
            'sortOrder must be "asc" or "desc"',
            'sortOrder',
          ),
        );
    }

    if (!req.validated) {req.validated = {};}
    if (!req.validated.query) {req.validated.query = {};}
    req.validated.query.sortBy = sortBy;
    req.validated.query.sortOrder = sortOrder;

    next();
  };
}

/**
 * Validate filter query parameters
 *
 * Usage:
 *   const filters = {
 *     status: { type: 'string', allowed: ['active', 'inactive'] },
 *     is_admin: { type: 'boolean' },
 *     age: { type: 'integer', min: 0, max: 150 }
 *   };
 *   router.get('/', validateFilters(filters), handler)
 *   // Access: req.validated.query.filters.status, req.validated.query.filters.is_admin
 *
 * @param {Object} filterSchema - Schema defining allowed filters
 * @returns {Function} Express middleware
 */
function validateFilters(filterSchema) {
  return (req, res, next) => {
    try {
      const filters = {};

      for (const [key, config] of Object.entries(filterSchema)) {
        const value = req.query[key];

        // Skip if not provided (filters are optional)
        if (value === undefined) {continue;}

        // Validate based on type
        if (config.type === 'integer') {
          filters[key] = toSafeInteger(value, key, {
            min: config.min,
            max: config.max,
            allowNull: false,
          });
        } else if (config.type === 'boolean') {
          filters[key] = toSafeBoolean(value, key);
        } else if (config.type === 'string') {
          if (typeof value !== 'string') {
            throw new Error(`${key} must be a string`);
          }

          // Check allowed values
          if (config.allowed && !config.allowed.includes(value)) {
            throw new Error(
              `${key} must be one of: ${config.allowed.join(', ')}`,
            );
          }

          filters[key] = value.trim();
        }
      }

      if (!req.validated) {req.validated = {};}
      if (!req.validated.query) {req.validated.query = {};}
      req.validated.query.filters = filters;

      next();
    } catch (error) {
      logValidationFailure({
        validator: 'validateFilters',
        field: 'filters',
        value: req.query,
        reason: error.message,
        context: { url: req.url, method: req.method },
      });

      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createValidationError(error.message, 'filters'));
    }
  };
}

/**
 * Validate query parameters using model metadata
 * Contract v2.0: Metadata-driven validation (ZERO hardcoding!)
 *
 * Usage:
 *   const userMetadata = require('../config/models/user-metadata');
 *   router.get('/', validateQuery(userMetadata), handler);
 *   // Access: req.validated.query.search, req.validated.query.filters,
 *   //         req.validated.query.sortBy, req.validated.query.sortOrder
 *
 * @param {Object} metadata - Model metadata from config/models
 * @param {string[]} metadata.searchableFields - Fields that can be searched
 * @param {string[]} metadata.filterableFields - Fields that can be filtered
 * @param {string[]} metadata.sortableFields - Fields that can be sorted
 * @param {Object} metadata.defaultSort - Default sort configuration
 * @returns {Function} Express middleware
 */
function validateQuery(metadata) {
  const {
    searchableFields: _searchableFields = [],
    filterableFields = [],
    sortableFields = [],
    defaultSort: _defaultSort = { field: 'id', order: 'ASC' },
  } = metadata;

  return (req, res, next) => {
    try {
      if (!req.validated) {req.validated = {};}
      if (!req.validated.query) {req.validated.query = {};}

      // Validate search (optional)
      const search = req.query.search || req.query.q;
      if (search && typeof search === 'string') {
        const trimmed = search.trim();
        if (trimmed.length > 255) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(
            createValidationError('Search query cannot exceed 255 characters', 'search'),
          );
        }
        req.validated.query.search = trimmed.length > 0 ? trimmed : undefined;
      }

      // Validate filters (optional, accept ANY filterable field)
      const filters = {};
      for (const field of filterableFields) {
        // Support both direct filters and operator-based filters
        // e.g., ?role_id=2 or ?priority[gte]=50
        const directValue = req.query[field];
        if (directValue !== undefined) {
          filters[field] = directValue;
        }

        // Check for operator-based filters (field[operator]=value)
        const operators = ['gt', 'gte', 'lt', 'lte', 'in', 'not'];
        for (const op of operators) {
          const opKey = `${field}[${op}]`;
          if (req.query[opKey] !== undefined) {
            if (!filters[field]) {filters[field] = {};}
            if (typeof filters[field] === 'object' && !Array.isArray(filters[field])) {
              filters[field][op] = req.query[opKey];
            } else {
              // If direct value exists, create object
              const directVal = filters[field];
              filters[field] = { [op]: req.query[opKey] };
              if (directVal !== undefined) {
                filters[field].eq = directVal;
              }
            }
          }
        }
      }
      req.validated.query.filters = Object.keys(filters).length > 0 ? filters : undefined;

      // Validate sort (optional)
      const sortBy = req.query.sortBy || req.query.sort;
      const sortOrder = req.query.sortOrder || req.query.order;

      if (sortBy && !sortableFields.includes(sortBy)) {
        logValidationFailure({
          validator: 'validateQuery',
          field: 'sortBy',
          value: sortBy,
          reason: `Field not in sortable list: ${sortableFields.join(', ')}`,
          context: { url: req.url, method: req.method },
        });

        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createValidationError(
            `sortBy must be one of: ${sortableFields.join(', ')}`,
            'sortBy',
          ),
        );
      }

      if (sortOrder && !['asc', 'desc', 'ASC', 'DESC'].includes(sortOrder)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createValidationError('sortOrder must be "asc" or "desc"', 'sortOrder'),
        );
      }

      req.validated.query.sortBy = sortBy;
      req.validated.query.sortOrder = sortOrder;

      next();
    } catch (error) {
      logValidationFailure({
        validator: 'validateQuery',
        field: 'query',
        value: req.query,
        reason: error.message,
        context: { url: req.url, method: req.method },
      });

      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createValidationError(error.message, 'query'),
      );
    }
  };
}

module.exports = {
  validatePagination,
  validateSearch,
  validateSort,
  validateFilters,
  validateQuery, // NEW: Metadata-driven query validation
};
