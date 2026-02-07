/**
 * Smart Service Mocks
 *
 * PHILOSOPHY:
 * - Metadata-driven: Reads actual schema from config/models/*.js
 * - Domain-aware: Understands filter/search/sort/pagination logic
 * - Future-proof: New entities inherit correct behavior
 * - Override-capable: Opt-in escape hatch for error simulation
 *
 * USAGE:
 *   const { createQueryBuilderMock, createPaginationMock } = require('./mocks/service-mocks');
 *
 *   jest.mock('../../services/query-builder-service', () => createQueryBuilderMock());
 *   jest.mock('../../services/pagination-service', () => createPaginationMock());
 */

/**
 * Create intelligent QueryBuilderService mock
 * Generates realistic SQL clauses and parameters based on actual filter/search inputs
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.overrides - Optional override functions for error simulation
 * @param {Function} options.overrides.buildSearchClause - Override search logic
 * @param {Function} options.overrides.buildFilterClause - Override filter logic
 * @param {Function} options.overrides.buildSortClause - Override sort logic
 * @returns {Object} Mock QueryBuilderService with smart implementations
 */
function createQueryBuilderMock(options = {}) {
  const { overrides = {} } = options;

  return {
    /**
     * Build search clause with ILIKE logic
     * Mimics real QueryBuilderService.buildSearchClause behavior
     */
    buildSearchClause: jest.fn((searchTerm, searchableFields = []) => {
      // ⚠️ Override escape hatch (for error simulation only!)
      if (overrides.buildSearchClause) {
        return overrides.buildSearchClause(searchTerm, searchableFields);
      }

      // No search term or no searchable fields = no clause
      if (!searchTerm || !searchTerm.trim() || searchableFields.length === 0) {
        return { clause: null, params: [], paramOffset: 0 };
      }

      const sanitized = searchTerm.trim();
      const conditions = searchableFields.map(
        (field, index) => `${field} ILIKE $${index + 1}`,
      );
      const clause = `(${conditions.join(" OR ")})`;
      const params = searchableFields.map(() => `%${sanitized}%`);

      return { clause, params, paramOffset: params.length };
    }),

    /**
     * Build filter clause with exact match and operators
     * Mimics real QueryBuilderService.buildFilterClause behavior
     */
    buildFilterClause: jest.fn(
      (filters = {}, filterableFields = [], paramOffset = 0) => {
        // ⚠️ Override escape hatch (for error simulation only!)
        if (overrides.buildFilterClause) {
          return overrides.buildFilterClause(
            filters,
            filterableFields,
            paramOffset,
          );
        }

        // No filters or no filterable fields = no clause
        if (
          !filters ||
          Object.keys(filters).length === 0 ||
          filterableFields.length === 0
        ) {
          return { clause: "", params: [], applied: {}, paramOffset };
        }

        const clauses = [];
        const params = [];
        const applied = {};
        let currentOffset = paramOffset;

        // Process each filter key
        Object.entries(filters).forEach(([key, value]) => {
          // Only process filterable fields
          if (!filterableFields.includes(key)) {
            return;
          }

          // Handle different value types
          if (value === null || value === undefined) {
            clauses.push(`${key} IS NULL`);
            applied[key] = null;
          } else if (typeof value === "object" && !Array.isArray(value)) {
            // Handle operators: { gt: 5, lt: 10 }
            Object.entries(value).forEach(([op, opValue]) => {
              currentOffset++;
              switch (op) {
                case "gt":
                  clauses.push(`${key} > $${currentOffset}`);
                  params.push(opValue);
                  applied[key] = { gt: opValue };
                  break;
                case "gte":
                  clauses.push(`${key} >= $${currentOffset}`);
                  params.push(opValue);
                  applied[key] = { gte: opValue };
                  break;
                case "lt":
                  clauses.push(`${key} < $${currentOffset}`);
                  params.push(opValue);
                  applied[key] = { lt: opValue };
                  break;
                case "lte":
                  clauses.push(`${key} <= $${currentOffset}`);
                  params.push(opValue);
                  applied[key] = { lte: opValue };
                  break;
                case "not":
                  clauses.push(`${key} != $${currentOffset}`);
                  params.push(opValue);
                  applied[key] = { not: opValue };
                  break;
                case "in":
                  // Handle array of values
                  const inValues = Array.isArray(opValue) ? opValue : [opValue];
                  const placeholders = inValues
                    .map((_, idx) => `$${currentOffset + idx}`)
                    .join(", ");
                  clauses.push(`${key} IN (${placeholders})`);
                  params.push(...inValues);
                  currentOffset += inValues.length - 1;
                  applied[key] = { in: inValues };
                  break;
                default:
                  // Unknown operator - skip
                  currentOffset--;
              }
            });
          } else {
            // Simple exact match
            currentOffset++;
            clauses.push(`${key} = $${currentOffset}`);
            params.push(value);
            applied[key] = value;
          }
        });

        return {
          clause: clauses.join(" AND "),
          params,
          applied,
          paramOffset: currentOffset,
        };
      },
    ),

    /**
     * Build sort clause
     * Mimics real QueryBuilderService.buildSortClause behavior
     */
    buildSortClause: jest.fn(
      (sortBy, sortOrder, sortableFields = [], defaultSort = {}) => {
        // ⚠️ Override escape hatch (for error simulation only!)
        if (overrides.buildSortClause) {
          return overrides.buildSortClause(
            sortBy,
            sortOrder,
            sortableFields,
            defaultSort,
          );
        }

        // Determine if requested field is valid
        const isValidField = sortableFields.includes(sortBy);
        const field = isValidField
          ? sortBy
          : defaultSort.field || sortableFields[0] || "id";

        // Determine sort order
        let order;
        if (!isValidField && defaultSort.field) {
          // Using default field → use default order
          order = (defaultSort.order || "ASC").toUpperCase();
        } else {
          // Using requested field → validate requested order
          const upperOrder = sortOrder?.toUpperCase();
          order =
            upperOrder === "ASC" || upperOrder === "DESC"
              ? upperOrder
              : (defaultSort.order || "ASC").toUpperCase();
        }

        return `${field} ${order}`;
      },
    ),

    /**
     * Combine WHERE clauses with AND logic
     * Mimics real QueryBuilderService.combineWhereClauses behavior
     */
    combineWhereClauses: jest.fn((clauses = []) => {
      const validClauses = clauses.filter((c) => c && c.trim());

      if (validClauses.length === 0) {
        return "";
      }

      return validClauses.join(" AND ");
    }),
  };
}

