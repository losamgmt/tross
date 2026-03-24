// Database connection and pool management
const { Pool, types } = require('pg');
const { logger } = require('../config/logger');
const { DATABASE, DATABASE_PERFORMANCE } = require('../config/constants');
const { TIMEOUTS } = require('../config/timeouts');
const { getDatabaseConfig } = require('../config/deployment-adapter');
require('dotenv').config();

// ============================================================================
// TIMESTAMP TIMEZONE HANDLING
// ============================================================================
// All timestamp columns use PostgreSQL TIMESTAMPTZ (WITH TIME ZONE).
// TIMESTAMPTZ stores values internally as UTC and converts on I/O based on
// session timezone. This eliminates all timezone bugs:
//
//   - Frontend sends: "2026-03-15T17:00:00" (local time, 5pm)
//   - With session TZ=UTC: PostgreSQL converts and stores as UTC
//   - On read: Returns UTC timestamp, pg driver creates Date object
//   - Frontend: Displays in user's local timezone automatically
//
// CONFIGURATION:
// 1. Session timezone set to UTC on connect (pool.on('connect'))
// 2. TIMESTAMPTZ parser returns JS Date (pg default behavior)
// 3. Legacy TIMESTAMP parser kept for compatibility (treats as UTC)
// ============================================================================
const TIMESTAMP_OID = 1114; // TIMESTAMP without timezone (legacy)
const TIMESTAMPTZ_OID = 1184; // TIMESTAMP with timezone (preferred)

// Legacy TIMESTAMP parser - treats raw value as UTC (for backwards compat)
types.setTypeParser(TIMESTAMP_OID, (val) => {
  if (val === null) {
    return null;
  }
  // Append Z to treat the raw timestamp as UTC, not local time
  return new Date(val.replace(' ', 'T') + 'Z');
});

// TIMESTAMPTZ parser - value includes timezone, parse directly
types.setTypeParser(TIMESTAMPTZ_OID, (val) => {
  if (val === null) {
    return null;
  }
  return new Date(val);
});

// Import environment detection from app-mode (SSOT)
const { isTestMode, isLocalDev } = require('../config/app-mode');

// Determine which database configuration to use based on environment
const isTest = isTestMode();
const isDevelopment = isLocalDev();
const useRailwayDB = process.env.DB_ENV === 'railway';

// Railway database configuration (for testing against production DB)
const railwayDbConfig = {
  user: process.env.RAILWAY_DB_USER,
  host: process.env.RAILWAY_DB_HOST,
  database: process.env.RAILWAY_DB_NAME,
  password: process.env.RAILWAY_DB_PASSWORD,
  port: parseInt(process.env.RAILWAY_DB_PORT),
  ssl: {
    rejectUnauthorized: false, // Railway uses self-signed certs
  },

  // Production-like pool configuration
  max: DATABASE.DEV.POOL.MAX,
  min: DATABASE.DEV.POOL.MIN,
  idleTimeoutMillis: TIMEOUTS.DATABASE.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: TIMEOUTS.DATABASE.CONNECTION_TIMEOUT_MS,
  statement_timeout: TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS,
  query_timeout: TIMEOUTS.DATABASE.QUERY_TIMEOUT_MS,
  application_name: 'tross_dev_railway_test',
};

// Test database configuration (port 5433, separate from default on 5432)
// Uses constants.js for single source of truth
const testDbConfig = {
  user: process.env.TEST_DB_USER || DATABASE.TEST.USER,
  host: process.env.TEST_DB_HOST || DATABASE.TEST.HOST,
  database: process.env.TEST_DB_NAME || DATABASE.TEST.NAME,
  password: process.env.TEST_DB_PASSWORD || DATABASE.TEST.PASSWORD,
  port: parseInt(process.env.TEST_DB_PORT) || DATABASE.TEST.PORT,

  // Test pool configuration (smaller, faster cleanup)
  max: DATABASE.TEST.POOL.MAX,
  min: DATABASE.TEST.POOL.MIN,
  idleTimeoutMillis: TIMEOUTS.DATABASE.TEST.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: TIMEOUTS.DATABASE.TEST.CONNECTION_TIMEOUT_MS,
  statement_timeout: TIMEOUTS.DATABASE.TEST.STATEMENT_TIMEOUT_MS,
  query_timeout: TIMEOUTS.DATABASE.TEST.QUERY_TIMEOUT_MS,
  application_name: 'tross_test',
};

// Default database configuration (standard PostgreSQL port 5432)
// Used for both development (tross_dev) and production (tross_prod)
// Supports both DATABASE_URL (Railway/Heroku) and individual env vars (AWS/local)
// Uses deployment-adapter for platform-agnostic configuration
const adapterConfig = getDatabaseConfig();

