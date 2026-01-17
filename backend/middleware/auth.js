/**
 * Authentication Middleware
 *
 * Verifies JWT tokens from both Dev and Auth0 strategies.
 * Works seamlessly with the unified AuthService (Strategy Pattern).
 *
 * SECURITY: Development tokens are ONLY accepted in development/test mode.
 * Production mode ONLY accepts Auth0 tokens.
 */
const jwt = require('jsonwebtoken');
const UserDataService = require('../services/user-data');
const { hasPermission, hasMinimumRole } = require('../config/permissions-loader');
const { logSecurityEvent } = require('../config/logger');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const AppConfig = require('../config/app-config');
const { TEST_USERS } = require('../config/test-users');
const ResponseFormatter = require('../utils/response-formatter');
const { ERROR_CODES } = require('../utils/response-formatter');
const AppError = require('../utils/app-error');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    logSecurityEvent('AUTH_MISSING_TOKEN', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
    });
    return ResponseFormatter.unauthorized(res, 'Access token required', ERROR_CODES.AUTH_REQUIRED);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Validate required standard claims (RFC 7519)
    if (!decoded.sub) {
      throw new AppError('Missing required "sub" claim', 401, 'UNAUTHORIZED');
    }

    // Accept both development and auth0 providers
    if (
      !decoded.provider ||
      !['development', 'auth0'].includes(decoded.provider)
    ) {
      throw new AppError('Invalid token provider', 401, 'UNAUTHORIZED');
    }

    // SECURITY CHECK: Reject development tokens in production
    if (decoded.provider === 'development' && !AppConfig.devAuthEnabled) {
      logSecurityEvent('AUTH_DEV_TOKEN_IN_PRODUCTION', {
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
        url: req.url,
        provider: decoded.provider,
        environment: AppConfig.environment,
        severity: 'CRITICAL',
      });
      throw new AppError(
        'Development authentication is not permitted in production mode. ' +
          'Only Auth0 authentication is allowed.',
        403,
        'FORBIDDEN',
      );
    }

    req.user = decoded;

    // HTTP methods that mutate data - dev users CANNOT use these (with exceptions)
    const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    // Routes that are SAFE for dev users even with mutating methods
    // These are session/auth operations, NOT business data mutations
    // Check both full path and route-relative path for flexibility
    const DEV_ALLOWED_WRITE_PATHS = [
      '/api/auth/logout', // Logout just clears token/session, no DB mutation
      '/logout', // Route-relative path (when checked via req.path)
      '/api/auth/refresh', // Token refresh (if dev tokens supported it)
      '/refresh', // Route-relative path
    ];

    // CRITICAL: Development tokens should NEVER touch the database
    // They exist purely in-memory from test-users.js config
    if (decoded.provider === 'development') {
      // Get the full user object from TEST_USERS (DB-consistent structure)
      const testUser = Object.values(TEST_USERS).find(
        (u) => u.auth0_id === decoded.sub || u.email === decoded.email,
      );

      if (!testUser) {
        throw new AppError('Development user not found in TEST_USERS', 401, 'UNAUTHORIZED');
      }

      // Use the complete test user data (already matches DB schema)
      req.dbUser = {
        ...testUser,
        name: `${testUser.first_name} ${testUser.last_name}`.trim() || 'User',
      };

      // Attach permissions helper for route-level checks
      req.permissions = {
        hasPermission: (resource, operation) => hasPermission(req.dbUser.role, resource, operation),
        hasMinimumRole: (requiredRole) => hasMinimumRole(req.dbUser.role, requiredRole),
      };

      // CRITICAL SECURITY: Check if user is active (deactivated users cannot authenticate)
      if (req.dbUser.is_active === false) {
        logSecurityEvent('AUTH_DEACTIVATED_USER', {
          ip: getClientIp(req),
          userAgent: getUserAgent(req),
          url: req.url,
          userId: req.dbUser.id,
          email: req.dbUser.email,
        });
        return ResponseFormatter.forbidden(res, 'Account has been deactivated', ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS);
      }

      // ========================================================================
      // CRITICAL SECURITY: Dev users are READ-ONLY (with safe exceptions)
      // Dev tokens are NOT authenticated via Auth0 - they MUST NOT mutate data
      // This is defense-in-depth: even if route code is buggy, this blocks writes
      // Exception: Auth operations (logout, refresh) are safe - they manage
      // session state, not business data
      // ========================================================================
      const requestPath = req.originalUrl || req.url;
      const isAllowedPath = DEV_ALLOWED_WRITE_PATHS.some(path =>
        requestPath.startsWith(path),
      );

      if (MUTATING_METHODS.includes(req.method) && !isAllowedPath) {
        logSecurityEvent('DEV_WRITE_BLOCKED', {
          ip: getClientIp(req),
          userAgent: getUserAgent(req),
          url: req.url,
          method: req.method,
          email: req.dbUser.email,
          role: req.dbUser.role,
        });
        return ResponseFormatter.forbidden(
          res,
          'Development users are read-only. Authenticate with Auth0 to modify data.',
          ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        );
      }

      next();
    } else {
      // Auth0 provider: find or create user in database
      // SECURITY: decoded.role comes from JWT (signed by Auth0 Action - tamper-proof)
      const dbUser = await UserDataService.findOrCreateUser(decoded);

      // Normalize role field: prefer JWT role (signed), then DB role from JOIN
      // JOIN now returns: role (identity field), role_priority, role_description
      const roleName = decoded.role || dbUser.role;
      const rolePriority = dbUser.role_priority;

      req.dbUser = {
        ...dbUser,
        // Canonical role fields
        role: roleName, // 'admin', 'manager', etc.
        role_priority: rolePriority, // 5, 4, 3, 2, 1
      };

      // Attach permissions helper for route-level checks
      req.permissions = {
        hasPermission: (resource, operation) => hasPermission(req.dbUser.role, resource, operation),
        hasMinimumRole: (requiredRole) => hasMinimumRole(req.dbUser.role, requiredRole),
      };

      // CRITICAL SECURITY: Check if user is active (deactivated users cannot authenticate)
      if (req.dbUser.is_active === false) {
        logSecurityEvent('AUTH_DEACTIVATED_USER', {
          ip: getClientIp(req),
          userAgent: getUserAgent(req),
          url: req.url,
          userId: req.dbUser.id,
          email: req.dbUser.email,
        });
        return ResponseFormatter.forbidden(res, 'Account has been deactivated', ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS);
      }

      next();
    }
  } catch (error) {
    // Distinguish between expected expiration and actual security concerns
    const isExpiredToken = error.name === 'TokenExpiredError' || error.message === 'jwt expired';

    if (isExpiredToken) {
      // Token expiration is normal auth flow - user needs to refresh/re-login
      // Don't log as security event to reduce noise
      return ResponseFormatter.forbidden(res, 'Token expired', ERROR_CODES.AUTH_TOKEN_EXPIRED);
    }

    // Actual invalid tokens ARE a security concern
    logSecurityEvent('AUTH_INVALID_TOKEN', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      error: error.message,
    });
    return ResponseFormatter.forbidden(res, 'Invalid or expired token', ERROR_CODES.AUTH_INVALID_TOKEN);
  }
};

