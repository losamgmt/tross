// Clean TrossApp Backend Server
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { HTTP_STATUS, SECURITY } = require('./config/constants');
const { TIMEOUTS } = require('./config/timeouts');
const { logger, requestLogger } = require('./config/logger');
const { healthManager } = require('./services/health-manager');
const { securityHeaders, sanitizeInput } = require('./middleware/security');
const {
  apiLimiter,
  authLimiter,
  refreshLimiter: _refreshLimiter,
} = require('./middleware/rate-limit');
const { requestTimeout, timeoutHandler } = require('./middleware/timeout');
require('dotenv').config();

// Production Environment Validation
// Ensures critical secrets are properly configured before starting the server
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DB_PASSWORD',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
  ];

  // Check for missing environment variables
  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);
  if (missing.length > 0) {
    logger.error(
      '❌ FATAL: Missing required environment variables in production',
      { missing },
    );
    logger.error('Please set the following environment variables:', missing);
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  if (
    process.env.JWT_SECRET === 'dev-secret-key' ||
    process.env.JWT_SECRET.length < 32
  ) {
    logger.error(
      '❌ FATAL: JWT_SECRET must be a strong secret (32+ characters) in production',
    );
    logger.error(
      'Current JWT_SECRET is weak or uses default development value',
    );
    process.exit(1);
  }

  // Validate DB_PASSWORD strength
  if (
    process.env.DB_PASSWORD === 'tross123' ||
    process.env.DB_PASSWORD.length < 12
  ) {
    logger.error(
      '❌ FATAL: DB_PASSWORD must be a strong password (12+ characters) in production',
    );
    logger.error(
      'Current DB_PASSWORD is weak or uses default development value',
    );
    process.exit(1);
  }

  // Optional: Validate Auth0 configuration if using Auth0
  if (process.env.AUTH_MODE === 'auth0') {
    const auth0Required = [
      'AUTH0_DOMAIN',
      'AUTH0_CLIENT_ID',
      'AUTH0_CLIENT_SECRET',
      'AUTH0_AUDIENCE',
    ];
    const auth0Missing = auth0Required.filter((envVar) => !process.env[envVar]);
    if (auth0Missing.length > 0) {
      logger.error('❌ FATAL: Missing Auth0 configuration in production', {
        missing: auth0Missing,
      });
      process.exit(1);
    }
  }

  logger.info('✅ Production environment validation passed');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Essential security middleware
app.use(securityHeaders());

// Request timeout middleware (must be early in chain)
app.use(requestTimeout(TIMEOUTS.REQUEST.DEFAULT_MS));

app.use(requestLogger);
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://trossapp.com', 'https://app.trossapp.com']
        : true, // Allow all origins in development for Flutter's random ports
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
  }),
);
app.use(express.json({ limit: SECURITY.REQUEST_LIMITS.JSON_BODY_SIZE }));
app.use(
  express.urlencoded({
    extended: true,
    limit: SECURITY.REQUEST_LIMITS.URL_ENCODED_SIZE,
  }),
);
app.use(sanitizeInput()); // Input sanitization enabled for security

// API Documentation (Swagger UI)
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TrossApp API Documentation',
  }),
);

// Swagger JSON spec endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Get system health status
 *     description: Returns comprehensive health information about all system services (database, memory, filesystem)
 *     responses:
 *       200:
 *         description: System health information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       503:
 *         description: System is experiencing issues
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 */
app.get('/api/health', async (req, res) => {
  try {
    const health = await healthManager.getSystemHealth();
    const statusCode =
      health.status === 'critical'
        ? HTTP_STATUS.SERVICE_UNAVAILABLE
        : HTTP_STATUS.OK;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check system failed', { error: error.message });
    // Even if health manager fails, return basic server status
    res.status(HTTP_STATUS.OK).json({
      status: 'basic',
      service: 'TrossApp Backend',
      timestamp: new Date().toISOString(),
      message: 'Server running in isolation mode',
      error: 'Health system unavailable',
    });
  }
});

