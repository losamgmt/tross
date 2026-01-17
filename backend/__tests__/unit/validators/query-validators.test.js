/**
 * Query Validators - Unit Tests
 *
 * Tests query string parameter validation
 *
 * KISS: Test behavior, minimal mocking
 */

const {
  validatePagination,
  validateSearch,
  validateSort,
  validateQuery,
} = require('../../../validators/query-validators');

jest.mock('../../../validators/validation-logger');

describe('Query Validators', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
      validated: {},
      url: '/test',
      method: 'GET',
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  describe('validatePagination', () => {
    test('should set default pagination', () => {
      // Arrange
      const middleware = validatePagination();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.pagination).toEqual({ page: 1, limit: 50, offset: 0 });
      expect(next).toHaveBeenCalled();
    });

    test('should parse page and limit from query', () => {
      // Arrange
      req.query = { page: '2', limit: '25' };
      const middleware = validatePagination();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.pagination).toEqual({ page: 2, limit: 25, offset: 25 });
    });

    test('should use custom limits', () => {
      // Arrange
      const middleware = validatePagination({ defaultLimit: 100, maxLimit: 500 });

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.pagination.limit).toBe(100);
    });

    test('should reject invalid page number', () => {
      // Arrange
      req.query = { page: 'abc' };
      const middleware = validatePagination();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should initialize req.validated if not present', () => {
      // Arrange
      delete req.validated;
      const middleware = validatePagination();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated).toBeDefined();
    });
  });

  describe('validateSearch', () => {
    test('should validate search query', () => {
      // Arrange
      req.query = { search: 'test query' };
      const middleware = validateSearch();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBe('test query');
      expect(next).toHaveBeenCalled();
    });

    test('should trim search query', () => {
      // Arrange
      req.query = { search: '  hello  ' };
      const middleware = validateSearch();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBe('hello');
    });

    test('should accept "q" as alias for search', () => {
      // Arrange
      req.query = { q: 'test' };
      const middleware = validateSearch();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBe('test');
    });

    test('should reject search below minimum length', () => {
      // Arrange
      req.query = { search: 'a' };
      const middleware = validateSearch({ minLength: 2 });

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('at least 2 characters'),
        }),
      );
    });

    test('should reject search above maximum length', () => {
      // Arrange
      req.query = { search: 'a'.repeat(101) };
      const middleware = validateSearch({ maxLength: 100 });

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('cannot exceed 100 characters'),
        }),
      );
    });

    test('should reject empty search when required', () => {
      // Arrange
      req.query = {};
      const middleware = validateSearch({ required: true });

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Search query is required',
        }),
      );
    });

    test('should pass through when search not required and not provided', () => {
      // Arrange
      req.query = {};
      const middleware = validateSearch();

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateSort', () => {
    test('should validate sort with default field', () => {
      // Arrange
      const middleware = validateSort(['name', 'created_at']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortBy).toBe('name');
      expect(req.validated.query.sortOrder).toBe('asc');
      expect(next).toHaveBeenCalled();
    });

    test('should parse sortBy from query', () => {
      // Arrange
      req.query = { sortBy: 'created_at' };
      const middleware = validateSort(['name', 'created_at']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortBy).toBe('created_at');
    });

    test('should parse sortOrder from query', () => {
      // Arrange
      req.query = { sortOrder: 'desc' };
      const middleware = validateSort(['name']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortOrder).toBe('desc');
    });

    test('should accept "sort" as alias for sortBy', () => {
      // Arrange
      req.query = { sort: 'name' };
      const middleware = validateSort(['name', 'id']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortBy).toBe('name');
    });

    test('should accept "order" as alias for sortOrder', () => {
      // Arrange
      req.query = { order: 'DESC' };
      const middleware = validateSort(['name']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortOrder).toBe('desc');
    });

    test('should reject invalid sort field', () => {
      // Arrange
      req.query = { sortBy: 'invalid_field' };
      const middleware = validateSort(['name', 'created_at']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('name, created_at'),
        }),
      );
    });

    test('should reject invalid sort order', () => {
      // Arrange
      req.query = { sortOrder: 'invalid' };
      const middleware = validateSort(['name']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('asc" or "desc'),
        }),
      );
    });

    test('should use custom default field', () => {
      // Arrange
      const middleware = validateSort(['name', 'id'], 'id');

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortBy).toBe('id');
    });

    test('should use custom default order', () => {
      // Arrange
      const middleware = validateSort(['name'], null, 'desc');

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortOrder).toBe('desc');
    });

    test('should throw if no allowed fields provided', () => {
      // Assert
      expect(() => validateSort([])).toThrow('at least one allowed field');
    });
  });

  // NOTE: validateFilters tests removed - replaced by validateQuery (metadata-driven)

  describe('validateQuery', () => {
    const metadata = {
      searchableFields: ['name', 'email'],
      filterableFields: ['status', 'role_id'],
      sortableFields: ['name', 'created_at', 'id'],
      defaultSort: { field: 'id', order: 'ASC' },
    };

    test('should validate search query', () => {
      // Arrange
      req.query = { search: 'test' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBe('test');
      expect(next).toHaveBeenCalled();
    });

    test('should accept "q" as search alias', () => {
      // Arrange
      req.query = { q: 'test' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBe('test');
    });

    test('should validate filters', () => {
      // Arrange
      req.query = { status: 'active', role_id: '2' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.filters).toEqual({
        status: 'active',
        role_id: '2',
      });
    });

    test('should validate operator-based filters', () => {
      // Arrange
      req.query = { 'role_id[gte]': '2' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.filters.role_id).toEqual({ gte: '2' });
    });

    test('should validate sort parameters', () => {
      // Arrange
      req.query = { sortBy: 'name', sortOrder: 'desc' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortBy).toBe('name');
      expect(req.validated.query.sortOrder).toBe('desc');
    });

    test('should reject invalid sortBy', () => {
      // Arrange
      req.query = { sortBy: 'invalid' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject invalid sortOrder', () => {
      // Arrange
      req.query = { sortOrder: 'invalid' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject search exceeding max length', () => {
      // Arrange
      req.query = { search: 'a'.repeat(300) };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should handle empty search gracefully', () => {
      // Arrange
      req.query = { search: '   ' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    test('should initialize req.validated if not present', () => {
      // Arrange
      delete req.validated;
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated).toBeDefined();
      expect(req.validated.query).toBeDefined();
    });
  });
});
