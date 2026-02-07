/**
 * Logger Configuration - Simple winston setup
 * KISS principle: Essential logging only
 */

const winston = require("winston");

// Log levels: error, warn, info, debug
const logLevel = process.env.LOG_LEVEL || "info";
const isDevelopment = process.env.NODE_ENV !== "production";

// Simple, clean format for development - KISS!
const prettyFormat = winston.format.printf(
  ({ _level, message, timestamp, ...metadata }) => {
    // Clean, minimal format: timestamp + message
    let msg = `${timestamp} ${message}`;

    // Only show important metadata (skip noise like userAgent, ip for routine requests)
    const importantMeta = {};
    const skipKeys = ["timestamp", "level", "message", "userAgent", "ip"];

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
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    isDevelopment ? prettyFormat : winston.format.json(),
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: isDevelopment
        ? winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({ format: "HH:mm:ss" }),
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
      filename: "logs/error.log",
      level: "error",
    }),
  );

  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  );
}

/**
 * Express middleware for request logging - Clean & Simple
 * EXTENDED: Request ID tracing for distributed debugging
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Generate unique request ID (timestamp + random, 12 chars for tracing)
  req.requestId = `${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
  res.setHeader("X-Request-Id", req.requestId);

  res.on("finish", () => {
    const duration = Date.now() - start;

    // Skip noisy OPTIONS requests in dev
    if (isDevelopment && req.method === "OPTIONS") {
      return;
    }

    // Clean, readable format: [requestId] METHOD /path (status, duration)
    const message = `[${req.requestId}] ${req.method} ${req.url} → ${res.statusCode} (${duration}ms)`;

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
 * Respects severity field: DEBUG uses debug level, others use warn
 */
const logSecurityEvent = (event, details = {}) => {
  const logData = {
    event,
    ...details,
  };

  // Use appropriate log level based on severity
  if (details.severity === "DEBUG") {
    logger.debug("Security Event", logData);
  } else {
    logger.warn("Security Event", logData);
  }
};

module.exports = {
  logger,
  requestLogger,
  logSecurityEvent,
};