// Individual service health endpoints - DISABLED: Conflicts with /api/health/databases route
// Use healthRoutes instead which has specific handlers
/*
app.get('/api/health/:service', async (req, res) => {
  try {
    const serviceStatus = await healthManager.getServiceStatus(req.params.service);
    res.json(serviceStatus);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      service: req.params.service,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
*/

// API routes with rate limiting
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const devAuthRoutes = require('./routes/dev-auth');
const auth0Routes = require('./routes/auth0');
const healthRoutes = require('./routes/health');
const schemaRoutes = require('./routes/schema');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, usersRoutes); // RESTful user management
app.use('/api/roles', apiLimiter, roleRoutes);
app.use('/api/dev', devAuthRoutes); // Development auth endpoints (no rate limit - dev only)
app.use('/api/health', apiLimiter, healthRoutes); // Health monitoring endpoints
app.use('/api/auth0', authLimiter, auth0Routes); // Auth0 OAuth endpoints - rate limited for brute force protection
app.use('/api/schema', apiLimiter, schemaRoutes); // Schema introspection for auto-generating UIs
app.use('/api', apiLimiter);

// 404 handler for unknown endpoints
app.use((req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    available_endpoints: [
      '/api/health',
      '/api/auth/me',
      '/api/auth/users',
      '/api/roles',
      process.env.USE_TEST_AUTH === 'true' ? '/api/dev/status' : null,
    ].filter(Boolean),
  });
});

// Timeout handler (must be before global error handler)
app.use(timeoutHandler);

// Global error handler
app.use((error, req, res, _next) => {
  logger.error('Server error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Something went wrong',
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown (no hard dependencies)
process.on('SIGTERM', async () => {
  logger.info('📴 Shutting down gracefully...');
  try {
    // Try to close DB connection if available, but don't fail if it's not
    const db = require('./db/connection');
    await db.end();
    logger.info('✅ Database connection closed');
  } catch (_error) {
    logger.warn('⚠️ Database was already disconnected or unavailable');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('📴 SIGINT received, shutting down gracefully');
  try {
    const db = require('./db/connection');
    await db.end();
    logger.info('✅ Database connection closed');
  } catch (_error) {
    logger.warn('⚠️ Database was already disconnected or unavailable');
  }
  process.exit(0);
});

// Start server and test database connection (skip in test mode - supertest handles it)
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, async () => {
    logger.info(`🚀 TrossApp Backend running on port ${PORT}`);
    logger.info(`📍 Health check: http://localhost:${PORT}/api/health`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Configure server-level timeouts
    // Layer 1: Outermost timeout protection
    server.setTimeout(TIMEOUTS.SERVER.REQUEST_TIMEOUT_MS);
    server.keepAliveTimeout = TIMEOUTS.SERVER.KEEP_ALIVE_TIMEOUT_MS;
    server.headersTimeout = TIMEOUTS.SERVER.HEADERS_TIMEOUT_MS;

    logger.info('⏱️  Server timeouts configured:', {
      requestTimeout: `${TIMEOUTS.SERVER.REQUEST_TIMEOUT_MS / 1000}s`,
      keepAliveTimeout: `${TIMEOUTS.SERVER.KEEP_ALIVE_TIMEOUT_MS / 1000}s`,
      headersTimeout: `${TIMEOUTS.SERVER.HEADERS_TIMEOUT_MS / 1000}s`,
    });

    logger.info('⏱️  Request timeouts configured:', {
      defaultTimeout: `${TIMEOUTS.REQUEST.DEFAULT_MS / 1000}s`,
      databaseTimeout: `${TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS / 1000}s`,
      slowRequestThreshold: `${TIMEOUTS.MONITORING.SLOW_REQUEST_MS / 1000}s`,
    });

    // Test database connection on startup
    try {
      const db = require('./db/connection');
      await db.testConnection();
    } catch (_error) {
      logger.error(
        '⚠️ Database connection failed on startup. Server will continue but DB-dependent features will be unavailable.',
      );
    }
  });
}

module.exports = app;
