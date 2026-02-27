/**
 * Row-Level Security (RLS) Middleware
 *
 * Enforces data-driven row-level access control policies.
 * Works with entity metadata rlsPolicy and model-level filtering.
 *
 * SECURITY: This is Level 2 of the multi-tier access control system:
 * - Level 1: Resource permissions (requirePermission) - WHO can access WHAT
 * - Level 2: Row-Level Security (enforceRLS) - WHICH RECORDS can be accessed
 * - Level 3: Field-Level Security (future) - WHICH FIELDS can be seen/modified
 *
 * RLS POLICY VALUES (ADR-008):
 * - null: No filtering - role can see all records
 * - false: Deny all access - role cannot access any records
 * - '$parent': Access controlled by parent entity
 * - 'field_name': Filter: WHERE table.field_name = $userId (shorthand)
 * - { field, value }: Full config - WHERE table.field = $rlsContext[value]
 *
 * USAGE:
 * Apply AFTER authenticateToken and requirePermission:
 * router.get('/customers',
 *   authenticateToken,
 *   requirePermission('customers', 'read'),
 *   enforceRLS('customers'),
 *   getCustomers
 * );
 */

const { getRLSRule } = require('../config/permissions-loader');
const { logSecurityEvent, logger } = require('../config/logger');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const ResponseFormatter = require('../utils/response-formatter');
const { ERROR_CODES } = require('../utils/response-formatter');

/**
 * Enforce Row-Level Security for a resource
 *
 * Attaches RLS filter configuration to request object for model-level filtering.
 * Models use this in their buildRLSQuery() method.
 *
 * UNIFIED PATTERN: Resource is ALWAYS read from req.entityMetadata.rlsResource
 * Routes must attach entity metadata via middleware BEFORE this runs.
 *
 * @returns {Function} Express middleware function
 *
 * @example
 * // In routes file:
 * router.get('/customers',
 *   authenticateToken,
 *   attachEntity,
 *   requirePermission('read'),
 *   enforceRLS,
 *   async (req, res) => {
 *     // req.rlsContext is now available for filtering
 *     const customers = await Customer.findAll(req);
 *   }
 * );
 */
const enforceRLS = (req, res, next) => {
  // Resource comes from entity metadata - ONE source, no fallbacks
  const resource = req.entityMetadata?.rlsResource;

  if (!resource) {
    // This is a configuration error - route is missing entity attachment middleware
    logSecurityEvent('RLS_NO_ENTITY_METADATA', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      severity: 'ERROR',
    });
    return ResponseFormatter.internalError(
      res,
      new Error('Route misconfiguration: entity metadata not attached'),
    );
  }

  const userRole = req.dbUser?.role;
  const userId = req.dbUser?.id;

  if (!userRole) {
    logSecurityEvent('RLS_NO_ROLE', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId,
      resource,
    });
    return ResponseFormatter.forbidden(
      res,
      'User has no assigned role',
      ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
    );
  }

  // Get RLS filter configuration from permissions (via entity metadata)
  // ADR-008: filterConfig is the rlsPolicy value for this role
  const filterConfig = getRLSRule(userRole, resource);

  // Build RLS context with all available filter values
  // ADR-008: Different entities may filter by different profile IDs
  req.rlsContext = {
    filterConfig, // null | false | '$parent' | string | { field, value }
    userId,
    customerProfileId: req.dbUser?.customer_profile_id || null,
    technicianProfileId: req.dbUser?.technician_profile_id || null,
    role: userRole,
    resource,
  };

  // Debug log only - RLS application is routine, not a security concern
  logger.debug('RLS context attached', {
    url: req.url,
    userId,
    userRole,
    resource,
    filterConfig:
      typeof filterConfig === 'object'
        ? JSON.stringify(filterConfig)
        : filterConfig,
  });

  next();
};

/**
 * Validate RLS filtering was applied
 *
 * Use at the END of route handler to verify model applied RLS correctly.
 * This is a safety check to prevent accidentally returning unfiltered data.
 *
 * @param {Object} req - Express request object
 * @param {Object} result - Query result to validate
 * @throws {Error} If RLS was not applied when required
 *
 * @example
 * router.get('/customers',
 *   authenticateToken,
 *   attachEntity,
 *   requirePermission('read'),
 *   enforceRLS,
 *   async (req, res) => {
 *     const customers = await Customer.findAll(req);
 *     validateRLSApplied(req, customers);
 *     res.json(customers);
 *   }
 * );
 */
const validateRLSApplied = (req, result) => {
  if (!req.rlsContext?.resource) {
    return; // No RLS enforcement on this route
  }

  if (req.rlsContext.filterConfig === null) {
    return; // No RLS filtering required
  }

  // Result should have metadata indicating RLS was applied
  if (!result || !result.rlsApplied) {
    const error = new Error(
      `RLS validation failed for ${req.rlsContext.resource}: ` +
        'Model did not apply RLS filtering',
    );
    logSecurityEvent('RLS_VALIDATION_FAILED', {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      url: req.url,
      userId: req.rlsContext.userId,
      userRole: req.rlsContext.role,
      resource: req.rlsContext.resource,
      filterConfig:
        typeof req.rlsContext.filterConfig === 'object'
          ? JSON.stringify(req.rlsContext.filterConfig)
          : req.rlsContext.filterConfig,
      severity: 'CRITICAL',
    });
    throw error;
  }
};

module.exports = {
  enforceRLS,
  validateRLSApplied,
};
