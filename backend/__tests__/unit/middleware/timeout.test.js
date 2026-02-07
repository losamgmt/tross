/**
 * Timeout Middleware - Unit Tests
 *
 * Tests timeout handling logic:
 * - Request timeout detection
 * - Slow request logging
 * - Duration tracking
 * - Helper functions
 *
 * KISS: Test behavior, not implementation
 */

const {
  requestTimeout,
  timeoutHandler,
  quickTimeout,
  longTimeout,
  getRequestDuration,
  isTimeoutImminent,
  getRemainingTime,
} = require("../../../middleware/timeout");
const { logger } = require("../../../config/logger");

jest.mock("../../../config/logger");

describe("Timeout Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    req = {
      method: "GET",
      path: "/api/test",
      originalUrl: "/api/test?query=1",
      ip: "127.0.0.1",
      get: jest.fn(() => "test-agent"),
      timedout: false,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      on: jest.fn(),
      headersSent: false,
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("requestTimeout", () => {
    test("should set timeout tracking on request", () => {
      // Arrange
      const middleware = requestTimeout(5000);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.startTime).toBeDefined();
      expect(req.timeoutMs).toBe(5000);
      expect(next).toHaveBeenCalled();
    });

    test("should trigger timeout after configured duration", () => {
      // Arrange
      const middleware = requestTimeout(1000);
      middleware(req, res, next);

      // Act
      jest.advanceTimersByTime(1001);

      // Assert
      expect(req.timedout).toBe(true);
      expect(res.status).toHaveBeenCalledWith(408);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Request Timeout",
          timeout: 1000,
        }),
      );
    });

    test("should log timeout with context", () => {
      // Arrange
      req.user = { id: 123 };
      const middleware = requestTimeout(1000);
      middleware(req, res, next);

      // Act
      jest.advanceTimersByTime(1001);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        "Request timeout",
        expect.objectContaining({
          method: "GET",
          path: "/api/test",
          timeoutMs: 1000,
          userId: 123,
        }),
      );
    });

    test("should not send response if headers already sent", () => {
      // Arrange
      res.headersSent = true;
      const middleware = requestTimeout(1000);
      middleware(req, res, next);

      // Act
      jest.advanceTimersByTime(1001);

      // Assert
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test("should call custom onTimeout handler", () => {
      // Arrange
      const onTimeout = jest.fn();
      const middleware = requestTimeout(1000, { onTimeout });
      middleware(req, res, next);
      res.headersSent = true; // Prevent default response

      // Act
      jest.advanceTimersByTime(1001);

      // Assert
      expect(onTimeout).toHaveBeenCalledWith(req, res);
    });

    test("should clear timeout when response finishes", () => {
      // Arrange
      const middleware = requestTimeout(5000);
      let finishCallback;
      res.on.mockImplementation((event, cb) => {
        if (event === "finish") finishCallback = cb;
      });

      // Act
      middleware(req, res, next);
      finishCallback();
      jest.advanceTimersByTime(6000);

      // Assert
      expect(req.timedout).toBe(false);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should log very slow requests", () => {
      // Arrange
      const middleware = requestTimeout(30000);
      let finishCallback;
      res.on.mockImplementation((event, cb) => {
        if (event === "finish") finishCallback = cb;
      });
      middleware(req, res, next);

      // Act - Simulate 15 second request (very slow threshold)
      jest.advanceTimersByTime(15000);
      finishCallback();

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        "Very slow request detected",
        expect.objectContaining({
          method: "GET",
          path: "/api/test",
        }),
      );
    });

    test("should log slow requests", () => {
      // Arrange
      const middleware = requestTimeout(30000);
      let finishCallback;
      res.on.mockImplementation((event, cb) => {
        if (event === "finish") finishCallback = cb;
      });
      middleware(req, res, next);

      // Act - Simulate 6 second request (slow threshold)
      jest.advanceTimersByTime(6000);
      finishCallback();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        "Slow request detected",
        expect.objectContaining({
          method: "GET",
          path: "/api/test",
        }),
      );
    });

    test("should skip if request already timed out", () => {
      // Arrange
      req.timedout = true;
      const middleware = requestTimeout(5000);

      // Act
      middleware(req, res, next);

      // Assert
      expect(req.startTime).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    test("should handle custom timeout handler errors gracefully", () => {
      // Arrange
      const onTimeout = jest.fn(() => {
        throw new Error("Handler error");
      });
      const middleware = requestTimeout(1000, { onTimeout });
      middleware(req, res, next);
      res.headersSent = true;

      // Act
      jest.advanceTimersByTime(1001);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        "Custom timeout handler error",
        expect.objectContaining({ error: "Handler error" }),
      );
    });
  });

  describe("timeoutHandler", () => {
    test("should pass through if request not timed out", () => {
      // Arrange
      req.timedout = false;

      // Act
      timeoutHandler(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should send timeout response if not already sent", () => {
      // Arrange
      req.timedout = true;
      req.startTime = Date.now() - 5000;
      req.timeoutMs = 3000;

      // Act
      timeoutHandler(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(408);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Request Timeout",
          message: "Request processing was terminated due to timeout",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should not send response if headers already sent", () => {
      // Arrange
      req.timedout = true;
      res.headersSent = true;

      // Act
      timeoutHandler(req, res, next);

      // Assert
      expect(res.status).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Helper Functions", () => {
    describe("quickTimeout", () => {
      test("should create 5 second timeout middleware", () => {
        // Act
        const middleware = quickTimeout();
        middleware(req, res, next);

        // Assert
        expect(req.timeoutMs).toBe(5000);
      });
    });

    describe("longTimeout", () => {
      test("should create 90 second timeout middleware", () => {
        // Act
        const middleware = longTimeout();
        middleware(req, res, next);

        // Assert
        expect(req.timeoutMs).toBe(90000);
      });
    });

    describe("getRequestDuration", () => {
      test("should return duration since request start", () => {
        // Arrange
        req.startTime = Date.now() - 2000;

        // Act
        const duration = getRequestDuration(req);

        // Assert
        expect(duration).toBeGreaterThanOrEqual(2000);
        expect(duration).toBeLessThan(2100);
      });

      test("should return 0 if no startTime", () => {
        // Act
        const duration = getRequestDuration(req);

        // Assert
        expect(duration).toBe(0);
      });
    });

    describe("isTimeoutImminent", () => {
      test("should return true when timeout approaching", () => {
        // Arrange
        req.startTime = Date.now() - 4500;
        req.timeoutMs = 5000;

        // Act
        const result = isTimeoutImminent(req, 1000);

        // Assert
        expect(result).toBe(true);
      });

      test("should return false when plenty of time remaining", () => {
        // Arrange
        req.startTime = Date.now() - 1000;
        req.timeoutMs = 5000;

        // Act
        const result = isTimeoutImminent(req, 1000);

        // Assert
        expect(result).toBe(false);
      });

      test("should return false if no timeout configured", () => {
        // Act
        const result = isTimeoutImminent(req);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe("getRemainingTime", () => {
      test("should return remaining milliseconds", () => {
        // Arrange
        req.startTime = Date.now() - 2000;
        req.timeoutMs = 5000;

        // Act
        const remaining = getRemainingTime(req);

        // Assert
        expect(remaining).toBeGreaterThan(2900);
        expect(remaining).toBeLessThanOrEqual(3000);
      });

      test("should return 0 if timeout exceeded", () => {
        // Arrange
        req.startTime = Date.now() - 6000;
        req.timeoutMs = 5000;

        // Act
        const remaining = getRemainingTime(req);

        // Assert
        expect(remaining).toBe(0);
      });

      test("should return Infinity if no timeout configured", () => {
        // Act
        const remaining = getRemainingTime(req);

        // Assert
        expect(remaining).toBe(Infinity);
      });
    });
  });
});
