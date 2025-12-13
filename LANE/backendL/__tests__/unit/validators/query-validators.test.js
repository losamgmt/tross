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
  validateFilters,
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
    it('should set default pagination', () => {
      // Arrange
      const middleware = validatePagination();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.pagination).toEqual({ page: 1, limit: 50, offset: 0 });
      expect(next).toHaveBeenCalled();
    });

    it('should parse page and limit from query', () => {
      // Arrange
      req.query = { page: '2', limit: '25' };
      const middleware = validatePagination();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.pagination).toEqual({ page: 2, limit: 25, offset: 25 });
    });

    it('should use custom limits', () => {
      // Arrange
      const middleware = validatePagination({ defaultLimit: 100, maxLimit: 500 });

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.pagination.limit).toBe(100);
    });

    it('should reject invalid page number', () => {
      // Arrange
      req.query = { page: 'abc' };
      const middleware = validatePagination();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should initialize req.validated if not present', () => {
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
    it('should validate search query', () => {
      // Arrange
      req.query = { search: 'test query' };
      const middleware = validateSearch();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBe('test query');
      expect(next).toHaveBeenCalled();
    });

    it('should trim search query', () => {
      // Arrange
      req.query = { search: '  hello  ' };
      const middleware = validateSearch();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBe('hello');
    });

    it('should accept "q" as alias for search', () => {
      // Arrange
      req.query = { q: 'test' };
      const middleware = validateSearch();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBe('test');
    });

    it('should reject search below minimum length', () => {
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

    it('should reject search above maximum length', () => {
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

    it('should reject empty search when required', () => {
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

    it('should pass through when search not required and not provided', () => {
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
    it('should validate sort with default field', () => {
      // Arrange
      const middleware = validateSort(['name', 'created_at']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortBy).toBe('name');
      expect(req.validated.query.sortOrder).toBe('asc');
      expect(next).toHaveBeenCalled();
    });

    it('should parse sortBy from query', () => {
      // Arrange
      req.query = { sortBy: 'created_at' };
      const middleware = validateSort(['name', 'created_at']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortBy).toBe('created_at');
    });

    it('should parse sortOrder from query', () => {
      // Arrange
      req.query = { sortOrder: 'desc' };
      const middleware = validateSort(['name']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortOrder).toBe('desc');
    });

    it('should accept "sort" as alias for sortBy', () => {
      // Arrange
      req.query = { sort: 'name' };
      const middleware = validateSort(['name', 'id']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortBy).toBe('name');
    });

    it('should accept "order" as alias for sortOrder', () => {
      // Arrange
      req.query = { order: 'DESC' };
      const middleware = validateSort(['name']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortOrder).toBe('desc');
    });

    it('should reject invalid sort field', () => {
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

    it('should reject invalid sort order', () => {
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

    it('should use custom default field', () => {
      // Arrange
      const middleware = validateSort(['name', 'id'], 'id');

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortBy).toBe('id');
    });

    it('should use custom default order', () => {
      // Arrange
      const middleware = validateSort(['name'], null, 'desc');

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortOrder).toBe('desc');
    });

    it('should throw if no allowed fields provided', () => {
      // Assert
      expect(() => validateSort([])).toThrow('at least one allowed field');
    });
  });

  describe('validateFilters', () => {
    it('should validate integer filter', () => {
      // Arrange
      req.query = { age: '25' };
      const schema = { age: { type: 'integer', min: 0, max: 150 } };
      const middleware = validateFilters(schema);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.filters.age).toBe(25);
      expect(next).toHaveBeenCalled();
    });

    it('should validate boolean filter', () => {
      // Arrange
      req.query = { is_active: 'true' };
      const schema = { is_active: { type: 'boolean' } };
      const middleware = validateFilters(schema);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.filters.is_active).toBe(true);
    });

    it('should validate string filter', () => {
      // Arrange
      req.query = { status: 'active' };
      const schema = { status: { type: 'string', allowed: ['active', 'inactive'] } };
      const middleware = validateFilters(schema);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.filters.status).toBe('active');
    });

    it('should trim string filters', () => {
      // Arrange
      req.query = { name: '  test  ' };
      const schema = { name: { type: 'string' } };
      const middleware = validateFilters(schema);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.filters.name).toBe('test');
    });

    it('should skip optional filters', () => {
      // Arrange
      req.query = {};
      const schema = { age: { type: 'integer' } };
      const middleware = validateFilters(schema);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.filters).toEqual({});
      expect(next).toHaveBeenCalled();
    });

    it('should reject string filter not in allowed list', () => {
      // Arrange
      req.query = { status: 'pending' };
      const schema = { status: { type: 'string', allowed: ['active', 'inactive'] } };
      const middleware = validateFilters(schema);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('active, inactive'),
        }),
      );
    });

    it('should reject non-string value for string filter', () => {
      // Arrange
      req.query = { name: 123 };
      const schema = { name: { type: 'string' } };
      const middleware = validateFilters(schema);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateQuery', () => {
    const metadata = {
      searchableFields: ['name', 'email'],
      filterableFields: ['status', 'role_id'],
      sortableFields: ['name', 'created_at', 'id'],
      defaultSort: { field: 'id', order: 'ASC' },
    };

    it('should validate search query', () => {
      // Arrange
      req.query = { search: 'test' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBe('test');
      expect(next).toHaveBeenCalled();
    });

    it('should accept "q" as search alias', () => {
      // Arrange
      req.query = { q: 'test' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBe('test');
    });

    it('should validate filters', () => {
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

    it('should validate operator-based filters', () => {
      // Arrange
      req.query = { 'role_id[gte]': '2' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.filters.role_id).toEqual({ gte: '2' });
    });

    it('should validate sort parameters', () => {
      // Arrange
      req.query = { sortBy: 'name', sortOrder: 'desc' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.sortBy).toBe('name');
      expect(req.validated.query.sortOrder).toBe('desc');
    });

    it('should reject invalid sortBy', () => {
      // Arrange
      req.query = { sortBy: 'invalid' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid sortOrder', () => {
      // Arrange
      req.query = { sortOrder: 'invalid' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject search exceeding max length', () => {
      // Arrange
      req.query = { search: 'a'.repeat(300) };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle empty search gracefully', () => {
      // Arrange
      req.query = { search: '   ' };
      const middleware = validateQuery(metadata);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.query.search).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should initialize req.validated if not present', () => {
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
