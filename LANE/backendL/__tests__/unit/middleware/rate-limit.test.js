/**
 * Rate Limit Middleware - Unit Tests
 *
 * Tests rate limiter configuration and bypass logic
 *
 * KISS: Rate limiters are bypassed in test env,
 * so we just verify they're functions and callable
 */

const {
  apiLimiter,
  authLimiter,
  refreshLimiter,
  passwordResetLimiter,
} = require('../../../middleware/rate-limit');

describe('Rate Limit Middleware', () => {
  describe('Limiter Exports', () => {
    it('should export apiLimiter as function', () => {
      expect(typeof apiLimiter).toBe('function');
    });

    it('should export authLimiter as function', () => {
      expect(typeof authLimiter).toBe('function');
    });

    it('should export refreshLimiter as function', () => {
      expect(typeof refreshLimiter).toBe('function');
    });

    it('should export passwordResetLimiter as function', () => {
      expect(typeof passwordResetLimiter).toBe('function');
    });
  });

  describe('Test Environment Bypass', () => {
    it('should bypass apiLimiter in test env', () => {
      // Arrange
      const req = {};
      const res = {};
      const next = jest.fn();

      // Act
      apiLimiter(req, res, next);

      // Assert - Should call next without modification
      expect(next).toHaveBeenCalled();
    });

    it('should bypass authLimiter in test env', () => {
      // Arrange
      const req = {};
      const res = {};
      const next = jest.fn();

      // Act
      authLimiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    it('should bypass refreshLimiter in test env', () => {
      // Arrange
      const req = {};
      const res = {};
      const next = jest.fn();

      // Act
      refreshLimiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    it('should bypass passwordResetLimiter in test env', () => {
      // Arrange
      const req = {};
      const res = {};
      const next = jest.fn();

      // Act
      passwordResetLimiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Multiple Calls', () => {
    it('should allow unlimited calls in test env (no rate limiting)', () => {
      // Arrange
      const req = {};
      const res = {};
      const next = jest.fn();

      // Act - Call 100 times (would trigger rate limit in prod)
      for (let i = 0; i < 100; i++) {
        apiLimiter(req, res, next);
      }

      // Assert - All calls should succeed
      expect(next).toHaveBeenCalledTimes(100);
    });
  });
});
