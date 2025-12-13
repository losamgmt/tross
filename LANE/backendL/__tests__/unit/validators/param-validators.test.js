/**
 * Param Validators - Unit Tests
 *
 * Tests URL parameter validation:
 * - ID validation and coercion
 * - Multiple ID validation
 * - Slug validation
 *
 * KISS: Test behavior, minimal mocking
 */

const {
  validateIdParam,
  validateIdParams,
  validateSlugParam,
} = require('../../../validators/param-validators');

describe('Param Validators', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      validated: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  describe('validateIdParam', () => {
    it('should validate valid ID and attach to req.validated', () => {
      // Arrange
      req.params.id = '123';
      const middleware = validateIdParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.id).toBe(123);
      expect(req.validatedId).toBe(123); // Legacy support
      expect(next).toHaveBeenCalled();
    });

    it('should validate custom param name', () => {
      // Arrange
      req.params.userId = '456';
      const middleware = validateIdParam({ paramName: 'userId' });

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.userId).toBe(456);
      expect(next).toHaveBeenCalled();
    });

    it('should reject non-numeric ID', () => {
      // Arrange
      req.params.id = 'abc';
      const middleware = validateIdParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          field: 'id',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject ID below minimum', () => {
      // Arrange
      req.params.id = '0';
      const middleware = validateIdParam({ min: 1 });

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
        }),
      );
    });

    it('should reject ID above maximum', () => {
      // Arrange
      req.params.id = '1000';
      const middleware = validateIdParam({ max: 999 });

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
        }),
      );
    });

    it('should coerce string numbers to integers', () => {
      // Arrange
      req.params.id = '42';
      const middleware = validateIdParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.id).toBe(42);
      expect(typeof req.validated.id).toBe('number');
    });

    it('should coerce floating point to integer', () => {
      // Arrange
      req.params.id = '12.5';
      const middleware = validateIdParam();

      // Act
      middleware(req, res, next);

      // Assert - toSafeInteger rounds to 12
      expect(req.validated.id).toBe(12);
      expect(next).toHaveBeenCalled();
    });

    it('should initialize req.validated if not present', () => {
      // Arrange
      delete req.validated;
      req.params.id = '123';
      const middleware = validateIdParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated).toBeDefined();
      expect(req.validated.id).toBe(123);
    });
  });

  describe('validateIdParams', () => {
    it('should validate multiple ID parameters', () => {
      // Arrange
      req.params.userId = '100';
      req.params.roleId = '200';
      const middleware = validateIdParams(['userId', 'roleId']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.userId).toBe(100);
      expect(req.validated.roleId).toBe(200);
      expect(next).toHaveBeenCalled();
    });

    it('should reject if any parameter is invalid', () => {
      // Arrange
      req.params.userId = '100';
      req.params.roleId = 'invalid';
      const middleware = validateIdParams(['userId', 'roleId']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          field: 'params',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate single parameter in array', () => {
      // Arrange
      req.params.userId = '300';
      const middleware = validateIdParams(['userId']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.userId).toBe(300);
      expect(next).toHaveBeenCalled();
    });

    it('should initialize req.validated if not present', () => {
      // Arrange
      delete req.validated;
      req.params.userId = '123';
      const middleware = validateIdParams(['userId']);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated).toBeDefined();
      expect(req.validated.userId).toBe(123);
    });
  });

  describe('validateSlugParam', () => {
    it('should validate valid slug', () => {
      // Arrange
      req.params.slug = 'my-awesome-post';
      const middleware = validateSlugParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.slug).toBe('my-awesome-post');
      expect(next).toHaveBeenCalled();
    });

    it('should validate slug with numbers', () => {
      // Arrange
      req.params.slug = 'post-123';
      const middleware = validateSlugParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.slug).toBe('post-123');
      expect(next).toHaveBeenCalled();
    });

    it('should validate custom param name', () => {
      // Arrange
      req.params.category = 'tech-news';
      const middleware = validateSlugParam({ paramName: 'category' });

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.category).toBe('tech-news');
      expect(next).toHaveBeenCalled();
    });

    it('should reject uppercase letters', () => {
      // Arrange
      req.params.slug = 'My-Post';
      const middleware = validateSlugParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('lowercase letters'),
        }),
      );
    });

    it('should reject special characters', () => {
      // Arrange
      req.params.slug = 'my@post';
      const middleware = validateSlugParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('lowercase letters'),
        }),
      );
    });

    it('should reject empty slug', () => {
      // Arrange
      req.params.slug = '';
      const middleware = validateSlugParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('required'),
        }),
      );
    });

    it('should reject slug below minimum length', () => {
      // Arrange
      req.params.slug = 'ab';
      const middleware = validateSlugParam({ minLength: 3 });

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('between'),
        }),
      );
    });

    it('should reject slug above maximum length', () => {
      // Arrange
      req.params.slug = 'a'.repeat(101);
      const middleware = validateSlugParam({ maxLength: 100 });

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('between'),
        }),
      );
    });

    it('should trim whitespace', () => {
      // Arrange
      req.params.slug = '  my-slug  ';
      const middleware = validateSlugParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated.slug).toBe('my-slug');
      expect(next).toHaveBeenCalled();
    });

    it('should reject spaces in slug', () => {
      // Arrange
      req.params.slug = 'my slug';
      const middleware = validateSlugParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject underscores in slug', () => {
      // Arrange
      req.params.slug = 'my_slug';
      const middleware = validateSlugParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should initialize req.validated if not present', () => {
      // Arrange
      delete req.validated;
      req.params.slug = 'test-slug';
      const middleware = validateSlugParam();

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.validated).toBeDefined();
      expect(req.validated.slug).toBe('test-slug');
    });
  });
});
