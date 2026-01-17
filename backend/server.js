// Clean TrossApp Backend Server
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { HTTP_STATUS, SECURITY } = require('./config/constants');
const { TIMEOUTS } = require('./config/timeouts');
const { logger, requestLogger } = require('./config/logger');
const { securityHeaders, sanitizeInput } = require('./middleware/security');
const { apiLimiter, authLimiter } = require('./middleware/rate-limit');
const { requestTimeout, timeoutHandler } = require('./middleware/timeout');
const { validateEnvironment } = require('./utils/env-validator');
const { getAllowedOrigins } = require('./config/deployment-adapter');
const { initializeDatabase } = require('./scripts/init-database');
require('dotenv').config();

// Environment Validation
// Comprehensive validation of all environment variables at startup
// Skipped during tests to allow test-specific configuration
if (process.env.NODE_ENV !== 'test') {
  const result = validateEnvironment({ exitOnError: true });
  if (!result.valid) {
    // exitOnError: true will have already called process.exit(1)
    // This is a fallback for defensive programming
    process.exit(1);
  }
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

// Trust proxy for Railway/Vercel (required for rate limiting behind reverse proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Essential security middleware
app.use(securityHeaders());

// Request timeout middleware (must be early in chain)
app.use(requestTimeout(TIMEOUTS.REQUEST.DEFAULT_MS));

app.use(requestLogger);
app.use(
  cors({
    origin: getAllowedOrigins(), // Uses ALLOWED_ORIGINS env var with smart defaults
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Filename', 'X-Category', 'X-Description'],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
  }),
);

// Raw body parser for file uploads (must be before JSON parser for /api/files routes)
app.use('/api/files', express.raw({
  type: ['image/*', 'application/pdf', 'text/*'],
  limit: '10mb',
}));

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
const devAuthRoutes = require('./routes/dev-auth');
const auth0Routes = require('./routes/auth0');
const healthRoutes = require('./routes/health');
const schemaRoutes = require('./routes/schema');
const preferencesRoutes = require('./routes/preferences');
const rolesExtensions = require('./routes/roles-extensions');
const statsRoutes = require('./routes/stats');
const exportRoutes = require('./routes/export');
const auditRoutes = require('./routes/audit');
const filesRoutes = require('./routes/files');
const adminRoutes = require('./routes/admin');

// Metadata-driven entity route loading (replaces hardcoded entity router imports)
const { loadEntityRoutes } = require('./config/route-loader');
const entityRoutes = loadEntityRoutes();

// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth0', authLimiter, auth0Routes); // Auth0 OAuth endpoints
app.use('/api/dev', devAuthRoutes); // Development auth (no rate limit - dev only)

// =============================================================================
// ENTITY CRUD ROUTES (Metadata-Driven)
// Loaded dynamically from config/models/* based on routeConfig.useGenericRouter
// =============================================================================
for (const { path, router } of entityRoutes) {
  app.use(path, apiLimiter, router);
}

// Entity-specific extensions (not generic - kept explicit)
app.use('/api/roles', apiLimiter, rolesExtensions); // Extension: /:id/users

// =============================================================================
// CUSTOM ENTITY ROUTES (specialized logic, not generic CRUD)
// =============================================================================
app.use('/api/preferences', apiLimiter, preferencesRoutes); // Shared-PK pattern
app.use('/api/files', apiLimiter, filesRoutes); // Polymorphic attachments + streaming

// =============================================================================
// INFRASTRUCTURE & UTILITY ROUTES (not entity-driven)
// =============================================================================
app.use('/api/health', apiLimiter, healthRoutes); // Health monitoring
app.use('/api/schema', apiLimiter, schemaRoutes); // Schema introspection for UI generation
app.use('/api/stats', apiLimiter, statsRoutes); // Aggregation endpoints
app.use('/api/export', apiLimiter, exportRoutes); // CSV export
app.use('/api/audit', apiLimiter, auditRoutes); // Audit log queries
app.use('/api/admin', apiLimiter, adminRoutes); // Admin system management
app.use('/api', apiLimiter); // Catch-all rate limiting

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

// Global error handler - SINGLE SOURCE OF TRUTH for error-to-response mapping
// Services throw plain Error objects; this handler maps them to HTTP responses
app.use((error, req, res, _next) => {
  // Determine status code from error properties or message patterns
  let statusCode = error.statusCode || error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = error.code || 'INTERNAL_ERROR';

  // Pattern matching for common error messages (services stay simple)
  const message = error.message || '';
  const messageLower = message.toLowerCase();

  if (!error.statusCode && !error.status) {
    // Not Found patterns
    if (messageLower.includes('not found') || messageLower.includes('does not exist')) {
      statusCode = HTTP_STATUS.NOT_FOUND;
      errorCode = 'NOT_FOUND';
    }
    // Bad Request patterns
    // Note: "cannot read properties" is JS internal error, not validation
    else if (
      messageLower.includes('invalid') ||
      messageLower.includes('required') ||
      (messageLower.includes('cannot') && !messageLower.includes('cannot read properties')) ||
      messageLower.includes('must be') ||
      messageLower.includes('already exists') ||
      messageLower.includes('yourself') ||
      messageLower.includes('not a foreign key')
    ) {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      errorCode = 'BAD_REQUEST';
    }
    // Unauthorized patterns
    else if (
      messageLower.includes('expired') ||
      messageLower.includes('unauthorized') ||
      messageLower.includes('not authenticated')
    ) {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
      errorCode = 'UNAUTHORIZED';
    }
    // Forbidden patterns
    else if (messageLower.includes('forbidden') || messageLower.includes('not allowed')) {
      statusCode = HTTP_STATUS.FORBIDDEN;
      errorCode = 'FORBIDDEN';
    }
    // Conflict patterns
    else if (messageLower.includes('conflict') || messageLower.includes('duplicate')) {
      statusCode = HTTP_STATUS.CONFLICT;
      errorCode = 'CONFLICT';
    }
  }

  // Log based on severity (5xx = error, 4xx = warn)
  const logContext = {
    error: message,
    code: errorCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
  };

  if (statusCode >= 500) {
    logContext.stack = error.stack;
    logger.error('Server error', logContext);
  } else {
    logger.warn('Client error', logContext);
  }

  // Build consistent response
  const response = {
    success: false,
    error: errorCode,
    message: statusCode >= 500 && process.env.NODE_ENV !== 'development'
      ? 'Something went wrong'
      : message,
    timestamp: new Date().toISOString(),
  };

  // Add details if present (validation errors, etc.)
  if (error.details) {
    response.details = error.details;
  }
  if (error.errors) {
    response.details = error.errors;
  }

  // Add retry-after for rate limits
  if (error.retryAfter) {
    response.retryAfter = error.retryAfter;
    res.set('Retry-After', String(error.retryAfter));
  }

  res.status(statusCode).json(response);
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
  // Initialize database schema and seed data (idempotent - safe to run every time)
  (async () => {
    try {
      await initializeDatabase();
    } catch (error) {
      logger.error('⚠️ Database initialization failed:', error.message);
      // Continue server startup - DB may already be initialized
    }

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

        // Validate enum synchronization between Joi and PostgreSQL
        const { validateEnumSync } = require('./utils/validation-sync-checker');
        await validateEnumSync(db);
      } catch (_error) {
        logger.error(
          '⚠️ Database connection failed on startup. Server will continue but DB-dependent features will be unavailable.',
        );
      }
    });
  })();
}

module.exports = app;
