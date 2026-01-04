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
const { UserDataService: userDataService } = require('../services/user-data');
const { HTTP_STATUS } = require('../config/constants');
const { hasPermission, hasMinimumRole } = require('../config/permissions-loader');
const { logSecurityEvent } = require('../config/logger');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const AppConfig = require('../config/app-config');
const { TEST_USERS } = require('../config/test-users');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// ============================================================================
// CENTRALIZED AUTH ERROR HELPER (follows same pattern as routes)
// ============================================================================

/**
 * Send standardized auth error response
 * Uses same JSON structure as route error handling for consistency
 *
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (401 or 403)
 * @param {string} message - User-facing error message
 * @returns {Object} Express response (for chaining)
 */
const sendAuthError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    error: statusCode === HTTP_STATUS.UNAUTHORIZED ? 'Unauthorized' : 'Forbidden',
    message,
    timestamp: new Date().toISOString(),
  });
};

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
    return sendAuthError(res, HTTP_STATUS.UNAUTHORIZED, 'Access token required');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Validate required standard claims (RFC 7519)
    if (!decoded.sub) {
      throw new Error('Missing required "sub" claim');
    }

    // Accept both development and auth0 providers
    if (
      !decoded.provider ||
      !['development', 'auth0'].includes(decoded.provider)
    ) {
      throw new Error('Invalid token provider');
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
      throw new Error(
        'Development authentication is not permitted in production mode. ' +
          'Only Auth0 authentication is allowed.',
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
        throw new Error('Development user not found in TEST_USERS');
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
        return sendAuthError(res, HTTP_STATUS.FORBIDDEN, 'Account has been deactivated');
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
        return sendAuthError(
          res,
          HTTP_STATUS.FORBIDDEN,
          'Development users are read-only. Authenticate with Auth0 to modify data.',
        );
      }

      next();
    } else {
      // Auth0 provider: find or create user in database
      // SECURITY: decoded.role comes from JWT (signed by Auth0 Action - tamper-proof)
      const dbUser = await userDataService.findOrCreateUser(decoded);

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
        return sendAuthError(res, HTTP_STATUS.FORBIDDEN, 'Account has been deactivated');
      }

      next();
    }
  } catch (error) {
    // Distinguish between expected expiration and actual security concerns
    const isExpiredToken = error.name === 'TokenExpiredError' || error.message === 'jwt expired';

    if (isExpiredToken) {
      // Token expiration is normal auth flow - user needs to refresh/re-login
      // Don't log as security event to reduce noise
      return sendAuthError(res, HTTP_STATUS.FORBIDDEN, 'Token expired');
    }

    // Actual invalid tokens ARE a security concern
    logSecurityEvent('AUTH_INVALID_TOKEN', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      error: error.message,
    });
    return sendAuthError(res, HTTP_STATUS.FORBIDDEN, 'Invalid or expired token');
  }
};

/**
 * Permission-based authorization middleware
 * Checks if user's role has permission to perform operation on resource
 *
 * Uses role hierarchy - higher roles inherit lower role permissions
 *
 * @param {string} resource - Resource name (e.g., 'users', 'roles')
 * @param {string} operation - Operation (create, read, update, delete)
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/users', requirePermission('users', 'create'), createUser);
 * router.get('/users', requirePermission('users', 'read'), getUsers);
 */
const requirePermission = (resource, operation) => (req, res, next) => {
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
    return sendAuthError(res, HTTP_STATUS.FORBIDDEN, 'User has no assigned role');
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
    return sendAuthError(res, HTTP_STATUS.FORBIDDEN, `Insufficient permissions to ${operation} ${resource}`);
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
    return sendAuthError(res, HTTP_STATUS.FORBIDDEN, 'User has no assigned role');
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
    return sendAuthError(res, HTTP_STATUS.FORBIDDEN, `Minimum role required: ${minimumRole}`);
  }

  next();
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireMinimumRole,
};
