/**
 * Pagination Service Tests
 * 
 * Tests ONLY pagination logic - no database, no routes
 * SRP LITERALISM: Each test validates ONE behavior
 */

const PaginationService = require("../../../services/pagination-service");

describe("PaginationService", () => {
  describe("validateParams()", () => {
    it("should use defaults when no options provided", () => {
      const result = PaginationService.validateParams();

      expect(result).toEqual({
        page: 1,
        limit: 50,
        offset: 0,
      });
    });

    it("should validate page parameter", () => {
      const result = PaginationService.validateParams({ page: 3 });

      expect(result.page).toBe(3);
      expect(result.offset).toBe(100); // (3-1) * 50
    });

    it("should validate limit parameter", () => {
      const result = PaginationService.validateParams({ limit: 25 });

      expect(result.limit).toBe(25);
    });

    it("should enforce max limit (200 by default)", () => {
      const result = PaginationService.validateParams({ limit: 500 });

      expect(result.limit).toBe(200); // Gracefully capped at MAX_LIMIT
    });

    it("should allow custom max limit", () => {
      const result = PaginationService.validateParams({ 
        limit: 300, 
        maxLimit: 500 
      });

      expect(result.limit).toBe(300);
    });

    it("should cap limit at custom max when exceeded", () => {
      const result = PaginationService.validateParams({ 
        limit: 600, 
        maxLimit: 500 
      });

      expect(result.limit).toBe(500); // Gracefully capped at custom maxLimit
    });

    it("should enforce minimum page of 1", () => {
      const result = PaginationService.validateParams({ page: 0 });

      expect(result.page).toBe(1); // Gracefully capped at minimum
    });

    it("should enforce minimum page for negative values", () => {
      const result = PaginationService.validateParams({ page: -5 });

      expect(result.page).toBe(1); // Gracefully capped at minimum
    });

    it("should enforce minimum limit of 1", () => {
      const result = PaginationService.validateParams({ limit: 0 });

      expect(result.limit).toBe(1); // Gracefully capped at minimum
    });

    it("should calculate correct offset", () => {
      const result = PaginationService.validateParams({ page: 5, limit: 20 });

      expect(result.offset).toBe(80); // (5-1) * 20
    });

    it("should handle string inputs (type coercion)", () => {
      const result = PaginationService.validateParams({ 
        page: "3", 
        limit: "25" 
      });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(50);
    });
  });

  describe("generateMetadata()", () => {
    it("should generate correct metadata for first page", () => {
      const result = PaginationService.generateMetadata(1, 50, 150);

      expect(result).toEqual({
        page: 1,
        limit: 50,
        total: 150,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it("should generate correct metadata for middle page", () => {
      const result = PaginationService.generateMetadata(2, 50, 150);

      expect(result).toEqual({
        page: 2,
        limit: 50,
        total: 150,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it("should generate correct metadata for last page", () => {
      const result = PaginationService.generateMetadata(3, 50, 150);

      expect(result).toEqual({
        page: 3,
        limit: 50,
        total: 150,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      });
    });

    it("should handle partial last page", () => {
      const result = PaginationService.generateMetadata(3, 50, 125);

      expect(result).toEqual({
        page: 3,
        limit: 50,
        total: 125,
        totalPages: 3, // 125 / 50 = 2.5, ceil = 3
        hasNext: false,
        hasPrev: true,
      });
    });

    it("should handle single page", () => {
      const result = PaginationService.generateMetadata(1, 50, 25);

      expect(result).toEqual({
        page: 1,
        limit: 50,
        total: 25,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it("should handle empty results", () => {
      const result = PaginationService.generateMetadata(1, 50, 0);

      expect(result).toEqual({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1, // Always at least 1 page
        hasNext: false,
        hasPrev: false,
      });
    });

    it("should handle page beyond total pages gracefully", () => {
      const result = PaginationService.generateMetadata(10, 50, 25);

      expect(result).toEqual({
        page: 10,
        limit: 50,
        total: 25,
        totalPages: 1,
        hasNext: false,
        hasPrev: true,
      });
    });
  });

  describe("buildLimitClause()", () => {
    it("should build correct SQL LIMIT/OFFSET clause", () => {
      const result = PaginationService.buildLimitClause(50, 100);

      expect(result).toBe("LIMIT 50 OFFSET 100");
    });

    it("should handle zero offset", () => {
      const result = PaginationService.buildLimitClause(25, 0);

      expect(result).toBe("LIMIT 25 OFFSET 0");
    });
  });

  describe("paginate() - Complete Workflow", () => {
    it("should combine validation and metadata generation", () => {
      const result = PaginationService.paginate({ page: 2, limit: 25 }, 150);

      expect(result.params).toEqual({
        page: 2,
        limit: 25,
        offset: 25,
      });

      expect(result.metadata).toEqual({
        page: 2,
        limit: 25,
        total: 150,
        totalPages: 6,
        hasNext: true,
        hasPrev: true,
      });
    });

    it("should work with defaults", () => {
      const result = PaginationService.paginate({}, 100);

      expect(result.params.page).toBe(1);
      expect(result.params.limit).toBe(50);
      expect(result.metadata.total).toBe(100);
      expect(result.metadata.totalPages).toBe(2);
    });
  });

  describe("DEFAULTS", () => {
    it("should export default constants", () => {
      expect(PaginationService.DEFAULTS).toEqual({
        PAGE: 1,
        LIMIT: 50,
        MAX_LIMIT: 200,
      });
    });
  });
});
