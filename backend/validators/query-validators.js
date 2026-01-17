/**
 * Query String Validators
 *
 * Middleware for validating and coercing query string parameters.
 * Handles pagination, filtering, sorting, and search parameters.
 *
 * All validators attach validated values to req.validated.query = {}
 */
const {
  toSafePagination,
} = require('./type-coercion');
const { logValidationFailure } = require('./validation-logger');
const ResponseFormatter = require('../utils/response-formatter');

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

      return ResponseFormatter.badRequest(res, error.message, [
        { field: 'pagination', message: error.message },
      ]);
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
      return ResponseFormatter.badRequest(res, 'Search query is required', [
        { field: 'search', message: 'Search query is required' },
      ]);
    }

    if (search && typeof search === 'string') {
      const trimmed = search.trim();

      if (trimmed.length < minLength) {
        return ResponseFormatter.badRequest(
          res,
          `Search query must be at least ${minLength} characters`,
          [{ field: 'search', message: `Search query must be at least ${minLength} characters` }],
        );
      }

      if (trimmed.length > maxLength) {
        return ResponseFormatter.badRequest(
          res,
          `Search query cannot exceed ${maxLength} characters`,
          [{ field: 'search', message: `Search query cannot exceed ${maxLength} characters` }],
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

      return ResponseFormatter.badRequest(
        res,
        `sortBy must be one of: ${allowedFields.join(', ')}`,
        [{ field: 'sortBy', message: `sortBy must be one of: ${allowedFields.join(', ')}` }],
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

      return ResponseFormatter.badRequest(
        res,
        'sortOrder must be "asc" or "desc"',
        [{ field: 'sortOrder', message: 'sortOrder must be "asc" or "desc"' }],
      );
    }

    if (!req.validated) {req.validated = {};}
    if (!req.validated.query) {req.validated.query = {};}
    req.validated.query.sortBy = sortBy;
    req.validated.query.sortOrder = sortOrder;

    next();
  };
}

// NOTE: validateFilters has been removed - replaced by validateQuery (metadata-driven)

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
          return ResponseFormatter.badRequest(
            res,
            'Search query cannot exceed 255 characters',
            [{ field: 'search', message: 'Search query cannot exceed 255 characters' }],
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

        return ResponseFormatter.badRequest(
          res,
          `sortBy must be one of: ${sortableFields.join(', ')}`,
          [{ field: 'sortBy', message: `sortBy must be one of: ${sortableFields.join(', ')}` }],
        );
      }

      if (sortOrder && !['asc', 'desc', 'ASC', 'DESC'].includes(sortOrder)) {
        return ResponseFormatter.badRequest(
          res,
          'sortOrder must be "asc" or "desc"',
          [{ field: 'sortOrder', message: 'sortOrder must be "asc" or "desc"' }],
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

      return ResponseFormatter.badRequest(res, error.message, [
        { field: 'query', message: error.message },
      ]);
    }
  };
}

module.exports = {
  validatePagination,
  validateSearch,
  validateSort,
  validateQuery, // Metadata-driven query validation (replaced validateFilters)
};
