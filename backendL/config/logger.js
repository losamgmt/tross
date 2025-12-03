/**
 * Logger Configuration - Simple winston setup
 * KISS principle: Essential logging only
 */

const winston = require('winston');

// Log levels: error, warn, info, debug
const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV !== 'production';

// Simple, clean format for development - KISS!
const prettyFormat = winston.format.printf(
  ({ _level, message, timestamp, ...metadata }) => {
    // Clean, minimal format: timestamp + message
    let msg = `${timestamp} ${message}`;

    // Only show important metadata (skip noise like userAgent, ip for routine requests)
    const importantMeta = {};
    const skipKeys = ['timestamp', 'level', 'message', 'userAgent', 'ip'];

    Object.keys(metadata).forEach((key) => {
      if (!skipKeys.includes(key) && metadata[key] !== undefined) {
        importantMeta[key] = metadata[key];
      }
    });

    // Add metadata only if something important to show
    if (Object.keys(importantMeta).length > 0) {
      msg += ` ${JSON.stringify(importantMeta)}`;
    }

    return msg;
  },
);

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    isDevelopment ? prettyFormat : winston.format.json(),
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: isDevelopment
        ? winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          prettyFormat,
        )
        : winston.format.json(),
    }),
  ],
});

// Add file logging in production
if (!isDevelopment) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  );
}

/**
 * Express middleware for request logging - Clean & Simple
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Skip noisy OPTIONS requests in dev
    if (isDevelopment && req.method === 'OPTIONS') {
      return;
    }

    // Clean, readable format: METHOD /path (status, duration)
    const message = `${req.method} ${req.url} → ${res.statusCode} (${duration}ms)`;

    if (res.statusCode >= 400) {
      logger.warn(`⚠️  ${message}`);
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      logger.info(`✅ ${message}`);
    } else {
      logger.info(`ℹ️  ${message}`);
    }
  });

  next();
};

/**
 * Log security events
 */
const logSecurityEvent = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

module.exports = {
  logger,
  requestLogger,
  logSecurityEvent,
};
