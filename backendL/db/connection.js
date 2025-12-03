// Database connection and pool management
const { Pool } = require('pg');
const { logger } = require('../config/logger');
const { DATABASE } = require('../config/constants');
const { TIMEOUTS } = require('../config/timeouts');
require('dotenv').config();

// Determine which database configuration to use based on environment
const isTest = process.env.NODE_ENV === 'test';
const isDevelopment = process.env.NODE_ENV === 'development';

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
  application_name: 'trossapp_test',
};

// Default database configuration (standard PostgreSQL port 5432)
// Used for both development (trossapp_dev) and production (trossapp_prod)
// Actual database determined by DB_NAME environment variable
// Uses constants.js for single source of truth
const defaultDbConfig = {
  user: process.env.DB_USER || DATABASE.DEV.USER,
  host: process.env.DB_HOST || DATABASE.DEV.HOST,
  database: process.env.DB_NAME || DATABASE.DEV.NAME,
  password: process.env.DB_PASSWORD || DATABASE.DEV.PASSWORD,
  port: parseInt(process.env.DB_PORT) || DATABASE.DEV.PORT,

  // Default pool configuration (optimized for performance)
  max: DATABASE.DEV.POOL.MAX,
  min: DATABASE.DEV.POOL.MIN,
  idleTimeoutMillis: TIMEOUTS.DATABASE.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: TIMEOUTS.DATABASE.CONNECTION_TIMEOUT_MS,
  statement_timeout: TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS,
  query_timeout: TIMEOUTS.DATABASE.QUERY_TIMEOUT_MS,
  application_name: 'trossapp_backend',
};

// Create connection pool with appropriate configuration
const poolConfig = isTest ? testDbConfig : defaultDbConfig;
const pool = new Pool(poolConfig);

// Log which database we're connecting to (environment + database name)
if (isTest) {
  logger.info('🧪 Using TEST database', {
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
pool.on('connect', (_client) => {
  logger.debug('New database client connected to pool');
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

// Simple query interface with error logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms`);
    return result;
  } catch (error) {
    logger.error('Query error:', { error: error.message, query: text });
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
          host: productionConfig.host,
          port: productionConfig.port,
          database: productionConfig.database,
          user: productionConfig.user,
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
    logger.error('❌ Error closing database pool:', err.message);
    return false;
  }
};

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
