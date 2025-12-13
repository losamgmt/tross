/**
 * Validation Logger - Unit Tests
 *
 * Tests validation logging functions
 *
 * KISS: Just verify logger calls, no complex logic
 */

const {
  logValidationFailure,
  logTypeCoercion,
  logValidationSuccess,
} = require('../../../validators/validation-logger');
const { logger } = require('../../../config/logger');

jest.mock('../../../config/logger');

describe('Validation Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logValidationFailure', () => {
    it('should log validation failure at warning level', () => {
      // Arrange
      const params = {
        validator: 'toSafeInteger',
        field: 'id',
        value: 'abc',
        reason: 'Cannot convert to integer',
        context: { url: '/test', method: 'GET' },
      };

      // Act
      logValidationFailure(params);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        '⚠️  Validation failure',
        expect.objectContaining({
          validator: 'toSafeInteger',
          field: 'id',
          value: 'abc',
          valueType: 'string',
          reason: 'Cannot convert to integer',
          url: '/test',
          method: 'GET',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should stringify object values', () => {
      // Arrange
      const params = {
        validator: 'test',
        field: 'data',
        value: { foo: 'bar' },
        reason: 'Invalid object',
      };

      // Act
      logValidationFailure(params);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          value: '{"foo":"bar"}',
          valueType: 'object',
        }),
      );
    });

    it('should work without context', () => {
      // Arrange
      const params = {
        validator: 'test',
        field: 'id',
        value: 123,
        reason: 'Test',
      };

      // Act
      logValidationFailure(params);

      // Assert
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('logTypeCoercion', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should log type coercion in development', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const params = {
        field: 'id',
        originalValue: '123',
        originalType: 'string',
        coercedValue: 123,
        coercedType: 'number',
        reason: 'URL param conversion',
      };

      // Act
      logTypeCoercion(params);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        '🔄 Type coercion',
        expect.objectContaining({
          field: 'id',
          originalValue: '123',
          originalType: 'string',
          coercedValue: 123,
          coercedType: 'number',
          reason: 'URL param conversion',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should not log in production', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const params = {
        field: 'id',
        originalValue: '123',
        originalType: 'string',
        coercedValue: 123,
        coercedType: 'number',
        reason: 'Conversion',
      };

      // Act
      logTypeCoercion(params);

      // Assert
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should not log in test env', () => {
      // Arrange
      process.env.NODE_ENV = 'test';
      const params = {
        field: 'id',
        originalValue: '123',
        originalType: 'string',
        coercedValue: 123,
        coercedType: 'number',
        reason: 'Conversion',
      };

      // Act
      logTypeCoercion(params);

      // Assert
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should stringify object values', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const params = {
        field: 'data',
        originalValue: { foo: 'bar' },
        originalType: 'object',
        coercedValue: null,
        coercedType: 'null',
        reason: 'Null value allowed',
      };

      // Act
      logTypeCoercion(params);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          originalValue: '{"foo":"bar"}',
          coercedValue: 'null',
        }),
      );
    });
  });

  describe('logValidationSuccess', () => {
    it('should log success at debug level', () => {
      // Arrange
      const params = {
        validator: 'toSafeInteger',
        field: 'id',
      };

      // Act
      logValidationSuccess(params);

      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        '✅ Validation success',
        expect.objectContaining({
          validator: 'toSafeInteger',
          field: 'id',
          timestamp: expect.any(String),
        }),
      );
    });
  });
});
