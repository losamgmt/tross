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
const { HTTP_STATUS, USER_ROLES: _USER_ROLES } = require('../config/constants');
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
    } else {
      // Auth0 provider: find or create user in database
      const dbUser = await userDataService.findOrCreateUser(decoded);
      req.dbUser = dbUser;

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
    logSecurityEvent('AUTH_INVALID_TOKEN', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      error: error.message,
    });
    return sendAuthError(res, HTTP_STATUS.FORBIDDEN, 'Invalid or expired token');
  }
};

const _requireRole = (roleName) => (req, res, next) => {
  if (!req.dbUser?.role || req.dbUser.role !== roleName) {
    logSecurityEvent('AUTH_INSUFFICIENT_ROLE', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId: req.dbUser?.id,
      requiredRole: roleName,
      userRole: req.dbUser?.role,
    });
    return sendAuthError(res, HTTP_STATUS.FORBIDDEN, `${roleName} role required`);
  }
  next();
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
