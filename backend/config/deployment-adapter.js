/**
 * Deployment Environment Adapter
 *
 * Abstracts deployment-specific details so we can swap hosting providers.
 * Supports: Railway, Render, Fly.io, Heroku, and local development.
 *
 * Pattern: All providers must support the same interface, but config formats differ.
 */

const { logger } = require("./logger");

/**
 * Required environment variables (platform-agnostic)
 */
const REQUIRED_ENV_VARS = [
  "NODE_ENV",
  "JWT_SECRET",
  "AUTH0_DOMAIN",
  "AUTH0_AUDIENCE",
  "AUTH0_ISSUER",
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  PORT: 3001,
  BACKEND_PORT: 3001,
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 1000, // Professional standard (GitHub: 5k/hr, we use 1k/15min)
  REQUEST_TIMEOUT_MS: 30000, // 30 seconds
  DB_POOL_MIN: 2,
  DB_POOL_MAX: 20, // Aligned with DATABASE.DEV.POOL.MAX in constants.js
};

/**
 * Deployment platform detection
 */
function detectPlatform() {
  if (process.env.RAILWAY_ENVIRONMENT) {
    return "railway";
  }
  if (process.env.RENDER) {
    return "render";
  }
  if (process.env.FLY_APP_NAME) {
    return "fly";
  }
  if (process.env.DYNO) {
    return "heroku";
  }
  return "local";
}

/**
 * Validate required environment variables
 * @throws {Error} if required variables are missing
 */
function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(", ")}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  logger.info("✅ Environment validation passed", {
    platform: detectPlatform(),
    nodeEnv: process.env.NODE_ENV,
  });
}

/**
 * Get database configuration
 * Supports multiple formats: DATABASE_URL (Railway, Heroku) or individual vars
 * @returns {Object|string} Database configuration
 */
function getDatabaseConfig() {
  // Railway, Render, Heroku provide DATABASE_URL
  if (process.env.DATABASE_URL) {
    logger.info("Using DATABASE_URL for database connection");
    return process.env.DATABASE_URL;
  }

  // Fallback to individual environment variables (local development)
  const config = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "tross_dev",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    min: parseInt(process.env.DB_POOL_MIN || OPTIONAL_ENV_VARS.DB_POOL_MIN),
    max: parseInt(process.env.DB_POOL_MAX || OPTIONAL_ENV_VARS.DB_POOL_MAX),
  };

  logger.info("Using individual DB environment variables", {
    host: config.host,
    port: config.port,
    database: config.database,
  });

  return config;
}

/**
 * Get server port
 * Railway, Render, Heroku inject PORT dynamically
 * @returns {number} Port number
 */
function getPort() {
  // Cloud platforms set PORT dynamically
  const port = parseInt(
    process.env.PORT || process.env.BACKEND_PORT || OPTIONAL_ENV_VARS.PORT,
  );

  logger.info(`Server will listen on port ${port}`);
  return port;
}

/**
 * Get health check path (standard across platforms)
 * @returns {string} Health check endpoint path
 */
function getHealthCheckPath() {
  return "/api/health";
}

/**
 * Get CORS allowed origins
 * @returns {string[]|Function} Array of allowed origins or origin validation function
 */
function getAllowedOrigins() {
  const origins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "";

  // Split by comma, trim whitespace, filter empty
  const originList = origins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  // Always include localhost for development
  if (process.env.NODE_ENV !== "production") {
    originList.push("http://localhost:8080");
    originList.push("http://localhost:3000");
  }

  logger.info("CORS allowed origins configured", { count: originList.length });

  // Return a function that also allows Vercel preview deployments
  // Preview URLs: *-zarika-ambers-projects.vercel.app
  return function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check static origin list
    if (originList.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments (pattern: *-zarika-ambers-projects.vercel.app)
    if (origin.endsWith("-zarika-ambers-projects.vercel.app")) {
      logger.info("CORS: Allowing Vercel preview deployment", { origin });
      return callback(null, true);
    }

    // Allow main Vercel domain
    if (origin === "https://trossapp.vercel.app") {
      return callback(null, true);
    }

    logger.warn("CORS: Origin not allowed", {
      origin,
      allowedCount: originList.length,
    });
    return callback(new Error("Not allowed by CORS"), false);
  };
}

/**
 * Get platform-specific metadata
 * @returns {Object} Platform metadata
 */
function getPlatformMetadata() {
  const platform = detectPlatform();

  const metadata = {
    platform,
    environment: process.env.NODE_ENV || "development",
    region: process.env.FLY_REGION || process.env.RAILWAY_REGION || "unknown",
    deployment: {
      id:
        process.env.RAILWAY_DEPLOYMENT_ID ||
        process.env.RENDER_GIT_COMMIT ||
        process.env.HEROKU_SLUG_COMMIT ||
        "local",
      timestamp: new Date().toISOString(),
    },
  };

  return metadata;
}

/**
 * Check if running in production
 * @returns {boolean}
 */
function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in test environment
 * @returns {boolean}
 */
function isTest() {
  return process.env.NODE_ENV === "test";
}

/**
 * Get rate limiting configuration
 * @returns {Object} Rate limit config
 */
function getRateLimitConfig() {
  return {
    windowMs: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS ||
        OPTIONAL_ENV_VARS.RATE_LIMIT_WINDOW_MS,
    ),
    max: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS ||
        OPTIONAL_ENV_VARS.RATE_LIMIT_MAX_REQUESTS,
    ),
    message: "Too many requests from this IP, please try again later",
  };
}

/**
 * Get request timeout configuration
 * @returns {number} Timeout in milliseconds
 */
function getRequestTimeout() {
  return parseInt(
    process.env.REQUEST_TIMEOUT_MS || OPTIONAL_ENV_VARS.REQUEST_TIMEOUT_MS,
  );
}

module.exports = {
  // Core functions
  validateEnvironment,
  getDatabaseConfig,
  getPort,
  getHealthCheckPath,
  getAllowedOrigins,

  // Platform detection
  detectPlatform,
  getPlatformMetadata,
  isProduction,
  isTest,

  // Configuration getters
  getRateLimitConfig,
  getRequestTimeout,

  // Constants
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS,
};
