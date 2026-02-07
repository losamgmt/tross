/**
 * Query Builder Service Tests
 *
 * Tests the GENERIC query builder that powers ALL models
 *
 * Coverage:
 * - Search clause building (ILIKE)
 * - Filter clause building (exact match + operators)
 * - Sort clause building (with validation)
 * - Clause combining
 * - Parameter combining
 * - Complete query building (all-in-one)
 * - Edge cases (empty inputs, SQL injection attempts, invalid fields)
 */

const QueryBuilderService = require("../../../services/query-builder-service");

describe("QueryBuilderService", () => {
  // ==========================================================================
  // SEARCH CLAUSE TESTS
  // ==========================================================================

  describe("buildSearchClause", () => {
    const searchableFields = ["first_name", "last_name", "email"];

    test("should build ILIKE search clause for single field", () => {
      const result = QueryBuilderService.buildSearchClause("john", [
        "first_name",
      ]);

      expect(result.clause).toBe("(first_name ILIKE $1)");
      expect(result.params).toEqual(["%john%"]);
      expect(result.paramOffset).toBe(1);
    });

    test("should build ILIKE search clause for multiple fields with OR", () => {
      const result = QueryBuilderService.buildSearchClause(
        "john",
        searchableFields,
      );

      expect(result.clause).toBe(
        "(first_name ILIKE $1 OR last_name ILIKE $2 OR email ILIKE $3)",
      );
      expect(result.params).toEqual(["%john%", "%john%", "%john%"]);
      expect(result.paramOffset).toBe(3);
    });

    test("should handle search term with spaces (trimmed)", () => {
      const result = QueryBuilderService.buildSearchClause(
        "  john  ",
        searchableFields,
      );

      expect(result.params).toEqual(["%john%", "%john%", "%john%"]);
    });

    test("should handle special characters safely (parameterized)", () => {
      const result = QueryBuilderService.buildSearchClause(
        "O'Brien",
        searchableFields,
      );

      expect(result.params).toEqual(["%O'Brien%", "%O'Brien%", "%O'Brien%"]);
    });

    test("should return null clause when search term is empty", () => {
      const result = QueryBuilderService.buildSearchClause(
        "",
        searchableFields,
      );

      expect(result.clause).toBeNull();
      expect(result.params).toEqual([]);
      expect(result.paramOffset).toBe(0);
    });

    test("should return null clause when search term is whitespace only", () => {
      const result = QueryBuilderService.buildSearchClause(
        "   ",
        searchableFields,
      );

      expect(result.clause).toBeNull();
      expect(result.params).toEqual([]);
    });

    test("should return null clause when no searchable fields provided", () => {
      const result = QueryBuilderService.buildSearchClause("john", []);

      expect(result.clause).toBeNull();
      expect(result.params).toEqual([]);
    });

    test("should return null clause when searchTerm is undefined", () => {
      const result = QueryBuilderService.buildSearchClause(
        undefined,
        searchableFields,
      );

      expect(result.clause).toBeNull();
    });

    test("should return null clause when searchTerm is null", () => {
      const result = QueryBuilderService.buildSearchClause(
        null,
        searchableFields,
      );

      expect(result.clause).toBeNull();
    });
  });

  // ==========================================================================
  // FILTER CLAUSE TESTS
  // ==========================================================================

  describe("buildFilterClause", () => {
    const filterableFields = [
      "id",
      "role_id",
      "is_active",
      "priority",
      "created_at",
    ];

    test("should build exact match filter for single field", () => {
      const result = QueryBuilderService.buildFilterClause(
        { role_id: "2" },
        filterableFields,
      );

      expect(result.clause).toBe("role_id = $1");
      expect(result.params).toEqual(["2"]);
      expect(result.paramOffset).toBe(1);
    });

    test("should build multiple filters with AND", () => {
      const result = QueryBuilderService.buildFilterClause(
        { role_id: "2", is_active: "true" },
        filterableFields,
      );

      expect(result.clause).toBe("role_id = $1 AND is_active = $2");
      expect(result.params).toEqual(["2", "true"]);
      expect(result.paramOffset).toBe(2);
    });

    test("should respect paramOffset for combining clauses", () => {
      const result = QueryBuilderService.buildFilterClause(
        { role_id: "2" },
        filterableFields,
        3, // Start at $4
      );

      expect(result.clause).toBe("role_id = $4");
      expect(result.params).toEqual(["2"]);
      expect(result.paramOffset).toBe(4);
    });

    test("should handle greater than operator", () => {
      const result = QueryBuilderService.buildFilterClause(
        { priority: { gt: "5" } },
        filterableFields,
      );

      expect(result.clause).toBe("priority > $1");
      expect(result.params).toEqual(["5"]);
    });

    test("should handle greater than or equal operator", () => {
      const result = QueryBuilderService.buildFilterClause(
        { priority: { gte: "5" } },
        filterableFields,
      );

      expect(result.clause).toBe("priority >= $1");
      expect(result.params).toEqual(["5"]);
    });

    test("should handle less than operator", () => {
      const result = QueryBuilderService.buildFilterClause(
        { priority: { lt: "10" } },
        filterableFields,
      );

      expect(result.clause).toBe("priority < $1");
      expect(result.params).toEqual(["10"]);
    });

    test("should handle less than or equal operator", () => {
      const result = QueryBuilderService.buildFilterClause(
        { priority: { lte: "10" } },
        filterableFields,
      );

      expect(result.clause).toBe("priority <= $1");
      expect(result.params).toEqual(["10"]);
    });

    test("should handle not equal operator", () => {
      const result = QueryBuilderService.buildFilterClause(
        { is_active: { not: "false" } },
        filterableFields,
      );

      expect(result.clause).toBe("is_active != $1");
      expect(result.params).toEqual(["false"]);
    });

    test("should handle IN operator with array", () => {
      const result = QueryBuilderService.buildFilterClause(
        { id: { in: ["1", "2", "3"] } },
        filterableFields,
      );

      expect(result.clause).toBe("id IN ($1, $2, $3)");
      expect(result.params).toEqual(["1", "2", "3"]);
      expect(result.paramOffset).toBe(3);
    });

    test("should handle IN operator with comma-separated string", () => {
      const result = QueryBuilderService.buildFilterClause(
        { id: { in: "1,2,3" } },
        filterableFields,
      );

      expect(result.clause).toBe("id IN ($1, $2, $3)");
      expect(result.params).toEqual(["1", "2", "3"]);
    });

    test("should handle multiple operators on same field", () => {
      const result = QueryBuilderService.buildFilterClause(
        { priority: { gte: "5", lte: "10" } },
        filterableFields,
      );

      expect(result.clause).toContain("priority >= $1");
      expect(result.clause).toContain("priority <= $2");
      expect(result.params).toEqual(["5", "10"]);
    });

    test("should ignore unauthorized fields (SECURITY)", () => {
      const result = QueryBuilderService.buildFilterClause(
        { role_id: "2", malicious_field: "DROP TABLE users" },
        ["role_id"], // Only role_id allowed
      );

      expect(result.clause).toBe("role_id = $1");
      expect(result.params).toEqual(["2"]);
      // malicious_field silently ignored
    });

    test("should return null clause when no filters provided", () => {
      const result = QueryBuilderService.buildFilterClause(
        {},
        filterableFields,
      );

      expect(result.clause).toBeNull();
      expect(result.params).toEqual([]);
    });

    test("should return null clause when filters is undefined", () => {
      const result = QueryBuilderService.buildFilterClause(
        undefined,
        filterableFields,
      );

      expect(result.clause).toBeNull();
    });

    test("should return null clause when all fields unauthorized", () => {
      const result = QueryBuilderService.buildFilterClause(
        { malicious: "value" },
        ["role_id"], // malicious not in list
      );

      expect(result.clause).toBeNull();
      expect(result.params).toEqual([]);
    });
  });

  // ==========================================================================
  // SORT CLAUSE TESTS
  // ==========================================================================

  describe("buildSortClause", () => {
    const sortableFields = ["id", "email", "created_at"];
    const defaultSort = { field: "created_at", order: "DESC" };

    test("should build valid sort clause", () => {
      const result = QueryBuilderService.buildSortClause(
        "email",
        "ASC",
        sortableFields,
        defaultSort,
      );

      expect(result).toBe("email ASC");
    });

    test("should handle lowercase sort order", () => {
      const result = QueryBuilderService.buildSortClause(
        "email",
        "asc",
        sortableFields,
        defaultSort,
      );

      expect(result).toBe("email ASC");
    });

    test("should handle DESC order", () => {
      const result = QueryBuilderService.buildSortClause(
        "created_at",
        "DESC",
        sortableFields,
        defaultSort,
      );

      expect(result).toBe("created_at DESC");
    });

    test("should use default sort when sortBy invalid", () => {
      const result = QueryBuilderService.buildSortClause(
        "invalid_field",
        "ASC",
        sortableFields,
        defaultSort,
      );

      expect(result).toBe("created_at DESC"); // Falls back to default
    });

    test("should use default order when sortOrder invalid", () => {
      const result = QueryBuilderService.buildSortClause(
        "email",
        "INVALID",
        sortableFields,
        defaultSort,
      );

      expect(result).toBe("email DESC"); // Uses defaultSort.order
    });

    test("should use first sortable field when no default provided", () => {
      const result = QueryBuilderService.buildSortClause(
        "invalid_field",
        "ASC",
        sortableFields,
        {}, // No default
      );

      expect(result).toBe("id ASC"); // First field in sortableFields
    });

    test("should use id ASC as ultimate fallback", () => {
      const result = QueryBuilderService.buildSortClause(null, null, [], {});

      expect(result).toBe("id ASC");
    });

    test("should prevent SQL injection in sort field (only whitelisted)", () => {
      const result = QueryBuilderService.buildSortClause(
        "email; DROP TABLE users--",
        "ASC",
        sortableFields,
        defaultSort,
      );

      // Malicious field not in sortableFields, uses default
      expect(result).toBe("created_at DESC");
    });
  });

  // ==========================================================================
  // COMBINING TESTS
  // ==========================================================================

  describe("combineWhereClauses", () => {
    test("should combine multiple clauses with AND", () => {
      const result = QueryBuilderService.combineWhereClauses([
        "age > 18",
        "status = active",
      ]);

      expect(result).toBe("age > 18 AND status = active");
    });

    test("should filter out null clauses", () => {
      const result = QueryBuilderService.combineWhereClauses([
        "age > 18",
        null,
        "status = active",
      ]);

      expect(result).toBe("age > 18 AND status = active");
    });

    test("should filter out empty string clauses", () => {
      const result = QueryBuilderService.combineWhereClauses([
        "age > 18",
        "",
        "status = active",
      ]);

      expect(result).toBe("age > 18 AND status = active");
    });

    test("should return null when no valid clauses", () => {
      const result = QueryBuilderService.combineWhereClauses([
        null,
        "",
        undefined,
      ]);

      expect(result).toBeNull();
    });

    test("should return single clause unchanged", () => {
      const result = QueryBuilderService.combineWhereClauses(["age > 18"]);

      expect(result).toBe("age > 18");
    });

    test("should handle empty array", () => {
      const result = QueryBuilderService.combineWhereClauses([]);

      expect(result).toBeNull();
    });
  });

  describe("combineParams", () => {
    test("should combine multiple parameter arrays", () => {
      const result = QueryBuilderService.combineParams(
        ["%john%", "%john%"],
        ["2", "true"],
      );

      expect(result).toEqual(["%john%", "%john%", "2", "true"]);
    });

    test("should flatten nested arrays", () => {
      const result = QueryBuilderService.combineParams(
        ["a", "b"],
        ["c", "d"],
        ["e", "f"],
      );

      expect(result).toEqual(["a", "b", "c", "d", "e", "f"]);
    });

    test("should filter out null/undefined values", () => {
      const result = QueryBuilderService.combineParams(
        ["a", null, "b"],
        [undefined, "c"],
      );

      expect(result).toEqual(["a", "b", "c"]);
    });

    test("should handle empty arrays", () => {
      const result = QueryBuilderService.combineParams([], [], []);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // COMPLETE QUERY BUILDER TESTS (Integration)
  // ==========================================================================

  describe("buildQuery", () => {
    const metadata = {
      searchableFields: ["first_name", "last_name", "email"],
      filterableFields: ["id", "role_id", "is_active"],
      sortableFields: ["id", "email", "created_at"],
      defaultSort: { field: "created_at", order: "DESC" },
    };

    test("should build complete query with search, filters, and sort", () => {
      const result = QueryBuilderService.buildQuery(
        {
          search: "john",
          filters: { role_id: "2", is_active: "true" },
          sortBy: "email",
          sortOrder: "ASC",
        },
        metadata,
      );

      expect(result.whereClause).toBe(
        "(first_name ILIKE $1 OR last_name ILIKE $2 OR email ILIKE $3) AND role_id = $4 AND is_active = $5",
      );
      expect(result.params).toEqual([
        "%john%",
        "%john%",
        "%john%",
        "2",
        "true",
      ]);
      expect(result.orderByClause).toBe("email ASC");
    });

    test("should build query with only search", () => {
      const result = QueryBuilderService.buildQuery(
        { search: "john" },
        metadata,
      );

      expect(result.whereClause).toBe(
        "(first_name ILIKE $1 OR last_name ILIKE $2 OR email ILIKE $3)",
      );
      expect(result.params).toEqual(["%john%", "%john%", "%john%"]);
      expect(result.orderByClause).toBe("created_at DESC"); // Default
    });

    test("should build query with only filters", () => {
      const result = QueryBuilderService.buildQuery(
        { filters: { role_id: "2" } },
        metadata,
      );

      expect(result.whereClause).toBe("role_id = $1");
      expect(result.params).toEqual(["2"]);
      expect(result.orderByClause).toBe("created_at DESC");
    });

    test("should build query with only sort", () => {
      const result = QueryBuilderService.buildQuery(
        { sortBy: "email", sortOrder: "ASC" },
        metadata,
      );

      expect(result.whereClause).toBeNull();
      expect(result.params).toEqual([]);
      expect(result.orderByClause).toBe("email ASC");
    });

    test("should build query with no options (defaults only)", () => {
      const result = QueryBuilderService.buildQuery({}, metadata);

      expect(result.whereClause).toBeNull();
      expect(result.params).toEqual([]);
      expect(result.orderByClause).toBe("created_at DESC");
    });

    test("should handle complex filters with operators", () => {
      const result = QueryBuilderService.buildQuery(
        {
          search: "admin",
          filters: {
            role_id: { in: ["1", "2"] },
            is_active: "true",
          },
          sortBy: "created_at",
          sortOrder: "DESC",
        },
        metadata,
      );

      expect(result.whereClause).toContain("ILIKE");
      expect(result.whereClause).toContain("role_id IN");
      expect(result.whereClause).toContain("is_active =");
      expect(result.params.length).toBeGreaterThan(0);
      expect(result.orderByClause).toBe("created_at DESC");
    });
  });
});
