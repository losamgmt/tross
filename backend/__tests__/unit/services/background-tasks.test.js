/**
 * Background Tasks Service Unit Tests
 *
 * Tests start/stop/runNow lifecycle with timer mocking
 * Pattern: jest.useFakeTimers() for interval control
 */

// Must mock config BEFORE requiring the module (ENABLED check happens on load)
const mockConfig = {
  ENABLED: true,
  INTERVALS: {
    IDEMPOTENCY_CLEANUP_MS: 60 * 60 * 1000, // 1 hour
    TOKEN_CLEANUP_MS: 6 * 60 * 60 * 1000, // 6 hours
  },
};

jest.mock('../../../config/api-operations', () => ({
  API_OPERATIONS: {
    BACKGROUND_TASKS: mockConfig,
  },
}));

jest.mock('../../../services/idempotency-service', () => ({
  cleanup: jest.fn().mockResolvedValue(5),
}));

jest.mock('../../../services/token-service', () => ({
  cleanupExpiredTokens: jest.fn().mockResolvedValue(3),
}));

jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('background-tasks', () => {
  let backgroundTasks;
  let IdempotencyService;
  let TokenService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Reset module state between tests (clears runningTasks Map)
    jest.resetModules();

    // Re-mock after resetModules
    jest.doMock('../../../config/api-operations', () => ({
      API_OPERATIONS: {
        BACKGROUND_TASKS: mockConfig,
      },
    }));

    jest.doMock('../../../services/idempotency-service', () => ({
      cleanup: jest.fn().mockResolvedValue(5),
    }));

    jest.doMock('../../../services/token-service', () => ({
      cleanupExpiredTokens: jest.fn().mockResolvedValue(3),
    }));

    jest.doMock('../../../config/logger', () => ({
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    }));

    // Re-require with fresh mocks
    backgroundTasks = require('../../../services/background-tasks');
    IdempotencyService = require('../../../services/idempotency-service');
    TokenService = require('../../../services/token-service');
  });

  afterEach(() => {
    // Ensure tasks stopped to avoid leaks
    backgroundTasks.stop();
    jest.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════
  // start()
  // ═══════════════════════════════════════════════════════════════

  describe('start()', () => {
    test('registers scheduled tasks when enabled', () => {
      const { logger } = require('../../../config/logger');

      backgroundTasks.start();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting scheduled'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('registered'),
        expect.objectContaining({
          tasks: expect.arrayContaining(['idempotency', 'tokens']),
        }),
      );
    });

    test('is idempotent (second call is no-op)', () => {
      const { logger } = require('../../../config/logger');

      backgroundTasks.start();
      backgroundTasks.start(); // Second call

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Already running'),
      );
    });

    test('executes idempotency cleanup on interval', async () => {
      backgroundTasks.start();

      // Should not have been called yet
      expect(IdempotencyService.cleanup).not.toHaveBeenCalled();

      // Advance past first interval
      jest.advanceTimersByTime(mockConfig.INTERVALS.IDEMPOTENCY_CLEANUP_MS);

      // Wait for promise to resolve
      await Promise.resolve();

      expect(IdempotencyService.cleanup).toHaveBeenCalledTimes(1);
    });

    test('executes token cleanup on interval', async () => {
      backgroundTasks.start();

      expect(TokenService.cleanupExpiredTokens).not.toHaveBeenCalled();

      jest.advanceTimersByTime(mockConfig.INTERVALS.TOKEN_CLEANUP_MS);
      await Promise.resolve();

      expect(TokenService.cleanupExpiredTokens).toHaveBeenCalledTimes(1);
    });

    test('continues running after task failure', async () => {
      const { logger } = require('../../../config/logger');
      IdempotencyService.cleanup.mockRejectedValueOnce(new Error('DB error'));

      backgroundTasks.start();

      // First interval - will fail
      jest.advanceTimersByTime(mockConfig.INTERVALS.IDEMPOTENCY_CLEANUP_MS);
      await Promise.resolve();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        expect.objectContaining({ error: 'DB error' }),
      );

      // Reset mock for next success
      IdempotencyService.cleanup.mockResolvedValue(5);

      // Second interval - should still work
      jest.advanceTimersByTime(mockConfig.INTERVALS.IDEMPOTENCY_CLEANUP_MS);
      await Promise.resolve();

      expect(IdempotencyService.cleanup).toHaveBeenCalledTimes(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // stop()
  // ═══════════════════════════════════════════════════════════════

  describe('stop()', () => {
    test('clears all running intervals', () => {
      const { logger } = require('../../../config/logger');

      backgroundTasks.start();
      backgroundTasks.stop();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('All tasks stopped'),
      );
    });

    test('is idempotent (second call is no-op)', () => {
      const { logger } = require('../../../config/logger');

      backgroundTasks.start();
      backgroundTasks.stop();
      logger.info.mockClear();

      backgroundTasks.stop(); // Second call

      // Should not log "Stopping" again
      expect(logger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Stopping'),
      );
    });

    test('prevents further task execution', async () => {
      backgroundTasks.start();
      backgroundTasks.stop();

      // Advance time past interval
      jest.advanceTimersByTime(mockConfig.INTERVALS.IDEMPOTENCY_CLEANUP_MS * 2);
      await Promise.resolve();

      // Should not have been called (intervals cleared)
      expect(IdempotencyService.cleanup).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // runNow()
  // ═══════════════════════════════════════════════════════════════

  describe('runNow()', () => {
    test('executes all cleanup tasks immediately', async () => {
      const results = await backgroundTasks.runNow();

      expect(IdempotencyService.cleanup).toHaveBeenCalledTimes(1);
      expect(TokenService.cleanupExpiredTokens).toHaveBeenCalledTimes(1);
      expect(results).toEqual({
        idempotency: 5,
        tokens: 3,
      });
    });

    test('reports errors for failed tasks', async () => {
      IdempotencyService.cleanup.mockRejectedValue(new Error('Idem error'));
      TokenService.cleanupExpiredTokens.mockRejectedValue(new Error('Token error'));

      const results = await backgroundTasks.runNow();

      expect(results.idempotency).toEqual({ error: 'Idem error' });
      expect(results.tokens).toEqual({ error: 'Token error' });
    });

    test('continues after first task fails', async () => {
      IdempotencyService.cleanup.mockRejectedValue(new Error('Idem error'));
      TokenService.cleanupExpiredTokens.mockResolvedValue(3);

      const results = await backgroundTasks.runNow();

      expect(results.idempotency).toEqual({ error: 'Idem error' });
      expect(results.tokens).toBe(3);
    });

    test('works independently of start/stop state', async () => {
      // Never called start()
      const results = await backgroundTasks.runNow();

      expect(results.idempotency).toBe(5);
      expect(results.tokens).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DISABLED IN TEST MODE
  // ═══════════════════════════════════════════════════════════════

  describe('test mode disabled', () => {
    test('start() does nothing when ENABLED is false', () => {
      // Reset and re-require with ENABLED=false
      jest.resetModules();

      jest.doMock('../../../config/api-operations', () => ({
        API_OPERATIONS: {
          BACKGROUND_TASKS: {
            ENABLED: false,
            INTERVALS: mockConfig.INTERVALS,
          },
        },
      }));

      jest.doMock('../../../config/logger', () => ({
        logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        },
      }));

      const disabledTasks = require('../../../services/background-tasks');
      const { logger } = require('../../../config/logger');

      disabledTasks.start();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Disabled'),
      );
      expect(logger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Starting'),
      );
    });
  });
});