/**
 * Permission-based authorization middleware
 * Checks if user's role has permission to perform operation on resource
 *
 * Uses role hierarchy - higher roles inherit lower role permissions
 *
 * UNIFIED PATTERN: Resource is ALWAYS read from req.entityMetadata.rlsResource
 * Routes must attach entity metadata via middleware BEFORE this runs.
 *
 * @param {string} operation - Operation (create, read, update, delete)
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/users', attachEntity, requirePermission('create'), createUser);
 * router.get('/users', attachEntity, requirePermission('read'), getUsers);
 */
const requirePermission = (operation) => (req, res, next) => {
  // Resource comes from entity metadata - ONE source, no fallbacks
  const resource = req.entityMetadata?.rlsResource;

  if (!resource) {
    // This is a configuration error - route is missing entity attachment middleware
    logSecurityEvent('AUTH_NO_ENTITY_METADATA', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      operation,
      severity: 'ERROR',
    });
    return ResponseFormatter.internalError(res, new Error('Route misconfiguration: entity metadata not attached'));
  }

  const userRole = req.dbUser?.role;

  if (!userRole) {
    logSecurityEvent('AUTH_NO_ROLE', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId: req.dbUser?.id,
      resource,
      operation,
    });
    return ResponseFormatter.forbidden(res, 'User has no assigned role', ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS);
  }

  if (!hasPermission(userRole, resource, operation)) {
    logSecurityEvent('AUTH_INSUFFICIENT_PERMISSION', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId: req.dbUser?.id,
      userRole,
      resource,
      operation,
    });
    return ResponseFormatter.forbidden(res, `Insufficient permissions to ${operation} ${resource}`, ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS);
  }

  next();
};

/**
 * Minimum role authorization middleware
 * Checks if user's role meets or exceeds the required role
 *
 * Uses role hierarchy - admin can access manager-only routes
 *
 * @param {string} minimumRole - Minimum required role name
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/admin/dashboard', requireMinimumRole('admin'), getDashboard);
 * router.get('/reports', requireMinimumRole('manager'), getReports);
 */
const requireMinimumRole = (minimumRole) => (req, res, next) => {
  const userRole = req.dbUser?.role;

  if (!userRole) {
    logSecurityEvent('AUTH_NO_ROLE', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId: req.dbUser?.id,
      minimumRole,
    });
    return ResponseFormatter.forbidden(res, 'User has no assigned role', ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS);
  }

  if (!hasMinimumRole(userRole, minimumRole)) {
    logSecurityEvent('AUTH_INSUFFICIENT_ROLE', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId: req.dbUser?.id,
      userRole,
      minimumRole,
    });
    return ResponseFormatter.forbidden(res, `Minimum role required: ${minimumRole}`, ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS);
  }

  next();
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireMinimumRole,
};