/**
 * Create intelligent PaginationService mock
 * Calculates page/limit/offset with proper clamping and validation
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.overrides - Optional override functions for error simulation
 * @param {Function} options.overrides.validateParams - Override validation logic
 * @param {Function} options.overrides.generateMetadata - Override metadata generation
 * @returns {Object} Mock PaginationService with smart implementations
 */
function createPaginationMock(options = {}) {
  const { overrides = {} } = options;

  const DEFAULTS = {
    PAGE: 1,
    LIMIT: 50,
    MAX_LIMIT: 200,
  };

  return {
    /**
     * Validate and normalize pagination parameters
     * Mimics real PaginationService.validateParams behavior
     */
    validateParams: jest.fn((params = {}) => {
      // ⚠️ Override escape hatch (for error simulation only!)
      if (overrides.validateParams) {
        return overrides.validateParams(params);
      }

      const maxLimit = params.maxLimit || DEFAULTS.MAX_LIMIT;

      // Gracefully clamp values
      const page = Math.max(
        1,
        Math.min(
          parseInt(params.page, 10) || DEFAULTS.PAGE,
          Number.MAX_SAFE_INTEGER,
        ),
      );
      const limit = Math.max(
        1,
        Math.min(parseInt(params.limit, 10) || DEFAULTS.LIMIT, maxLimit),
      );
      const offset = (page - 1) * limit;

      return { page, limit, offset };
    }),

    /**
     * Generate pagination metadata for API response
     * Mimics real PaginationService.generateMetadata behavior
     */
    generateMetadata: jest.fn((page, limit, total) => {
      // ⚠️ Override escape hatch (for error simulation only!)
      if (overrides.generateMetadata) {
        return overrides.generateMetadata(page, limit, total);
      }

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      };
    }),
  };
}

/**
 * Create smart mocks for all services at once
 * Convenience function for common test setup
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.queryBuilderOverrides - QueryBuilder overrides
 * @param {Object} options.paginationOverrides - Pagination overrides
 * @returns {Object} All service mocks
 */
function createSmartMocks(options = {}) {
  return {
    queryBuilder: createQueryBuilderMock({
      overrides: options.queryBuilderOverrides,
    }),
    pagination: createPaginationMock({
      overrides: options.paginationOverrides,
    }),
  };
}

module.exports = {
  createQueryBuilderMock,
  createPaginationMock,
  createSmartMocks,
};
