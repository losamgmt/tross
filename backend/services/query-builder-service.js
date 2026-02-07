/**
 * Query Builder Service
 *
 * SRP LITERALISM: ONLY builds SQL query components from metadata
 *
 * PHILOSOPHY:
 * - GENERIC: Works with ANY model metadata
 * - SECURE: Parameterized queries prevent SQL injection
 * - COMPOSABLE: Each function returns reusable components
 * - PURE: No side effects, no state
 * - JOIN-AWARE: All clauses support table prefixes for unambiguous column references
 *
 * USAGE:
 *   const search = QueryBuilderService.buildSearchClause(term, metadata.searchableFields, 'users');
 *   const filters = QueryBuilderService.buildFilterClause(params, metadata.filterableFields, 0, 'users');
 *   const sort = QueryBuilderService.buildSortClause(sortBy, order, metadata.sortableFields, metadata.defaultSort, 'users');
 *   const where = QueryBuilderService.combineWhereClauses([search.clause, filters.clause]);
 */

class QueryBuilderService {
  // ==========================================================================
  // SEARCH (Text Search with ILIKE)
  // ==========================================================================

  /**
   * Build case-insensitive search clause across multiple fields
   *
   * @param {string} searchTerm - User's search input
   * @param {string[]} searchableFields - Fields to search (from metadata)
   * @param {string} [tablePrefix] - Table name prefix for JOIN queries (optional)
   * @returns {Object} { clause: string, params: array, paramOffset: number }
   *
   * @example
   *   buildSearchClause('john', ['first_name', 'last_name', 'email'], 'users')
   *   // Returns: {
   *   //   clause: '(users.first_name ILIKE $1 OR users.last_name ILIKE $2 OR users.email ILIKE $3)',
   *   //   params: ['%john%', '%john%', '%john%'],
   *   //   paramOffset: 3
   *   // }
   */
  static buildSearchClause(
    searchTerm,
    searchableFields = [],
    tablePrefix = null,
  ) {
    // No search term or no searchable fields = no search clause
    if (!searchTerm || searchableFields.length === 0) {
      return { clause: null, params: [], paramOffset: 0 };
    }

    // Sanitize search term (trim whitespace)
    const sanitized = searchTerm.trim();
    if (sanitized.length === 0) {
      return { clause: null, params: [], paramOffset: 0 };
    }

    // Build ILIKE clause for each field (with optional table prefix)
    const prefix = tablePrefix ? `${tablePrefix}.` : "";
    const conditions = searchableFields.map((field, index) => {
      return `${prefix}${field} ILIKE $${index + 1}`;
    });

    // Combine with OR (match ANY field)
    const clause = `(${conditions.join(" OR ")})`;

    // All params are '%searchTerm%' (case-insensitive partial match)
    const params = searchableFields.map(() => `%${sanitized}%`);

    return {
      clause,
      params,
      paramOffset: params.length,
    };
  }

  // ==========================================================================
  // FILTERS (Exact Match & Operators)
  // ==========================================================================

  /**
   * Build filter clauses from query parameters
   *
   * Supports operators:
   *   - Exact match: ?role_id=2
   *   - Greater than: ?priority[gt]=5
   *   - Greater/equal: ?priority[gte]=5
   *   - Less than: ?priority[lt]=10
   *   - Less/equal: ?priority[lte]=10
   *   - In list: ?id[in]=1,2,3
   *   - Not equal: ?is_active[not]=false
   *
   * @param {Object} filters - Key-value filter object from query params
   * @param {string[]} filterableFields - Fields allowed (from metadata)
   * @param {number} paramOffset - Starting parameter index (for combining clauses)
   * @param {string} [tablePrefix] - Table name prefix for JOIN queries (optional)
   * @returns {Object} { clause: string, params: array, paramOffset: number }
   *
   * @example
   *   buildFilterClause({ role_id: '2', is_active: 'true' }, ['role_id', 'is_active'], 0, 'users')
   *   // Returns: {
   *   //   clause: 'users.role_id = $1 AND users.is_active = $2',
   *   //   params: ['2', 'true'],
   *   //   paramOffset: 2
   *   // }
   */
  static buildFilterClause(
    filters = {},
    filterableFields = [],
    paramOffset = 0,
    tablePrefix = null,
  ) {
    // No filters or no filterable fields = no filter clause
    if (
      !filters ||
      Object.keys(filters).length === 0 ||
      filterableFields.length === 0
    ) {
      return { clause: null, params: [], paramOffset };
    }

    const conditions = [];
    const params = [];
    let currentOffset = paramOffset;
    const prefix = tablePrefix ? `${tablePrefix}.` : "";

    // Process each filter
    for (const [field, value] of Object.entries(filters)) {
      // Security: Only allow whitelisted fields
      if (!filterableFields.includes(field)) {
        continue; // Skip unauthorized fields silently
      }

      // Handle operator-based filters (e.g., priority[gt]=5)
      if (typeof value === "object" && value !== null) {
        const operators = {
          gt: ">",
          gte: ">=",
          lt: "<",
          lte: "<=",
          not: "!=",
          in: "IN",
        };

        for (const [operator, operatorValue] of Object.entries(value)) {
          const sqlOperator = operators[operator];
          if (!sqlOperator) {
            continue;
          } // Unknown operator

          currentOffset++;

          // Special handling for IN operator (expects array)
          if (operator === "in") {
            // Parse comma-separated values
            const values = Array.isArray(operatorValue)
              ? operatorValue
              : operatorValue.split(",").map((v) => v.trim());

            const placeholders = values
              .map((_, i) => `$${currentOffset + i}`)
              .join(", ");
            conditions.push(`${prefix}${field} IN (${placeholders})`);
            params.push(...values);
            currentOffset += values.length - 1; // Adjust for multiple params
          } else {
            conditions.push(
              `${prefix}${field} ${sqlOperator} $${currentOffset}`,
            );
            params.push(operatorValue);
          }
        }
      } else {
        // Simple exact match
        currentOffset++;
        conditions.push(`${prefix}${field} = $${currentOffset}`);
        params.push(value);
      }
    }

    // No valid filters found
    if (conditions.length === 0) {
      return { clause: null, params: [], paramOffset };
    }

    // Combine with AND (match ALL filters)
    const clause = conditions.join(" AND ");

    return {
      clause,
      params,
      paramOffset: currentOffset,
    };
  }

