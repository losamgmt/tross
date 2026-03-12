/**
 * Background Tasks Service
 *
 * SRP LITERALISM: ONLY manages scheduled maintenance tasks
 *
 * PHILOSOPHY:
 * - IN-PROCESS: Uses setInterval (no external dependencies like node-cron)
 * - CONFIGURABLE: Intervals from API_OPERATIONS (SSOT)
 * - GRACEFUL: Clean start/stop for server lifecycle
 * - RESILIENT: Task failures logged, don't crash server
 *
 * TASKS:
 * - Idempotency key cleanup (hourly)
 * - Expired token cleanup (every 6 hours)
 *
 * INTEGRATION:
 *   // In server.js after DB connection confirmed:
 *   const backgroundTasks = require('./services/background-tasks');
 *   backgroundTasks.start();
 *
 *   // On shutdown:
 *   backgroundTasks.stop();
 */

const { API_OPERATIONS } = require('../config/api-operations');
const IdempotencyService = require('./idempotency-service');
const TokenService = require('./token-service');
const { logger } = require('../config/logger');

const { BACKGROUND_TASKS } = API_OPERATIONS;

// Track running intervals for cleanup on shutdown
const runningTasks = new Map();

/**
 * Run a task safely (catch errors, log, continue)
 *
 * @param {string} name - Task identifier for logging
 * @param {Function} taskFn - Async function to execute
 */
async function runTaskSafely(name, taskFn) {
  try {
    // Services log their own success; we only catch errors here
    await taskFn();
  } catch (error) {
    logger.error(`[BackgroundTasks] ${name} failed`, {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Start all background tasks
 *
 * Called once after database connection is confirmed.
 * Safe to call multiple times (idempotent).
 */
function start() {
  // Skip in test mode or if already running
  if (!BACKGROUND_TASKS.ENABLED) {
    logger.debug('[BackgroundTasks] Disabled (test mode)');
    return;
  }

  if (runningTasks.size > 0) {
    logger.warn('[BackgroundTasks] Already running, skipping start');
    return;
  }

  logger.info('[BackgroundTasks] Starting scheduled maintenance tasks');

  // ─────────────────────────────────────────────────────────────
  // Task: Idempotency key cleanup
  // ─────────────────────────────────────────────────────────────
  const idempotencyInterval = setInterval(
    () => runTaskSafely('IdempotencyCleanup', IdempotencyService.cleanup),
    BACKGROUND_TASKS.INTERVALS.IDEMPOTENCY_CLEANUP_MS,
  );
  runningTasks.set('idempotency', idempotencyInterval);

  // ─────────────────────────────────────────────────────────────
  // Task: Expired token cleanup
  // ─────────────────────────────────────────────────────────────
  const tokenInterval = setInterval(
    () => runTaskSafely('TokenCleanup', TokenService.cleanupExpiredTokens),
    BACKGROUND_TASKS.INTERVALS.TOKEN_CLEANUP_MS,
  );
  runningTasks.set('tokens', tokenInterval);

  logger.info('[BackgroundTasks] Scheduled tasks registered', {
    tasks: [...runningTasks.keys()],
    intervals: {
      idempotencyCleanup: `${BACKGROUND_TASKS.INTERVALS.IDEMPOTENCY_CLEANUP_MS / 1000 / 60} min`,
      tokenCleanup: `${BACKGROUND_TASKS.INTERVALS.TOKEN_CLEANUP_MS / 1000 / 60} min`,
    },
  });
}

/**
 * Stop all background tasks
 *
 * Called on server shutdown (SIGTERM/SIGINT).
 * Safe to call multiple times (idempotent).
 */
function stop() {
  if (runningTasks.size === 0) {
    return;
  }

  logger.info('[BackgroundTasks] Stopping scheduled tasks');

  for (const [name, intervalId] of runningTasks) {
    clearInterval(intervalId);
    logger.debug(`[BackgroundTasks] Stopped: ${name}`);
  }

  runningTasks.clear();
  logger.info('[BackgroundTasks] All tasks stopped');
}

/**
 * Run cleanup tasks immediately (for testing or manual maintenance)
 *
 * @returns {Promise<Object>} Results of each cleanup task
 */
async function runNow() {
  const results = {};

  try {
    results.idempotency = await IdempotencyService.cleanup();
  } catch (error) {
    results.idempotency = { error: error.message };
  }

  try {
    results.tokens = await TokenService.cleanupExpiredTokens();
  } catch (error) {
    results.tokens = { error: error.message };
  }

  return results;
}

module.exports = {
  start,
  stop,
  runNow,
};
