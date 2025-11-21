// Clean TrossApp Backend Server
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { HTTP_STATUS, SECURITY } = require('./config/constants');
const { TIMEOUTS } = require('./config/timeouts');
const { logger, requestLogger } = require('./config/logger');
const { securityHeaders, sanitizeInput } = require('./middleware/security');
const {
  apiLimiter,
  authLimiter,
  refreshLimiter: __refreshLimiter,
} = require('./middleware/rate-limit');
const { requestTimeout, timeoutHandler } = require('./middleware/timeout');
const { validateEnvironment } = require('./utils/env-validator');
const { getAllowedOrigins } = require('./config/deployment-adapter');
require('dotenv').config();

// Environment Validation
// Comprehensive validation of all environment variables at startup
// Skipped during tests to allow test-specific configuration
if (process.env.NODE_ENV !== 'test') {
  validateEnvironment();
}

// Legacy production checks (kept for backwards compatibility)
// Note: Most validation now handled by env-validator.js
if (process.env.NODE_ENV === 'production') {
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
    origin: getAllowedOrigins(), // Uses ALLOWED_ORIGINS env var with smart defaults
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

// Health endpoints moved to routes/health.js for SRP
// REMOVED duplicate /api/health - causes route conflict with healthRoutes
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
const customersRoutes = require('./routes/customers');
const techniciansRoutes = require('./routes/technicians');
const workOrdersRoutes = require('./routes/work_orders');
const invoicesRoutes = require('./routes/invoices');
const contractsRoutes = require('./routes/contracts');
const inventoryRoutes = require('./routes/inventory');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, usersRoutes); // RESTful user management
app.use('/api/roles', apiLimiter, roleRoutes);
app.use('/api/customers', apiLimiter, customersRoutes);
app.use('/api/technicians', apiLimiter, techniciansRoutes);
app.use('/api/work_orders', apiLimiter, workOrdersRoutes);
app.use('/api/invoices', apiLimiter, invoicesRoutes);
app.use('/api/contracts', apiLimiter, contractsRoutes);
app.use('/api/inventory', apiLimiter, inventoryRoutes);
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