// Handle both string (DATABASE_URL) and object (individual vars) formats
const defaultDbConfig =
  typeof adapterConfig === 'string'
    ? {
      // DATABASE_URL format - add pool and timeout config
      connectionString: adapterConfig,
      max: DATABASE.DEV.POOL.MAX,
      min: DATABASE.DEV.POOL.MIN,
      idleTimeoutMillis: TIMEOUTS.DATABASE.IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: TIMEOUTS.DATABASE.CONNECTION_TIMEOUT_MS,
      statement_timeout: TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS,
      query_timeout: TIMEOUTS.DATABASE.QUERY_TIMEOUT_MS,
      application_name: 'tross_backend',
    }
    : {
      // Individual vars format - merge with pool and timeout config
      ...adapterConfig,
      max: DATABASE.DEV.POOL.MAX,
      min: DATABASE.DEV.POOL.MIN,
      idleTimeoutMillis: TIMEOUTS.DATABASE.IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: TIMEOUTS.DATABASE.CONNECTION_TIMEOUT_MS,
      statement_timeout: TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS,
      query_timeout: TIMEOUTS.DATABASE.QUERY_TIMEOUT_MS,
      application_name: 'tross_backend',
    };

// Create connection pool with appropriate configuration
const poolConfig = isTest
  ? testDbConfig
  : useRailwayDB
    ? railwayDbConfig
    : defaultDbConfig;
const pool = new Pool(poolConfig);

// Log which database we're connecting to (environment + database name)
if (isTest) {
  logger.info('🧪 Using TEST database', {
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
  });
} else if (useRailwayDB) {
  logger.warn('🚂 Using RAILWAY PRODUCTION database (READ-ONLY TESTING)', {
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
  });
} else if (isDevelopment) {
  logger.info('🔧 Using DEVELOPMENT database', {
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
  });
} else {
  logger.info('� Using PRODUCTION database', {
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
  });
}

// Comprehensive pool event logging and error handling
// Set timezone to UTC on each new connection for consistent TIMESTAMPTZ behavior
// TIMESTAMPTZ stores as UTC internally; session timezone determines display format
pool.on('connect', (client) => {
  client.query('SET timezone = \'UTC\'');
  logger.debug('New database client connected to pool (timezone set to UTC)');
});

pool.on('acquire', (_client) => {
  logger.debug('Client acquired from pool');
});

pool.on('remove', (_client) => {
  logger.debug('Client removed from pool');
});

pool.on('error', (err, _client) => {
  logger.error('Unexpected error on idle database client:', err);
  // Don't exit process - let application handle gracefully
});

// Query interface with slow query logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries for optimization
    if (duration >= DATABASE_PERFORMANCE.SLOW_QUERY_THRESHOLD_MS) {
      logger.warn('🐌 Slow query detected', {
        duration: `${duration}ms`,
        query: text.substring(0, 200), // Truncate long queries
        params: params ? params.length : 0,
        threshold: `${DATABASE_PERFORMANCE.SLOW_QUERY_THRESHOLD_MS}ms`,
      });
    } else {
      logger.debug(`Query executed in ${duration}ms`);
    }

    return result;
  } catch (error) {
    // Logger outputs JSON in production for Railway visibility
    logger.error('Query error', { error: error.message, code: error.code });
    throw error;
  }
};

const getClient = () => pool.connect();

// Test connection with retry logic
const testConnection = async (retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      const result = await client.query(
        'SELECT NOW() as current_time, version() as postgres_version',
      );
      client.release();
      logger.info('✅ Database connection successful', {
        timestamp: result.rows[0].current_time,
        version: result.rows[0].postgres_version.split(' ')[0],
      });
      return true;
    } catch (error) {
      logger.error(
        `❌ Database connection attempt ${attempt}/${retries} failed`,
        {
          error: error.message,
          code: error.code,
          host: poolConfig.host,
          port: poolConfig.port,
          database: poolConfig.database,
          user: poolConfig.user,
        },
      );
      if (attempt < retries) {
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
};

// Graceful shutdown handler
const closePool = async () => {
  try {
    await pool.end();
    logger.info('✅ Database pool closed gracefully');
    return true;
  } catch (err) {
    // "Connection terminated" is expected during forced shutdown
    if (err.message === 'Connection terminated') {
      logger.debug('Pool connection terminated (expected during shutdown)');
      return true;
    }
    logger.error('❌ Error closing database pool:', err.message);
    return false;
  }
};

// Handle process exit signals for graceful shutdown
// This prevents "Connection terminated" errors when Jest uses --forceExit
if (isTest) {
  // In test mode, register exit handlers to close pool before process ends
  const handleExit = () => {
    pool.end().catch(() => {
      // Ignore errors - process is exiting anyway
    });
  };

  process.on('exit', handleExit);
  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}

// Graceful shutdown (alias for compatibility)
const end = () => pool.end();

module.exports = {
  query,
  getClient,
  testConnection,
  end,
  closePool,
  pool,
};