  // ==========================================================================
  // SORT (ORDER BY)
  // ==========================================================================

  /**
   * Build ORDER BY clause with validation
   *
   * @param {string} sortBy - Field to sort by
   * @param {string} sortOrder - 'ASC' or 'DESC'
   * @param {string[]} sortableFields - Fields allowed (from metadata)
   * @param {Object} defaultSort - Fallback sort (from metadata)
   * @param {string} [tablePrefix] - Table name prefix for JOIN queries (optional)
   * @returns {string} ORDER BY clause
   *
   * @example
   *   buildSortClause('created_at', 'desc', ['id', 'created_at'], { field: 'id', order: 'ASC' }, 'users')
   *   // Returns: 'users.created_at DESC'
   */
  static buildSortClause(
    sortBy,
    sortOrder,
    sortableFields = [],
    defaultSort = {},
    tablePrefix = null,
  ) {
    // Determine if we're using the requested field or falling back to default
    const isValidField = sortableFields.includes(sortBy);
    const field = isValidField
      ? sortBy
      : defaultSort.field || sortableFields[0] || "id";

    // If using default field, use default order too (tied together)
    // Otherwise, validate the requested order
    let order;
    if (!isValidField && defaultSort.field) {
      // Using default field → use default order
      order = (defaultSort.order || "ASC").toUpperCase();
    } else {
      // Using requested field → validate requested order
      order =
        sortOrder?.toUpperCase() === "ASC" ||
        sortOrder?.toUpperCase() === "DESC"
          ? sortOrder.toUpperCase()
          : (defaultSort.order || "ASC").toUpperCase();
    }

    const prefix = tablePrefix ? `${tablePrefix}.` : "";
    return `${prefix}${field} ${order}`;
  }

  // ==========================================================================
  // COMBINING CLAUSES
  // ==========================================================================

  /**
   * Combine multiple WHERE clauses with AND
   *
   * @param {string[]} clauses - Array of clause strings (may contain nulls)
   * @returns {string|null} Combined WHERE clause or null if no clauses
   *
   * @example
   *   combineWhereClauses(['age > 18', 'status = active', null])
   *   // Returns: 'age > 18 AND status = active'
   */
  static combineWhereClauses(clauses = []) {
    // Filter out null/undefined/empty clauses
    const validClauses = clauses.filter((c) => c && c.trim().length > 0);

    if (validClauses.length === 0) {
      return null;
    }

    // Combine with AND
    return validClauses.join(" AND ");
  }

  /**
   * Combine all parameters into single array
   *
   * @param {...Array} paramArrays - Multiple parameter arrays
   * @returns {Array} Combined parameters
   *
   * @example
   *   combineParams(['%john%', '%john%'], ['2', 'true'])
   *   // Returns: ['%john%', '%john%', '2', 'true']
   */
  static combineParams(...paramArrays) {
    return paramArrays.flat().filter((p) => p !== undefined && p !== null);
  }

  // ==========================================================================
  // COMPLETE QUERY BUILDER (All-in-One Helper)
  // ==========================================================================

  /**
   * Build complete query components from request options
   *
   * ONE FUNCTION to rule them all! Combines search, filter, sort.
   *
   * @param {Object} options - Request options
   * @param {string} options.search - Search term
   * @param {Object} options.filters - Filter object
   * @param {string} options.sortBy - Sort field
   * @param {string} options.sortOrder - Sort direction
   * @param {Object} metadata - Model metadata
   * @returns {Object} { whereClause, params, orderByClause }
   *
   * @example
   *   buildQuery(
   *     { search: 'john', filters: { is_active: true }, sortBy: 'created_at', sortOrder: 'desc' },
   *     userMetadata
   *   )
   *   // Returns: {
   *   //   whereClause: '(first_name ILIKE $1 OR last_name ILIKE $2) AND is_active = $3',
   *   //   params: ['%john%', '%john%', true],
   *   //   orderByClause: 'created_at DESC'
   *   // }
   */
  static buildQuery(options = {}, metadata = {}) {
    const { search, filters, sortBy, sortOrder } = options;
    const { searchableFields, filterableFields, sortableFields, defaultSort } =
      metadata;

    // Build search clause
    const searchResult = this.buildSearchClause(search, searchableFields);

    // Build filter clause (offset by search params)
    const filterResult = this.buildFilterClause(
      filters,
      filterableFields,
      searchResult.paramOffset,
    );

    // Build sort clause
    const orderByClause = this.buildSortClause(
      sortBy,
      sortOrder,
      sortableFields,
      defaultSort,
    );

    // Combine WHERE clauses
    const whereClause = this.combineWhereClauses([
      searchResult.clause,
      filterResult.clause,
    ]);

    // Combine parameters
    const params = this.combineParams(searchResult.params, filterResult.params);

    return {
      whereClause,
      params,
      orderByClause,
    };
  }
}

module.exports = QueryBuilderService;
